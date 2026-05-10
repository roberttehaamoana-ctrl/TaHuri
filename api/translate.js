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
## RÈGLES CRITIQUES — PRÉSENT FRANÇAIS
Le présent français est fondamentalement ambigu. Deux lectures possibles :
1. Action non encore accomplie, habituelle ou imminente → E + V + S (inaccompli)
2. Action en cours au moment de parler → Tē + V + nei/ra + S (progressif)

Règle de décision :
- Si la phrase contient un marqueur de contexte clair (maintenant, en ce moment, là, tous les jours, demain) → choisir l'aspect correspondant sans ambiguïté.
- Si aucun contexte ne permet de trancher → proposer les DEUX formes dans "traduction" et "si_tu_veux_dire" :
  * E + V + S = action non encore faite / habitude / imminence
  * Tē + V + nei/ra + S = action en cours au moment de parler

Règle nei/ra :
- Tē + V + nei + au = progressif 1ère personne singulier (usage établi avec au)
- Tē + V + ra + S = progressif tous les autres sujets (usage dominant)
- na (2ème personne) existe mais est rare — ne proposer que si contexte explicite.
- E + V + nei = FAUTE GRAVE — ne jamais produire.

## LEXIQUE SUPPLÉMENTAIRE VALIDÉ
- chocolat = tōtōrā
- étoile = fetiʻa (avec ʻeta — ne jamais écrire fetia sans ʻeta)

## RÈGLE ABSOLUE — ATTRIBUT ADJECTIVAL
"Le/La + nom + est + adjectif" = TOUJOURS E mea + adjectif + te + nom.
JAMAIS E + nom + adjectif + teie pour cette structure.
Exemples corrects :
- "La maison est rouge" → E mea 'ute'ute te fare. (PAS E fare 'ute'ute teie)
- "Le chien est blanc" → E mea 'ōre'ore te 'ūrī. (PAS E 'ūrī 'ōre'ore teie)
- "La mer est bleue" → E mea nīnamu te miti. (PAS E miti nīnamu teie)
RAPPEL : E + nom + adjectif + teie = "C'est un/une + nom + adjectif" — structure DIFFÉRENTE du "le/la + nom + est + adjectif".

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
