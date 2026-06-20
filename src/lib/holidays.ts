/**
 * Festivos nacionales de España para un año dado.
 * Incluye el Viernes Santo (móvil, calculado a partir de la Pascua).
 * Los festivos autonómicos y locales se añaden manualmente en el calendario.
 */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=marzo, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

export type NationalHoliday = { date: string; name: string };

export function nationalHolidays(year: number): NationalHoliday[] {
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);

  return [
    { date: `${year}-01-01`, name: "Año Nuevo" },
    { date: `${year}-01-06`, name: "Epifanía del Señor (Reyes)" },
    { date: toDateStr(goodFriday), name: "Viernes Santo" },
    { date: `${year}-05-01`, name: "Fiesta del Trabajo" },
    { date: `${year}-08-15`, name: "Asunción de la Virgen" },
    { date: `${year}-10-12`, name: "Fiesta Nacional de España" },
    { date: `${year}-11-01`, name: "Todos los Santos" },
    { date: `${year}-12-06`, name: "Día de la Constitución" },
    { date: `${year}-12-08`, name: "Inmaculada Concepción" },
    { date: `${year}-12-25`, name: "Navidad" },
  ];
}
