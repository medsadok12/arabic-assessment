import { google } from 'googleapis';
import { Readable } from 'stream';

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
};

const FOLDER_ID = '19O3jRyBOLcmInmIsk0k7GiWjDavA8hHQ';

function sanitize(val, max = 80) {
  return String(val ?? '').replace(/[<>&"'`/\\]/g, '').trim().slice(0, max);
}

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SA_KEY);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { audioBase64, studentName: rawName, questionId } = req.body;

    if (!audioBase64)
      return res.status(400).json({ error: 'No audio data' });

    if (!process.env.GOOGLE_SA_KEY)
      return res.status(500).json({ error: 'Google Drive not configured' });

    const studentName = sanitize(rawName || 'طالب');
    const uniqueId    = Date.now().toString(36).toUpperCase();
    const fileName    = `${studentName}_${uniqueId}.webm`;

    const base64Data  = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const audioBuffer = Buffer.from(base64Data, 'base64');

    const auth  = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const bodyStream = new Readable();
    bodyStream.push(audioBuffer);
    bodyStream.push(null);

    const uploaded = await drive.files.create({
      requestBody: {
        name:    fileName,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: 'audio/webm',
        body:     bodyStream,
      },
      fields: 'id,name,webViewLink',
    });

    return res.status(200).json({
      success:  true,
      fileId:   uploaded.data.id,
      fileName: uploaded.data.name,
      url:      uploaded.data.webViewLink,
    });
  } catch (error) {
    console.error('Drive upload error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
