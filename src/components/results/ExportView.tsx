import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { CalculationResult } from '../../domain/allocate';
import { CalendarExport } from './CalendarExport';
import { PrintExport } from './PrintExport';

interface ExportViewProps {
  result: CalculationResult;
}

export function ExportView({ result }: ExportViewProps) {
  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Zabierz plan poza kalkulator — jako wydarzenia w kalendarzu albo listę do odhaczania na
        papierze. Oba eksporty obejmują pełny rok, dokładnie tak jak tabela „Miesiąc po miesiącu".
      </Typography>

      <CalendarExport result={result} />
      <PrintExport result={result} />
    </Stack>
  );
}
