export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!process.env.SHEETS_SCRIPT_URL)
      return res.status(200).json({ success: false, note: 'SHEETS_SCRIPT_URL not configured' });

    const response = await fetch(process.env.SHEETS_SCRIPT_URL, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      body:     JSON.stringify(req.body),
      redirect: 'follow',
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Sheets save error:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
}
