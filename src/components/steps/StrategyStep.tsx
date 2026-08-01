import CalculateIcon from '@mui/icons-material/Calculate';
import LayersIcon from '@mui/icons-material/Layers';
import SpeedIcon from '@mui/icons-material/Speed';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { ASSETS, ASSET_KEYS } from '../../domain/assets';
import type { CalculatorFormValues } from '../../domain/schema';
import { SectionCard } from '../SectionCard';

interface StrategyOptionProps {
  value: string;
  selected: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function StrategyOption({ value, selected, icon, title, description }: StrategyOptionProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? 'rgba(0, 201, 167, 0.08)' : 'transparent',
        transition: 'border-color .15s, background-color .15s',
      }}
    >
      <FormControlLabel
        value={value}
        control={<Radio />}
        sx={{ alignItems: 'flex-start', m: 0, '& .MuiFormControlLabel-label': { pt: 0.5 } }}
        label={
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Box sx={{ color: selected ? 'primary.main' : 'text.secondary', display: 'flex' }}>
                {icon}
              </Box>
              <Typography variant="subtitle2">{title}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          </Box>
        }
      />
    </Paper>
  );
}

export function StrategyStep() {
  const { control } = useFormContext<CalculatorFormValues>();
  const strategy = useWatch({ control, name: 'strategy' });
  const roundTo100 = useWatch({ control, name: 'roundTo100' });
  const useIke = useWatch({ control, name: 'useIke' });
  const useIkze = useWatch({ control, name: 'useIkze' });

  return (
    <Stack spacing={3}>
      <SectionCard
        title="Kolejność wpłat w ciągu roku"
        subtitle="Czy rozkładasz wpłaty równo przez 12 miesięcy, czy najpierw domykasz limity kont emerytalnych?"
        icon={<SpeedIcon />}
      >
        <Controller
          control={control}
          name="strategy"
          render={({ field }) => (
            <RadioGroup {...field}>
              <Stack spacing={2}>
                <StrategyOption
                  value="proportional"
                  selected={field.value === 'proportional'}
                  icon={<LayersIcon fontSize="small" />}
                  title="Równomiernie przez cały rok"
                  description="Co miesiąc ta sama struktura wpłat zgodna z proporcjami. Konta emerytalne dostają 1/12 celu rocznego miesięcznie."
                />
                <StrategyOption
                  value="priority"
                  selected={field.value === 'priority'}
                  icon={<SpeedIcon fontSize="small" />}
                  title="Priorytetowo: najpierw IKZE, potem IKE"
                  description="W pierwszych miesiącach cała kwota idzie na IKZE, po jego domknięciu na IKE, a dopiero potem na resztę portfela zgodnie z proporcjami."
                />
              </Stack>
            </RadioGroup>
          )}
        />

        {strategy === 'priority' ? (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }} icon={false}>
            Szybciej korzystasz z ulgi podatkowej i domykasz limity, ale przez kilka pierwszych
            miesięcy nie kupujesz pozostałych aktywów — rezygnujesz z części uśredniania ceny zakupu.
          </Alert>
        ) : null}
      </SectionCard>

      <SectionCard
        title="IKE i IKZE poza proporcjami"
        subtitle="IKE i IKZE to zwykle tylko opakowanie na ETF-y. Możesz je liczyć jako osobne, neutralne kubełki, żeby nie zaburzały proporcji akcje/ETF."
        icon={<LayersIcon />}
      >
        <Controller
          control={control}
          name="neutralWrappers"
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
              }
              label={
                field.value
                  ? 'Tak — kwota kont wynika z celu rocznego, proporcje dzielą resztę'
                  : 'Nie — IKE i IKZE mają własne wagi w proporcjach (cel roczny działa jako sufit)'
              }
            />
          )}
        />
        {strategy === 'priority' && (useIke || useIkze) ? (
          <Alert severity="info" variant="outlined" sx={{ mt: 2 }} icon={false}>
            W trybie priorytetowym konta emerytalne i tak są zasilane poza proporcjami — to
            ustawienie ma znaczenie tylko przy rozkładzie równomiernym.
          </Alert>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Zaokrąglanie"
        subtitle="Wygodne, jeśli wolisz wykonywać przelewy w okrągłych kwotach."
        icon={<CalculateIcon />}
      >
        <Stack spacing={2}>
          <Controller
            control={control}
            name="roundTo100"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                }
                label="Zaokrąglaj kwoty w dół do pełnych 100 zł"
              />
            )}
          />

          <Collapse in={roundTo100} unmountOnExit>
            <Controller
              control={control}
              name="roundingTarget"
              render={({ field, fieldState }) => (
                <FormControl fullWidth size="small" error={Boolean(fieldState.error)}>
                  <InputLabel id="rounding-target-label">Końcówkę alokuj w</InputLabel>
                  <Select {...field} labelId="rounding-target-label" label="Końcówkę alokuj w">
                    {ASSET_KEYS.map((key) => (
                      <MenuItem
                        key={key}
                        value={key}
                        disabled={(key === 'ike' && !useIke) || (key === 'ikze' && !useIkze)}
                      >
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                          <Box
                            sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ASSETS[key].color }}
                          />
                          {ASSETS[key].label}
                        </Stack>
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    {fieldState.error?.message ??
                      'Reszta z zaokrągleń trafi w całości tutaj — dzięki temu suma miesiąca zawsze zgadza się z Twoim budżetem.'}
                  </FormHelperText>
                </FormControl>
              )}
            />
          </Collapse>
        </Stack>
      </SectionCard>
    </Stack>
  );
}
