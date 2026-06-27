import { useScriptureStore } from '../store/scriptureStore';
import { parseScriptureReference } from '../utils/scriptureParser';
import { fetchVerse } from '../api/bible';

export function useVerseDetector() {
  const setPreviewVerse = useScriptureStore((state) => state.setActiveVerse);

  const detectScripture = async (textChunk: string) => {
    if (!textChunk.trim()) return;

    const parsedReferences = parseScriptureReference(textChunk);

    if (parsedReferences && parsedReferences.length > 0) {
      try {
        const targetRef = parsedReferences[0];
        const refStr = targetRef.verseEnd
          ? `${targetRef.book} ${targetRef.chapter}:${targetRef.verse}-${targetRef.verseEnd}`
          : targetRef.verse
            ? `${targetRef.book} ${targetRef.chapter}:${targetRef.verse}`
            : `${targetRef.book} ${targetRef.chapter}`;
        const verseData = await fetchVerse(refStr, 'kjv');

        if (verseData) {
          setPreviewVerse({
            reference: verseData.reference,
            text: verseData.text,
            book: verseData.book,
            chapter: verseData.chapter,
            verse: verseData.verse,
            translation: 'KJV'
          });
        }
      } catch (err) {
        console.error("Automated verse retrieval failure:", err);
      }
    }
  };

  return { detectScripture };
}
