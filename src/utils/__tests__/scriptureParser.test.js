import { describe, it, expect } from "vitest";
import {
  parseScriptureReference,
  normaliseBook,
  formatReference,
  isScriptureReference,
  parseReference,
} from "../scriptureParser";

describe("normaliseBook", () => {
  it("expands common abbreviations", () => {
    expect(normaliseBook("gen")).toBe("Genesis");
    expect(normaliseBook("exo")).toBe("Exodus");
    expect(normaliseBook("psa")).toBe("Psalms");
    expect(normaliseBook("mat")).toBe("Matthew");
    expect(normaliseBook("jhn")).toBe("John");
    expect(normaliseBook("rev")).toBe("Revelation");
  });

  it("expands numbered book abbreviations", () => {
    expect(normaliseBook("1co")).toBe("1 Corinthians");
    expect(normaliseBook("2co")).toBe("2 Corinthians");
    expect(normaliseBook("1sa")).toBe("1 Samuel");
    expect(normaliseBook("2ki")).toBe("2 Kings");
  });

  it("passes full names through", () => {
    expect(normaliseBook("Genesis")).toBe("Genesis");
    expect(normaliseBook("John")).toBe("John");
    expect(normaliseBook("Revelation")).toBe("Revelation");
  });

  it("handles case insensitivity", () => {
    expect(normaliseBook("GEN")).toBe("Genesis");
    expect(normaliseBook("Jhn")).toBe("John");
    expect(normaliseBook("Psa")).toBe("Psalms");
  });

  it("returns null for unknown books", () => {
    expect(normaliseBook("apocalypse")).toBeNull();
    expect(normaliseBook("gospels")).toBeNull();
    expect(normaliseBook("")).toBeNull();
  });
});

describe("parseScriptureReference", () => {
  it("parses standard Book Chapter:Verse", () => {
    const result = parseScriptureReference("John 3:16");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "John", chapter: 3, verse: 16 });
  });

  it("parses verse ranges", () => {
    const result = parseScriptureReference("Romans 8:28-30");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "Romans", chapter: 8, verse: 28, verseEnd: 30 });
  });

  it("parses em-dash ranges", () => {
    const result = parseScriptureReference("Romans 8:28–30");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "Romans", chapter: 8, verse: 28, verseEnd: 30 });
  });

  it('parses spoken format: "Book chapter N verse M"', () => {
    const result = parseScriptureReference("John chapter 3 verse 16");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "John", chapter: 3, verse: 16 });
  });

  it("parses spoken format with range", () => {
    const result = parseScriptureReference("Romans chapter 8 verses 28-30");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "Romans", chapter: 8, verse: 28, verseEnd: 30 });
  });

  it("parses Book Chapter only", () => {
    const result = parseScriptureReference("Psalm 23");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "Psalms", chapter: 23, verse: undefined });
  });

  it("parses numbered books correctly", () => {
    const result = parseScriptureReference("1 Corinthians 13:4");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ book: "1 Corinthians", chapter: 13, verse: 4 });
  });

  it("handles multiple references in text", () => {
    const result = parseScriptureReference("John 3:16 and Romans 8:28");
    expect(result).toHaveLength(2);
    expect(result[0].book).toBe("John");
    expect(result[1].book).toBe("Romans");
  });

  it("returns empty array for empty input", () => {
    expect(parseScriptureReference("")).toEqual([]);
    expect(parseScriptureReference(null)).toEqual([]);
    expect(parseScriptureReference(undefined)).toEqual([]);
  });

  it("returns empty array for text without refs", () => {
    expect(parseScriptureReference("Hello world")).toEqual([]);
  });
});

describe("formatReference", () => {
  it("formats standard reference", () => {
    expect(formatReference("John", 3, 16)).toBe("John 3:16");
  });

  it("formats reference with verse range", () => {
    expect(formatReference("Romans", 8, 28, 30)).toBe("Romans 8:28-30");
  });

  it("formats chapter-only reference", () => {
    expect(formatReference("Psalms", 23, undefined)).toBe("Psalms 23");
  });
});

describe("isScriptureReference", () => {
  it("returns true for valid references", () => {
    expect(isScriptureReference("John 3:16")).toBe(true);
    expect(isScriptureReference("Romans 8:28")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(isScriptureReference("Hello world")).toBe(false);
    expect(isScriptureReference("")).toBe(false);
  });
});

describe("parseReference (legacy)", () => {
  it("returns first match or null", () => {
    expect(parseReference("John 3:16")).toBeTruthy();
    expect(parseReference("Hello world")).toBeNull();
  });
});
