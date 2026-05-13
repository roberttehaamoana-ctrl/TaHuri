import { readFileSync } from 'fs';
import { join } from 'path';
// Charger la base de connaissance au démarrage
let knowledge = null;
try {
  const raw = readFileSync(join(process.cwd(), 'api', 'knowledge.json'), 'utf-8');
  knowledge = JSON.parse(raw);
  console.log('knowledge.json chargé — grammaire:', knowledge.grammaire?.length, 'chars, lexique_specialise:', knowledge.lexique_specialise?.length, 'chars');
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
## EXEMPLES FEW-SHOT — structure de référence
- "Je mange du pain" → E 'amu vau i te faraoa. ('amu finit par u → vau)
- "Je bois de l'eau" → E inu vau i te pape. (inu finit par u → vau)
- "Je chante" → E hīmene au. (hīmene finit par e → au)
- "Je marche" → E haere au. (haere finit par e → au)
- "Je dors" → E ta'oto vau. (ta'oto finit par o → vau)
- "Je cours" → E horo vau. (horo finit par o → vau)
- "Je lis" → E tai'o vau. (tai'o finit par o → vau)
- "Je parle" → E parau vau. (parau finit par u → vau)

## EXEMPLES FEW-SHOT — au/vau (à appliquer dans TOUTES les sections)
- Je mange du pain → E 'amu vau i te faraoa ('amu finit par u → vau)
- Je bois de l'eau → E inu vau i te pape (inu finit par u → vau)
- Je chante → E hīmene au (hīmene finit par e → au)
- Je marche → E haere au (haere finit par e → au)
- Je dors → E ta'oto vau (ta'oto finit par o → vau)
- Je cours → E horo vau (horo finit par o → vau)
- Je lis → E tai'o vau (tai'o finit par o → vau)
- Je parle → E parau vau (parau finit par u → vau)

## LEXIQUE SUPPLÉMENTAIRE VALIDÉ
- chocolat = tōtōrā
- étoile = fetiʻa (avec ʻeta — ne jamais écrire fetia sans ʻeta)
- partir = haere (partir en général, s'en aller)
- partir (en voyage) = reva (départ pour un voyage, une traversée)
- fils = tamāiti
- fille = tamāhine
- enfant / enfants (sans précision de sexe) = tamari'i
## RÈGLE ABSOLUE — GENRE EN REO TAHITI
Le reo Tahiti n'a PAS de genre grammatical — ni masculin, ni féminin, ni neutre.
Ne JAMAIS écrire qu'un terme est "neutre en genre" : la catégorie du genre est simplement absente de la langue.
L'expression du SEXE BIOLOGIQUE (pas du genre) se fait ainsi :
- Humains : tāne (mâle) / vahine (femelle) — ex: tuati ma'i tāne = infirmier, tuati ma'i vahine = infirmière
- Animaux : oni (mâle) / ufa (femelle)
- Plantes : 'ōtāne (mâle) / 'ōvahine (femelle)
Dans les notes culturelles, toujours préciser qu'il s'agit d'expression du sexe, jamais du genre.
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
    // Vérifier si les traductions sont activées
    try {
      const REDIS_URL = process.env.KV_REST_API_URL;
      const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
      const switchResp = await fetch(`${REDIS_URL}/get/tahuri:traductions_actives`, {
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
      });
      const switchData = await switchResp.json();
      if (switchData.result === 'false') {
        return res.status(503).json({ error: 'Les traductions sont temporairement désactivées. Le lexique et les exercices restent disponibles.' });
      }
    } catch(e) {}
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
    let systemPrompt = '';
    if (knowledge) {
      if (knowledge.grammaire) {
        systemPrompt += knowledge.grammaire + '\n\n';
      }
      if (knowledge.lexique_valide) {
        systemPrompt += '## LEXIQUE VALIDÉ DGEE/CRDP (priorité absolue — ne jamais contredire)\n';
        systemPrompt += knowledge.lexique_valide + '\n\n';
      }
      if (knowledge.lexique_specialise) {
        systemPrompt += '## LEXIQUES SPÉCIALISÉS (Enseigner, SVT, SPT, EPS)\n';
        systemPrompt += knowledge.lexique_specialise + '\n\n';
      }
    }
    systemPrompt += FORMAT;
    if (glossaireUpstash.length > 0) {
      systemPrompt += '\n\n## GLOSSAIRE VALIDÉ — PRIORITÉ ABSOLUE (ne jamais contredire)\n';
      glossaireUpstash.forEach(e => {
        systemPrompt += `- ${e.fr} = ${e.tah}${e.note ? ' (' + e.note + ')' : ''}\n`;
      });
    }
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
