import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { useState } from 'react';

import type { CalculationResult } from '../../domain/allocate';
import { ASSETS, ASSET_KEYS } from '../../domain/assets';
import { MONTH_NAMES_SHORT } from '../../domain/constants';
import { formatMoney, formatMoneyShort, formatPercent } from '../../utils/format';

type BarMode = 'amount' | 'share';

interface ChartsViewProps {
  result: CalculationResult;
}

export function ChartsView({ result }: ChartsViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [barMode, setBarMode] = useState<BarMode>('amount');

  const activeKeys = ASSET_KEYS.filter((key) => result.byAsset[key] > 0);
  const keys = activeKeys.length > 0 ? activeKeys : ASSET_KEYS;

  const barSeries = keys.map((key) => ({
    id: key,
    label: ASSETS[key].label,
    color: ASSETS[key].color,
    stack: 'total',
    data: result.months.map((plan) =>
      barMode === 'amount'
        ? plan.byAsset[key]
        : plan.total > 0
          ? (plan.byAsset[key] / plan.total) * 100
          : 0,
    ),
    valueFormatter: (value: number | null) =>
      value === null || value === 0
        ? null
        : barMode === 'amount'
          ? formatMoney(value)
          : formatPercent(value),
  }));

  const pieData = keys.map((key) => ({
    id: key,
    value: result.byAsset[key],
    label: ASSETS[key].label,
    color: ASSETS[key].color,
  }));

  const chartHeight = isMobile ? 380 : 420;
  // Wykres poziomy i kołowy muszą pomieścić tyle wierszy/segmentów, ile jest kubełków.
  const comparisonHeight = Math.max(chartHeight, keys.length * 46 + 120);

  return (
    <Grid container spacing={3}>
      <Grid size={12}>
        <Paper sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
           
           
            sx={{ alignItems: { sm: 'center' }, justifyContent: "space-between", mb: 2 }}
          >
            <Box>
              <Typography variant="h6">Wpłaty miesiąc po miesiącu</Typography>
              <Typography variant="body2" color="text.secondary">
                Każdy słupek to jeden miesiąc, warstwy to poszczególne kubełki.
              </Typography>
            </Box>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={barMode}
              onChange={(_, value: BarMode | null) => value && setBarMode(value)}
            >
              <ToggleButton value="amount">Kwoty</ToggleButton>
              <ToggleButton value="share">Udziały %</ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: isMobile ? 560 : 0 }}>
              <BarChart
                height={chartHeight}
                borderRadius={4}
                skipAnimation
                grid={{ horizontal: true }}
                xAxis={[{ scaleType: 'band', data: [...MONTH_NAMES_SHORT] }]}
                yAxis={[
                  {
                    width: 72,
                    valueFormatter: (value: number) =>
                      barMode === 'amount' ? formatMoneyShort(value) : `${value}%`,
                    ...(barMode === 'share' ? { max: 100 } : {}),
                  },
                ]}
                series={barSeries}
                slotProps={{ legend: { direction: 'horizontal', sx: { gap: 1.5, pb: 1 } } }}
                sx={{
                  '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: theme.palette.divider },
                  '& .MuiChartsGrid-line': { stroke: theme.palette.divider, strokeDasharray: '3 4' },
                  '& .MuiChartsAxis-tickLabel': { fill: `${theme.palette.text.secondary} !important` },
                }}
              />
            </Box>
          </Box>
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
          <Typography variant="h6">Struktura portfela po roku</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Suma wpłat: {formatMoney(result.investedTotal)}
          </Typography>
          <PieChart
            height={comparisonHeight}
            skipAnimation
            series={[
              {
                data: pieData,
                innerRadius: isMobile ? 50 : 70,
                paddingAngle: 2,
                cornerRadius: 4,
                arcLabel: (item) =>
                  result.investedTotal > 0 && item.value / result.investedTotal >= 0.07
                    ? formatPercent((item.value / result.investedTotal) * 100)
                    : '',
                arcLabelMinAngle: 20,
                highlightScope: { fade: 'global', highlight: 'item' },
                valueFormatter: (item) => formatMoney(item.value),
              },
            ]}
            slotProps={{ legend: { direction: 'horizontal', sx: { gap: 1.5, pt: 1 } } }}
            sx={{ '& .MuiPieArcLabel-root': { fill: '#0d1b2a', fontWeight: 700, fontSize: 12 } }}
          />
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%' }}>
          <Typography variant="h6">Plan a wynik</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Udział rzeczywisty zestawiony z proporcjami, które ustawiłeś.
          </Typography>
          <BarChart
            height={comparisonHeight}
            borderRadius={4}
            skipAnimation
            grid={{ vertical: true }}
            layout="horizontal"
            yAxis={[
              { scaleType: 'band', width: 64, data: keys.map((key) => ASSETS[key].shortLabel) },
            ]}
            xAxis={[{ valueFormatter: (value: number) => `${Math.round(value)}%` }]}
            series={[
              {
                id: 'planned',
                label: 'Planowany',
                color: '#8bafc9',
                data: keys.map(
                  (key) => result.summary.find((row) => row.key === key)?.plannedShare ?? 0,
                ),
                valueFormatter: (value: number | null) => (value === null ? '' : formatPercent(value)),
              },
              {
                id: 'actual',
                label: 'Rzeczywisty',
                color: theme.palette.primary.main,
                data: keys.map(
                  (key) => result.summary.find((row) => row.key === key)?.actualShare ?? 0,
                ),
                valueFormatter: (value: number | null) => (value === null ? '' : formatPercent(value)),
              },
            ]}
            slotProps={{ legend: { direction: 'horizontal', sx: { gap: 1.5, pb: 1 } } }}
            sx={{
              '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: theme.palette.divider },
              '& .MuiChartsGrid-line': { stroke: theme.palette.divider, strokeDasharray: '3 4' },
              '& .MuiChartsAxis-tickLabel': { fill: `${theme.palette.text.secondary} !important` },
            }}
          />
        </Paper>
      </Grid>
    </Grid>
  );
}
