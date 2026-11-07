/** All money is handled as integer céntimos to avoid floating point errors. */
export type Cents = number;

export function fmt(c: Cents): string {
  const neg = c < 0;
  const a = Math.abs(Math.round(c));
  const soles = Math.floor(a / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}S/ ${soles}.${String(a % 100).padStart(2, "0")}`;
}

/** Parses user input ("194.29", "194,29", "20.21", "22,35"). Returns null when invalid or negative. */
export function parseMoney(input: string): Cents | null {
  if (input === null || input === undefined) return 0;
  let t = String(input).trim().replace(/^S\/\s*/i, "");
  if (t === "") return 0;
  t = t.replace(",", ".");
  t = t.replace(/(?<=\d),(?=\d{3})/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t) && !/^\d+$/.test(t)) return null;
  const num = parseFloat(t);
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

export function toInput(c: Cents): string {
  return c === 0 ? "" : (c / 100).toFixed(2);
}
