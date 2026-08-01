import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: string;
  hint?: ReactNode;
  accent?: string;
}

export function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <Paper sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
      {accent ? (
        <Box
          sx={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, bgcolor: accent }}
        />
      ) : null}
      <Typography variant="body2" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}
