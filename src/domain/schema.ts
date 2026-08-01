import { z } from 'zod';

import { ASSET_KEYS, PLAIN_KEYS, type AssetKey } from './assets';
import { MONTHS_IN_YEAR, ikeLimit, ikzeLimit } from './constants';

const money = (label: string) =>
  z
    .number({ error: `${label}: podaj liczbę` })
    .refine((value) => Number.isFinite(value), { message: `${label}: podaj liczbę` });

const weightsShape = Object.fromEntries(
  ASSET_KEYS.map((key) => [
    key,
    z
      .number({ error: 'Podaj liczbę' })
      .min(0, 'Proporcja nie może być ujemna')
      .max(100, 'Proporcja nie może przekraczać 100%'),
  ]),
) as Record<AssetKey, z.ZodNumber>;

export const calculatorSchema = z
  .object({
    monthlyAmount: money('Kwota miesięczna').gt(0, 'Kwota musi być większa od 0'),
    employmentType: z.enum(['employment', 'business']),
    useIke: z.boolean(),
    useIkze: z.boolean(),
    ikeAnnual: money('IKE').min(0, 'Kwota nie może być ujemna'),
    ikzeAnnual: money('IKZE').min(0, 'Kwota nie może być ujemna'),
    weights: z.object(weightsShape),
    strategy: z.enum(['proportional', 'priority']),
    neutralWrappers: z.boolean(),
    roundTo100: z.boolean(),
    roundingTarget: z.enum(ASSET_KEYS),
  })
  .superRefine((data, ctx) => {
    if (data.useIke && data.ikeAnnual > ikeLimit()) {
      ctx.addIssue({
        code: 'custom',
        path: ['ikeAnnual'],
        message: `Limit wpłat na IKE w 2026 r. to ${ikeLimit().toLocaleString('pl-PL')} zł`,
      });
    }

    const ikzeMax = ikzeLimit(data.employmentType);
    if (data.useIkze && data.ikzeAnnual > ikzeMax) {
      ctx.addIssue({
        code: 'custom',
        path: ['ikzeAnnual'],
        message: `Limit wpłat na IKZE w 2026 r. to ${ikzeMax.toLocaleString('pl-PL')} zł`,
      });
    }

    const budget = data.monthlyAmount * MONTHS_IN_YEAR;
    const wrapperTarget = (data.useIke ? data.ikeAnnual : 0) + (data.useIkze ? data.ikzeAnnual : 0);

    if (wrapperTarget > budget + 0.005) {
      ctx.addIssue({
        code: 'custom',
        path: ['monthlyAmount'],
        message: `Roczny budżet (${budget.toLocaleString('pl-PL')} zł) nie pokryje wpłat na IKE i IKZE (${wrapperTarget.toLocaleString('pl-PL')} zł)`,
      });
    }

    const plainWeightSum = PLAIN_KEYS.reduce((sum, key) => sum + (data.weights[key] ?? 0), 0);
    const wrapperWeightSum =
      (data.useIke ? data.weights.ike : 0) + (data.useIkze ? data.weights.ikze : 0);
    const wrappersInProportions = data.strategy === 'proportional' && !data.neutralWrappers;
    const usableWeightSum = wrappersInProportions ? plainWeightSum + wrapperWeightSum : plainWeightSum;

    if (usableWeightSum <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['weights'],
        message: wrappersInProportions
          ? 'Ustaw proporcję większą od 0 dla przynajmniej jednego kubełka'
          : 'Ustaw proporcję większą od 0 dla przynajmniej jednej inwestycji poza IKE/IKZE',
      });
    }

    if (data.roundTo100) {
      const target = data.roundingTarget;
      const targetActive =
        target === 'ike' ? data.useIke : target === 'ikze' ? data.useIkze : true;
      if (!targetActive) {
        ctx.addIssue({
          code: 'custom',
          path: ['roundingTarget'],
          message: 'Wybierz kubełek, którego faktycznie używasz',
        });
      }
    }
  });

export type CalculatorFormValues = z.infer<typeof calculatorSchema>;

export const defaultValues: CalculatorFormValues = {
  monthlyAmount: 2000,
  employmentType: 'employment',
  useIke: true,
  useIkze: true,
  ikeAnnual: 6_000,
  ikzeAnnual: 6_000,
  weights: {
    ike: 20,
    ikze: 15,
    stocks: 10,
    etf: 35,
    bonds: 10,
    gold: 5,
    deposits: 5,
    crypto: 5,
  },
  strategy: 'proportional',
  neutralWrappers: true,
  roundTo100: false,
  roundingTarget: 'etf',
};
