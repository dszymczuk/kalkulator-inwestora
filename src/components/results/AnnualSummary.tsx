import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { CalculationResult } from '../../domain/allocate';
import { ASSETS } from '../../domain/assets';
import { MONTH_NAMES_LOCATIVE } from '../../domain/constants';
import { formatDrift, formatMoney, formatPercent } from '../../utils/format';
import { StatTile } from './StatTile';

interface AnnualSummaryProps {
  result: CalculationResult;
}

function driftColor(drift: number): string {
  if (Math.abs(drift) < 0.05) return 'text.secondary';
  return Math.abs(drift) > 5 ? 'warning.main' : 'text.primary';
}

export function AnnualSummary({ result }: AnnualSummaryProps) {
  const rows = result.summary.filter((row) => row.amount > 0 || row.plannedShare > 0);

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label="Budżet roczny"
            value={formatMoney(result.budgetTotal)}
            hint={`${formatMoney(result.budgetTotal / 12)} miesięcznie`}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label="Rozdysponowane"
            value={formatMoney(result.investedTotal)}
            hint={
              result.unallocatedTotal > 0
                ? `Poza planem: ${formatMoney(result.unallocatedTotal)}`
                : 'Cały budżet ma przypisanie'
            }
            accent="#00c9a7"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label="IKZE w roku"
            value={formatMoney(result.ikze.funded)}
            accent={ASSETS.ikze.color}
            hint={
              result.ikze.target > 0
                ? `${formatPercent((result.ikze.funded / result.ikze.limit) * 100)} limitu${
                    result.ikze.monthFilled
                      ? ` · cel domknięty w ${MONTH_NAMES_LOCATIVE[result.ikze.monthFilled - 1]}`
                      : ''
                  }`
                : 'Nie korzystasz z IKZE'
            }
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatTile
            label="IKE w roku"
            value={formatMoney(result.ike.funded)}
            accent={ASSETS.ike.color}
            hint={
              result.ike.target > 0
                ? `${formatPercent((result.ike.funded / result.ike.limit) * 100)} limitu${
                    result.ike.monthFilled
                      ? ` · cel domknięty w ${MONTH_NAMES_LOCATIVE[result.ike.monthFilled - 1]}`
                      : ''
                  }`
                : 'Nie korzystasz z IKE'
            }
          />
        </Grid>
      </Grid>

      {result.warnings.map((warning) => (
        <Alert key={warning} severity="warning" variant="outlined">
          {warning}
        </Alert>
      ))}

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>
          Struktura portfela po roku
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Kolumna „planowany” to Twoje proporcje przeliczone na cały budżet — traktuj ją jako
          wskazówkę. „Rzeczywisty” pokazuje, ile faktycznie wyszło po uwzględnieniu limitów,
          priorytetów i zaokrągleń.
        </Typography>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>Kubełek</TableCell>
                <TableCell align="right">Kwota roczna</TableCell>
                <TableCell align="right">Rzeczywisty</TableCell>
                <TableCell align="right">Planowany</TableCell>
                <TableCell align="right">Różnica</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: ASSETS[row.key].color,
                          flexShrink: 0,
                        }}
                      />
                      <span>{ASSETS[row.key].label}</span>
                    </Stack>
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(row.amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                      <Box sx={{ width: 56 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, row.actualShare)}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: 'rgba(255,255,255,0.07)',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: ASSETS[row.key].color,
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                      <span>{formatPercent(row.actualShare)}</span>
                    </Stack>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatPercent(row.plannedShare)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: driftColor(row.drift), fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatDrift(row.drift)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2.5, flexWrap: 'wrap', gap: 1 }}>
          <Chip
            size="small"
            variant="outlined"
            label={`Konta emerytalne: ${formatPercent(
              result.investedTotal > 0
                ? ((result.ike.funded + result.ikze.funded) / result.investedTotal) * 100
                : 0,
            )} portfela`}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`Poza kontami: ${formatMoney(
              result.investedTotal - result.ike.funded - result.ikze.funded,
            )}`}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
