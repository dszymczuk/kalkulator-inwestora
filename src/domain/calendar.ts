/**
 * Generator pliku iCalendar (.ics) z planem wpłat — do zaimportowania
 * w Kalendarzu Google (Ustawienia → Importuj i eksportuj → Importuj).
 *
 * Dla każdego miesiąca powstaje osobne wydarzenie na każdy kubełek z niezerową
 * kwotą. Wydarzenia idą jedno po drugim w odstępie 5 minut i każde trwa 5 minut.
 */

import type { CalculationResult } from './allocate';
import { ASSETS, ASSET_KEYS } from './assets';
import { MONTH_NAMES } from './constants';
import { formatMoney, formatPercent } from '../utils/format';

/** Odstęp między kolejnymi wydarzeniami w danym miesiącu (minuty). */
export const EVENT_INTERVAL_MINUTES = 5;

/** Czas trwania pojedynczego wydarzenia (minuty). */
export const EVENT_DURATION_MINUTES = 5;

/**
 * Przełącznik stopki w opisie wydarzenia.
 * Ustaw na `false`, żeby GENERATOR_NOTE nie trafiała do pliku .ics.
 */
export const INCLUDE_GENERATOR_NOTE = true;

/** Stopka dopisywana na końcu opisu każdego wydarzenia. */
export const GENERATOR_NOTE = 'Wygenerowano w Kalkulatorze inwestora.';

export interface CalendarExportOptions {
  /** Rok, w którym mają powstać wydarzenia. */
  year: number;
  /** Preferowany dzień miesiąca (1–31). Krótsze miesiące dostają swój ostatni dzień. */
  dayOfMonth: number;
  /** Godzina pierwszego wydarzenia w miesiącu (0–23). */
  hour: number;
  /** Minuta pierwszego wydarzenia w miesiącu (0–59). */
  minute: number;
  /** Nadpisuje INCLUDE_GENERATOR_NOTE dla pojedynczego wywołania. */
  includeGeneratorNote?: boolean;
}

const CRLF = '\r\n';
const encoder = new TextEncoder();

/** Liczba dni w miesiącu (month liczony od 1). */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Dzień, w którym faktycznie wypadnie wpłata — skrócony do końca miesiąca. */
export function resolveDayOfMonth(year: number, month: number, preferredDay: number): number {
  const clamped = Math.min(Math.max(Math.trunc(preferredDay), 1), 31);
  return Math.min(clamped, daysInMonth(year, month));
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0');
}

/** Data lokalna „pływająca" (bez strefy) — kalendarz pokaże ją o wskazanej godzinie. */
function formatLocal(date: Date): string {
  return (
    `${pad(date.getFullYear(), 4)}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

function formatUtc(date: Date): string {
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** Escapowanie wartości tekstowych wg RFC 5545. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Zawijanie linii do 75 oktetów (RFC 5545). Liczymy bajty UTF-8, a nie znaki,
 * bo polskie znaki diakrytyczne zajmują po dwa bajty.
 */
function foldLine(line: string): string {
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentBytes + size > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
      limit = 74; // kolejne linie zaczynają się od spacji, która też liczy się do limitu
    }
    current += char;
    currentBytes += size;
  }
  parts.push(current);

  return parts.join(`${CRLF} `);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export interface CalendarPreview {
  /** Łączna liczba wydarzeń w pliku. */
  eventCount: number;
  /** Miesiące, w których preferowany dzień został skrócony do końca miesiąca. */
  shortenedMonths: string[];
  /** Godzina zakończenia ostatniego wydarzenia w najdłuższym miesiącu (np. „19:40"). */
  lastEventEnd: string | null;
}

function activeKeysForMonth(byAsset: Record<string, number>) {
  return ASSET_KEYS.filter((key) => byAsset[key] > 0);
}

/** Podsumowanie tego, co znajdzie się w pliku — do pokazania przed pobraniem. */
export function previewCalendar(
  result: CalculationResult,
  options: CalendarExportOptions,
): CalendarPreview {
  let eventCount = 0;
  let maxPerMonth = 0;
  const shortenedMonths: string[] = [];

  for (const plan of result.months) {
    const count = activeKeysForMonth(plan.byAsset).length;
    eventCount += count;
    maxPerMonth = Math.max(maxPerMonth, count);

    if (resolveDayOfMonth(options.year, plan.month, options.dayOfMonth) !== options.dayOfMonth) {
      shortenedMonths.push(MONTH_NAMES[plan.month - 1]);
    }
  }

  let lastEventEnd: string | null = null;
  if (maxPerMonth > 0) {
    const start = new Date(options.year, 0, 1, options.hour, options.minute, 0);
    const end = addMinutes(
      start,
      (maxPerMonth - 1) * EVENT_INTERVAL_MINUTES + EVENT_DURATION_MINUTES,
    );
    lastEventEnd = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  }

  return { eventCount, shortenedMonths, lastEventEnd };
}

export function buildCalendar(
  result: CalculationResult,
  options: CalendarExportOptions,
  now: Date = new Date(),
): string {
  const stamp = formatUtc(now);
  const includeNote = options.includeGeneratorNote ?? INCLUDE_GENERATOR_NOTE;
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kalkulator inwestora//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`Plan inwestycyjny ${options.year}`)}`,
  ];

  for (const plan of result.months) {
    const day = resolveDayOfMonth(options.year, plan.month, options.dayOfMonth);
    const monthStart = new Date(options.year, plan.month - 1, day, options.hour, options.minute, 0);

    activeKeysForMonth(plan.byAsset).forEach((key, index) => {
      const amount = plan.byAsset[key];
      const start = addMinutes(monthStart, index * EVENT_INTERVAL_MINUTES);
      const end = addMinutes(start, EVENT_DURATION_MINUTES);
      const share = plan.total > 0 ? (amount / plan.total) * 100 : 0;

      const description = [
        `Kwota: ${formatMoney(amount)}`,
        `Udział w miesiącu: ${formatPercent(share)}`,
        `Plan roczny dla tego kubełka: ${formatMoney(result.byAsset[key])}`,
        ...(includeNote ? ['', GENERATOR_NOTE] : []),
      ].join('\n');

      lines.push(
        'BEGIN:VEVENT',
        // Deterministyczny UID: ponowny import aktualizuje wydarzenie zamiast je dublować.
        `UID:${options.year}-${pad(plan.month)}-${key}@kalkulator-inwestora`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatLocal(start)}`,
        `DTEND:${formatLocal(end)}`,
        `SUMMARY:${escapeText(`${ASSETS[key].label}: ${formatMoney(amount)}`)}`,
        `DESCRIPTION:${escapeText(description)}`,
        `CATEGORIES:${escapeText('Inwestycje')}`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      );
    });
  }

  lines.push('END:VCALENDAR');

  return `${lines.map(foldLine).join(CRLF)}${CRLF}`;
}

export function calendarFileName(year: number): string {
  return `plan-inwestycyjny-${year}.ics`;
}
