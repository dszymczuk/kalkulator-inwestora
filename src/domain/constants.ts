/**
 * Limity wpłat na konta emerytalne.
 *
 * Limity są ogłaszane co roku przez Ministerstwo Rodziny, Pracy i Polityki Społecznej
 * i wyliczane jako wielokrotność prognozowanego przeciętnego wynagrodzenia miesięcznego
 * w gospodarce narodowej:
 *   IKE                      = 3,0 x prognozowane wynagrodzenie
 *   IKZE (umowa o pracę)     = 1,2 x prognozowane wynagrodzenie
 *   IKZE (działalność gosp.) = 1,8 x prognozowane wynagrodzenie
 *
 * Aktualizacja raz w roku sprowadza się do dopisania nowego wpisu do LIMITS_BY_YEAR
 * i podbicia CURRENT_YEAR.
 */

export type EmploymentType = 'employment' | 'business';

export interface YearlyLimits {
  /** Prognozowane przeciętne wynagrodzenie miesięczne w gospodarce narodowej (zł). */
  forecastAverageSalary: number;
  /** Limit rocznej wpłaty na IKE (zł). */
  ike: number;
  /** Limit rocznej wpłaty na IKZE dla osób zatrudnionych, np. na umowie o pracę (zł). */
  ikzeEmployment: number;
  /** Limit rocznej wpłaty na IKZE dla osób prowadzących pozarolniczą działalność gospodarczą (zł). */
  ikzeBusiness: number;
}

export const LIMITS_BY_YEAR: Record<number, YearlyLimits> = {
  2025: {
    forecastAverageSalary: 8673,
    ike: 26_019,
    ikzeEmployment: 10_407.6,
    ikzeBusiness: 15_611.4,
  },
  2026: {
    forecastAverageSalary: 9420,
    ike: 28_260,
    ikzeEmployment: 11_304,
    ikzeBusiness: 16_956,
  },
};

export const CURRENT_YEAR = 2026;

export const LIMITS = LIMITS_BY_YEAR[CURRENT_YEAR];

export function ikzeLimit(employmentType: EmploymentType, year = CURRENT_YEAR): number {
  const limits = LIMITS_BY_YEAR[year] ?? LIMITS;
  return employmentType === 'business' ? limits.ikzeBusiness : limits.ikzeEmployment;
}

export function ikeLimit(year = CURRENT_YEAR): number {
  return (LIMITS_BY_YEAR[year] ?? LIMITS).ike;
}

export const MONTHS_IN_YEAR = 12;

/** Domyślny dzień miesiąca proponowany przy eksporcie do kalendarza i wydruku. */
export const DEFAULT_PAYMENT_DAY = 5;

export const MONTH_NAMES = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
] as const;

/** Miejscownik — do zdań w rodzaju „cel domknięty w grudniu". */
export const MONTH_NAMES_LOCATIVE = [
  'styczniu',
  'lutym',
  'marcu',
  'kwietniu',
  'maju',
  'czerwcu',
  'lipcu',
  'sierpniu',
  'wrześniu',
  'październiku',
  'listopadzie',
  'grudniu',
] as const;

export const MONTH_NAMES_SHORT = [
  'Sty',
  'Lut',
  'Mar',
  'Kwi',
  'Maj',
  'Cze',
  'Lip',
  'Sie',
  'Wrz',
  'Paź',
  'Lis',
  'Gru',
] as const;
