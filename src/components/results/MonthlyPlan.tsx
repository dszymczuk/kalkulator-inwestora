import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';

import type { CalculationResult, MonthPlan } from '../../domain/allocate';
import { ASSETS, ASSET_KEYS, type AssetKey } from '../../domain/assets';
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '../../domain/constants';
import { formatMoney, formatPercent } from '../../utils/format';
import { CalendarExport } from './CalendarExport';

type Mode = 'amount' | 'share';

interface MonthlyPlanProps {
  result: CalculationResult;
}

function shareOf(plan: MonthPlan, key: AssetKey): number {
  return plan.total > 0 ? (plan.byAsset[key] / plan.total) * 100 : 0;
}

function MobileMonths({
  result,
  visibleKeys,
}: {
  result: CalculationResult;
  visibleKeys: readonly AssetKey[];
}) {
  return (
    <Box>
      {result.months.map((plan) => (
        <Accordion key={plan.month} disableGutters defaultExpanded={plan.month === 1}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" sx={{ justifyContent: "space-between", width: '100%', pr: 1 }}>
              <Typography variant="subtitle2">{MONTH_NAMES[plan.month - 1]}</Typography>
              <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                {formatMoney(plan.total)}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Stack spacing={1.25}>
              {visibleKeys
                .filter((key) => plan.byAsset[key] > 0)
                .map((key) => (
                  <Stack key={key} direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ASSETS[key].color, flexShrink: 0 }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {ASSETS[key].label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatMoney(plan.byAsset[key])}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ width: 52, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatPercent(shareOf(plan, key))}
                    </Typography>
                  </Stack>
                ))}
              {plan.unallocated > 0 ? (
                <Typography variant="caption" color="warning.main">
                  Nierozdysponowane: {formatMoney(plan.unallocated)}
                </Typography>
              ) : null}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export function MonthlyPlan({ result }: MonthlyPlanProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mode, setMode] = useState<Mode>('amount');

  const visibleKeys = ASSET_KEYS.filter((key) => result.byAsset[key] > 0);
  const keys = visibleKeys.length > 0 ? visibleKeys : ASSET_KEYS;
  const hasUnallocated = result.unallocatedTotal > 0;

  return (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          Plan wpłat na 12 miesięcy. Kubełki z zerową kwotą w całym roku są pominięte.
        </Typography>
        {!isMobile ? (
          <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            onChange={(_, value: Mode | null) => value && setMode(value)}
          >
            <ToggleButton value="amount">Kwoty</ToggleButton>
            <ToggleButton value="share">Udziały %</ToggleButton>
          </ToggleButtonGroup>
        ) : null}
      </Stack>

      {isMobile ? (
        <MobileMonths result={result} visibleKeys={keys} />
      ) : (
        <Paper sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    position: 'sticky',
                    left: 0,
                    bgcolor: 'background.paper',
                    zIndex: 2,
                  }}
                >
                  Miesiąc
                </TableCell>
                {keys.map((key) => (
                  <TableCell key={key} align="right">
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center", justifyContent: "flex-end" }}>
                      <Box
                        sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: ASSETS[key].color }}
                      />
                      <span>{ASSETS[key].shortLabel}</span>
                    </Stack>
                  </TableCell>
                ))}
                {hasUnallocated ? <TableCell align="right">Nierozdysp.</TableCell> : null}
                <TableCell align="right">Razem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.months.map((plan) => (
                <TableRow key={plan.month} hover>
                  <TableCell
                    sx={{
                      position: 'sticky',
                      left: 0,
                      bgcolor: 'background.paper',
                      zIndex: 1,
                      fontWeight: 600,
                    }}
                  >
                    {MONTH_NAMES_SHORT[plan.month - 1]}
                  </TableCell>
                  {keys.map((key) => (
                    <TableCell
                      key={key}
                      align="right"
                      sx={{
                        fontVariantNumeric: 'tabular-nums',
                        color: plan.byAsset[key] > 0 ? 'text.primary' : 'text.disabled',
                      }}
                    >
                      {mode === 'amount'
                        ? formatMoney(plan.byAsset[key])
                        : formatPercent(shareOf(plan, key))}
                    </TableCell>
                  ))}
                  {hasUnallocated ? (
                    <TableCell align="right" sx={{ color: 'warning.main', fontVariantNumeric: 'tabular-nums' }}>
                      {plan.unallocated > 0 ? formatMoney(plan.unallocated) : '—'}
                    </TableCell>
                  ) : null}
                  <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(plan.total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ '& td': { borderTop: '2px solid', borderColor: 'divider' } }}>
                <TableCell
                  sx={{ position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1, fontWeight: 700 }}
                >
                  Rok
                </TableCell>
                {keys.map((key) => (
                  <TableCell
                    key={key}
                    align="right"
                    sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {mode === 'amount'
                      ? formatMoney(result.byAsset[key])
                      : formatPercent(
                          result.investedTotal > 0
                            ? (result.byAsset[key] / result.investedTotal) * 100
                            : 0,
                        )}
                  </TableCell>
                ))}
                {hasUnallocated ? (
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {formatMoney(result.unallocatedTotal)}
                  </TableCell>
                ) : null}
                <TableCell align="right" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatMoney(result.investedTotal)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      )}

      <Box sx={{ pt: 1 }}>
        <CalendarExport result={result} />
      </Box>
    </Stack>
  );
}
