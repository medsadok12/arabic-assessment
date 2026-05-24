import { createSign } from 'crypto';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

function sanitize(val, max = 80) {
  return String(val ?? '').replace(/[<>&"'`/\\]/g, '').trim().slice(0, max);
}

function parseCredentials() {
  let creds;
  try {
    creds = JSON.parse(process.env.GOOGLE_SA_KEY);
  } catch {
    throw new Error('GOOGLE_SA_KEY is not valid JSON');
  }
  // Vercel escapes \n in env vars — restore for PEM format
  if (creds.private_key) {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  return creds;
}

async function getAccessToken(creds) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss:   creds.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  };

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const input   = `${header}.${payload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(input);
  const sig = signer.sign(creds.private_key, 'base64url');
  const jwt = `${input}.${sig}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || JSON.stringify(data));
  return data.access_token;
}

async function uploadToDrive(token, fileName, audioBuffer, folderId) {
  const boundary = 'areem_audio_boundary';
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: audio/webm\r\n\r\n`
    ),
    audioBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { audioBase64, studentName: rawName } = req.body;

    if (!audioBase64)
      return res.status(400).json({ error: 'No audio data' });

    if (!process.env.GOOGLE_SA_KEY)
      return res.status(500).json({ error: 'GOOGLE_SA_KEY not configured' });

    const folderId    = process.env.GOOGLE_DRIVE_FOLDER_ID || '19O3jRyBOLcmInmIsk0k7GiWjDavA8hHQ';
    const studentName = sanitize(rawName || 'طالب');
    const uniqueId    = Date.now().toString(36).toUpperCase();
    const fileName    = `${studentName}_${uniqueId}.webm`;

    const base64Data  = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const creds = parseCredentials();
    const token = await getAccessToken(creds);
    const file  = await uploadToDrive(token, fileName, audioBuffer, folderId);

    return res.status(200).json({
      success:  true,
      fileId:   file.id,
      fileName: file.name,
      url:      file.webViewLink,
    });
  } catch (error) {
    console.error('Drive upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
