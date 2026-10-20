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

/** Parses user input ("194.29", "194,29", "S/ 1,200.00"). Returns null when invalid or negative. */
export function parseMoney(input: string): Cents | null {
  let t = input.trim().replace(/^S\/\s*/i, "");
  if (t === "") return 0;
  if (t.includes(",") && !t.includes(".")) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(t)) return null;
  const [i, d = ""] = t.split(".");
  return parseInt(i, 10) * 100 + parseInt((d + "00").slice(0, 2), 10);
}

export function toInput(c: Cents): string {
  return c === 0 ? "" : (c / 100).toFixed(2);
}
