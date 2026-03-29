/**
 * Chat message profanity filter.
 * Reuses banned word lists from username-filter.ts but REPLACES matches
 * with asterisks instead of blocking outright.
 */

// =============================================
// ENGLISH
// =============================================
const BANNED_EN = [
  'ass', 'cum', 'fag', 'gai', 'nig', 'tit', 'wtf', 'hoe', 'ho',
  'fuck', 'shit', 'dick', 'cock', 'pussy', 'bitch', 'whore', 'slut',
  'cunt', 'bastard', 'damn', 'piss', 'crap', 'wank', 'wanker', 'tosser',
  'bollocks', 'bugger', 'bloody', 'arse', 'arsehole', 'asshole', 'shithead',
  'fuckhead', 'fuckwit', 'fuckwad', 'fucktard', 'bullshit', 'horseshit',
  'dogshit', 'apeshit', 'dipshit', 'batshit',
  'nigger', 'nigga', 'nignog', 'chink', 'chinky', 'gook', 'gookie',
  'spic', 'spick', 'wetback', 'beaner', 'greaseball', 'kike', 'hymie',
  'towelhead', 'raghead', 'sandnigger', 'darkie', 'darkey',
  'coon', 'jigaboo', 'spearchucker', 'wog', 'paki', 'pikey',
  'honky', 'honkey', 'cracker', 'wigger', 'wigga', 'kraut',
  'zipperhead', 'golliwog', 'gollywog', 'chinaman',
  'faggot', 'fagot', 'dyke', 'tranny', 'trannie', 'shemale',
  'ladyboy', 'battyboy', 'battyboi', 'pansy', 'lesbo', 'lezzie',
  'sodomite', 'sodomist', 'homo',
  'penis', 'vagina', 'clitoris', 'clit', 'dildo', 'vibrator',
  'erect', 'orgasm', 'ejaculate', 'ejaculation', 'masturbat',
  'blowjob', 'handjob', 'footjob', 'rimjob', 'circlejerk',
  'bukkake', 'cumshot', 'creampie', 'deepthroat', 'gangbang',
  'threesome', 'bondage', 'bdsm', 'dominatrix', 'fetish',
  'fellatio', 'cunnilingus', 'anilingus', 'sodomy', 'anal',
  'porn', 'porno', 'pornhub', 'xhamster', 'xvideos', 'xnxx',
  'hentai', 'futanari', 'shibari', 'strapon', 'fisting',
  'queef', 'smegma', 'goatse', 'tubgirl', 'lemonparty',
  'jailbait', 'cameltoe', 'booty', 'nipple', 'topless',
  'nude', 'nudity', 'semen', 'spunk', 'splooge',
  'schlong', 'boner', 'horny', 'kinky', 'nympho',
  'genitals', 'rectum', 'anus', 'pubic', 'pubes',
  'erotic', 'autoerotic', 'homoerotic',
  'pedophil', 'paedophil', 'pedobear', 'paedobear',
  'molest', 'rape', 'raping', 'rapist', 'incest',
  'necrophil', 'zoophil', 'bestiality',
  'nazi', 'neonazi', 'hitler', 'swastika', 'svastika',
  'genocide', 'terrorist', 'terrorism', 'suicide', 'murder',
  'killer', 'lynch',
  'retard', 'retarded', 'spastic', 'cripple',
  'cocaine', 'heroin', 'meth',
]

// =============================================
// RUSSIAN
// =============================================
const BANNED_RU = [
  'хуй', 'хуе', 'хуя', 'хуи', 'хуёв', 'хуев', 'хуил',
  'пизд', 'пизж',
  'блять', 'бляд', 'блят', 'блядк', 'блядов', 'блядин',
  'ебат', 'ебан', 'ебал', 'ебну', 'ебло', 'ёбан', 'ёбат', 'ёбар',
  'ебён', 'ебен', 'наеб', 'заеб', 'проеб', 'выеб', 'уеб', 'доеб',
  'сука', 'сучк', 'сучар',
  'мудак', 'мудил', 'мудозвон', 'мудох',
  'пидор', 'пидар', 'педик', 'педераст',
  'жопа', 'жопол', 'жополиз',
  'залуп',
  'манда', 'мандав',
  'шлюх', 'шалав',
  'давалк',
  'гандон',
  'дерьм',
  'говно', 'говня', 'говнюк',
  'срать', 'сран', 'засран', 'просрат',
  'ссать', 'обосса',
  'дрочи', 'дрочил',
  'отсос', 'сосат',
  'долбаёб', 'долбоёб', 'долбаеб', 'долбоеб',
  'дебил',
  'уёбок', 'уебок', 'уёбищ', 'уебищ',
  'пиздец', 'пиздос', 'пиздат', 'пиздюл', 'пиздюк',
  'хуесос', 'хуило', 'хуеплет',
  'курва',
  'лох', 'чмо', 'чмошн',
  'тварь', 'урод',
  'падло', 'падла',
  'выблядок', 'ублюдок',
  'выпердыш', 'перд',
  'малофья',
  'сволочь', 'сволоч',
  'петух', 'опущен',
  'хyй', 'пиzда', 'бляtь',
  'нигер', 'фашист', 'нацист', 'гитлер',
  'хохол', 'чурк', 'чурбан', 'черножоп',
  'жид', 'хач',
  'даун',
  'huy', 'hui', 'pizd', 'blyat', 'blyad', 'blya',
  'ebat', 'ebal', 'eban', 'yobany', 'yoban',
  'suka', 'suchka',
  'mudak', 'mudil',
  'pidor', 'pidar', 'pedik', 'pederast',
  'gandon', 'govno', 'govnyuk',
  'nahui', 'nahuy', 'nakhui', 'nakhuy',
  'pizdec', 'pizdez', 'pizdato',
  'dolbaeb', 'dolboeb', 'dolboyob',
  'debil',
  'zaebal', 'zaebis', 'zaebat',
  'otsos', 'sosat', 'droch',
  'uebok', 'uebische',
  'blyadina', 'shlyuha', 'shalava', 'kurva',
  'zhopa', 'sraka',
  'huesos', 'huilo', 'huepl',
  'ublyudok', 'padla', 'padlo',
  'svoloch', 'tvar',
  'bychara', 'ebalnik',
  'chernozhop', 'churka',
]

// =============================================
// ARABIC
// =============================================
const BANNED_AR = [
  'سكس', 'طيز', 'شرج', 'لعق', 'لحس', 'مص', 'تمص',
  'بيضان', 'ثدي', 'بز', 'بزاز', 'حلمة', 'مفلقسة',
  'بظر', 'كس', 'فرج', 'شهوة', 'جماع', 'قضيب', 'زب', 'زبي',
  'لوطي', 'لواط', 'سحاق', 'سحاقية', 'اغتصاب', 'خنثي',
  'احتلام', 'نيك', 'متناك', 'متناكة',
  'شرموط', 'شرموطة', 'عرص', 'خول', 'قحبة', 'لبوة',
  'عاهر', 'عاهرة', 'زاني', 'زانية',
  'كلب', 'حمار', 'غبي', 'أحمق', 'جحش', 'خنزير',
  'منيك', 'ابن الكلب', 'يلعن', 'لعنة',
  'ديوث', 'معرص', 'منيوك', 'طحن',
  'كسمك', 'كسام', 'كساخت',
  'شاذ', 'مبادل',
  'واطي', 'ساقط', 'وسخ', 'قذر',
  'تفو', 'يخرب', 'يلعن',
]

// Short words that should only match as whole words (not substrings)
const EXACT_ONLY = new Set([
  'ass', 'cum', 'fag', 'gai', 'nig', 'tit', 'wtf', 'hoe', 'ho',
  'damn', 'anal', 'homo',
  'лох', 'чмо', 'жид', 'хач',
  'كلب', 'بز', 'كس', 'زب',
])

// Leet-speak substitutions
const LEET_MAP: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
  '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i',
  '*': '', '+': 't',
}

function deLeet(text: string): string {
  return text.split('').map(c => LEET_MAP[c] ?? c).join('')
}

function normalize(text: string): string {
  return deLeet(
    text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_\-.\s*'`~]/g, '')
  )
}

/**
 * Build a list of { original, normalized } for all banned words,
 * sorted longest-first so longer matches take priority.
 */
const ALL_BANNED = [...BANNED_EN, ...BANNED_RU, ...BANNED_AR]
  .map(word => ({ original: word, normalized: normalize(word) }))
  .filter(w => w.normalized.length > 0)
  .sort((a, b) => b.normalized.length - a.normalized.length)

/**
 * Replace profanity in a message with asterisks of the same length
 * as the matched portion of the original text.
 *
 * Works on the normalized form for detection but replaces in the
 * original text to preserve spacing and casing of non-profane parts.
 */
export function censorMessage(text: string): string {
  if (!text || text.trim().length === 0) return text

  // We work character-by-character: build a mapping from normalized
  // positions back to original positions, then mark which original
  // characters should be censored.

  // Step 1: Build position map. Each char in `normalized` maps to
  // the index of the original char it came from.
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // We need a more careful approach: process char by char, tracking
  // which original chars map to which normalized chars.

  const origChars = Array.from(lower)
  const normChars: string[] = []
  const normToOrig: number[] = [] // normChars[i] came from origChars[normToOrig[i]]

  for (let i = 0; i < origChars.length; i++) {
    const c = origChars[i]
    // Separators are stripped in normalization
    if (/[_\-.\s*'`~]/.test(c)) continue
    const mapped = LEET_MAP[c] ?? c
    if (mapped === '') continue // e.g. '*' maps to ''
    for (const mc of mapped) {
      normChars.push(mc)
      normToOrig.push(i)
    }
  }

  const normalized = normChars.join('')
  const censored = Array.from(text) // work on original chars
  const marked = new Array(text.length).fill(false)

  // Step 2: For exact-only words, split normalized into word boundaries
  // For substring words, scan the full normalized string
  // We need to map normalized positions back to original text positions.
  // Since lower may differ from text only in case, and normalize strips
  // separators, we build a second map from `lower` positions to `text` positions.

  // Map from `lower` index to `text` index (they should be 1:1 after NFD + accent strip,
  // but NFD can expand chars). Let's use a simpler approach:
  // just map normToOrig -> lower index -> text index.
  // Actually, since we did normalize('NFD') then stripped accents, the length can change.
  // Let's build a proper map from the original text.

  const textChars = Array.from(text)
  const lowerNFD = text.toLowerCase().normalize('NFD')
  const lowerNFDChars = Array.from(lowerNFD)

  // Map from lowerNFD index to original text char index
  // NFD decomposes e.g. 'é' -> 'e' + combining accent
  // We need to map each NFD char back to its source text char
  const nfdToText: number[] = []
  let textIdx = 0
  const textNFDExpanded: number[] = [] // for each text char, how many NFD chars it produces
  for (let ti = 0; ti < textChars.length; ti++) {
    const nfd = textChars[ti].toLowerCase().normalize('NFD')
    for (let j = 0; j < Array.from(nfd).length; j++) {
      nfdToText.push(ti)
    }
  }

  // After stripping accents from lowerNFD (removing combining marks), we get `lower`.
  // Build map from `lower` index to lowerNFD index
  const strippedToNFD: number[] = []
  for (let i = 0; i < lowerNFDChars.length; i++) {
    // Skip combining marks (they were stripped)
    if (/[\u0300-\u036f]/.test(lowerNFDChars[i])) continue
    strippedToNFD.push(i)
  }

  // Now normToOrig[i] points to an index in `origChars` (= stripped lower),
  // strippedToNFD maps that to lowerNFD index,
  // nfdToText maps that to original text index.
  function normIdxToTextIdx(ni: number): number {
    const strippedIdx = normToOrig[ni]
    if (strippedIdx === undefined) return 0
    const nfdIdx = strippedToNFD[strippedIdx]
    if (nfdIdx === undefined) return 0
    return nfdToText[nfdIdx] ?? 0
  }

  // Step 3: Find and mark profanity
  for (const { original, normalized: normWord } of ALL_BANNED) {
    if (EXACT_ONLY.has(original)) {
      // Word-boundary match: split normalized text on word boundaries
      // For chat messages, check if the normalized text contains the word
      // surrounded by non-alphanumeric chars or string boundaries
      const re = new RegExp(`(?:^|[^a-zа-яёа-я\\u0600-\\u06FF])${escapeRegex(normWord)}(?=$|[^a-zа-яё\\u0600-\\u06FF])`, 'g')
      let match
      while ((match = re.exec(normalized)) !== null) {
        // The match may start with a boundary char; find actual word start
        const offset = match[0].length - normWord.length
        const startNorm = match.index + offset
        for (let ni = startNorm; ni < startNorm + normWord.length; ni++) {
          const ti = normIdxToTextIdx(ni)
          marked[ti] = true
        }
      }
    } else {
      // Substring match
      let searchFrom = 0
      while (true) {
        const idx = normalized.indexOf(normWord, searchFrom)
        if (idx === -1) break
        for (let ni = idx; ni < idx + normWord.length; ni++) {
          const ti = normIdxToTextIdx(ni)
          marked[ti] = true
        }
        searchFrom = idx + 1
      }
    }
  }

  // Step 4: Replace marked characters with asterisks
  for (let i = 0; i < censored.length; i++) {
    if (marked[i] && !/\s/.test(censored[i])) {
      censored[i] = '*'
    }
  }

  return censored.join('')
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
