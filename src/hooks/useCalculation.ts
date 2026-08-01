import { useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';

import { calculate, type CalculationResult } from '../domain/allocate';
import { calculatorSchema, type CalculatorFormValues } from '../domain/schema';

/**
 * Przelicza plan na bieżąco. Zwraca null, dopóki formularz nie jest w stanie,
 * z którego da się policzyć sensowny wynik.
 *
 * Przyjmuje `control` zamiast sięgać po kontekst, bo hook jest używany również
 * w komponencie, który sam dostarcza FormProvider.
 */
export function useCalculation(control: Control<CalculatorFormValues>): CalculationResult | null {
  const values = useWatch({ control }) as CalculatorFormValues;

  return useMemo(() => {
    const parsed = calculatorSchema.safeParse(values);
    if (!parsed.success) return null;
    return calculate(parsed.data);
  }, [values]);
}
