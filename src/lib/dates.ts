/** Dates are plain "YYYY-MM-DD" strings in America/Lima. Arithmetic is done in UTC to avoid DST/TZ drift. */
export type ISODate = string;

export function todayLima(): ISODate {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
}

function toUTC(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fromUTC(dt: Date): ISODate {
  return dt.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const dt = toUTC(d);
  dt.setUTCDate(dt.getUTCDate() + n);
  return fromUTC(dt);
}

/** Weeks run Monday → Sunday. */
export function weekStart(d: ISODate): ISODate {
  const dow = (toUTC(d).getUTCDay() + 6) % 7;
  return addDays(d, -dow);
}

export function weekDays(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const fmtOpts = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", ...o });

export function formatLong(d: ISODate): string {
  return fmtOpts({ weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(toUTC(d))
    .replace(",", "");
}

export function formatShort(d: ISODate): string {
  return fmtOpts({ weekday: "short", day: "numeric", month: "short" }).format(toUTC(d)).replace(/\./g, "").replace(",", "");
}

export function dayName(d: ISODate): string {
  const s = fmtOpts({ weekday: "long" }).format(toUTC(d));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function dayNum(d: ISODate): string {
  return String(toUTC(d).getUTCDate());
}

export function formatWeekRange(start: ISODate): string {
  const end = addDays(start, 6);
  const a = fmtOpts({ day: "numeric", month: "short" }).format(toUTC(start)).replace(".", "");
  const b = fmtOpts({ day: "numeric", month: "short", year: "numeric" }).format(toUTC(end)).replace(".", "");
  return `${a} – ${b}`;
}

export function toLocalDate(d: ISODate): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function fromLocalDate(dt: Date): ISODate {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
