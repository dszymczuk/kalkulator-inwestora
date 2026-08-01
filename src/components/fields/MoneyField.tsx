import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { Controller, useFormContext, type FieldPath } from 'react-hook-form';

import type { CalculatorFormValues } from '../../domain/schema';

interface MoneyFieldProps {
  name: FieldPath<CalculatorFormValues>;
  label: string;
  helperText?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Pole kwotowe: trzyma w formularzu liczbę (a nie string), więc pusta wartość
 * mapuje się na NaN i wpada w walidację zod zamiast po cichu stać się zerem.
 */
export function MoneyField({ name, label, helperText, disabled, autoFocus }: MoneyFieldProps) {
  const { control } = useFormContext<CalculatorFormValues>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          value={
            typeof field.value === 'number' && Number.isFinite(field.value) ? field.value : ''
          }
          onChange={(event) => {
            const raw = event.target.value.replace(',', '.');
            field.onChange(raw === '' ? Number.NaN : Number(raw));
          }}
          type="number"
          label={label}
          fullWidth
          disabled={disabled}
          autoFocus={autoFocus}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? helperText}
          slotProps={{
            input: {
              endAdornment: <InputAdornment position="end">zł</InputAdornment>,
            },
            htmlInput: { min: 0, step: 100, inputMode: 'decimal' },
          }}
        />
      )}
    />
  );
}
