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
    const response = await fetch(`${REDIS_URL}/set/${key}/${encodeURIComponent(JSON.stringify(value))}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    });
    return await response.json();
  }

  try {
    // GET — lire tout le glossaire
    if (req.method === 'GET') {
      const raw = await redisGet('tahuri:glossaire');
      const glossaire = raw ? JSON.parse(raw) : [];
      return res.status(200).json(glossaire);
    }

    // POST — ajouter ou mettre à jour une entrée
    if (req.method === 'POST') {
      const { fr, tah, note } = req.body;
      if (!fr || !tah) return res.status(400).json({ error: 'fr et tah requis' });

      const raw = await redisGet('tahuri:glossaire');
      let glossaire = raw ? JSON.parse(raw) : [];

      // Remplacer si existe déjà, sinon ajouter
      const existeIndex = glossaire.findIndex(e => e.fr.toLowerCase() === fr.toLowerCase());
      const entree = { id: Date.now(), fr, tah, note: note || '', date: new Date().toLocaleDateString('fr-FR') };

      if (existeIndex >= 0) {
        glossaire[existeIndex] = entree;
      } else {
        glossaire.push(entree);
      }

      await redisSet('tahuri:glossaire', glossaire);
      return res.status(200).json({ success: true, entree });
    }

    // DELETE — supprimer une entrée
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const raw = await redisGet('tahuri:glossaire');
      let glossaire = raw ? JSON.parse(raw) : [];
      glossaire = glossaire.filter(e => e.id !== id);
      await redisSet('tahuri:glossaire', glossaire);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
