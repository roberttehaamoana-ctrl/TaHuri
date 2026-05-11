export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const REDIS_URL = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

  try {
    // GET — lire l'état actuel
    if (req.method === 'GET') {
      const response = await fetch(`${REDIS_URL}/get/tahuri:traductions_actives`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const data = await response.json();
      const actif = data.result !== 'false';
      return res.status(200).json({ actif });
    }

    // POST — changer l'état
    if (req.method === 'POST') {
      const { actif } = req.body;
      await fetch(`${REDIS_URL}/set/tahuri:traductions_actives/${actif ? 'true' : 'false'}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      return res.status(200).json({ success: true, actif });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
