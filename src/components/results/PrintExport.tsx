import ChecklistIcon from '@mui/icons-material/Checklist';
import PrintIcon from '@mui/icons-material/Print';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import type { CalculationResult } from '../../domain/allocate';
import { buildChecklist } from '../../domain/checklist';
import { CURRENT_YEAR, DEFAULT_PAYMENT_DAY } from '../../domain/constants';
import { PrintableChecklist, type PrintColorMode } from './PrintableChecklist';

interface PrintExportProps {
  result: CalculationResult;
}

export function PrintExport({ result }: PrintExportProps) {
  const [day, setDay] = useState(String(DEFAULT_PAYMENT_DAY));
  const [colorMode, setColorMode] = useState<PrintColorMode>('color');

  const dayNumber = Number(day);
  const dayValid = day !== '' && Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31;

  const checklist = useMemo(
    () =>
      dayValid
        ? // Zawsze rok limitów — lista ma odpowiadać planowi z tabeli.
          buildChecklist(result, { year: CURRENT_YEAR, dayOfMonth: dayNumber })
        : null,
    [result, dayValid, dayNumber],
  );

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mb: 2.5 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', mt: '2px' }}>
          <ChecklistIcon />
        </Box>
        <Box>
          <Typography variant="h6">Lista wpłat do wydruku</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Wszystkie wpłaty {CURRENT_YEAR} r. jako lista „do odhaczenia" — miesiąc po miesiącu, z
            kwadratem przy każdej pozycji i podsumowaniem rocznym na końcu. W oknie drukowania
            wybierz drukarkę albo „Zapisz jako PDF".
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        useFlexGap
        sx={{ alignItems: { sm: 'flex-start' }, flexWrap: 'wrap' }}
      >
        <TextField
          label="Dzień wpłaty"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          type="number"
          error={!dayValid}
          helperText={
            dayValid ? 'W krótszych miesiącach użyjemy ostatniego dnia' : 'Podaj dzień z zakresu 1–31'
          }
          slotProps={{ htmlInput: { min: 1, max: 31, inputMode: 'numeric' } }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        />

        <Box>
          <ToggleButtonGroup
            exclusive
            value={colorMode}
            onChange={(_, value: PrintColorMode | null) => value && setColorMode(value)}
            sx={{ mt: { sm: 0.5 } }}
          >
            <ToggleButton value="color">Kolorowe teksty</ToggleButton>
            <ToggleButton value="mono">Czarno-biały</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
            {colorMode === 'color'
              ? 'Nazwy kubełków w kolorach palety, przyciemnionych pod biały papier'
              : 'Cała lista czarno-biała — oszczędza tusz'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          disabled={!checklist || checklist.itemCount === 0}
          sx={{ width: { xs: '100%', sm: 'auto' }, mt: { sm: 0.5 } }}
        >
          Drukuj / zapisz PDF
        </Button>
      </Stack>

      {checklist ? (
        <Stack spacing={1.5} sx={{ mt: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Lista będzie zawierać <strong>{checklist.itemCount}</strong>{' '}
            {checklist.itemCount === 1 ? 'pozycję' : 'pozycji'} w 12 miesiącach.
          </Typography>

          {checklist.shortenedMonths.length > 0 ? (
            <Alert severity="info" variant="outlined" icon={false}>
              Dzień {dayNumber} nie istnieje w niektórych miesiącach — wpłata trafi tam na ostatni
              dzień miesiąca: {checklist.shortenedMonths.join(', ').toLowerCase()}.
            </Alert>
          ) : null}

          {checklist.weekendMonths.length > 0 ? (
            <Alert severity="info" variant="outlined" icon={false}>
              Wpłata wypada w weekend w miesiącach:{' '}
              {checklist.weekendMonths.join(', ').toLowerCase()} — przelew zaksięguje się w kolejny
              dzień roboczy.
            </Alert>
          ) : null}
        </Stack>
      ) : null}

      {checklist ? (
        <PrintableChecklist result={result} checklist={checklist} colorMode={colorMode} />
      ) : null}
    </Paper>
  );
}
