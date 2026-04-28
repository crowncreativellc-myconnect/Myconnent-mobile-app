interface LocalModerationResult {
  passed: boolean;
  category: string | null;
  reason: string | null;
}

interface PatternCategory {
  label: string;
  reason: string;
  patterns: RegExp[];
}

// Normalise input to defeat common evasion: leet speak, punctuation masking,
// deliberate inter-character spacing, repeated-char inflation, and Unicode confusables.
export function normaliseInput(raw: string): string {
  return raw
    .toLowerCase()
    // Unicode confusables → ASCII (Cyrillic lookalikes are the most common)
    .replace(/[\u0430]/g, 'a') // а
    .replace(/[\u0435]/g, 'e') // е
    .replace(/[\u043E]/g, 'o') // о
    .replace(/[\u0441]/g, 'c') // с
    .replace(/[\u0440]/g, 'r') // р
    .replace(/[\u0456]/g, 'i') // і
    // Leet-speak digit/symbol substitutions
    .replace(/@/g, 'a')
    .replace(/4/g, 'a')
    .replace(/3/g, 'e')
    .replace(/1/g, 'i')
    .replace(/!/g, 'i')
    .replace(/0/g, 'o')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\+/g, 't')
    .replace(/8/g, 'b')
    // Remove dots between letters used to break up words (c.o.c.a.i.n.e → cocaine)
    .replace(/([a-z])\.([a-z])/g, '$1$2')
    // Remove asterisks / hyphens used as character masks (c*ke → cke, h-e-r-o-i-n → heroin)
    .replace(/\*/g, '')
    .replace(/([a-z])-([a-z])/g, '$1$2')
    // Collapse runs of 3+ identical chars to 2 (coooool → cool, drruuugs → drugs)
    .replace(/(.)\1{2,}/g, '$1$1')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Design principle ─────────────────────────────────────────────────────────
// runLocalModeration() normalises the input first, then pattern-matches on the
// normalised string. This catches leet-speak and punctuation-masking evasions.
// Layer 2 (Claude) handles genuine edge cases and ambiguous phrasings.
//
// Categories:
//   drug_services        – drug dealing/supply, coded narcotics language
//   sexual_exploitation  – child safety (zero tolerance), solicitation, non-consensual content
//   illegal_weapons      – unlawful acquisition/modification of firearms and explosives
//   financial_fraud      – scams, laundering, tax evasion, fake charities
//   human_trafficking    – smuggling, forced labour, sex trafficking
//   violence_threats     – direct threats, doxxing, stalking tools, coordinated attacks
// ─────────────────────────────────────────────────────────────────────────────

const PROHIBITED_CATEGORIES: PatternCategory[] = [

  // ─── drug_services — checked first after child_safety ────────────────────────
  {
    label: 'drug_services',
    reason:
      'This request appears to involve the supply, purchase, or distribution of controlled substances.',
    patterns: [
      // Cannabis street slang standalone — "zaa" / "zaaaa" collapses to "zaa" via normaliser
      /\b(weed|zaza|zaa|marijuana)\b/i,
      // Hard drug names standalone (post-normalisation covers leet-speak variants)
      /\b(cocaine|heroin|methamphetamine|crystal\s*meth|fentanyl|crack\s*cocaine|mdma|ecstasy|ketamine|oxycontin|xanax)\b/i,
      // Street slang for hard drugs standalone
      /\b(coke|blow|snow|nose\s*candy|smack|dope|junk|horse|brown\s*sugar|ice|glass|tina|fent|molly|mandy|ket|xans|xannies|addy|addies)\b/i,
      // Prescription pill slang standalone
      /\b(percs?|oxys?|blues?\s*pills?|pressed\s*pills?|counterfeit\s*pills?|m30s?)\b/i,
      // Lean / codeine syrup slang standalone
      /\b(lean\b|purple\s*drank|sizzurp|dirty\s*sprite|wock(y)?|wockesha|activis)\b/i,
      // Fentanyl analogues standalone
      /\b(fetty|grey\s*death|china\s*white|carfentanil)\b/i,
      // Psilocybin / psychedelic supply
      /\b(shrooms?|magic\s*mushrooms?|psilocybin|lsd\s*tabs?|acid\s*tabs?|dmt\s*vials?|ayahuasca\s*brew)\b.{0,30}\b(buy|sell|source|supply|ship|deliver|cop|get\s*me|hook\s*me\s*up)\b/i,
      // Trap / dealer terminology standalone
      /\b(trap\s*house|trapper|re[\s-]?up|move\s*(weight|bricks?|packs?)|whip(ping)?\s*(up\s*)?work)\b/i,
      // "Plug" in drug context
      /\b(need|looking\s*for|find\s*me|connect\s*me)\b.{0,25}\b(a\s*)?(plug|connect|hookup)\b.{0,30}\b(for\s*)?(weed|coke|pills?|drugs?|pack|za\b|zaza|gas\b|loud\b|exotic\b|dank|chronic|kush)\b/i,
      // Buy/sell verbs + substance
      /\b(buy|purchase|sell|deal|obtain|source|score|cop|grab|pick\s*up|drop\s*off)\b.{0,30}\b(drugs?|weed|marijuana|cannabis|zaaa?|za\b|zaza|gas\b|loud\b|exotic\b|boof|reggie|mids?|chronic|kush|green\b|herb\b|bud\b|pack\b|work\b|soft\b|hard\b|white\b|brown\b|shrooms?|tabs\b|rolls\b|beans\b)\b/i,
      // Cannabis in explicitly illegal context
      /\b(sell|deal|source|obtain)\b.{0,25}\b(weed|marijuana|cannabis|zaaa?|zaza|gas\b|loud\b|exotic\b)\b.{0,40}\b(illegally|without\s*licen[cs]e|unlicen[cs]ed|off\s*the\s*books|black\s*market)\b/i,
      // Drug delivery / shipping language
      /\b(ship|mail|send|deliver)\b.{0,25}\b(pills?|powder|grams?|ounces?|oz\b|bales?|bricks?|packs?)\b.{0,20}\b(discreet(ly)?|stealth|vacuum[\s-]?sealed|no\s*signature)\b/i,
      // Pill press / counterfeit manufacturing
      /\b(pill\s*press|counterfeit\s*pills?|press(ing)?\s*pills?|fake\s*m30s?|fake\s*oxy)\b/i,
      // Dark web drug markets
      /\b(silk\s*road|dream\s*market|empire\s*market|hydra\s*market|dark\s*web\s*(drugs?|market|vendor))\b/i,
      // Drug testing kit evasion (buying to resell)
      /\b(fentanyl\s*test\s*strips?|drug\s*test\s*cheat|beat\s*(a\s*)?drug\s*test|synthetic\s*urine|fake\s*pee|clean\s*urine)\b/i,
      // Nar-coded quantities indicating dealing (grams/oz of named substance)
      /\b(quarter|half\s*zip|zip\b|elbow\b|QP\b|pound\b)\b.{0,20}\b(of\s+)?(weed|coke|meth|heroin|fent)\b/i,
      /\b(gram(s)?|oz\b|ounce(s)?)\b.{0,20}\b(of\s+)?(cocaine|heroin|fentanyl|meth|mdma|ecstasy)\b/i,
    ],
  },

  // ─── sexual_exploitation — zero tolerance for child safety ───────────────────
  {
    label: 'sexual_exploitation',
    reason:
      'This request contains content that may involve the sexualisation of minors, sexual solicitation, or non-consensual intimate content, which is strictly prohibited.',
    patterns: [
      // Child safety — checked first, no exceptions
      /\b(child|minor|underage|under\s*age|u18|u-18|teen(ager)?|preteen|pre-teen|juvenile|youth|kid(s)?)\b.{0,40}\b(sex|nude|naked|explicit|porn|sexual|intimate|erotic|lewd|escort)\b/i,
      /\b(sex|nude|naked|explicit|porn|sexual|intimate|erotic|lewd)\b.{0,40}\b(child|minor|underage|teen(ager)?|preteen|juvenile|youth|kid(s)?)\b/i,
      /\b(csam|cp\s*content|child\s*porn(ography)?|loli(con)?|shota(con)?)\b/i,
      /\b(young\s+(girl|boy|girls|boys|woman|man|teen|model))\b.{0,30}\b(nude|naked|explicit|sexy|sexual|erotic)\b/i,
      // Prostitution / solicitation
      /\b(hooker|prostitut(e|ion)|call\s*girl|gigolo|sex\s*worker|street\s*walker)\b/i,
      /\b(escort|sensual|erotic|sexual)\b.{0,30}\b(services?|sessions?|appointments?|bookings?|available|agency)\b/i,
      /\b(hook\s*up|sexual\s*favour?s?|intimate\s*services?)\b/i,
      // Adult platforms as solicitation vehicle
      /\b(onlyfans|only\s*fans|fansly|manyvids)\b.{0,30}\b(manage|promote|recruit|set\s*up|create\s*content|run\s*my)\b/i,
      // Sugar dating
      /\bsugar\s+(daddy|baby|momm?[ay]?|mommy)\b/i,
      // Porn / explicit content creation/distribution
      /\bporn(star|ography|ographic|site|video|hub|content|film|industry)?\b/i,
      /\b(smut|filth|hentai|xxx|x[\s-]rated|r[\s-]18|adult\s*only)\b/i,
      /\bnudes\b/i,
      // Webcam / camming solicitation
      /\b(stripper|strip\s*club|lapdance|cam\s*girl|cam\s*boy|camming|webcam\s*model)\b/i,
      // Nude/naked + media type
      /\b(nude|naked|topless|bottomless)\b.{0,25}\b(photos?|pics?|videos?|images?|content|shoot|models?)\b/i,
      // Explicit content production
      /\b(sex|nsfw|explicit|adult)\b.{0,20}\b(content|photos?|videos?|pics?|images?|clips?|shoots?)\b/i,
      // Revenge porn / non-consensual sharing
      /\b(share|post|send|distribut|leak|upload|spread)\b.{0,30}\b(intimate|nude|naked|explicit|sexual)\b.{0,20}\b(photos?|pics?|videos?|images?|clips?)\b/i,
      /\b(leak[s]?|leaked)\b.{0,20}\b(nude|naked|explicit|celeb|celebrity)\b/i,
      // Slang solicitation terms
      /\b(lewds?|thot|hoe\s*for\s*hire)\b/i,
      // Trafficking-adjacent exploitation
      /\b(recruit|find|manage|run)\b.{0,25}\b(girls?|women|models?)\b.{0,30}\b(for\s*)?(sex|adult\s*content|escort(ing)?|companionship)\b/i,
    ],
  },

  // ─── illegal_weapons ─────────────────────────────────────────────────────────
  {
    label: 'illegal_weapons',
    reason:
      'This request appears to involve the unlawful acquisition, modification, or trafficking of firearms, weapons, or explosives.',
    patterns: [
      // Buying/acquiring illegal firearms
      /\b(buy|sell|source|obtain|acquire|supply|get\s*me)\b.{0,30}\b(illegal\s*)?(guns?|firearms?|handguns?|pistols?|revolvers?|rifles?|shotguns?|weapons?)\b.{0,30}\b(no\s*serial|untraceable|off[\s-]books|no\s*background\s*check|illegally|black\s*market)\b/i,
      // Ghost guns
      /\b(ghost\s*gun|unserialized\s*(firearm|gun|pistol|rifle)|80[\s-]percent\s*(lower|kit|build)|privately\s*made\s*firearm)\b/i,
      // 3D printed weapons
      /\b(3d[\s-]?print(ed)?\s*(gun|firearm|pistol|rifle|weapon)|liberator\s*pistol|glock\s*switch\s*print)\b/i,
      // Converting semi-auto to full-auto
      /\b(convert|modify|make)\b.{0,30}\b(semi[\s-]?auto(matic)?)\b.{0,20}\b(full[\s-]?auto(matic)?|machine\s*gun|select[\s-]?fire)\b/i,
      /\b(auto\s*sear|glock\s*switch|auto\s*conversion\s*kit|forced\s*reset\s*trigger|FRT\b)\b/i,
      // Suppressors / silencers
      /\b(suppressor|silencer|solvent\s*trap\s*kit)\b.{0,25}\b(build|make|fabricate|install|buy|sell|source)\b/i,
      /\b(buy|make|build|install)\b.{0,25}\b(suppressor|silencer|home[\s-]?made\s*silencer)\b/i,
      // Ammunition trafficking
      /\b(sell|supply|ship|source)\b.{0,25}\b(ammo|ammunition|hollow[\s-]?points?|armour[\s-]?piercing|AP\s*rounds?)\b.{0,25}\b(bulk|wholesale|no\s*records?|untraceable)\b/i,
      // Explosives / IEDs
      /\b(make|build|construct|assemble|acquire)\b.{0,30}\b(bomb|explosive|ied|pipe\s*bomb|pressure\s*cooker\s*bomb|molotov|grenade|c4|semtex|det\s*cord|blasting\s*cap)\b/i,
      /\b(explosives?|c-?4|semtex|det(onator)?|ied|pipe\s*bomb)\b.{0,25}\b(buy|source|build|make|acquire)\b/i,
      // Bypassing background checks
      /\b(bypass|avoid|skip|get\s*around)\b.{0,25}\b(background\s*check|nics|waiting\s*period)\b.{0,25}\b(gun|firearm|pistol|rifle)\b/i,
      // Straw purchase
      /\b(straw\s*(purchase|buy|buying)|buy\s*(a\s*)?gun\s*for\s*someone|purchase\s*(a\s*)?firearm\s*for\s*(a\s*)?third\s*party)\b/i,
      // Illegal knife / blade trafficking
      /\b(switchblade|gravity\s*knife|brass\s*knuckles?|sawed[\s-]?off\s*shotgun)\b.{0,20}\b(sell|buy|source|supply)\b/i,
      // RPG / military hardware
      /\b(rpg|rocket[\s-]?propelled\s*grenade|anti[\s-]?tank\s*missile|military[\s-]?grade\s*weapons?)\b.{0,25}\b(buy|source|acquire|obtain)\b/i,
      // Illegal import/export of weapons
      /\b(import|export|smuggle|traffic)\b.{0,25}\b(guns?|firearms?|weapons?|arms?)\b.{0,25}\b(internationally|across\s*(the\s*)?border|without\s*(a\s*)?licen[cs]e|illegally)\b/i,
    ],
  },

  // ─── financial_fraud ─────────────────────────────────────────────────────────
  {
    label: 'financial_fraud',
    reason:
      'This request contains patterns associated with financial fraud, money laundering, pyramid schemes, or tax evasion.',
    patterns: [
      // Money laundering
      /\b(launder|wash|clean)\b.{0,20}\b(dirty\s*)?(money|funds?|crypto|bitcoin|proceeds)\b/i,
      /\b(money\s*mule|money\s*muling|mule\s*account)\b/i,
      /\b(transfer|move|send|wire|channel)\b.{0,25}\b(cash|funds?|money|crypto|bitcoin)\b.{0,35}\b(avoid|bypass|without\s*(declaring|reporting)|off\s*the\s*books|unreported)\b/i,
      // Tax evasion
      /\b(hide|conceal|shelter)\b.{0,25}\b(income|earnings?|revenue|profits?|money)\b.{0,25}\b(from\s*(the\s*)?(irs|hmrc|tax\s*office|government)|avoid(ing)?\s*(tax|reporting))\b/i,
      /\b(offshore|shell\s*company|nominee\s*director)\b.{0,30}\b(hide|conceal|avoid|evade)\b.{0,25}\b(tax|income|assets|revenue)\b/i,
      // Crypto fraud
      /\b(rug\s*pull|rugging|exit\s*scam|pump\s*and\s*dump)\b/i,
      /\b(pump\s*(this\s*)?(coin|token|crypto|memecoin))\b/i,
      /\b(fake\s*crypto|fake\s*nft|rug\s*token|honeypot\s*contract)\b/i,
      // Pyramid / MLM fraud
      /\b(recruit|sign\s*(up|on)|onboard|bring\s*in)\b.{0,35}\b(investors?|members?|participants?|people)\b.{0,35}\b(commission|percentage|cut|earn|guaranteed)\b/i,
      /\b(guaranteed?|100%\s*(safe|secure|certain)|risk[\s-]?free)\b.{0,25}\b(returns?|profits?|gains?|income|investment\s*growth)\b/i,
      // Fake invoice / expense fraud
      /\b(fake|fraudulent|inflated)\b.{0,20}\b(invoice|bill|receipt|expense\s*report)\b.{0,20}\b(submit|file|send|claim)\b/i,
      // Fake charity
      /\b(fake|fraudulent|false|sham)\b.{0,20}\b(charity|donation\s*campaign|fundrais(er|ing)|gofundme|nonprofit)\b/i,
      // Advance fee / 419 fraud
      /\b(advance\s*fee|419\s*scam|nigerian\s*prince|inheritance\s*transfer)\b/i,
      /\b(send|wire|transfer)\b.{0,20}\b(small\s*fee|processing\s*fee|upfront\s*fee)\b.{0,20}\b(to\s*receive|to\s*claim|to\s*unlock)\b.{0,20}\b(million|inheritance|prize|winnings?)\b/i,
      // Romance scam script writing
      /\b(write|create|draft|script)\b.{0,25}\b(romance\s*scam|love\s*bombing|catfish(ing)?)\b/i,
      /\b(pretend|pose|act)\b.{0,20}\b(to\s*be\s*(in\s*love|a\s*(soldier|doctor|engineer|widow))|romantically\s*interested)\b.{0,30}\b(to\s*(get|extract|receive)\s*money)\b/i,
      // Bank fraud
      /\b(card\s*cashing|carding|cash\s*out\s*(method|cards?)|cc\s*bins?|fullz)\b/i,
      /\b(chargeback\s*fraud|friendly\s*fraud|dispute\s*legit(imate)?\s*charges?)\b/i,
      // Fake reviews / ratings manipulation
      /\b(fake|false|bought?|paid[\s-]for)\b.{0,20}\b(reviews?|ratings?|testimonials?|google\s*reviews?|yelp|trustpilot)\b/i,
    ],
  },

  // ─── human_trafficking ───────────────────────────────────────────────────────
  {
    label: 'human_trafficking',
    reason:
      'This request contains patterns consistent with human trafficking, forced labour recruitment, or people smuggling.',
    patterns: [
      // People smuggling
      /\b(smuggl(e|ing)|traffic(k|king)?)\b.{0,30}\b(people|persons?|women|girls?|workers?|migrants?|humans?|individuals?)\b/i,
      /\b(smuggl(e|ing))\b.{0,25}\b(across\s*(the\s*)?border|into\s*(the\s*)?(country|us|uk|eu)|illegally\s*enter)\b/i,
      // Sex trafficking recruitment
      /\b(recruit|lure|trick|coerce|force)\b.{0,30}\b(women|girls?|young\s*women|people)\b.{0,30}\b(into\s*)?(sex\s*work|prostitution|escorting|the\s*trade)\b/i,
      /\b(manage|run|control|pimp)\b.{0,25}\b(girls?|women|sex\s*workers?|escorts?)\b.{0,20}\b(for\s*(profit|money|income))\b/i,
      // Deceptive labour recruitment
      /\b(recruit|hire)\b.{0,30}\b(workers?|employees?|people)\b.{0,40}\b(false|fake|deceptive|misleading)\b.{0,20}\b(promise|offer|contract|job\s*offer)\b/i,
      /\b(lure|entice|trick)\b.{0,25}\b(workers?|people|migrants?)\b.{0,25}\b(with\s*(fake|false|deceptive)\s*(jobs?|offers?|promises?))\b/i,
      // Debt bondage
      /\b(debt\s*bondage|force(d)?\s*labour|bonded\s*labour|hold(ing)?\s*(their|someone('?s)?)\s*(passport|documents?|id))\b/i,
      /\b(confiscat(e|ing)|tak(e|ing)|with?hold(ing)?)\b.{0,20}\b(passport|documents?|id|visa)\b.{0,25}\b(to\s*(control|keep|trap|prevent\s*them))\b/i,
      // Forced marriage brokering
      /\b(arrange|broker|facilitate)\b.{0,25}\b(forced|sham|fake|fraudulent)\b.{0,20}\b(marriage|wedding|visa\s*marriage)\b/i,
      // Massage parlour / front business trafficking
      /\b(massage\s*parlou?r|happy\s*ending)\b.{0,30}\b(set\s*up|run|manage|open)\b/i,
      /\b(set\s*up|run|operate|manage)\b.{0,25}\b(front\s*business|front\s*company)\b.{0,30}\b(trafficking|sex\s*work|exploitation)\b/i,
      // Transportation for exploitation
      /\b(transport|move|bring)\b.{0,30}\b(women|girls?|people|workers?|migrants?)\b.{0,30}\b(across\s*(borders?|states?|countries?)|for\s*(sex|work|labour|exploitation))\b/i,
      // Control language
      /\b(lock\s*up|imprison|confine|isolate)\b.{0,25}\b(workers?|girls?|women|victims?)\b.{0,25}\b(for\s*(work|sex|exploitation|labour))\b/i,
      // Fraudulent sponsor / visa schemes
      /\b(sponsor(ship)?)\b.{0,25}\b(visa|work\s*permit)\b.{0,30}\b(in\s*exchange\s*for|they\s*(work\s*off|owe|pay\s*back)|indentured)\b/i,
      // Child labour
      /\b(child(ren)?|minors?|underage)\b.{0,25}\b(work(ing)?|labour|factory|farm(ing)?)\b.{0,25}\b(illegally|without\s*consent|against\s*(their\s*)?will)\b/i,
    ],
  },

  // ─── violence_threats ────────────────────────────────────────────────────────
  {
    label: 'violence_threats',
    reason:
      'This request contains content consistent with threats of violence, targeted harassment, doxxing, or the coordination of attacks against individuals or groups.',
    patterns: [
      // Direct physical threats
      /\b(i('?ll|'?m\s*going\s*to)|going\s*to|want\s*to|help\s*me)\b.{0,30}\b(kill|hurt|harm|beat\s*(up|down)|attack|assault|stab|shoot|jump)\b.{0,30}\b(him|her|them|you|this\s*(person|guy|girl)|my\s*ex|someone)\b/i,
      // Street threat slang
      /\b(slide\s*on|run\s*up\s*on|spin\s*the\s*block|pull\s*up\s*on|catch\s*(him|her|them)\s*slipping)\b/i,
      // Contract violence
      /\b(hire|pay|find\s*someone|need\s*someone)\b.{0,25}\b(to\s*)?(beat\s*(up|down)|rough\s*up|hurt|assault|attack|jump)\b.{0,25}\b(him|her|them|someone|a\s*person)\b/i,
      // Doxxing
      /\b(dox(x)?(ing)?|d0x(x)?(ing)?)\b/i,
      /\b(find|post|publish|share)\b.{0,25}\b(home\s*address|personal\s*details|private\s*info(rmation)?|phone\s*number)\b.{0,25}\b(of|for|about)\b.{0,20}\b(him|her|them|this\s*(person|guy|girl)|my\s*ex)\b/i,
      // Stalking tools / location tracking without consent
      /\b(track|monitor|spy\s*on)\b.{0,25}\b(location|movements?|phone|activity)\b.{0,25}\b(without\s*(them\s*)?(knowing|consent|permission)|secretly|covertly)\b/i,
      /\b(install|put|drop|plant)\b.{0,20}\b(spy\s*app|tracker|keylogger|monitoring\s*app|airtag)\b.{0,20}\b(on|in)\b.{0,15}\b(their|his|her)\b/i,
      // Coordinated online attacks
      /\b(mass\s*report|review\s*bomb|coordinated\s*(attack|harassment|report))\b/i,
      /\b(brigade|mob|flood|spam)\b.{0,25}\b(their|his|her)\b.{0,20}\b(comments?|inbox|messages?|dms?|profile)\b/i,
      // Harassment facilitation
      /\b(help\s*me|need\s*(someone|help)\s*to|want\s*to|trying\s*to)\b.{0,35}\b(threaten|intimidate|stalk|harass|scare|bully|terrorise?)\b/i,
      // SWATting
      /\b(swat(ting)?\b)\b/i,
      // Reputation destruction
      /\b(ruin|destroy|take\s*down|sabotage|torpedo)\b.{0,30}\b(their|his|her)\b.{0,20}\b(reputation|career|marriage|relationship|life|business)\b.{0,20}\b(with\s*(lies?|false|fake|made[\s-]?up))\b/i,
      // Inciting violence against groups
      /\b(someone\s*should|we\s*should|they\s*deserve\s*to)\b.{0,30}\b(be\s*(killed?|hurt|harmed?|attacked?|beaten?))\b.{0,25}\b(because\s*(they('re)?|of\s*(their)?))\b/i,
      // Blackmail / extortion
      /\b(blackmail|extort(ion)?)\b/i,
      /\b(pay|send|give)\b.{0,20}\b(me|us)\b.{0,20}\b(or\s*(i|we)\s*(will|'?ll|am\s*going\s*to))\b.{0,30}\b(share|post|leak|expose|tell|send)\b/i,
      // Threatening messages ghostwriting
      /\b(write|draft|compose)\b.{0,25}\b(threatening|threatening?\s*message|intimidating|warning)\b.{0,20}\b(to\s*send\s*to|for)\b/i,
      // Hacking / account takeover for harm
      /\b(hack|break\s*into|get\s*into|bypass|pwn)\b.{0,30}\b(phone|email|gmail|icloud|instagram|facebook|whatsapp|snapchat|account|messages?|device)\b/i,
    ],
  },
];

export function runLocalModeration(input: string): LocalModerationResult {
  // Always normalise before matching to defeat evasion
  const normalised = normaliseInput(input);

  for (const category of PROHIBITED_CATEGORIES) {
    for (const pattern of category.patterns) {
      if (pattern.test(normalised)) {
        return {
          passed: false,
          category: category.label,
          reason: category.reason,
        };
      }
    }
  }

  return { passed: true, category: null, reason: null };
}

const SUGGESTIONS: Record<string, string> = {
  drug_services:
    'If you work in a regulated cannabis, pharmaceutical, or healthcare industry, try rephrasing as a request for a licensed compliance officer, regulatory consultant, or healthcare attorney.',
  sexual_exploitation:
    'MyKonnect is a verified professional network. Any content involving the exploitation of minors or sexual solicitation is strictly prohibited and may be reported to the relevant authorities.',
  illegal_weapons:
    'If you work in a licensed firearms business, security, or defence industry, describe the specific professional service you need (e.g. "FFL compliance consultant," "firearms legal adviser") without referencing unlawful acquisition or modification.',
  financial_fraud:
    'If you need investment, tax planning, or compliance advice, try rephrasing as a request for a licensed CFA, CPA, or regulated financial adviser. Describe the legitimate outcome you are working toward.',
  human_trafficking:
    'If you need international HR, immigration compliance, or labour law support, describe the specific professional service you need (e.g. "immigration solicitor," "global mobility consultant").',
  violence_threats:
    'If you have a legitimate dispute or safety concern, consider consulting a legal professional about proper dispute resolution, mediation services, or contacting the relevant authorities.',
};

export function getSuggestion(category: string): string {
  return (
    SUGGESTIONS[category] ??
    'Please rephrase your request to focus on the legitimate professional service you need.'
  );
}
