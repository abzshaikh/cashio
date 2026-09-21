import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';
import type { SvgIconComponent } from '@mui/icons-material';

interface ComingSoonPageProps {
  title: string;
  subtitle: string;
  icon: SvgIconComponent;
  phaseLabel: string;
}

/**
 * Placeholder used for routes established in Phase 1 whose real functionality
 * arrives in a later phase (see PHASE_LOG.md). Keeps the route, layout and
 * navigation entry real and working now, without building ahead of scope.
 */
export function ComingSoonPage({
  title,
  subtitle,
  icon: Icon,
  phaseLabel,
}: ComingSoonPageProps) {
  return (
    <Box>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<Chip label={phaseLabel} size="small" color="primary" variant="outlined" />}
      />
      <EmptyState
        icon={<Icon fontSize="inherit" />}
        title="Coming soon"
        description={`This section will be built in ${phaseLabel}.`}
      />
    </Box>
  );
}
