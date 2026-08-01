import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, subtitle, icon, action, children }: SectionCardProps) {
  return (
    <Paper sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        spacing={1.5}
       
       
        sx={{ alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
          {icon ? (
            <Box sx={{ color: 'primary.main', display: 'flex', mt: '2px' }}>{icon}</Box>
          ) : null}
          <Box>
            <Typography variant="h6">{title}</Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
          </Box>
        </Stack>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
