export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const REDIS_URL = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

  async function redis(command) {
    const response = await fetch(`${REDIS_URL}/${command.join('/')}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await response.json();
    return data.result;
  }

  try {
    // GET — lire toutes les activités
    if (req.method === 'GET') {
      const raw = await redis(['get', 'tahuri:activites']);
      const activites = raw ? JSON.parse(raw) : [];
      return res.status(200).json(activites);
    }

    // POST — ajouter une activité
    if (req.method === 'POST') {
      const { titre, url, categorie } = req.body;
      if (!titre || !url) return res.status(400).json({ error: 'Titre et URL requis' });

      const raw = await redis(['get', 'tahuri:activites']);
      const activites = raw ? JSON.parse(raw) : [];
      const nouvelle = { id: Date.now(), titre, url, categorie: categorie || 'Général', date: new Date().toLocaleDateString('fr-FR') };
      activites.push(nouvelle);

      await fetch(`${REDIS_URL}/set/tahuri:activites/${encodeURIComponent(JSON.stringify(activites))}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });

      return res.status(200).json({ success: true, activite: nouvelle });
    }

    // DELETE — supprimer une activité
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const raw = await redis(['get', 'tahuri:activites']);
      let activites = raw ? JSON.parse(raw) : [];
      activites = activites.filter(a => a.id !== id);

      await fetch(`${REDIS_URL}/set/tahuri:activites/${encodeURIComponent(JSON.stringify(activites))}`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
