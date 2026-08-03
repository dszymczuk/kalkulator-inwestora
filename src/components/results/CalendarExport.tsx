import DownloadIcon from '@mui/icons-material/Download';
import EventIcon from '@mui/icons-material/Event';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import type { CalculationResult } from '../../domain/allocate';
import {
  EVENT_DURATION_MINUTES,
  EVENT_INTERVAL_MINUTES,
  buildCalendar,
  calendarFileName,
  previewCalendar,
} from '../../domain/calendar';
import { CURRENT_YEAR } from '../../domain/constants';

interface CalendarExportProps {
  result: CalculationResult;
}

const DEFAULT_DAY = 5;
const DEFAULT_TIME = '18:00';

/** Zamienia „HH:MM" na godzinę i minutę; zwraca null dla niepełnej wartości. */
function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function CalendarExport({ result }: CalendarExportProps) {
  const [day, setDay] = useState(String(DEFAULT_DAY));
  const [time, setTime] = useState(DEFAULT_TIME);

  const dayNumber = Number(day);
  const dayValid = day !== '' && Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= 31;
  const parsedTime = parseTime(time);

  const options = useMemo(
    () =>
      dayValid && parsedTime
        ? {
            // Zawsze rok limitów — dzięki temu plan w kalendarzu odpowiada
            // dokładnie tabeli i limitom, na których został policzony.
            year: CURRENT_YEAR,
            dayOfMonth: dayNumber,
            hour: parsedTime.hour,
            minute: parsedTime.minute,
          }
        : null,
    [dayValid, dayNumber, parsedTime],
  );

  const preview = useMemo(
    () => (options ? previewCalendar(result, options) : null),
    [result, options],
  );

  const handleDownload = () => {
    if (!options) return;

    const content = buildCalendar(result, options);
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = calendarFileName(options.year);
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mb: 2.5 }}>
        <Box sx={{ color: 'primary.main', display: 'flex', mt: '2px' }}>
          <EventIcon />
        </Box>
        <Box>
          <Typography variant="h6">Eksport do kalendarza</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Pobierz plik .ics i zaimportuj go w Kalendarzu Google (Ustawienia → Importuj i eksportuj).
            Wydarzenia obejmują cały {CURRENT_YEAR} r., od stycznia do grudnia — dokładnie tak jak
            tabela powyżej. Każdy kubełek dostaje osobne wydarzenie, jedno po drugim co{' '}
            {EVENT_INTERVAL_MINUTES} minut.
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
          label="Dzień miesiąca"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          type="number"
          error={!dayValid}
          helperText={
            dayValid
              ? 'W krótszych miesiącach użyjemy ostatniego dnia'
              : 'Podaj dzień z zakresu 1–31'
          }
          slotProps={{ htmlInput: { min: 1, max: 31, inputMode: 'numeric' } }}
          sx={{ width: { xs: '100%', sm: 200 } }}
        />

        <TextField
          label="Godzina pierwszej wpłaty"
          value={time}
          onChange={(event) => setTime(event.target.value)}
          type="time"
          error={!parsedTime}
          helperText={
            preview?.lastEventEnd
              ? `Ostatnie wydarzenie kończy się o ${preview.lastEventEnd}`
              : 'Format 24-godzinny'
          }
          slotProps={{ htmlInput: { step: 300 } }}
          sx={{ width: { xs: '100%', sm: 220 } }}
        />

        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
          disabled={!options || (preview?.eventCount ?? 0) === 0}
          sx={{ width: { xs: '100%', sm: 'auto' }, mt: { sm: 0.5 } }}
        >
          Pobierz .ics
        </Button>
      </Stack>

      {preview ? (
        <Stack spacing={1.5} sx={{ mt: 2.5 }}>
          <Typography variant="body2" color="text.secondary">
            Plik będzie zawierać <strong>{preview.eventCount}</strong>{' '}
            {preview.eventCount === 1 ? 'wydarzenie' : 'wydarzeń'} w roku {CURRENT_YEAR} — każde po{' '}
            {EVENT_DURATION_MINUTES} minut.
          </Typography>

          {preview.shortenedMonths.length > 0 ? (
            <Alert severity="info" variant="outlined" icon={false}>
              Dzień {dayNumber} nie istnieje w niektórych miesiącach — wpłata trafi tam na ostatni
              dzień miesiąca: {preview.shortenedMonths.join(', ').toLowerCase()}.
            </Alert>
          ) : null}
        </Stack>
      ) : null}
    </Paper>
  );
}
