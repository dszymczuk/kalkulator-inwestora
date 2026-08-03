import { describe, expect, it } from 'vitest';

import { calculate, type CalculatorInput } from './allocate';
import { ASSET_KEYS } from './assets';
import {
  EVENT_DURATION_MINUTES,
  EVENT_INTERVAL_MINUTES,
  GENERATOR_NOTE,
  INCLUDE_GENERATOR_NOTE,
  buildCalendar,
  previewCalendar,
  resolveDayOfMonth,
} from './calendar';

const input: CalculatorInput = {
  monthlyAmount: 2000,
  employmentType: 'employment',
  useIke: true,
  useIkze: true,
  ikeAnnual: 6000,
  ikzeAnnual: 6000,
  weights: { ike: 0, ikze: 0, stocks: 10, etf: 50, bonds: 20, gold: 10, deposits: 5, crypto: 5 },
  strategy: 'proportional',
  neutralWrappers: true,
  roundTo100: false,
  roundingTarget: 'etf',
};

const result = calculate(input);
const options = { year: 2026, dayOfMonth: 5, hour: 18, minute: 0 };

/** Rozwija zawinięte linie (RFC 5545) z powrotem do pełnych wartości. */
function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, '').split('\r\n');
}

describe('resolveDayOfMonth', () => {
  it('skraca dzień do ostatniego dnia krótszego miesiąca', () => {
    expect(resolveDayOfMonth(2026, 2, 31)).toBe(28);
    expect(resolveDayOfMonth(2026, 4, 31)).toBe(30);
    expect(resolveDayOfMonth(2026, 1, 31)).toBe(31);
  });

  it('uwzględnia rok przestępny', () => {
    expect(resolveDayOfMonth(2028, 2, 30)).toBe(29);
  });

  it('przycina wartości spoza zakresu 1-31', () => {
    expect(resolveDayOfMonth(2026, 3, 0)).toBe(1);
    expect(resolveDayOfMonth(2026, 3, 99)).toBe(31);
  });
});

describe('buildCalendar', () => {
  const ics = buildCalendar(result, options, new Date(Date.UTC(2026, 7, 2, 10, 0, 0)));
  const lines = unfold(ics);

  it('generuje poprawną kopertę pliku', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines.at(-2)).toBe('END:VCALENDAR');
    expect(ics.endsWith('\r\n')).toBe(true);
  });

  it('tworzy jedno wydarzenie na każdy niezerowy kubełek w każdym miesiącu', () => {
    const activeKeys = ASSET_KEYS.filter((key) => result.byAsset[key] > 0);
    const eventCount = lines.filter((line) => line === 'BEGIN:VEVENT').length;

    expect(eventCount).toBe(activeKeys.length * 12);
    expect(previewCalendar(result, options).eventCount).toBe(eventCount);
  });

  it('rozstawia wydarzenia co 5 minut i nadaje im 5 minut długości', () => {
    const january = lines
      .filter((line) => line.startsWith('DTSTART:20260105'))
      .map((line) => line.replace('DTSTART:', ''));

    expect(january[0]).toBe('20260105T180000');
    expect(january[1]).toBe('20260105T180500');
    expect(january[2]).toBe('20260105T181000');

    const first = lines.indexOf('DTSTART:20260105T180000');
    expect(lines[first + 1]).toBe('DTEND:20260105T180500');

    expect(EVENT_INTERVAL_MINUTES).toBe(5);
    expect(EVENT_DURATION_MINUTES).toBe(5);
  });

  it('przenosi wpłatę na ostatni dzień miesiąca, gdy wybrany dzień nie istnieje', () => {
    const ics31 = buildCalendar(result, { ...options, dayOfMonth: 31 });
    const starts = unfold(ics31).filter((line) => line.startsWith('DTSTART:'));

    expect(starts.some((line) => line.startsWith('DTSTART:20260228'))).toBe(true);
    expect(starts.some((line) => line.startsWith('DTSTART:20260430'))).toBe(true);
    expect(starts.some((line) => line.startsWith('DTSTART:20260131'))).toBe(true);

    const preview = previewCalendar(result, { ...options, dayOfMonth: 31 });
    expect(preview.shortenedMonths).toContain('Luty');
    expect(preview.shortenedMonths).not.toContain('Styczeń');
  });

  it('zawsze pokrywa pełne 12 miesięcy, niezależnie od bieżącej daty', () => {
    // Plik generowany w sierpniu ma zawierać także miesiące styczeń–lipiec,
    // żeby zgadzał się z tabelą planu.
    const inAugust = unfold(buildCalendar(result, options, new Date(Date.UTC(2026, 7, 2))));
    const inDecember = unfold(buildCalendar(result, options, new Date(Date.UTC(2026, 11, 30))));

    const months = (lines: string[]) =>
      new Set(
        lines
          .filter((line) => line.startsWith('DTSTART:'))
          .map((line) => line.slice('DTSTART:2026'.length, 'DTSTART:2026'.length + 2)),
      );

    const expected = new Set(
      Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')),
    );

    expect(months(inAugust)).toEqual(expected);
    expect(months(inDecember)).toEqual(expected);
  });

  it('generuje wydarzenia w wybranym roku, uwzględniając rok przestępny', () => {
    const leap = unfold(buildCalendar(result, { ...options, year: 2028, dayOfMonth: 31 }));
    const starts = leap.filter((line) => line.startsWith('DTSTART:'));

    expect(starts.every((line) => line.startsWith('DTSTART:2028'))).toBe(true);
    expect(starts.some((line) => line.startsWith('DTSTART:20280229'))).toBe(true);
    expect(starts.some((line) => line.startsWith('DTSTART:20280228'))).toBe(false);
    expect(leap).toContain('X-WR-CALNAME:Plan inwestycyjny 2028');
  });

  it('różnicuje UID-y między latami, żeby importy się nie nadpisywały', () => {
    const uids2026 = unfold(buildCalendar(result, options)).filter((line) => line.startsWith('UID:'));
    const uids2027 = unfold(buildCalendar(result, { ...options, year: 2027 })).filter((line) =>
      line.startsWith('UID:'),
    );

    expect(uids2026.some((uid) => uids2027.includes(uid))).toBe(false);
  });

  it('nadaje każdemu wydarzeniu unikalny, powtarzalny UID', () => {
    const uids = lines.filter((line) => line.startsWith('UID:'));
    expect(new Set(uids).size).toBe(uids.length);

    const again = unfold(buildCalendar(result, options)).filter((line) => line.startsWith('UID:'));
    expect(again).toEqual(uids);
  });

  it('zawija linie do 75 oktetów licząc bajty UTF-8', () => {
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('domyślnie stosuje ustawienie stałej INCLUDE_GENERATOR_NOTE', () => {
    const description = lines.find((line) => line.startsWith('DESCRIPTION:'));
    expect(description?.includes(GENERATOR_NOTE)).toBe(INCLUDE_GENERATOR_NOTE);
  });

  it('dopisuje stopkę, gdy INCLUDE_GENERATOR_NOTE jest włączone', () => {
    const withNote = unfold(buildCalendar(result, { ...options, includeGeneratorNote: true }));
    const description = withNote.find((line) => line.startsWith('DESCRIPTION:'));

    expect(description?.endsWith(`\\n${GENERATOR_NOTE}`)).toBe(true);
  });

  it('pomija stopkę wraz z pustą linią, gdy jest wyłączona', () => {
    const withoutNote = unfold(buildCalendar(result, { ...options, includeGeneratorNote: false }));
    const description = withoutNote.find((line) => line.startsWith('DESCRIPTION:'));

    expect(description).toBeDefined();
    expect(description).not.toContain('Kalkulatorze inwestora');
    // Bez stopki opis nie może kończyć się osieroconym łamaniem linii.
    expect(description?.endsWith('\\n')).toBe(false);
    expect(description).toMatch(/^DESCRIPTION:Kwota: .*Plan roczny dla tego kubełka: .*$/);

    // Reszta pliku zostaje nienaruszona.
    expect(withoutNote.filter((line) => line === 'BEGIN:VEVENT')).toHaveLength(
      lines.filter((line) => line === 'BEGIN:VEVENT').length,
    );
  });

  it('escapuje przecinki i łamie opis zgodnie z RFC 5545', () => {
    const description = lines.find((line) => line.startsWith('DESCRIPTION:'));
    expect(description).toBeDefined();
    // Kwoty w formacie pl-PL zawierają przecinek dziesiętny — musi być escapowany.
    expect(description).toContain('\\,');
    expect(description).toContain('\\n');
  });

  it('opisuje kubełek w tytule wydarzenia', () => {
    expect(lines.some((line) => line.startsWith('SUMMARY:IKE:'))).toBe(true);
    expect(lines.some((line) => line.startsWith('SUMMARY:IKZE:'))).toBe(true);
  });

  it('pomija kubełki bez wpłat w danym miesiącu', () => {
    const priority = calculate({ ...input, strategy: 'priority' });
    const styczen = unfold(buildCalendar(priority, options)).filter((line) =>
      line.startsWith('DTSTART:20260105'),
    );

    // W trybie priorytetowym styczeń to wyłącznie wpłata na IKZE.
    expect(styczen).toHaveLength(1);
  });

  it('podaje godzinę zakończenia ostatniego wydarzenia', () => {
    // 8 kubełków => start 18:00, ostatni start 18:35, koniec 18:40.
    expect(previewCalendar(result, options).lastEventEnd).toBe('18:40');
  });
});
