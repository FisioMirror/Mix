export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const url = 'https://mnkqfrulcpxpwaftokdi.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ua3FmcnVsY3B4cHdhZnRva2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzA5OTAsImV4cCI6MjA5NzY0Njk5MH0.lsbk4vs8F3uvp4gOqs0Ydz7V7zh04MJqWC919KssRQ0';
    const jobId = req.query.job_id;
    const response = await fetch(`${url}/functions/v1/get-job?job_id=${jobId}`, {
      method: 'GET', headers: { Authorization: `Bearer ${key}` }
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) { return res.status(500).json({ error: 'Error interno del servidor proxy' }); }
}
