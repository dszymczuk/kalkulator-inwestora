import { describe, expect, it } from 'vitest';

import { calculate, type CalculatorInput } from './allocate';
import { buildChecklist } from './checklist';
import { contrastOnWhite, darkenForPrint } from '../utils/color';
import { ASSETS, ASSET_KEYS } from './assets';

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

describe('buildChecklist', () => {
  const checklist = buildChecklist(result, { year: 2026, dayOfMonth: 5 });

  it('tworzy pozycję dla każdego niezerowego kubełka w każdym miesiącu', () => {
    const activeKeys = ASSET_KEYS.filter((key) => result.byAsset[key] > 0);

    expect(checklist.months).toHaveLength(12);
    expect(checklist.itemCount).toBe(activeKeys.length * 12);
  });

  it('sumy miesięcy i roku zgadzają się z planem', () => {
    for (const month of checklist.months) {
      const sum = month.items.reduce((acc, item) => acc + item.amount, 0);
      expect(sum + month.unallocated).toBeCloseTo(month.total, 2);
    }

    expect(checklist.total).toBeCloseTo(result.budgetTotal, 2);
  });

  it('opisuje datę wpłaty razem z dniem tygodnia', () => {
    const styczen = checklist.months[0];

    expect(styczen.day).toBe(5);
    expect(styczen.dateLabel).toBe('5 stycznia 2026');
    // 5 stycznia 2026 to poniedziałek.
    expect(styczen.weekday).toBe('poniedziałek');
    expect(styczen.weekend).toBe(false);
    expect(styczen.shortened).toBe(false);
  });

  it('przesuwa wpłatę na ostatni dzień krótszego miesiąca', () => {
    const end = buildChecklist(result, { year: 2026, dayOfMonth: 31 });
    const luty = end.months[1];

    expect(luty.day).toBe(28);
    expect(luty.shortened).toBe(true);
    expect(end.shortenedMonths).toContain('Luty');
    expect(end.shortenedMonths).not.toContain('Styczeń');
    expect(end.months[0].shortened).toBe(false);
  });

  it('uwzględnia rok przestępny', () => {
    const leap = buildChecklist(result, { year: 2028, dayOfMonth: 31 });
    expect(leap.months[1].day).toBe(29);
  });

  it('wskazuje miesiące, w których wpłata wypada w weekend', () => {
    // 5 kwietnia 2026 to niedziela, 5 lipca 2026 — niedziela.
    expect(checklist.weekendMonths).toContain('Kwiecień');
    expect(checklist.weekendMonths).toContain('Lipiec');
    expect(checklist.weekendMonths).not.toContain('Styczeń');
  });

  it('udziały pozycji w miesiącu sumują się do 100%', () => {
    for (const month of checklist.months) {
      const sum = month.items.reduce((acc, item) => acc + item.share, 0);
      expect(sum).toBeCloseTo(100, 6);
    }
  });
});

describe('darkenForPrint', () => {
  it('przyciemnia każdy kolor palety do czytelnego kontrastu na białym papierze', () => {
    for (const key of ASSET_KEYS) {
      expect(contrastOnWhite(darkenForPrint(ASSETS[key].color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('nie rusza koloru, który już ma wystarczający kontrast', () => {
    expect(darkenForPrint('#000000')).toBe('#000000');
    expect(darkenForPrint('#1c5fa8')).toBe('#1c5fa8');
  });

  it('zachowuje odcień — kanał dominujący pozostaje dominujący', () => {
    // #c98500 jest bursztynowy: R > G > B i tak ma zostać.
    const darker = darkenForPrint('#c98500');
    const [r, g, b] = [darker.slice(1, 3), darker.slice(3, 5), darker.slice(5, 7)].map((part) =>
      Number.parseInt(part, 16),
    );

    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
  });
});
