/**
 * Barrel file para componentes UI
 * Este arquivo centraliza as exportações de todos os componentes de UI,
 * facilitando importações em outros arquivos.
 */

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './accordion';
export { Alert, AlertDescription, AlertTitle } from './alert';
export { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './alert-dialog';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';
export { Badge, badgeVariants } from './badge';
export { Button, buttonVariants } from './button';
export { Calendar } from './calendar';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
export { Checkbox } from './checkbox';
export { DataChart } from './data-chart';
export { DataTable } from './data-table';
export { DateRangeFilter } from './date-range-filter';
export { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
export { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from './dropdown-menu';
export { FileUpload } from './file-upload';
export { FilterDropdown } from './filter-dropdown';
export { GlassCard } from './glass-card';
export { Input } from './input';
export { Label } from './label';
export { LayoutProvider, useLayout } from './layout-context';
export { LayoutManager } from './layout-manager';
export { LoaderWithTimeout } from './loader-with-timeout';
export { Loading } from './loading';
export { Logo } from './logo';
export { NavLink } from './nav-link';
export { NavMenu } from './nav-menu';
export { default as OptimizedImage } from './optimized-image';
export { Popover, PopoverContent, PopoverTrigger } from './popover';
export { PersistentLayout } from './persistent-layout';
export { Progress } from './progress';
export { ScrollArea, ScrollBar } from './scroll-area';
export { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from './select';
export { Separator } from './separator';
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from './sheet';
export { Skeleton } from './skeleton';
export { Sidebar, SidebarContent, /* SidebarContext, */ SidebarFooter, SidebarHeader, SidebarMenuItem, SidebarProvider, useSidebar } from './sidebar';
export { Switch } from './switch';
export { Table, TableBody, /* TableCaption, */ TableCell, /* TableFooter, */ TableHead, TableHeader, TableRow } from './table';
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
export { Textarea } from './textarea';
export { ThemeToggle } from './theme-toggle';
export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast';
export { Toaster } from './toaster';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
export { useToast } from './use-toast';

// Dashboard components
export { DashboardLayout } from './dashboard-layout';
export { DashboardStats } from './dashboard-stats';

// Notification components
export { default as NotificationItem } from './notification-item'; 