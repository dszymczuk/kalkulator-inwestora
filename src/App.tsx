import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InsightsIcon from '@mui/icons-material/Insights';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm, type FieldPath } from 'react-hook-form';

import { AccountsStep } from './components/steps/AccountsStep';
import { BudgetStep } from './components/steps/BudgetStep';
import { ProportionsStep } from './components/steps/ProportionsStep';
import { ResultsStep } from './components/steps/ResultsStep';
import { StrategyStep } from './components/steps/StrategyStep';
import { CURRENT_YEAR } from './domain/constants';
import { calculatorSchema, defaultValues, type CalculatorFormValues } from './domain/schema';
import { useCalculation } from './hooks/useCalculation';
import { theme } from './theme';
import { formatMoney } from './utils/format';

const STORAGE_KEY = 'kalkulator-inwestora:v1';

const STEPS: Array<{ label: string; fields: Array<FieldPath<CalculatorFormValues>> }> = [
  { label: 'Budżet', fields: ['monthlyAmount', 'employmentType'] },
  { label: 'IKE / IKZE', fields: ['useIke', 'useIkze', 'ikeAnnual', 'ikzeAnnual'] },
  { label: 'Proporcje', fields: ['weights'] },
  { label: 'Strategia', fields: ['strategy', 'neutralWrappers', 'roundTo100', 'roundingTarget'] },
  { label: 'Wyniki', fields: [] },
];

function loadStored(): CalculatorFormValues {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultValues;
    const parsed = calculatorSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : defaultValues;
  } catch {
    return defaultValues;
  }
}

function CalculatorShell() {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [activeStep, setActiveStep] = useState(0);

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: loadStored(),
    mode: 'onChange',
  });

  const result = useCalculation(form.control);
  const isLast = activeStep === STEPS.length - 1;

  useEffect(() => {
    const subscription = form.watch((values) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } catch {
        /* localStorage niedostępny (tryb prywatny) — działamy dalej bez zapisu */
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const goNext = useCallback(async () => {
    const valid = await form.trigger(STEPS[activeStep].fields);
    if (valid) setActiveStep((step) => Math.min(step + 1, STEPS.length - 1));
  }, [activeStep, form]);

  const reset = useCallback(() => {
    form.reset(defaultValues);
    setActiveStep(0);
  }, [form]);

  return (
    <FormProvider {...form}>
      <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}
        >
          <Toolbar sx={{ gap: 1.5 }}>
            <InsightsIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: '1rem', sm: '1.15rem' } }}>
              Kalkulator inwestora
            </Typography>
            <Chip size="small" color="primary" variant="outlined" label={`Limity ${CURRENT_YEAR}`} />
            <Tooltip title="Przywróć ustawienia domyślne">
              <Button
                size="small"
                color="inherit"
                onClick={reset}
                startIcon={<RestartAltIcon />}
                sx={{ minWidth: 0, px: { xs: 1, sm: 2 }, '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 } } }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Reset
                </Box>
              </Button>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: { xs: 2.5, md: 4 }, flexGrow: 1 }}>
          {isMobile ? (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", mb: 1 }}>
                <Typography variant="subtitle2">{STEPS[activeStep].label}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Krok {activeStep + 1} z {STEPS.length}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={((activeStep + 1) / STEPS.length) * 100}
                sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)' }}
              />
            </Box>
          ) : (
            <Stepper nonLinear activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
              {STEPS.map((step, index) => (
                <Step key={step.label} completed={index < activeStep}>
                  <StepButton onClick={() => setActiveStep(index)}>{step.label}</StepButton>
                </Step>
              ))}
            </Stepper>
          )}

          {activeStep === 0 ? <BudgetStep /> : null}
          {activeStep === 1 ? <AccountsStep /> : null}
          {activeStep === 2 ? <ProportionsStep /> : null}
          {activeStep === 3 ? <StrategyStep /> : null}
          {activeStep === 4 ? <ResultsStep result={result} /> : null}
        </Container>

        <Paper
          square
          sx={{
            position: 'sticky',
            bottom: 0,
            borderRadius: 0,
            borderLeft: 0,
            borderRight: 0,
            borderBottom: 0,
            backdropFilter: 'blur(8px)',
            bgcolor: 'rgba(22, 34, 50, 0.92)',
            zIndex: (t) => t.zIndex.appBar,
          }}
        >
          <Container maxWidth="lg" sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Button
                onClick={() => setActiveStep((step) => Math.max(0, step - 1))}
                disabled={activeStep === 0}
                startIcon={<ArrowBackIcon />}
                color="inherit"
              >
                Wstecz
              </Button>

              <Box sx={{ flexGrow: 1, minWidth: 0, textAlign: 'center' }}>
                {result ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      Rocznie
                    </Typography>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {formatMoney(result.budgetTotal)}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="warning.main" noWrap>
                    Uzupełnij dane
                  </Typography>
                )}
              </Box>

              <Button
                variant="contained"
                onClick={isLast ? () => setActiveStep(0) : goNext}
                endIcon={isLast ? undefined : <ArrowForwardIcon />}
              >
                {isLast ? 'Zmień dane' : 'Dalej'}
              </Button>
            </Stack>
          </Container>
        </Paper>
      </Box>
    </FormProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CalculatorShell />
    </ThemeProvider>
  );
}
