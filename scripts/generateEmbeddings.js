import { pipeline } from "@huggingface/transformers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIBLE_DIR = path.resolve(__dirname, "../public/bible");
const VERSES_PATH = path.resolve(BIBLE_DIR, "verses.json");
const OUTPUT_PATH = path.resolve(BIBLE_DIR, "embeddings.json");
const KJV_SOURCE =
  "https://raw.githubusercontent.com/thiagobodruk/bible-json/master/bibles/en/kjv.json";

function formatBookName(raw) {
  const map = {
    "1 Sam": "1 Samuel",
    "2 Sam": "2 Samuel",
    "1 Kings": "1 Kings",
    "2 Kings": "2 Kings",
    "1 Chron": "1 Chronicles",
    "2 Chron": "2 Chronicles",
    "1 Chr": "1 Chronicles",
    "2 Chr": "2 Chronicles",
    "1 Esdras": "1 Esdras",
    "2 Esdras": "2 Esdras",
    "1 Macc": "1 Maccabees",
    "2 Macc": "2 Maccabees",
    "Song of Sol": "Song of Solomon",
  };
  return map[raw] || raw;
}

async function downloadVerses() {
  console.log(`Downloading KJV from ${KJV_SOURCE}...`);
  const res = await fetch(KJV_SOURCE);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const raw = await res.json();
  const verses = raw.map((v, i) => ({
    id: i + 1,
    book: formatBookName(v.book_name || v.book),
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.trim(),
  }));
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
