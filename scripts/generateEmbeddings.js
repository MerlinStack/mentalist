import { pipeline } from "@huggingface/transformers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIBLE_DIR = path.resolve(__dirname, "../public/bible");
const VERSES_PATH = path.resolve(BIBLE_DIR, "verses.json");
const OUTPUT_PATH = path.resolve(BIBLE_DIR, "embeddings.json");
const KJV_SOURCE = "https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json";

const ABBREV_TO_BOOK = {
  gn: "Genesis",
  ex: "Exodus",
  lv: "Leviticus",
  nm: "Numbers",
  dt: "Deuteronomy",
  js: "Joshua",
  jg: "Judges",
  rt: "Ruth",
  "1sm": "1 Samuel",
  "2sm": "2 Samuel",
  "1kg": "1 Kings",
  "2kg": "2 Kings",
  "1ch": "1 Chronicles",
  "2ch": "2 Chronicles",
  ez: "Ezra",
  nh: "Nehemiah",
  et: "Esther",
  jb: "Job",
  ps: "Psalms",
  pr: "Proverbs",
  ec: "Ecclesiastes",
  ss: "Song of Solomon",
  is: "Isaiah",
  jr: "Jeremiah",
  lm: "Lamentations",
  ek: "Ezekiel",
  dn: "Daniel",
  hs: "Hosea",
  jl: "Joel",
  am: "Amos",
  ob: "Obadiah",
  jh: "Jonah",
  mc: "Micah",
  na: "Nahum",
  hk: "Habakkuk",
  zp: "Zephaniah",
  hg: "Haggai",
  zc: "Zechariah",
  ml: "Malachi",
  mt: "Matthew",
  mk: "Mark",
  lk: "Luke",
  jn: "John",
  ac: "Acts",
  rm: "Romans",
  "1co": "1 Corinthians",
  "2co": "2 Corinthians",
  gl: "Galatians",
  ep: "Ephesians",
  pp: "Philippians",
  cl: "Colossians",
  "1ts": "1 Thessalonians",
  "2ts": "2 Thessalonians",
  "1tm": "1 Timothy",
  "2tm": "2 Timothy",
  tt: "Titus",
  pm: "Philemon",
  hb: "Hebrews",
  jm: "James",
  "1pt": "1 Peter",
  "2pt": "2 Peter",
  "1jn": "1 John",
  "2jn": "2 John",
  "3jn": "3 John",
  jd: "Jude",
  rv: "Revelation",
};

function formatBookName(raw) {
  return ABBREV_TO_BOOK[raw.toLowerCase()] || raw;
}

async function downloadVerses() {
  console.log(`Downloading KJV from ${KJV_SOURCE}...`);
  const res = await fetch(KJV_SOURCE);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const raw = await res.json();
  const verses = [];
  let id = 1;
  for (const book of raw) {
    const bookName = formatBookName(book.name || book.book_name || book.abbrev || "");
    if (book.chapters) {
      for (let c = 0; c < book.chapters.length; c++) {
        const chapter = book.chapters[c];
        for (let v = 0; v < chapter.length; v++) {
          verses.push({
            id: id++,
            book: bookName,
            chapter: c + 1,
            verse: v + 1,
            text: chapter[v].trim(),
          });
        }
      }
    }
  }
  console.log(`   Downloaded ${verses.length} verses`);
  return verses;
}

function toMins(ms) {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

async function generateEmbeddings() {
  let verses;
  if (fs.existsSync(VERSES_PATH)) {
    console.log("Loading existing verses.json...");
    verses = JSON.parse(fs.readFileSync(VERSES_PATH, "utf8"));
    console.log(`   Loaded ${verses.length} verses`);
  } else {
    verses = await downloadVerses();
    fs.mkdirSync(BIBLE_DIR, { recursive: true });
    fs.writeFileSync(VERSES_PATH, JSON.stringify(verses, null, 1));
    console.log(`   Saved to ${VERSES_PATH}`);
  }

  console.log("Loading MiniLM model...");
  const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
    quantized: true,
    progress_callback: (progress) => {
      if (progress.status === "progress") {
        const pct = ((progress.loaded / progress.total) * 100).toFixed(1);
        process.stdout.write(
          `\r   Downloading model: ${pct}% (${(progress.loaded / 1e6).toFixed(1)}MB / ${(progress.total / 1e6).toFixed(1)}MB)`,
        );
      }
      if (progress.status === "done") {
        process.stdout.write("\r   Model loaded                                    \n");
      }
    },
  });
  console.log("   Model loaded");

  console.log("Generating embeddings...");
  const embeddings = [];
  const batchSize = 50;
  const total = verses.length;
  const startTime = Date.now();

  for (let i = 0; i < total; i += batchSize) {
    const batch = verses.slice(i, i + batchSize);
    const texts = batch.map((v) => `${v.book} ${v.chapter}:${v.verse} ${v.text}`);
    const outputs = await Promise.all(
      texts.map((t) => extractor(t, { pooling: "mean", normalize: true })),
    );

    for (let j = 0; j < batch.length; j++) {
      embeddings.push({
        id: batch[j].id,
        book: batch[j].book,
        chapter: batch[j].chapter,
        verse: batch[j].verse,
        vector: Array.from(outputs[j].data),
      });
    }

    const progress = Math.min(i + batchSize, total);
    const elapsed = Date.now() - startTime;
    const rate = (progress / elapsed) * 1000;
    const remaining = rate > 0 ? ((total - progress) / rate) * 1000 : 0;
    const pct = ((progress / total) * 100).toFixed(1);
    const barLen = 30;
    const filled = Math.round((progress / total) * barLen);
    const bar = "\u2588".repeat(filled) + "\u2591".repeat(barLen - filled);
    process.stdout.write(
      `\r   ${bar} ${pct}% (${progress}/${total}) \u2022 ${toMins(elapsed)} elapsed \u2022 ~${toMins(remaining)} remaining`,
    );
  }

  process.stdout.write("\n");
  console.log("Saving embeddings...");
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(embeddings));
  console.log(`   Saved ${embeddings.length} embeddings to ${OUTPUT_PATH}`);
  console.log(`   Total time: ${toMins(Date.now() - startTime)}`);
  console.log("Done!");
}

generateEmbeddings().catch((err) => {
  console.error(err);
  process.exit(1);
});
