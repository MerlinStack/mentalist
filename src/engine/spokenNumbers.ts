const ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

export function parseSpokenNumber(words: string): number | null {
  const cleaned = words
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .trim();
  if (!cleaned) return null;

  const tokens = cleaned.split(/\s+/);
  let total = 0;
  let current = 0;

  for (const token of tokens) {
    if (ONES[token] !== undefined) {
      current += ONES[token];
    } else if (TENS[token] !== undefined) {
      current += TENS[token];
    } else if (token === "hundred") {
      current *= 100;
    } else if (token === "thousand") {
      total += current * 1000;
      current = 0;
    } else {
      const hyphenIdx = token.indexOf("-");
      if (hyphenIdx > 0) {
        const first = TENS[token.slice(0, hyphenIdx)];
        const second = ONES[token.slice(hyphenIdx + 1)];
        if (first !== undefined && second !== undefined) {
          current += first + second;
        } else {
          return null;
        }
      } else {
        return null;
      }
    }
  }

  total += current;
  return total > 0 ? total : null;
}

export function replaceSpokenNumbers(text: string): string {
  const numberWords =
    "zero|one|two|three|four|five|six|seven|eight|nine|ten|" +
    "eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|" +
    "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand";

  const pattern = new RegExp(`(?:${numberWords})(?:[\\s-](?:${numberWords}))*`, "gi");

  let result = text;
  let match: RegExpExecArray | null;
  const regex = new RegExp(pattern.source, "gi");

  while ((match = regex.exec(result)) !== null) {
    const num = parseSpokenNumber(match[0]);
    if (num !== null) {
      result =
        result.slice(0, match.index) + String(num) + result.slice(match.index + match[0].length);
      regex.lastIndex = match.index + String(num).length;
    }
  }

  return result;
}
