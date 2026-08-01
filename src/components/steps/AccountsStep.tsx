import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch, type FieldPath } from 'react-hook-form';

import { ASSETS } from '../../domain/assets';
import { MONTHS_IN_YEAR, ikeLimit, ikzeLimit } from '../../domain/constants';
import type { CalculatorFormValues } from '../../domain/schema';
import { formatMoney } from '../../utils/format';
import { MoneyField } from '../fields/MoneyField';
import { SectionCard } from '../SectionCard';

interface AccountCardProps {
  toggleName: 'useIke' | 'useIkze';
  amountName: Extract<FieldPath<CalculatorFormValues>, 'ikeAnnual' | 'ikzeAnnual'>;
  title: string;
  color: string;
  description: string;
  limit: number;
  limitNote: string;
}

function AccountCard({
  toggleName,
  amountName,
  title,
  color,
  description,
  limit,
  limitNote,
}: AccountCardProps) {
  const { control, setValue } = useFormContext<CalculatorFormValues>();
  const enabled = useWatch({ control, name: toggleName });
  const amount = useWatch({ control, name: amountName });

  const safeAmount = Number.isFinite(amount) ? Math.min(Math.max(amount, 0), limit) : 0;
  const usage = limit > 0 ? (safeAmount / limit) * 100 : 0;

  return (
    <SectionCard
      title={title}
      subtitle={description}
      icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, mt: '6px' }} />}
      action={
        <Controller
          control={control}
          name={toggleName}
          render={({ field }) => (
            <Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
          )}
        />
      }
    >
      <Collapse in={enabled} unmountOnExit>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'flex-start' } }}>
            <Box sx={{ flex: 1, width: '100%' }}>
              <MoneyField
                name={amountName}
                label="Planowana wpłata roczna"
                helperText={`Limit 2026: ${formatMoney(limit)} — ${limitNote}`}
              />
            </Box>
            <Stack direction="row" spacing={1} sx={{ pt: { sm: 0.5 } }}>
              <Button size="small" variant="outlined" onClick={() => setValue(amountName, 0, { shouldValidate: true })}>
                0 zł
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setValue(amountName, Math.round(limit / 2), { shouldValidate: true })}
              >
                50%
              </Button>
              <Button size="small" variant="outlined" onClick={() => setValue(amountName, limit, { shouldValidate: true })}>
                Maks
              </Button>
            </Stack>
          </Stack>

          <Controller
            control={control}
            name={amountName}
            render={({ field }) => (
              <Slider
                value={safeAmount}
                min={0}
                max={limit}
                step={10}
                onChange={(_, value) => field.onChange(value as number)}
                sx={{ color, mx: 1, width: 'calc(100% - 16px)' }}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatMoney(value)}
              />
            )}
          />

          <Box>
            <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                Wykorzystanie limitu
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {usage.toFixed(0)}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, usage)}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: 'rgba(255,255,255,0.06)',
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
              }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Chip size="small" variant="outlined" label={`${formatMoney(safeAmount / MONTHS_IN_YEAR)} / mies.`} />
              <Chip
                size="small"
                variant="outlined"
                label={`Niewykorzystany limit: ${formatMoney(Math.max(0, limit - safeAmount))}`}
              />
            </Stack>
          </Box>
        </Stack>
      </Collapse>

      {!enabled ? (
        <Typography variant="body2" color="text.secondary">
          Konto wyłączone — nie będzie brane pod uwagę w podziale wpłat.
        </Typography>
      ) : null}
    </SectionCard>
  );
}

export function AccountsStep() {
  const { control } = useFormContext<CalculatorFormValues>();
  const employmentType = useWatch({ control, name: 'employmentType' });
  const useIke = useWatch({ control, name: 'useIke' });
  const useIkze = useWatch({ control, name: 'useIkze' });

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Konta emerytalne"
        subtitle="Zdecyduj, czy korzystasz z IKE, IKZE, obu, czy z żadnego — i ile chcesz na nie wpłacić w ciągu roku."
        icon={<AccountBalanceIcon />}
      >
        {!useIke && !useIkze ? (
          <Alert severity="warning" variant="outlined">
            Nie korzystasz z żadnego konta emerytalnego. Cały budżet rozdzielimy między pozostałe
            formy oszczędzania.
          </Alert>
        ) : (
          <Alert severity="info" variant="outlined" icon={false}>
            Limity są ustalane co roku jako wielokrotność prognozowanego przeciętnego wynagrodzenia
            (9 420 zł na 2026 r.). Wpłata na IKZE obniża podstawę opodatkowania w rozliczeniu
            rocznym, a IKE zwalnia zysk z podatku Belki przy wypłacie po 60. roku życia.
          </Alert>
        )}
      </SectionCard>

      <AccountCard
        toggleName="useIkze"
        amountName="ikzeAnnual"
        title={ASSETS.ikze.label}
        color={ASSETS.ikze.color}
        description={ASSETS.ikze.description}
        limit={ikzeLimit(employmentType)}
        limitNote={
          employmentType === 'business' ? 'działalność gospodarcza' : 'umowa o pracę / zlecenie'
        }
      />

      <AccountCard
        toggleName="useIke"
        amountName="ikeAnnual"
        title={ASSETS.ike.label}
        color={ASSETS.ike.color}
        description={ASSETS.ike.description}
        limit={ikeLimit()}
        limitNote="wspólny dla wszystkich form zatrudnienia"
      />
    </Stack>
  );
}
