import type { ComponentType } from 'react';

export interface NavItem {
  /** Label shown in the sidebar/drawer */
  label: string;
  /** Route path, relative to the app root */
  path: string;
  /** MUI icon component */
  icon: ComponentType;
}
