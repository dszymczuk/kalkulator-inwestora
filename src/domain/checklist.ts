/**
 * Lista wpłat „do odhaczenia" na cały rok — dane pod wydruk / zapis do PDF.
 *
 * Każdy miesiąc dostaje konkretną datę wpłaty (wybrany dzień miesiąca, a w
 * krótszych miesiącach ostatni dzień) oraz pozycje z niezerową kwotą.
 */

import type { CalculationResult } from './allocate';
import { ASSETS, ASSET_KEYS, type AssetKey } from './assets';
import { resolveDayOfMonth } from './calendar';
import { MONTH_NAMES } from './constants';

export interface ChecklistOptions {
  /** Rok, dla którego powstaje lista. */
  year: number;
  /** Preferowany dzień miesiąca (1–31). Krótsze miesiące dostają swój ostatni dzień. */
  dayOfMonth: number;
}

export interface ChecklistItem {
  key: AssetKey;
  label: string;
  color: string;
  amount: number;
}

export interface ChecklistMonth {
  month: number;
  monthName: string;
  /** Dzień, w którym faktycznie wypada wpłata. */
  day: number;
  /** Wybrany dzień nie istnieje w tym miesiącu — wpłata przeszła na jego koniec. */
  shortened: boolean;
  /** Data w formie „5 stycznia 2026". */
  dateLabel: string;
  /** Nazwa dnia tygodnia, np. „poniedziałek". */
  weekday: string;
  /** Wpłata wypada w sobotę lub niedzielę — przelew zaksięguje się później. */
  weekend: boolean;
  items: ChecklistItem[];
  total: number;
  unallocated: number;
}

export interface Checklist {
  year: number;
  dayOfMonth: number;
  months: ChecklistMonth[];
  /** Suma wszystkich wpłat z listy. */
  total: number;
  /** Liczba pozycji do odhaczenia w całym roku. */
  itemCount: number;
  /** Miesiące, w których data została przesunięta na koniec miesiąca. */
  shortenedMonths: string[];
  /** Miesiące, w których wpłata wypada w weekend. */
  weekendMonths: string[];
}

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' });

export function buildChecklist(
  result: CalculationResult,
  options: ChecklistOptions,
): Checklist {
  const months: ChecklistMonth[] = result.months.map((plan) => {
    const day = resolveDayOfMonth(options.year, plan.month, options.dayOfMonth);
    const date = new Date(options.year, plan.month - 1, day);
    const weekdayIndex = date.getDay();

    const items: ChecklistItem[] = ASSET_KEYS.filter((key) => plan.byAsset[key] > 0).map((key) => ({
      key,
      label: ASSETS[key].label,
      color: ASSETS[key].color,
      amount: plan.byAsset[key],
    }));

    return {
      month: plan.month,
      monthName: MONTH_NAMES[plan.month - 1],
      day,
      shortened: day !== Math.min(Math.max(Math.trunc(options.dayOfMonth), 1), 31),
      dateLabel: dateFormatter.format(date),
      weekday: weekdayFormatter.format(date),
      weekend: weekdayIndex === 0 || weekdayIndex === 6,
      items,
      total: plan.total,
      unallocated: plan.unallocated,
    };
  });

  return {
    year: options.year,
    dayOfMonth: options.dayOfMonth,
    months,
    total: months.reduce((sum, month) => sum + month.total, 0),
    itemCount: months.reduce((sum, month) => sum + month.items.length, 0),
    shortenedMonths: months.filter((month) => month.shortened).map((month) => month.monthName),
    weekendMonths: months.filter((month) => month.weekend).map((month) => month.monthName),
  };
}
