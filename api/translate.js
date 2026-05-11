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

## LEXIQUE SUPPLÉMENTAIRE VALIDÉ
- chocolat = tōtōrā
- étoile = fetiʻa (avec ʻeta — ne jamais écrire fetia sans ʻeta)
- partir = haere (partir en général, s'en aller)
- partir (en voyage) = reva (départ pour un voyage, une traversée)

## RÈGLE ABSOLUE — POSSESSION O/A (Te fatura'a)

### Ordre O — relation subie, reçue, inhérente (tō / nō)
Appliquer O UNIQUEMENT pour ces catégories strictes, sans interprétation :
- Parents, aînés, ancêtres, supérieurs hiérarchiques
- Frères et sœurs (même génération)
- Parties du corps (toujours, sans exception)
- Qualités physiques, morales, psychologiques inhérentes
- Lieu d'origine, île, district, village d'appartenance
- Maison habitée par le possesseur
- Vêtements, parures, accessoires portés sur soi
- Fleur portée à l'oreille ou sur soi
- Véhicule personnel utilisé (voiture, moto, vélo, pirogue...)
- Tout transport en commun pris pour se déplacer (avion, bateau, bus, taxi...) — il est à ton service pour t'emmener, même si tu n'en es pas propriétaire → ordre O.

### Ordre A — relation active, choisie, produite (tā / nā)
Tout ce qui ne rentre PAS dans une catégorie O ci-dessus → ORDRE A par défaut.
En particulier : tous les objets ordinaires (outils, nourriture, meubles, couteau, livre, stylo...)
Enfants, élèves, subordonnés, animaux entretenus, plantes cultivées.
- École : tā'u fare ha'api'ira'a (A — appliquer sans exception)
- Salle de classe : tā'u piha ha'api'ira'a (A — appliquer sans exception)

### Classe T (déterminant direct) vs Classe N (prédicative)
- Classe T : tō/tā + pronom + nom → ex: Tā Hiro tipi = le couteau de Hiro
- Classe N : nō/nā + nom propre/pronom + te + nom → ex: Nā Hiro te tipi = le couteau est à Hiro

### Application stricte
- Ne JAMAIS interpréter ou nuancer la règle au-delà des catégories ci-dessus
- Si la catégorie n'est pas listée dans O → c'est A, sans exception
- Couteau, outil, objet ordinaire → TOUJOURS A → Nā (jamais Nō)

### Nuances parau / hīmene / 'ā'amu — à proposer dans "Si tu veux dire..."
Pour les mots parau (paroles), hīmene (chanson), 'ā'amu (histoire/conte), la distinction O/A est sémantiquement importante :
- Ordre A → ce que le possesseur PRODUIT, crée, émet, raconte :
  tā'oe parau = tes paroles (ce que tu dis)
  tā'oe hīmene = ta chanson (celle que tu chantes)
  tā'oe 'ā'amu = ton histoire (celle que tu racontes)
- Ordre O → ce qui PARLE du possesseur, lui est dédié, le concerne :
  tō'oe parau = les paroles sur toi (ce qu'on dit de toi)
  tō'oe hīmene = la chanson en ton honneur
  tō'oe 'ā'amu = l'histoire qui parle de toi
Quand l'utilisateur traduit "ma chanson", "mes paroles", "mon histoire" → proposer les deux formes dans "Si tu veux dire..." avec cette explication.

### Rubrique "Si tu veux dire..." pour la possession
Toujours proposer les deux structures complémentaires :
- Structure T (possession directe) : Tā/Tō + possesseur + nom
- Structure N (possession prédicative) : Nā/Nō + possesseur + teie/tenā/terā + nom
  (teie = ici/proche du locuteur, tenā = là/proche de l'interlocuteur, terā = là-bas/éloigné)
Ne proposer AUCUNE autre alternative pour la possession.

## RÈGLE ABSOLUE — au / vau (1ère personne singulier)
La forme de la 1ère personne du singulier (je) dépend de la terminaison du mot qui la précède :
- Mot précédent se termine par E ou I → utiliser AU
  Exemples : E haere AU (haere → e), Tē 'amu nei AU (nei → i), E hīmene AU (hīmene → e)
- Mot précédent se termine par A, O ou U → utiliser VAU
  Exemples : Tē ta'oto ra VAU (ra → a), E horo VAU (horo → o), Ua VAU (ua → a)
Cette règle s'applique à TOUT mot précédant la 1ère personne, pas seulement les verbes.
CRITIQUE : Cette règle doit être appliquée dans TOUTES les sections de la réponse — traduction principale, comparaison, tournure négative, si_tu_veux_dire, note culturelle, exemples. Sans exception.
- fils = tamāiti
- fille = tamāhine
- enfant / enfants (sans précision de sexe) = tamari'i
- partir = haere (partir en général, s'en aller)
- partir (en voyage) = reva (départ pour un voyage, une traversée)

## RÈGLE ABSOLUE — POSSESSION O/A (Te fatura'a)

### Ordre O — relation subie, reçue, inhérente (tō / nō)
Appliquer O UNIQUEMENT pour ces catégories strictes, sans interprétation :
- Parents, aînés, ancêtres, supérieurs hiérarchiques
- Frères et sœurs (même génération)
- Parties du corps (toujours, sans exception)
- Qualités physiques, morales, psychologiques inhérentes
- Lieu d'origine, île, district, village d'appartenance
- Maison habitée par le possesseur
- Vêtements, parures, accessoires portés sur soi
- Fleur portée à l'oreille ou sur soi
- Véhicule personnel utilisé (voiture, moto, vélo, pirogue...)
- Tout transport en commun pris pour se déplacer (avion, bateau, bus, taxi...) — il est à ton service pour t'emmener, même si tu n'en es pas propriétaire → ordre O.

### Ordre A — relation active, choisie, produite (tā / nā)
Tout ce qui ne rentre PAS dans une catégorie O ci-dessus → ORDRE A par défaut.
En particulier : tous les objets ordinaires (outils, nourriture, meubles, couteau, livre, stylo...)
Enfants, élèves, subordonnés, animaux entretenus, plantes cultivées.
- École : tā'u fare ha'api'ira'a (A — appliquer sans exception)
- Salle de classe : tā'u piha ha'api'ira'a (A — appliquer sans exception)

### Classe T (déterminant direct) vs Classe N (prédicative)
- Classe T : tō/tā + pronom + nom → ex: Tā Hiro tipi = le couteau de Hiro
- Classe N : nō/nā + nom propre/pronom + te + nom → ex: Nā Hiro te tipi = le couteau est à Hiro

### Application stricte
- Ne JAMAIS interpréter ou nuancer la règle au-delà des catégories ci-dessus
- Si la catégorie n'est pas listée dans O → c'est A, sans exception
- Couteau, outil, objet ordinaire → TOUJOURS A → Nā (jamais Nō)

### Nuances parau / hīmene / 'ā'amu — à proposer dans "Si tu veux dire..."
Pour les mots parau (paroles), hīmene (chanson), 'ā'amu (histoire/conte), la distinction O/A est sémantiquement importante :
- Ordre A → ce que le possesseur PRODUIT, crée, émet, raconte :
  tā'oe parau = tes paroles (ce que tu dis)
  tā'oe hīmene = ta chanson (celle que tu chantes)
  tā'oe 'ā'amu = ton histoire (celle que tu racontes)
- Ordre O → ce qui PARLE du possesseur, lui est dédié, le concerne :
  tō'oe parau = les paroles sur toi (ce qu'on dit de toi)
  tō'oe hīmene = la chanson en ton honneur
  tō'oe 'ā'amu = l'histoire qui parle de toi
Quand l'utilisateur traduit "ma chanson", "mes paroles", "mon histoire" → proposer les deux formes dans "Si tu veux dire..." avec cette explication.

### Rubrique "Si tu veux dire..." pour la possession
Toujours proposer les deux structures complémentaires :
- Structure T (possession directe) : Tā/Tō + possesseur + nom
- Structure N (possession prédicative) : Nā/Nō + possesseur + teie/tenā/terā + nom
  (teie = ici/proche du locuteur, tenā = là/proche de l'interlocuteur, terā = là-bas/éloigné)
Ne proposer AUCUNE autre alternative pour la possession.

## RÈGLE ABSOLUE — au / vau (1ère personne singulier)
La forme de la 1ère personne du singulier (je) dépend de la terminaison du mot qui la précède :
- Mot précédent se termine par E ou I → utiliser AU
  Exemples : E haere AU (haere → e), Tē 'amu nei AU (nei → i), E hīmene AU (hīmene → e)
- Mot précédent se termine par A, O ou U → utiliser VAU
  Exemples : Tē ta'oto ra VAU (ra → a), E horo VAU (horo → o), Ua VAU (ua → a)
Cette règle s'applique à TOUT mot précédant la 1ère personne, pas seulement les verbes.
CRITIQUE : Cette règle doit être appliquée dans TOUTES les sections de la réponse — traduction principale, comparaison, tournure négative, si_tu_veux_dire, note culturelle, exemples. Sans exception.
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
    } catch(e) {
      // Si Upstash non disponible, on laisse passer
    }

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
    } catch(e) {
      console.log('Glossaire Upstash non disponible:', e.message);
    }

    let systemPrompt = '';
    
    if (knowledge) {
      // Grammaire et règles
      if (knowledge.grammaire) {
        systemPrompt += knowledge.grammaire + '\n\n';
      }
      // Lexique validé DGEE/CRDP (338 entrées, source de référence absolue)
      if (knowledge.lexique_valide) {
        systemPrompt += '## LEXIQUE VALIDÉ DGEE/CRDP (priorité absolue — ne jamais contredire)\n';
        systemPrompt += knowledge.lexique_valide + '\n\n';
      }
      // Lexiques spécialisés disciplinaires
      if (knowledge.lexique_specialise) {
        systemPrompt += '## LEXIQUES SPÉCIALISÉS (Enseigner, SVT, SPT, EPS)\n';
        systemPrompt += knowledge.lexique_specialise + '\n\n';
      }
    }

    systemPrompt += FORMAT;

    // Injecter le glossaire Upstash (priorité absolue)
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
