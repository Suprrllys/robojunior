/**
 * Username profanity filter for EN, RU, AR.
 * Sources: google-profanity-words, dsojevic/profanity-list, LDNOOBW, uxbertlabs/arabic_bad_dirty_word_filter_list
 * Checks against banned words/patterns. Returns true if the username is clean.
 */

// =============================================
// ENGLISH — comprehensive list from multiple sources
// =============================================
const BANNED_EN = [
  // --- Exact match only (short, could appear in normal words) ---
  // handled via EXACT_ONLY set below
  'ass', 'cum', 'fag', 'gai', 'nig', 'tit', 'wtf', 'hoe', 'ho',

  // --- Substring match (profanity, slurs, sexual, violence, hate) ---
  // Core profanity
  'fuck', 'shit', 'dick', 'cock', 'pussy', 'bitch', 'whore', 'slut',
  'cunt', 'bastard', 'damn', 'piss', 'crap', 'wank', 'wanker', 'tosser',
  'bollocks', 'bugger', 'bloody', 'arse', 'arsehole', 'asshole', 'shithead',
  'fuckhead', 'fuckwit', 'fuckwad', 'fucktard', 'bullshit', 'horseshit',
  'dogshit', 'apeshit', 'dipshit', 'batshit',

  // Slurs — racial/ethnic
  'nigger', 'nigga', 'nignog', 'chink', 'chinky', 'gook', 'gookie',
  'spic', 'spick', 'wetback', 'beaner', 'greaseball', 'kike', 'hymie',
  'towelhead', 'raghead', 'camel jockey', 'sandnigger', 'darkie', 'darkey',
  'coon', 'jigaboo', 'spearchucker', 'wog', 'paki', 'pikey',
  'honky', 'honkey', 'cracker', 'wigger', 'wigga', 'kraut',
  'zipperhead', 'golliwog', 'gollywog', 'chinaman',

  // Slurs — LGBTQ+
  'faggot', 'fagot', 'dyke', 'tranny', 'trannie', 'shemale',
  'ladyboy', 'battyboy', 'battyboi', 'pansy', 'lesbo', 'lezzie',
  'sodomite', 'sodomist', 'homo',

  // Sexual
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

  // Pedophilia / abuse
  'pedophil', 'paedophil', 'pedobear', 'paedobear',
  'molest', 'rape', 'raping', 'rapist', 'incest',
  'necrophil', 'zoophil', 'bestiality',

  // Violence / hate
  'nazi', 'neonazi', 'hitler', 'swastika', 'svastika',
  'genocide', 'terrorist', 'terrorism', 'suicide', 'murder',
  'killer', 'lynch',

  // Disability slurs
  'retard', 'retarded', 'spastic', 'cripple',

  // Drug references (optional, but good for children's game)
  'cocaine', 'heroin', 'meth',
]

// =============================================
// RUSSIAN — cyrillic + transliteration
// Sources: LDNOOBW/ru, manual additions
// =============================================
const BANNED_RU = [
  // Core roots (substring match catches all forms)
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
  'петух',  // prison slang insult
  'опущен', // prison slang insult

  // Common misspellings & obfuscation in cyrillic
  'хyй', 'пиzда', 'бляtь',

  // Hate speech in Russian
  'нигер', 'фашист', 'нацист', 'гитлер',
  'хохол', // ethnic slur
  'чурк', 'чурбан', 'черножоп',
  'жид',
  'хач',
  'даун', // disability slur in Russian context

  // Transliterated Russian (Latin letters)
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
  'bychara',
  'ebalnik',
  'chernozhop',
  'churka',
]

// =============================================
// ARABIC — from LDNOOBW/ar + uxbertlabs
// =============================================
const BANNED_AR = [
  // Sexual
  'سكس', 'طيز', 'شرج', 'لعق', 'لحس', 'مص', 'تمص',
  'بيضان', 'ثدي', 'بز', 'بزاز', 'حلمة', 'مفلقسة',
  'بظر', 'كس', 'فرج', 'شهوة', 'جماع', 'قضيب', 'زب', 'زبي',
  'لوطي', 'لواط', 'سحاق', 'سحاقية', 'اغتصاب', 'خنثي',
  'احتلام', 'نيك', 'متناك', 'متناكة',

  // Insults
  'شرموط', 'شرموطة', 'عرص', 'خول', 'قحبة', 'لبوة',
  'عاهر', 'عاهرة', 'زاني', 'زانية',
  'كلب', 'حمار', 'غبي', 'أحمق', 'جحش', 'خنزير',
  'منيك', 'ابن الكلب', 'يلعن', 'لعنة',
  'ديوث', 'معرص', 'منيوك', 'طحن',
  'كسمك', 'كسام', 'كساخت',
  'شاذ', 'مبادل',

  // Additional dialect insults
  'واطي', 'ساقط', 'وسخ', 'قذر',
  'تفو', 'يخرب', 'يلعن',
]

// Words that are exact-match only (too short, could be part of normal words)
const EXACT_ONLY = new Set([
  'ass', 'cum', 'fag', 'gai', 'nig', 'tit', 'wtf', 'hoe', 'ho',
  'damn', 'anal', 'homo',
  'лох', 'чмо', 'жид', 'хач',
  'كلب', 'بز', 'كس', 'زب',
])

// Common leet-speak substitutions
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
      .replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/[_\-.\s*'`~]/g, '')   // strip separators and quotes
  )
}

/**
 * Check if a username contains profanity.
 * Returns the banned word found, or null if clean.
 */
export function findProfanity(username: string): string | null {
  const norm = normalize(username)
  if (!norm || norm.length < 2) return null

  const allBanned = [...BANNED_EN, ...BANNED_RU, ...BANNED_AR]

  for (const word of allBanned) {
    const normWord = normalize(word)
    if (!normWord) continue
    if (EXACT_ONLY.has(word)) {
      if (norm === normWord) return word
    } else {
      if (norm.includes(normWord)) return word
    }
  }

  return null
}

/**
 * Returns true if the username is appropriate.
 */
export function isUsernameClean(username: string): boolean {
  return findProfanity(username) === null
}
