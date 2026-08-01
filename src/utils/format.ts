const currency = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyCompact = new Intl.NumberFormat('pl-PL', {
  style: 'currency',
  currency: 'PLN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatMoney = (value: number): string => currency.format(value);

export const formatMoneyShort = (value: number): string => currencyCompact.format(value);

export const formatPercent = (value: number): string => `${percent.format(value)}%`;

export const formatDrift = (value: number): string => {
  // Poniżej progu wyświetlania traktujemy odchylenie jako zerowe, żeby nie
  // pokazywać mylącego „-0,0 pkt".
  if (Math.abs(value) < 0.05) return '0,0 pkt';
  return `${value > 0 ? '+' : ''}${percent.format(value)} pkt`;
};
