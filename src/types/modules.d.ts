// Type declarations for missing modules

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export const FileEdit: FC<SVGProps<SVGSVGElement>>;
  export const PlusCircle: FC<SVGProps<SVGSVGElement>>;
  export const Trash2: FC<SVGProps<SVGSVGElement>>;
  export const Edit: FC<SVGProps<SVGSVGElement>>;
  export const Check: FC<SVGProps<SVGSVGElement>>;
  export const X: FC<SVGProps<SVGSVGElement>>;
  export const Users: FC<SVGProps<SVGSVGElement>>;
  export const LayoutDashboard: FC<SVGProps<SVGSVGElement>>;
  export const ListTodo: FC<SVGProps<SVGSVGElement>>;
  export const Settings: FC<SVGProps<SVGSVGElement>>;
  export const ChevronLeft: FC<SVGProps<SVGSVGElement>>;
  export const ChevronRight: FC<SVGProps<SVGSVGElement>>;
  export const LogOut: FC<SVGProps<SVGSVGElement>>;
  export const Users2: FC<SVGProps<SVGSVGElement>>;
  export const Calculator: FC<SVGProps<SVGSVGElement>>;
  export const Bell: FC<SVGProps<SVGSVGElement>>;
  export const Hexagon: FC<SVGProps<SVGSVGElement>>;
  export const Menu: FC<SVGProps<SVGSVGElement>>;
  export const Home: FC<SVGProps<SVGSVGElement>>;
  export const BarChart3: FC<SVGProps<SVGSVGElement>>;
  export const Sun: FC<SVGProps<SVGSVGElement>>;
  export const LineChart: FC<SVGProps<SVGSVGElement>>;
  export const Building2: FC<SVGProps<SVGSVGElement>>;
  export const UserCircle2: FC<SVGProps<SVGSVGElement>>;
  export const BellRing: FC<SVGProps<SVGSVGElement>>;
  export const Lightbulb: FC<SVGProps<SVGSVGElement>>;
  export const Moon: FC<SVGProps<SVGSVGElement>>;
  export const DollarSign: FC<SVGProps<SVGSVGElement>>;
  // Adicionando os ícones faltantes para a página de perfil
  export const User: FC<SVGProps<SVGSVGElement>>;
  export const Mail: FC<SVGProps<SVGSVGElement>>;
  export const Phone: FC<SVGProps<SVGSVGElement>>;
  export const Building: FC<SVGProps<SVGSVGElement>>;
  export const Shield: FC<SVGProps<SVGSVGElement>>;
  export const Save: FC<SVGProps<SVGSVGElement>>;
  export const Key: FC<SVGProps<SVGSVGElement>>;
  export const CreditCard: FC<SVGProps<SVGSVGElement>>;
  export const Briefcase: FC<SVGProps<SVGSVGElement>>;
  // Ícones para a página de teste de e-mail
  export const Send: FC<SVGProps<SVGSVGElement>>;
  export const CheckCircle: FC<SVGProps<SVGSVGElement>>;
  export const AlertCircle: FC<SVGProps<SVGSVGElement>>;
  // Ícones para a página de cobranças
  export const Printer: FC<SVGProps<SVGSVGElement>>;
  export const Download: FC<SVGProps<SVGSVGElement>>;
  export const Search: FC<SVGProps<SVGSVGElement>>;
  export const Zap: FC<SVGProps<SVGSVGElement>>;
  export const ChevronsUpDown: FC<SVGProps<SVGSVGElement>>;
  export const ArrowUpDown: FC<SVGProps<SVGSVGElement>>;
  export const ChevronDown: FC<SVGProps<SVGSVGElement>>;
  // Add other icons as needed
}

declare module '@tanstack/react-table' {
  export interface ColumnDef<T> {
    id?: string;
    accessorKey?: string;
    header?: string | ((props: any) => React.ReactNode);
    cell?: (props: any) => React.ReactNode;
    enableSorting?: boolean;
    enableHiding?: boolean;
    // Add any other properties used in your code
  }
  
  export interface Row<T> {
    original: T;
    getValue: (key: string) => any;
  }
  
  // Add other types as needed
} 