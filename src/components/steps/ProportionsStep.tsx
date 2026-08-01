import TuneIcon from '@mui/icons-material/Tune';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { ASSETS, ASSET_KEYS, PLAIN_KEYS, type AssetKey } from '../../domain/assets';
import type { CalculatorFormValues } from '../../domain/schema';
import { formatPercent } from '../../utils/format';
import { SectionCard } from '../SectionCard';

interface WeightRowProps {
  assetKey: AssetKey;
  normalized: number;
  disabledReason?: string;
}

function WeightRow({ assetKey, normalized, disabledReason }: WeightRowProps) {
  const { control } = useFormContext<CalculatorFormValues>();
  const asset = ASSETS[assetKey];
  const disabled = Boolean(disabledReason);

  return (
    <Box sx={{ opacity: disabled ? 0.45 : 1 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: asset.color, flexShrink: 0 }} />
        <Tooltip title={asset.description} placement="top-start">
          <Typography variant="subtitle2" sx={{ flex: 1, cursor: 'help' }}>
            {asset.label}
          </Typography>
        </Tooltip>
        <Typography variant="body2" sx={{ color: disabled ? 'text.secondary' : asset.color, fontWeight: 700 }}>
          {disabled ? '—' : formatPercent(normalized)}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Controller
          control={control}
          name={`weights.${assetKey}` as const}
          render={({ field }) => (
            <>
              <Slider
                value={Number.isFinite(field.value) ? field.value : 0}
                min={0}
                max={100}
                step={1}
                disabled={disabled}
                onChange={(_, value) => field.onChange(value as number)}
                sx={{ color: asset.color, flex: 1, ml: 1 }}
                valueLabelDisplay="auto"
              />
              <TextField
                value={Number.isFinite(field.value) ? field.value : ''}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  field.onChange(event.target.value === '' ? 0 : Math.min(100, Math.max(0, next)));
                }}
                type="number"
                disabled={disabled}
                sx={{ width: 92, flexShrink: 0 }}
                slotProps={{ htmlInput: { min: 0, max: 100, inputMode: 'numeric', 'aria-label': `Waga: ${asset.label}` } }}
              />
            </>
          )}
        />
      </Stack>

      {disabledReason ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, ml: 3 }}>
          {disabledReason}
        </Typography>
      ) : null}
    </Box>
  );
}

export function ProportionsStep() {
  const { control, setValue } = useFormContext<CalculatorFormValues>();
  const weights = useWatch({ control, name: 'weights' });
  const strategy = useWatch({ control, name: 'strategy' });
  const neutralWrappers = useWatch({ control, name: 'neutralWrappers' });
  const useIke = useWatch({ control, name: 'useIke' });
  const useIkze = useWatch({ control, name: 'useIkze' });

  const wrappersInProportions = strategy === 'proportional' && !neutralWrappers;

  const isActive = (key: AssetKey) => {
    if (key === 'ike') return useIke && wrappersInProportions;
    if (key === 'ikze') return useIkze && wrappersInProportions;
    return true;
  };

  const activeKeys = ASSET_KEYS.filter(isActive);
  const total = activeKeys.reduce((sum, key) => sum + (weights[key] || 0), 0);

  const disabledReason = (key: AssetKey): string | undefined => {
    if (key === 'ike' && !useIke) return 'Konto IKE jest wyłączone.';
    if (key === 'ikze' && !useIkze) return 'Konto IKZE jest wyłączone.';
    if ((key === 'ike' || key === 'ikze') && !wrappersInProportions) {
      return strategy === 'priority'
        ? 'W trybie priorytetowym kwota konta wynika z celu rocznego, nie z proporcji.'
        : 'Konto jest kubełkiem neutralnym — kwota wynika z celu rocznego, nie z proporcji.';
    }
    return undefined;
  };

  const spreadEvenly = () => {
    const share = Math.round(100 / activeKeys.length);
    ASSET_KEYS.forEach((key) => {
      setValue(`weights.${key}`, isActive(key) ? share : weights[key] ?? 0, { shouldValidate: true });
    });
  };

  const clearAll = () => {
    PLAIN_KEYS.forEach((key) => setValue(`weights.${key}`, 0, { shouldValidate: true }));
  };

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Proporcje portfela"
        subtitle="Ustaw wagi względne — nie muszą sumować się do 100%. Kalkulator przeliczy je na udziały procentowe."
        icon={<TuneIcon />}
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={spreadEvenly}>
              Rozłóż równo
            </Button>
            <Button size="small" variant="outlined" color="inherit" onClick={clearAll}>
              Wyzeruj
            </Button>
            <Box sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Suma wag: <strong style={{ color: '#e8f0f7' }}>{total}</strong>
            </Typography>
          </Stack>

          {total === 0 ? (
            <Alert severity="error" variant="outlined">
              Wszystkie wagi są zerowe — ustaw proporcję większą od 0 dla przynajmniej jednego
              kubełka.
            </Alert>
          ) : null}

          {!wrappersInProportions && (useIke || useIkze) ? (
            <Alert severity="info" variant="outlined" icon={false}>
              IKE i IKZE są traktowane jako osobne kubełki poza proporcjami — poniższe wagi dotyczą
              tego, co zostanie po ich zasileniu.
            </Alert>
          ) : null}
        </Stack>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={3}>
          {ASSET_KEYS.map((key) => (
            <WeightRow
              key={key}
              assetKey={key}
              normalized={total > 0 ? ((weights[key] || 0) / total) * 100 : 0}
              disabledReason={disabledReason(key)}
            />
          ))}
        </Stack>
      </SectionCard>
    </Stack>
  );
}
