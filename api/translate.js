import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { readFileSync } = require('fs');
const { join } = require('path');

// Charger la base de connaissance au démarrage
let knowledge = null;
try {
  const raw = readFileSync(join(process.cwd(), 'api', 'knowledge.json'), 'utf-8');
  knowledge = JSON.parse(raw);
} catch(e) {
  console.error('Erreur chargement knowledge.json:', e.message);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system_extra } = req.body;

    // Charger le glossaire Upstash
    let glossaireUpstash = [];
    try {
      const REDIS_URL = process.env.KV_REST_API_URL;
      const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
      const redisResp = await fetch(`${REDIS_URL}/get/tahuri:glossaire`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const redisData = await redisResp.json();
      if (redisData.result) {
        glossaireUpstash = JSON.parse(redisData.result);
      }
    } catch(e) {}

    // Vérifier si les traductions sont activées
    try {
      const REDIS_URL = process.env.KV_REST_API_URL;
      const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
      const switchResp = await fetch(`${REDIS_URL}/get/tahuri:traductions_actives`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const switchData = await switchResp.json();
      if (switchData.result === 'false') {
        return res.status(503).json({ error: 'Les traductions sont temporairement désactivées.' });
      }
    } catch(e) {}

    // Construire le prompt système
    let systemPrompt = '';

    if (knowledge) {
      if (knowledge.grammaire) systemPrompt += knowledge.grammaire + '\n\n';
      if (knowledge.lexique_valide) {
        systemPrompt += '## LEXIQUE VALIDÉ DGEE/CRDP (priorité absolue)\n';
        systemPrompt += knowledge.lexique_valide + '\n\n';
      }
      if (knowledge.lexique_specialise) {
        systemPrompt += '## LEXIQUES SPÉCIALISÉS\n';
        systemPrompt += knowledge.lexique_specialise + '\n\n';
      }
    }

    // Règles critiques
    systemPrompt += `
## RÈGLES CRITIQUES ABSOLUES
1. FORMAT : JSON brut uniquement. Commencer par { finir par }. Aucun markdown.
2. au/vau : après E/I → au. après A/O/U → vau. Partout dans la réponse.
3. ATTRIBUT : Le/La + nom + est + adjectif → E mea + adjectif + te + nom.
4. POSSESSION objet → Nā (jamais Nō pour un objet ordinaire).
5. Pas de genre grammatical en reo Tahiti.
6. E + V + nei = FAUTE GRAVE.
`;

    // Glossaire Upstash
    if (glossaireUpstash.length > 0) {
      systemPrompt += '\n## GLOSSAIRE EXPERT (priorité maximale)\n';
      glossaireUpstash.forEach(e => {
        systemPrompt += `- ${e.fr} = ${e.tah}\n`;
      });
    }

    if (system_extra) systemPrompt += '\n## MÉMOIRE EXPERT\n' + system_extra;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
