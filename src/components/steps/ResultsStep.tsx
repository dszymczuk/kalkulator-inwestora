import BarChartIcon from '@mui/icons-material/BarChart';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import IosShareIcon from '@mui/icons-material/IosShare';
import PieChartIcon from '@mui/icons-material/PieChart';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { useState } from 'react';

import type { CalculationResult } from '../../domain/allocate';
import { AnnualSummary } from '../results/AnnualSummary';
import { ChartsView } from '../results/ChartsView';
import { ExportView } from '../results/ExportView';
import { MonthlyPlan } from '../results/MonthlyPlan';

interface ResultsStepProps {
  result: CalculationResult | null;
}

export function ResultsStep({ result }: ResultsStepProps) {
  const [tab, setTab] = useState(0);

  if (!result) {
    return (
      <Alert severity="warning" variant="outlined">
        Uzupełnij poprawnie wcześniejsze kroki, żeby zobaczyć wyniki. Sprawdź kwotę miesięczną,
        limity IKE/IKZE oraz proporcje.
      </Alert>
    );
  }

  return (
    <Box>
      <Tabs
        value={tab}
        onChange={(_, value: number) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<CalendarMonthIcon fontSize="small" />} iconPosition="start" label="Miesiąc po miesiącu" />
        <Tab icon={<PieChartIcon fontSize="small" />} iconPosition="start" label="Podsumowanie roczne" />
        <Tab icon={<BarChartIcon fontSize="small" />} iconPosition="start" label="Wykresy" />
        <Tab icon={<IosShareIcon fontSize="small" />} iconPosition="start" label="Eksport" />
      </Tabs>

      {tab === 0 ? <MonthlyPlan result={result} /> : null}
      {tab === 1 ? <AnnualSummary result={result} /> : null}
      {tab === 2 ? <ChartsView result={result} /> : null}
      {tab === 3 ? <ExportView result={result} /> : null}
    </Box>
  );
}
