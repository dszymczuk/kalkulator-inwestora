import { describe, expect, it } from 'vitest';

import { calculate, type CalculatorInput } from './allocate';
import { ASSET_KEYS } from './assets';
import { MONTHS_IN_YEAR, ikzeLimit } from './constants';

const base: CalculatorInput = {
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

const sumOfMonth = (byAsset: Record<string, number>) =>
  ASSET_KEYS.reduce((sum, key) => sum + byAsset[key], 0);

describe('calculate', () => {
  it('rozdziela dokładnie cały budżet w każdym miesiącu', () => {
    const result = calculate(base);
    expect(result.months).toHaveLength(MONTHS_IN_YEAR);
    for (const month of result.months) {
      expect(sumOfMonth(month.byAsset) + month.unallocated).toBeCloseTo(base.monthlyAmount, 2);
    }
    expect(result.investedTotal).toBeCloseTo(base.monthlyAmount * MONTHS_IN_YEAR, 2);
    expect(result.unallocatedTotal).toBeCloseTo(0, 2);
  });

  it('rozkłada cele IKE/IKZE równo na 12 rat w trybie proporcjonalnym', () => {
    const result = calculate(base);
    for (const month of result.months) {
      expect(month.byAsset.ike).toBeCloseTo(500, 2);
      expect(month.byAsset.ikze).toBeCloseTo(500, 2);
    }
    expect(result.ike.funded).toBeCloseTo(6000, 2);
    expect(result.ikze.funded).toBeCloseTo(6000, 2);
  });

  it('w trybie priorytetowym domyka najpierw IKZE, potem IKE', () => {
    const result = calculate({ ...base, strategy: 'priority' });

    // 6000 zł na IKZE przy 2000 zł/mies. => pełne miesiące 1-3.
    expect(result.months[0].byAsset.ikze).toBeCloseTo(2000, 2);
    expect(result.months[2].byAsset.ikze).toBeCloseTo(2000, 2);
    expect(result.months[0].byAsset.ike).toBeCloseTo(0, 2);

    // Następnie 6000 zł na IKE => miesiące 4-6.
    expect(result.months[3].byAsset.ike).toBeCloseTo(2000, 2);
    expect(result.months[5].byAsset.ike).toBeCloseTo(2000, 2);

    // Od 7. miesiąca tylko pozostałe kubełki.
    expect(result.months[6].byAsset.ike).toBeCloseTo(0, 2);
    expect(result.months[6].byAsset.etf).toBeCloseTo(1000, 2);

    expect(result.ikze.monthFilled).toBe(3);
    expect(result.ike.monthFilled).toBe(6);
    expect(result.ike.funded).toBeCloseTo(6000, 2);
    expect(result.ikze.funded).toBeCloseTo(6000, 2);
  });

  it('traktuje cel roczny jako sufit, gdy IKE/IKZE są w proporcjach', () => {
    const result = calculate({
      ...base,
      neutralWrappers: false,
      ikeAnnual: 1200,
      ikzeAnnual: 1200,
      weights: { ...base.weights, ike: 50, ikze: 50 },
    });

    expect(result.ike.funded).toBeCloseTo(1200, 2);
    expect(result.ikze.funded).toBeCloseTo(1200, 2);
    // Nadwyżka ponad sufit wraca do pozostałych kubełków — budżet zostaje wykorzystany.
    expect(result.investedTotal).toBeCloseTo(24_000, 2);
    expect(result.unallocatedTotal).toBeCloseTo(0, 2);
  });

  it('nie przekracza ustawowego limitu IKZE', () => {
    const limit = ikzeLimit('employment');
    const result = calculate({
      ...base,
      monthlyAmount: 5000,
      ikzeAnnual: limit + 10_000,
      strategy: 'priority',
    });
    expect(result.ikze.funded).toBeCloseTo(limit, 2);
  });

  it('uwzględnia wyższy limit IKZE dla działalności gospodarczej', () => {
    const employment = calculate({
      ...base,
      monthlyAmount: 5000,
      employmentType: 'employment',
      ikzeAnnual: 99_999,
      strategy: 'priority',
    });
    const business = calculate({
      ...base,
      monthlyAmount: 5000,
      employmentType: 'business',
      ikzeAnnual: 99_999,
      strategy: 'priority',
    });
    expect(business.ikze.funded).toBeGreaterThan(employment.ikze.funded);
    expect(business.ikze.funded).toBeCloseTo(ikzeLimit('business'), 2);
  });

  it('zaokrągla pozycje do pełnych 100 zł i przenosi końcówkę do wskazanego kubełka', () => {
    const result = calculate({ ...base, roundTo100: true, roundingTarget: 'deposits' });

    for (const month of result.months) {
      for (const key of ASSET_KEYS) {
        if (key === 'deposits') continue;
        expect(month.byAsset[key] % 100).toBeCloseTo(0, 6);
      }
      // Suma miesiąca nadal zgadza się z budżetem.
      expect(sumOfMonth(month.byAsset)).toBeCloseTo(base.monthlyAmount, 2);
    }
  });

  it('domyka limit konta co do grosza mimo zaokrąglania do 100 zł', () => {
    const limit = ikzeLimit('business'); // 16 956 zł — nie jest wielokrotnością 100
    const result = calculate({
      ...base,
      monthlyAmount: 3000,
      employmentType: 'business',
      ikzeAnnual: limit,
      ikeAnnual: 12_000,
      strategy: 'priority',
      roundTo100: true,
      roundingTarget: 'deposits',
    });

    expect(result.ikze.funded).toBeCloseTo(limit, 2);
    expect(result.ike.funded).toBeCloseTo(12_000, 2);
    expect(result.warnings).toHaveLength(0);

    // Po domknięciu kont resztówka nie może już zaburzać podziału proporcji:
    // 3000 zł przy wadze ETF 35/70 to równe 1500 zł.
    expect(result.months[10].byAsset.etf).toBeCloseTo(1500, 2);
  });

  it('sygnalizuje nierozdysponowaną kwotę, gdy nie ma dokąd jej skierować', () => {
    const result = calculate({
      ...base,
      weights: { ike: 0, ikze: 0, stocks: 0, etf: 0, bonds: 0, gold: 0, deposits: 0, crypto: 0 },
      ikeAnnual: 6000,
      ikzeAnnual: 6000,
    });

    expect(result.unallocatedTotal).toBeCloseTo(12_000, 2);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('sumuje udziały rzeczywiste do 100%', () => {
    const result = calculate(base);
    const total = result.summary.reduce((sum, row) => sum + row.actualShare, 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('działa bez kont emerytalnych', () => {
    const result = calculate({ ...base, useIke: false, useIkze: false });
    expect(result.ike.funded).toBe(0);
    expect(result.ikze.funded).toBe(0);
    expect(result.investedTotal).toBeCloseTo(24_000, 2);
  });

  it('radzi sobie z kwotą, która nie dzieli się równo na grosze', () => {
    const result = calculate({ ...base, monthlyAmount: 1000.01 });
    for (const month of result.months) {
      expect(sumOfMonth(month.byAsset) + month.unallocated).toBeCloseTo(1000.01, 2);
    }
  });
});
