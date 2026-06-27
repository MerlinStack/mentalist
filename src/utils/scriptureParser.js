/**
 * Regex-based Scripture reference parser.
 * Detects common formats and normalises them for API calls.
 */

const BOOK_ALIASES = {
  gen: "Genesis",
  genesis: "Genesis",
  gn: "Genesis",
  exo: "Exodus",
  exodus: "Exodus",
  ex: "Exodus",
  lev: "Leviticus",
  leviticus: "Leviticus",
  lv: "Leviticus",
  num: "Numbers",
  numbers: "Numbers",
  nm: "Numbers",
  nu: "Numbers",
  deu: "Deuteronomy",
  deuteronomy: "Deuteronomy",
  dt: "Deuteronomy",
  jos: "Joshua",
  joshua: "Joshua",
  josh: "Joshua",
  jdg: "Judges",
  judges: "Judges",
  judg: "Judges",
  jg: "Judges",
  rut: "Ruth",
  ruth: "Ruth",
  ru: "Ruth",
  "1sa": "1 Samuel",
  "1 samuel": "1 Samuel",
  "i samuel": "1 Samuel",
  "2sa": "2 Samuel",
  "2 samuel": "2 Samuel",
  "ii samuel": "2 Samuel",
  "1ki": "1 Kings",
  "1 kings": "1 Kings",
  "i kings": "1 Kings",
  "2ki": "2 Kings",
  "2 kings": "2 Kings",
  "ii kings": "2 Kings",
  "1ch": "1 Chronicles",
  "1 chronicles": "1 Chronicles",
  "i chronicles": "1 Chronicles",
  "2ch": "2 Chronicles",
  "2 chronicles": "2 Chronicles",
  "ii chronicles": "2 Chronicles",
  ezr: "Ezra",
  ezra: "Ezra",
  neh: "Nehemiah",
  nehemiah: "Nehemiah",
  est: "Esther",
  esther: "Esther",
  job: "Job",
  psa: "Psalms",
  psalm: "Psalms",
  psalms: "Psalms",
  ps: "Psalms",
  psl: "Psalms",
  pro: "Proverbs",
  proverbs: "Proverbs",
  prov: "Proverbs",
  pr: "Proverbs",
  ecc: "Ecclesiastes",
  ecclesiastes: "Ecclesiastes",
  eccl: "Ecclesiastes",
  sng: "Song of Solomon",
  "song of solomon": "Song of Solomon",
  song: "Song of Solomon",
  isa: "Isaiah",
  isaiah: "Isaiah",
  is: "Isaiah",
  jer: "Jeremiah",
  jeremiah: "Jeremiah",
  jr: "Jeremiah",
  jrm: "Jeremiah",
  lam: "Lamentations",
  lamentations: "Lamentations",
  la: "Lamentations",
  ezk: "Ezekiel",
  ezekiel: "Ezekiel",
  eze: "Ezekiel",
  ez: "Ezekiel",
  dan: "Daniel",
  daniel: "Daniel",
  dn: "Daniel",
  hos: "Hosea",
  hosea: "Hosea",
  ho: "Hosea",
  jol: "Joel",
  joel: "Joel",
  jl: "Joel",
  amo: "Amos",
  amos: "Amos",
  am: "Amos",
  oba: "Obadiah",
  obadiah: "Obadiah",
  ob: "Obadiah",
  jon: "Jonah",
  jonah: "Jonah",
  jnh: "Jonah",
  mic: "Micah",
  micah: "Micah",
  mc: "Micah",
  nam: "Nahum",
  nahum: "Nahum",
  na: "Nahum",
  hab: "Habakkuk",
  habakkuk: "Habakkuk",
  hb: "Habakkuk",
  zep: "Zephaniah",
  zephaniah: "Zephaniah",
  zeph: "Zephaniah",
  zp: "Zephaniah",
  hag: "Haggai",
  haggai: "Haggai",
  hg: "Haggai",
  zec: "Zechariah",
  zechariah: "Zechariah",
  zch: "Zechariah",
  zc: "Zechariah",
  mal: "Malachi",
  malachi: "Malachi",
  ml: "Malachi",
  mat: "Matthew",
  matthew: "Matthew",
  mt: "Matthew",
  mrk: "Mark",
  mark: "Mark",
  mk: "Mark",
  luk: "Luke",
  luke: "Luke",
  lk: "Luke",
  jhn: "John",
  john: "John",
  jn: "John",
  joh: "John",
  act: "Acts",
  acts: "Act",
  ac: "Acts",
  rom: "Romans",
  romans: "Romans",
  ro: "Romans",
  rm: "Romans",
  "1co": "1 Corinthians",
  "1 corinthians": "1 Corinthians",
  "i corinthians": "1 Corinthians",
  "2co": "2 Corinthians",
  "2 corinthians": "2 Corinthians",
  "ii corinthians": "2 Corinthians",
  gal: "Galatians",
  galatians: "Galatians",
  ga: "Galatians",
  eph: "Ephesians",
  ephesians: "Ephesians",
  ep: "Ephesians",
  php: "Philippians",
  philippians: "Philippians",
  phi: "Philippians",
  pp: "Philippians",
  col: "Colossians",
  colossians: "Colossians",
  co: "Colossians",
  "1th": "1 Thessalonians",
  "1 thessalonians": "1 Thessalonians",
  "i thessalonians": "1 Thessalonians",
  "2th": "2 Thessalonians",
  "2 thessalonians": "2 Thessalonians",
  "ii thessalonians": "2 Thessalonians",
  "1ti": "1 Timothy",
  "1 timothy": "1 Timothy",
  "i timothy": "1 Timothy",
  "2ti": "2 Timothy",
  "2 timothy": "2 Timothy",
  "ii timothy": "2 Timothy",
  tit: "Titus",
  titus: "Titus",
  tt: "Titus",
  phm: "Philemon",
  philemon: "Philemon",
  heb: "Hebrews",
  hebrews: "Hebrews",
  hb: "Hebrews",
  jam: "James",
  james: "James",
  jm: "James",
  "1pe": "1 Peter",
  "1 peter": "1 Peter",
  "i peter": "1 Peter",
  "2pe": "2 Peter",
  "2 peter": "2 Peter",
  "ii peter": "2 Peter",
  "1jn": "1 John",
  "1 john": "1 John",
  "i john": "1 John",
  "2jn": "2 John",
  "2 john": "2 John",
  "ii john": "2 John",
  "3jn": "3 John",
  "3 john": "3 John",
  "iii john": "3 John",
  jud: "Jude",
  jude: "Jude",
  rev: "Revelation",
  revelation: "Revelation",
  re: "Revelation",
};

export function normaliseBook(alias) {
  return BOOK_ALIASES[alias.trim().toLowerCase()] || null;
}

export function getCanonicalName(alias) {
  return normaliseBook(alias);
}

/**
 * Extract all scripture references from a text string.
 * Returns an array of { book, chapter, verse, verseEnd? } objects.
 *
 * Patterns matched:
 *   "John 3:16"             – Standard
 *   "1 Corinthians 13:4-7"  – Range
 *   "Romans 8 verse 28"     – Spoken "verse"
 *   "Genesis chapter 1 verse 1" – Spoken "chapter … verse"
 *   "Psalm 23"              – Book + chapter only (verse = 1)
 */
export function parseScriptureReference(text) {
  if (!text) return [];
  const results = [];
  const seen = new Set();
  const occupied = []; // [start, end) ranges already covered

  function isFree(from, to) {
    return !occupied.some(([s, e]) => from < e && to > s);
  }

  function addMatch(raw, from, to, book, chapter, verse, verseEnd) {
    if (!isFree(from, to)) return;
    occupied.push([from, to]);
    const ref = verseEnd
      ? `${book} ${chapter}:${verse}-${verseEnd}`
      : verse
        ? `${book} ${chapter}:${verse}`
        : `${book} ${chapter}`;
    if (!seen.has(ref)) {
      seen.add(ref);
      results.push({ raw, book, chapter, verse, verseEnd });
    }
  }

  // Pattern 1: "Book Chapter:Verse" or "Book Chapter:Verse-Verse" or "Book Chapter:Verse–Verse"
  const standardRe = /(\d{0,2}\s?[A-Za-z]+)\s+(\d+):(\d+)(?:\s*[-–]\s*(\d+))?/gi;
  let m;
  while ((m = standardRe.exec(text)) !== null) {
    const book = normaliseBook(m[1]);
    if (book) {
      addMatch(
        m[0],
        m.index,
        m.index + m[0].length,
        book,
        parseInt(m[2]),
        parseInt(m[3]),
        m[4] ? parseInt(m[4]) : undefined,
      );
    }
  }

  // Pattern 2: "Book chapter N verse M" or "Book chapter N verses M-M2"
  const spokenRe =
    /(\d{0,2}\s?[A-Za-z]+)\s+chapter\s+(\d+)\s+verse[s]?\s+(\d+)(?:\s*[-–]\s*(\d+))?/gi;
  while ((m = spokenRe.exec(text)) !== null) {
    const book = normaliseBook(m[1]);
    if (book) {
      addMatch(
        m[0],
        m.index,
        m.index + m[0].length,
        book,
        parseInt(m[2]),
        parseInt(m[3]),
        m[4] ? parseInt(m[4]) : undefined,
      );
    }
  }

  // Pattern 3: "Book N" (chapter-only — only when text doesn't contain a verse part)
  const chapRe = /(\d{0,2}\s?[A-Za-z]+)\s+(\d+)(?!\s*(?::\d+|chapter\s+\d+))/gi;
  while ((m = chapRe.exec(text)) !== null) {
    const book = normaliseBook(m[1]);
    if (book) {
      addMatch(m[0], m.index, m.index + m[0].length, book, parseInt(m[2]), undefined, undefined);
    }
  }

  return results;
}

export function isScriptureReference(text) {
  return parseScriptureReference(text).length > 0;
}

export function formatReference(book, chapter, verse, verseEnd) {
  return verseEnd
    ? `${book} ${chapter}:${verse}-${verseEnd}`
    : verse
      ? `${book} ${chapter}:${verse}`
      : `${book} ${chapter}`;
}

/**
 * Legacy single-reference parser (kept for backward compat).
 * Returns first match or null.
 */
export function parseReference(input) {
  if (!input) return null;
  const refs = parseScriptureReference(input);
  return refs.length > 0 ? refs[0] : null;
}
