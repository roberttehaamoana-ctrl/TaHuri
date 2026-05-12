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
- Si aucun contexte ne permet de trancher → proposer les DEUX formes dans "traduction" et "si_tu_veux_dire".
Règle nei/ra :
- Tē + V + nei + au = progressif 1ère personne singulier
- Tē + V + ra + S = progressif tous les autres sujets (usage dominant)
- E + V + nei = FAUTE GRAVE — ne jamais produire.

## LEXIQUE SUPPLÉMENTAIRE VALIDÉ
- chocolat = tōtōrā
- étoile = feti'a (avec ʻeta)
- partir = haere
- partir (en voyage) = reva
- fils = tamāiti
- fille = tamāhine
- enfant / enfants (sans précision de sexe) = tamari'i

## RÈGLE ABSOLUE — GENRE EN REO TAHITI
Le reo Tahiti n'a PAS de genre grammatical. Ne jamais écrire qu'un terme est "neutre en genre".
Expression du sexe biologique : tāne/vahine (humains), oni/ufa (animaux), 'ōtāne/'ōvahine (plantes).

## RÈGLE ABSOLUE — ADJECTIF QUALIFICATIF
Deux structures distinctes :
1. Adjectif épithète (qualifie le nom directement) → adjectif APRÈS le nom, sans E mea :
   - te pere'o'o uira nīnamu = la voiture bleue
   - Tei Tahiti te pere'o'o uira nīnamu. = La voiture bleue est à Tahiti.
   - E horo te 'ūrī 'ere'ere. = Le chien noir court.
2. Attribut adjectival (l'adjectif EST l'information principale) → E mea + adjectif + te + nom :
   - E mea nīnamu te pere'o'o uira. = La voiture est bleue.
   - E mea 'ute'ute te fare. = La maison est rouge.
JAMAIS appliquer E mea quand l'information principale est une localisation, une action ou autre chose que l'adjectif.
JAMAIS E + nom + adjectif + teie pour l'attribut adjectival.

## RÈGLE ABSOLUE — au / vau
Mot précédent finit par E ou I → au. Mot précédent finit par A, O ou U → vau.
Appliquer dans TOUTES les sections de la réponse.

## RÈGLE ABSOLUE — POSSESSION O/A
Ordre O : parents, corps, qualités inhérentes, maison habitée, vêtements portés, véhicule personnel, transports en commun.
Ordre A : tout le reste par défaut (objets, nourriture, école, salle de classe...).
Objet ordinaire → TOUJOURS Nā (jamais Nō). Ex: Nā Hiro te tipi.
Si tu veux dire (possession) → proposer Structure T (Tā/Tō + possesseur + nom) ET Structure N (Nā/Nō + possesseur + teie/tenā/terā + nom).

## RÈGLES — ÉTATS PHYSIQUES ET ÉMOTIONNELS
ma'i uniquement : 'Ua ma'ihia 'ōna (accompli), E ma'ihia 'ōna (inaccompli), Tē ma'ihia ra 'ōna (progressif), E ma'i tōna (nom), E mea ma'i roa 'ōna (adjectif). NE JAMAIS produire E mea ma'ihia.
États généraux (riri, rohirohi...) sans -hia : 'Ua riri 'ōna, E riri 'ōna, Tē riri ra 'ōna, E riri tōna, E mea riri roa.
nāna = impact physique/extérieur. nōna = impact psychologique/moral/intérieur.

## FORMAT DE RÉPONSE OBLIGATOIRE
JSON valide uniquement. Commencer par { et finir par }. 
INTERDIT : astérisques (**), tirets de liste (-), dièses (#), backticks (`), soulignés (_). 
Texte brut uniquement dans tous les champs. Jamais de mise en forme.
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

    systemPrompt += FORMAT;

    if (glossaireUpstash.length > 0) {
      systemPrompt += '\n\n## GLOSSAIRE EXPERT (priorité maximale)\n';
      glossaireUpstash.forEach(e => {
        systemPrompt += `- ${e.fr} = ${e.tah}${e.note ? ' (' + e.note + ')' : ''}\n`;
      });
    }

    if (system_extra) systemPrompt += '\n\n## MÉMOIRE EXPERT\n' + system_extra;

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
