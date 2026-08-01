/**
 * Silnik alokacji: zamienia ustawienia użytkownika na plan wpłat na 12 miesięcy.
 *
 * Wszystkie obliczenia prowadzone są na groszach (liczby całkowite), żeby suma
 * pozycji w każdym miesiącu zgadzała się co do grosza z zadeklarowanym budżetem.
 */

import {
  ASSET_KEYS,
  PLAIN_KEYS,
  emptyAllocation,
  type AssetKey,
} from './assets';
import { MONTHS_IN_YEAR, ikeLimit, ikzeLimit, type EmploymentType } from './constants';

export type Strategy = 'proportional' | 'priority';

export interface CalculatorInput {
  /** Kwota przeznaczana na oszczędzanie w każdym miesiącu (zł). */
  monthlyAmount: number;
  employmentType: EmploymentType;
  useIke: boolean;
  useIkze: boolean;
  /** Docelowa roczna wpłata na IKE (zł), z zakresu 0..limit. */
  ikeAnnual: number;
  /** Docelowa roczna wpłata na IKZE (zł), z zakresu 0..limit. */
  ikzeAnnual: number;
  /** Proporcje w punktach procentowych; wagi nie muszą sumować się do 100. */
  weights: Record<AssetKey, number>;
  strategy: Strategy;
  /** IKE/IKZE jako osobne, neutralne kubełki — nie wliczają się do proporcji. */
  neutralWrappers: boolean;
  roundTo100: boolean;
  /** Kubełek, do którego trafia końcówka powstała przy zaokrąglaniu. */
  roundingTarget: AssetKey;
}

export interface MonthPlan {
  /** Numer miesiąca 1..12. */
  month: number;
  byAsset: Record<AssetKey, number>;
  /** Suma faktycznie rozdysponowana w danym miesiącu (zł). */
  total: number;
  /** Kwota, której nie było gdzie ulokować — np. limity wyczerpane, brak innych proporcji (zł). */
  unallocated: number;
}

export interface AssetSummary {
  key: AssetKey;
  amount: number;
  /** Udział w faktycznie zainwestowanej kwocie rocznej (%). */
  actualShare: number;
  /** Udział wynikający z proporcji ustawionych przez użytkownika (%). */
  plannedShare: number;
  /** Różnica actualShare - plannedShare (pkt proc.). */
  drift: number;
}

export interface CalculationResult {
  months: MonthPlan[];
  byAsset: Record<AssetKey, number>;
  summary: AssetSummary[];
  /** Suma wpłat w roku (zł) — bez kwoty nierozdysponowanej. */
  investedTotal: number;
  /** Budżet roczny = kwota miesięczna x 12 (zł). */
  budgetTotal: number;
  unallocatedTotal: number;
  ike: { funded: number; target: number; limit: number; monthFilled: number | null };
  ikze: { funded: number; target: number; limit: number; monthFilled: number | null };
  warnings: string[];
}

const GR = 100;
const ROUND_STEP = 100 * GR; // 100 zł w groszach

const toGrosze = (zl: number): number => Math.round((Number.isFinite(zl) ? zl : 0) * GR);
const toZl = (gr: number): number => gr / GR;

/**
 * Dzieli kwotę proporcjonalnie do wag metodą największych reszt, dzięki czemu
 * suma części jest dokładnie równa kwocie wejściowej.
 */
function splitByWeights(amountGr: number, weights: Array<[AssetKey, number]>): Map<AssetKey, number> {
  const result = new Map<AssetKey, number>();
  const positive = weights.filter(([, weight]) => weight > 0);
  const totalWeight = positive.reduce((sum, [, weight]) => sum + weight, 0);

  if (amountGr <= 0 || totalWeight <= 0) return result;

  const remainders: Array<{ key: AssetKey; fraction: number }> = [];
  let assigned = 0;

  for (const [key, weight] of positive) {
    const exact = (amountGr * weight) / totalWeight;
    const base = Math.floor(exact);
    result.set(key, base);
    assigned += base;
    remainders.push({ key, fraction: exact - base });
  }

  remainders.sort((a, b) => b.fraction - a.fraction);
  let leftover = amountGr - assigned;
  for (let i = 0; leftover > 0 && i < remainders.length; i += 1, leftover -= 1) {
    const { key } = remainders[i % remainders.length];
    result.set(key, (result.get(key) ?? 0) + 1);
  }

  return result;
}

function activeWeights(
  input: CalculatorInput,
  keys: readonly AssetKey[],
): Array<[AssetKey, number]> {
  return keys
    .filter((key) => {
      if (key === 'ike') return input.useIke;
      if (key === 'ikze') return input.useIkze;
      return true;
    })
    .map((key) => [key, Math.max(0, input.weights[key] ?? 0)] as [AssetKey, number])
    .filter(([, weight]) => weight > 0);
}

/**
 * Zaokrągla pozycje miesiąca w dół do pełnych 100 zł, a powstałą końcówkę
 * przenosi w całości do wskazanego kubełka. Kubełek docelowy może w efekcie
 * mieć kwotę niebędącą wielokrotnością 100 zł — na tym polega "końcówka".
 *
 * `exempt` to kubełki wyłączone z zaokrąglania: wpłata domykająca roczny cel
 * IKE/IKZE musi trafić co do grosza, bo inaczej resztówka (np. 56 zł) byłaby
 * co miesiąc ścinana do zera i limit nigdy by się nie domknął.
 */
function applyRounding(
  monthAlloc: Map<AssetKey, number>,
  target: AssetKey,
  caps: Partial<Record<AssetKey, number>>,
  exempt: ReadonlySet<AssetKey>,
): Map<AssetKey, number> {
  const rounded = new Map<AssetKey, number>();
  let pot = 0;

  for (const [key, valueGr] of monthAlloc) {
    if (exempt.has(key)) {
      rounded.set(key, valueGr);
      continue;
    }
    const floored = Math.floor(valueGr / ROUND_STEP) * ROUND_STEP;
    rounded.set(key, floored);
    pot += valueGr - floored;
  }

  if (pot === 0) return rounded;

  // Kolejność odbiorców końcówki: wskazany kubełek, potem pozostałe wg wielkości
  // pozycji — żeby limit IKE/IKZE nie "zjadł" reszty na sztywno.
  const receivers: AssetKey[] = [
    target,
    ...[...monthAlloc.keys()]
      .filter((key) => key !== target)
      .sort((a, b) => (monthAlloc.get(b) ?? 0) - (monthAlloc.get(a) ?? 0)),
  ];

  for (const key of receivers) {
    if (pot <= 0) break;
    const current = rounded.get(key) ?? 0;
    const cap = caps[key];
    const room = cap === undefined ? pot : Math.max(0, cap - current);
    const give = Math.min(pot, room);
    if (give > 0) {
      rounded.set(key, current + give);
      pot -= give;
    }
  }

  return rounded;
}

export function calculate(input: CalculatorInput): CalculationResult {
  const warnings: string[] = [];

  const monthlyGr = toGrosze(input.monthlyAmount);
  const ikeLimitGr = toGrosze(ikeLimit());
  const ikzeLimitGr = toGrosze(ikzeLimit(input.employmentType));

  const ikeTargetGr = input.useIke ? Math.min(toGrosze(input.ikeAnnual), ikeLimitGr) : 0;
  const ikzeTargetGr = input.useIkze ? Math.min(toGrosze(input.ikzeAnnual), ikzeLimitGr) : 0;

  let ikeLeft = ikeTargetGr;
  let ikzeLeft = ikzeTargetGr;
  let ikeFilledMonth: number | null = null;
  let ikzeFilledMonth: number | null = null;

  // W trybie proporcjonalnym IKE/IKZE jako neutralne kubełki dostają równą
  // ratę 1/12 celu rocznego; reszta budżetu dzieli się wg proporcji.
  const plainWeights = activeWeights(input, PLAIN_KEYS);
  const allWeights = activeWeights(input, ASSET_KEYS);

  const wrappersInProportions = input.strategy === 'proportional' && !input.neutralWrappers;

  const months: MonthPlan[] = [];
  const totals = emptyAllocation();

  for (let month = 1; month <= MONTHS_IN_YEAR; month += 1) {
    let available = monthlyGr;
    const alloc = new Map<AssetKey, number>(ASSET_KEYS.map((key) => [key, 0]));

    const put = (key: AssetKey, amountGr: number) => {
      if (amountGr <= 0) return;
      alloc.set(key, (alloc.get(key) ?? 0) + amountGr);
    };

    if (wrappersInProportions) {
      // Proporcje obejmują IKE/IKZE, ale roczny cel działa jak sufit: nadwyżka
      // wraca do puli i jest dzielona między pozostałe kubełki.
      let pool = available;
      let candidates = allWeights.slice();
      const capped = new Set<AssetKey>();

      for (let guard = 0; guard < ASSET_KEYS.length + 1 && pool > 0 && candidates.length > 0; guard += 1) {
        const split = splitByWeights(pool, candidates);
        let overflow = 0;
        let cappedThisRound = false;

        for (const [key, valueGr] of split) {
          const left = key === 'ike' ? ikeLeft : key === 'ikze' ? ikzeLeft : null;
          if (left !== null && valueGr > left - (alloc.get(key) ?? 0)) {
            const room = Math.max(0, left - (alloc.get(key) ?? 0));
            put(key, room);
            overflow += valueGr - room;
            capped.add(key);
            cappedThisRound = true;
          } else {
            put(key, valueGr);
          }
        }

        pool = overflow;
        candidates = candidates.filter(([key]) => !capped.has(key));
        if (!cappedThisRound) break;
      }

      available = pool; // to, czego nie udało się rozdysponować
    } else {
      if (input.strategy === 'priority') {
        // Najpierw maksymalnie IKZE, potem IKE, dopiero reszta wg proporcji.
        const toIkze = Math.min(available, ikzeLeft);
        put('ikze', toIkze);
        available -= toIkze;

        const toIke = Math.min(available, ikeLeft);
        put('ike', toIke);
        available -= toIke;
      } else {
        // Równomiernie: 1/12 celu rocznego miesięcznie na każde konto.
        const ikzeRate = Math.min(Math.ceil(ikzeTargetGr / MONTHS_IN_YEAR), ikzeLeft);
        const toIkze = Math.min(available, ikzeRate);
        put('ikze', toIkze);
        available -= toIkze;

        const ikeRate = Math.min(Math.ceil(ikeTargetGr / MONTHS_IN_YEAR), ikeLeft);
        const toIke = Math.min(available, ikeRate);
        put('ike', toIke);
        available -= toIke;
      }

      const split = splitByWeights(available, plainWeights);
      for (const [key, valueGr] of split) put(key, valueGr);
      available -= [...split.values()].reduce((sum, value) => sum + value, 0);
    }

    let finalAlloc = alloc;
    if (input.roundTo100) {
      const caps: Partial<Record<AssetKey, number>> = {
        ike: ikeLeft,
        ikze: ikzeLeft,
      };
      // Wpłata, która domyka roczny cel konta, idzie co do grosza — bez niej
      // resztówka poniżej 100 zł nigdy by się nie zaksięgowała.
      const exempt = new Set<AssetKey>();
      if (ikzeLeft > 0 && (alloc.get('ikze') ?? 0) >= ikzeLeft) exempt.add('ikze');
      if (ikeLeft > 0 && (alloc.get('ike') ?? 0) >= ikeLeft) exempt.add('ike');

      const beforeSum = [...alloc.values()].reduce((sum, value) => sum + value, 0);
      finalAlloc = applyRounding(alloc, input.roundingTarget, caps, exempt);
      const afterSum = [...finalAlloc.values()].reduce((sum, value) => sum + value, 0);
      available += beforeSum - afterSum;
    }

    const byAsset = emptyAllocation();
    let monthTotal = 0;
    for (const [key, valueGr] of finalAlloc) {
      byAsset[key] = toZl(valueGr);
      totals[key] += valueGr;
      monthTotal += valueGr;
    }

    ikzeLeft -= finalAlloc.get('ikze') ?? 0;
    ikeLeft -= finalAlloc.get('ike') ?? 0;
    if (ikzeFilledMonth === null && ikzeTargetGr > 0 && ikzeLeft <= 0) ikzeFilledMonth = month;
    if (ikeFilledMonth === null && ikeTargetGr > 0 && ikeLeft <= 0) ikeFilledMonth = month;

    months.push({
      month,
      byAsset,
      total: toZl(monthTotal),
      unallocated: toZl(Math.max(0, available)),
    });
  }

  const investedGr = ASSET_KEYS.reduce((sum, key) => sum + totals[key], 0);
  const budgetGr = monthlyGr * MONTHS_IN_YEAR;
  const unallocatedGr = budgetGr - investedGr;

  // Deklarowane proporcje: baza zależy od tego, czy IKE/IKZE są w proporcjach.
  const plannedBase = wrappersInProportions ? allWeights : plainWeights;
  const plannedWeightSum = plannedBase.reduce((sum, [, weight]) => sum + weight, 0);
  const plannedShares = emptyAllocation();

  if (wrappersInProportions) {
    for (const [key, weight] of plannedBase) {
      plannedShares[key] = plannedWeightSum > 0 ? (weight / plannedWeightSum) * 100 : 0;
    }
  } else {
    // Neutralne kubełki: IKE/IKZE zjadają swoją część budżetu z góry,
    // reszta rozkłada się wg proporcji.
    const wrappersGr = ikeTargetGr + ikzeTargetGr;
    const restGr = Math.max(0, budgetGr - wrappersGr);
    plannedShares.ike = budgetGr > 0 ? (Math.min(ikeTargetGr, budgetGr) / budgetGr) * 100 : 0;
    plannedShares.ikze = budgetGr > 0 ? (Math.min(ikzeTargetGr, budgetGr) / budgetGr) * 100 : 0;
    for (const [key, weight] of plannedBase) {
      plannedShares[key] =
        plannedWeightSum > 0 && budgetGr > 0
          ? ((restGr * weight) / plannedWeightSum / budgetGr) * 100
          : 0;
    }
  }

  const summary: AssetSummary[] = ASSET_KEYS.map((key) => {
    const amount = toZl(totals[key]);
    const actualShare = investedGr > 0 ? (totals[key] / investedGr) * 100 : 0;
    const plannedShare = plannedShares[key];
    return { key, amount, actualShare, plannedShare, drift: actualShare - plannedShare };
  });

  if (unallocatedGr > 0) {
    warnings.push(
      'Część budżetu nie ma gdzie trafić — limity IKE/IKZE zostały wyczerpane, a pozostałe kubełki mają zerowe proporcje. Zwiększ proporcje poza kontami emerytalnymi.',
    );
  }
  if (input.useIke && ikeLeft > 0) {
    warnings.push(
      `Do wyczerpania celu na IKE brakuje ${toZl(ikeLeft).toFixed(2)} zł — budżet roczny nie pokrywa zadeklarowanej kwoty.`,
    );
  }
  if (input.useIkze && ikzeLeft > 0) {
    warnings.push(
      `Do wyczerpania celu na IKZE brakuje ${toZl(ikzeLeft).toFixed(2)} zł — budżet roczny nie pokrywa zadeklarowanej kwoty.`,
    );
  }

  return {
    months,
    byAsset: Object.fromEntries(ASSET_KEYS.map((key) => [key, toZl(totals[key])])) as Record<
      AssetKey,
      number
    >,
    summary,
    investedTotal: toZl(investedGr),
    budgetTotal: toZl(budgetGr),
    unallocatedTotal: toZl(Math.max(0, unallocatedGr)),
    ike: {
      funded: toZl(totals.ike),
      target: toZl(ikeTargetGr),
      limit: ikeLimit(),
      monthFilled: ikeFilledMonth,
    },
    ikze: {
      funded: toZl(totals.ikze),
      target: toZl(ikzeTargetGr),
      limit: ikzeLimit(input.employmentType),
      monthFilled: ikzeFilledMonth,
    },
    warnings,
  };
}
