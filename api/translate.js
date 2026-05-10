import { readFileSync } from 'fs';
import { join } from 'path';

// Charger la base de connaissance au démarrage
let knowledge = null;
try {
  const raw = readFileSync(join(process.cwd(), 'api', 'knowledge.json'), 'utf-8');
  knowledge = JSON.parse(raw);
} catch(e) {
  console.error('Erreur chargement knowledge.json:', e.message);
}

const FORMAT = `
## RÈGLES CRITIQUES
- Présent français ambigu : traduire par inaccompli E + V + S, puis dans si_tu_veux_dire proposer la forme progressive Tē + V + nei + S.
- E + V + nei = FAUTE GRAVE — ne jamais produire.
- Tē + V + nei/na/ra = progressif UNIQUEMENT.
- Toujours fournir la tournure négative.
- Analyse : 1-2 lignes max.

## FORMAT DE RÉPONSE OBLIGATOIRE
JSON valide uniquement, sans markdown, sans backticks :
{
  "traduction": "traduction principale",
  "structure": "a) Structure : ex: E + V + S (inaccompli)",
  "comparaison": "b) FR: phrase française → schéma\nTAH: traduction → schéma",
  "negative": "c) Tournure négative + traduction française",
  "si_tu_veux_dire": "d) Si tu veux dire que... → forme alternative ou null",
  "note": "note culturelle pertinente ou null"
}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, system_extra } = req.body;

    let systemPrompt = '';
    
    if (knowledge) {
      systemPrompt += knowledge.grammaire + '\n\n';
      systemPrompt += '## LEXIQUE DE RÉFÉRENCE COMPLET (priorité absolue)\n';
      systemPrompt += knowledge.lexique + '\n\n';
    }

    systemPrompt += FORMAT;

    if (system_extra) {
      systemPrompt += '\n\n## MÉMOIRE EXPERT (priorité maximale)\n' + system_extra;
    }

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
