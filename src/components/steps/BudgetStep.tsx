import SavingsIcon from '@mui/icons-material/Savings';
import WorkOutlineIcon from '@mui/icons-material/WorkOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { MONTHS_IN_YEAR, ikzeLimit } from '../../domain/constants';
import type { CalculatorFormValues } from '../../domain/schema';
import { formatMoney } from '../../utils/format';
import { MoneyField } from '../fields/MoneyField';
import { SectionCard } from '../SectionCard';

export function BudgetStep() {
  const { control } = useFormContext<CalculatorFormValues>();
  const monthlyAmount = useWatch({ control, name: 'monthlyAmount' });
  const employmentType = useWatch({ control, name: 'employmentType' });

  const annual = Number.isFinite(monthlyAmount) ? monthlyAmount * MONTHS_IN_YEAR : 0;

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Ile odkładasz miesięcznie?"
        subtitle="Kwota, którą co miesiąc przeznaczasz na inwestycje i oszczędności."
        icon={<SavingsIcon />}
      >
        <Stack spacing={2.5}>
          <MoneyField name="monthlyAmount" label="Kwota miesięczna" autoFocus />
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(0, 201, 167, 0.08)',
              border: '1px solid rgba(0, 201, 167, 0.25)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Budżet roczny
            </Typography>
            <Typography variant="h5" sx={{ color: 'primary.main' }}>
              {formatMoney(annual)}
            </Typography>
          </Box>
        </Stack>
      </SectionCard>

      <SectionCard
        title="Forma zatrudnienia"
        subtitle="Od niej zależy limit wpłat na IKZE — dla działalności gospodarczej jest wyższy."
        icon={<WorkOutlineIcon />}
      >
        <Stack spacing={2}>
          <Controller
            control={control}
            name="employmentType"
            render={({ field }) => (
              <ToggleButtonGroup
                {...field}
                exclusive
                fullWidth
                onChange={(_, value) => value && field.onChange(value)}
              >
                <ToggleButton value="employment">Umowa o pracę / zlecenie</ToggleButton>
                <ToggleButton value="business">Działalność gospodarcza</ToggleButton>
              </ToggleButtonGroup>
            )}
          />
          <Alert severity="info" variant="outlined" icon={false}>
            Twój limit IKZE na 2026 r.:{' '}
            <strong>{formatMoney(ikzeLimit(employmentType))}</strong>
            {employmentType === 'business'
              ? ' (1,8 × prognozowane przeciętne wynagrodzenie)'
              : ' (1,2 × prognozowane przeciętne wynagrodzenie)'}
          </Alert>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
