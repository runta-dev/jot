export function userReference(text: string, request: string) {
  const ranges = [
    ...request.matchAll(/`[^`]*`|"[^"]*"|(?<!\w)'[^']*'(?!\w)/g),
  ].map((m) => [m.index!, m.index! + m[0].length]);
  const positions: number[] = [];
  let start = 0;
  while (true) {
    const i = request.indexOf(text, start);
    if (i < 0) break;
    positions.push(i);
    start = i + Math.max(1, text.length);
  }
  if (
    positions.length &&
    positions.some((i) => ranges.some(([a, b]) => i < b && i + text.length > a))
  )
    throw new Error("Quoted or ambiguous participant needs entity resolution");
  if (!positions.length && /\b(I|my|me|mine|myself)\b/.test(text))
    throw new Error("Non-exact span requires provenance");
  return text
    .replace(/\bI am\b/g, "you are")
    .replace(/\bI was\b/g, "you were")
    .replace(/\bI\b/g, "you")
    .replace(/\bmyself\b/gi, "yourself")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bme\b/gi, "you");
}
