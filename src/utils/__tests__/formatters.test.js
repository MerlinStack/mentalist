import { describe, it, expect } from "vitest";
import { truncate, highlightMatches, timeAgo, groupByBook } from "../formatters";

describe("truncate", () => {
  it("returns text as-is when under max length", () => {
    expect(truncate("short", 100)).toBe("short");
  });

  it("truncates text exceeding max length", () => {
    const long = "a".repeat(200);
    const result = truncate(long, 100);
    expect(result).toHaveLength(103);
    expect(result.endsWith("...")).toBe(true);
  });

  it("handles null/empty input", () => {
    expect(truncate(null)).toBeNull();
    expect(truncate("")).toBe("");
  });
});

describe("highlightMatches", () => {
  it("wraps matching words in mark tags", () => {
    const result = highlightMatches("For God so loved the world", "loved");
    expect(result).toContain("<mark");
    expect(result).toContain(">loved</mark>");
  });

  it("returns original text when no query", () => {
    expect(highlightMatches("Hello", "")).toBe("Hello");
    expect(highlightMatches("Hello", null)).toBe("Hello");
  });

  it("is case insensitive", () => {
    const result = highlightMatches("For God so LOVED the world", "loved");
    expect(result.toLowerCase()).toContain("loved");
  });
});

describe("timeAgo", () => {
  it('returns "just now" for recent dates', () => {
    expect(timeAgo(new Date())).toBe("just now");
  });

  it('returns "Xm ago" for minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it('returns "Xh ago" for hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHoursAgo)).toBe("3h ago");
  });

  it('returns "Xd ago" for days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo)).toBe("2d ago");
  });
});

describe("groupByBook", () => {
  it("groups verses by book name", () => {
    const verses = [
      { book: "John", ref: "John 3:16" },
      { book: "John", ref: "John 1:1" },
      { book: "Romans", ref: "Romans 8:28" },
    ];
    const grouped = groupByBook(verses);
    expect(grouped.John).toHaveLength(2);
    expect(grouped.Romans).toHaveLength(1);
  });

  it("handles empty input", () => {
    expect(groupByBook([])).toEqual({});
  });
});
