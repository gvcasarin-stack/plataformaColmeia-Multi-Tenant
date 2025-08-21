import { IconProps } from './types';

// Importações dos componentes
import AlertIcon from './alert';
import BellIcon from './bell';
import CheckIcon from './check';
import ClockIcon from './clock';
import FileIcon from './file';
import LayoutGridIcon from './layout-grid';
import MessageIcon from './message';
import PlusIcon from './plus';
import RefreshIcon from './refresh';
import SearchIcon from './search';
import TableIcon from './table';

// Exporta todos os componentes com seus nomes originais
export {
  AlertIcon,
  BellIcon,
  CheckIcon,
  ClockIcon,
  FileIcon,
  LayoutGridIcon,
  MessageIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  TableIcon
};

// Exportações para compatibilidade com lucide-react
export { AlertIcon as AlertTriangle };
export { BellIcon as Bell };
export { CheckIcon as Check };
export { ClockIcon as Clock };
export { FileIcon as File };
export { LayoutGridIcon as LayoutGrid };
export { MessageIcon as MessageSquare };
export { PlusIcon as Plus };
export { RefreshIcon as RefreshCw };
export { SearchIcon as Search };
export { TableIcon as Table };

// Exporta tipo IconProps
export type { IconProps };
