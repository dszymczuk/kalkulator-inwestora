import { createTheme, alpha } from '@mui/material/styles';

const BG = '#0d1b2a';
const SURFACE = '#162232';
const BORDER = '#1e3448';
const ACCENT = '#00c9a7';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: BG, paper: SURFACE },
    primary: { main: ACCENT, light: '#4dd9be', dark: '#009b80', contrastText: BG },
    secondary: { main: '#1e90ff', light: '#63b3ff', dark: '#0066cc' },
    text: { primary: '#e8f0f7', secondary: '#8bafc9' },
    divider: BORDER,
    success: { main: '#00c9a7' },
    warning: { main: '#ffb547' },
    error: { main: '#ff5a5f' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.5px' },
    h5: { fontWeight: 700, letterSpacing: '-0.3px' },
    h6: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: `1px solid ${BORDER}` },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: BORDER },
            '&:hover fieldset': { borderColor: ACCENT },
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 700,
          letterSpacing: '0.3px',
          borderRadius: 8,
          padding: '9px 22px',
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            background: `linear-gradient(135deg, ${ACCENT} 0%, #009b80 100%)`,
            boxShadow: `0 4px 15px ${alpha(ACCENT, 0.3)}`,
            '&:hover': { boxShadow: `0 6px 20px ${alpha(ACCENT, 0.45)}` },
          },
        },
      ],
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderColor: BORDER,
          '&.Mui-selected': {
            backgroundColor: alpha(ACCENT, 0.16),
            color: ACCENT,
            '&:hover': { backgroundColor: alpha(ACCENT, 0.24) },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: BORDER },
        head: { fontWeight: 700, color: '#8bafc9', whiteSpace: 'nowrap' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1e3448',
          border: `1px solid ${alpha(ACCENT, 0.3)}`,
          fontSize: '0.8rem',
        },
      },
    },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12 } } },
  },
});
