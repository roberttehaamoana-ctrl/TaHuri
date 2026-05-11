export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const REDIS_URL = process.env.KV_REST_API_URL;
  const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

  async function redisGet(key) {
    const response = await fetch(`${REDIS_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    const data = await response.json();
    return data.result;
  }

  async function redisSet(key, value) {
    await fetch(`${REDIS_URL}/set/${key}/${encodeURIComponent(JSON.stringify(value))}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
  }

  try {
    // GET — lire tous les mots ajoutés
    if (req.method === 'GET') {
      const raw = await redisGet('tahuri:lexique');
      const mots = raw ? JSON.parse(raw) : [];
      return res.status(200).json(mots);
    }

    // POST — ajouter un mot
    if (req.method === 'POST') {
      const { fr, tah, theme } = req.body;
      if (!fr || !tah || !theme) return res.status(400).json({ error: 'fr, tah et theme requis' });

      const raw = await redisGet('tahuri:lexique');
      const mots = raw ? JSON.parse(raw) : [];

      // Éviter les doublons
      const existe = mots.findIndex(e => e.fr.toLowerCase() === fr.toLowerCase());
      const entree = { id: Date.now(), fr, tah, theme, date: new Date().toLocaleDateString('fr-FR') };

      if (existe >= 0) {
        mots[existe] = entree;
      } else {
        mots.push(entree);
      }

      await redisSet('tahuri:lexique', mots);
      return res.status(200).json({ success: true, entree });
    }

    // DELETE — supprimer un mot
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const raw = await redisGet('tahuri:lexique');
      let mots = raw ? JSON.parse(raw) : [];
      mots = mots.filter(e => e.id !== id);
      await redisSet('tahuri:lexique', mots);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
