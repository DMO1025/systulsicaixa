
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LogOut,
  User,
  Settings,
  MenuIcon,
  LayoutDashboard,
  FileText,
  CalendarPlus,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggleButton } from './ThemeToggleButton';
import type { PageId } from '@/lib/types';

const baseNavItems = [
  { id: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'entry', href: '/entry', label: 'Lançamento Diário', icon: CalendarPlus },
  { id: 'reports', href: '/reports', label: 'Relatórios', icon: FileText },
  { id: 'help', href: '/help', label: 'Ajuda', icon: HelpCircle },
];

export default function Header() {
  const { userRole, logout, allowedPages } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = baseNavItems.filter(item => {
    if (item.id === 'help') return true; // Help is always visible

    if (userRole === 'administrator') {
      return true;
    }
    if (userRole === 'operator') {
      return allowedPages?.includes(item.id as PageId);
    }
    return false;
  });

  const getLinkClassName = (href: string) => {
    // Exact match for homepage, startsWith for others
    if (href === '/') {
        return pathname === href ? "bg-muted text-primary font-semibold" : "font-medium";
    }
    return pathname.startsWith(href) ? "bg-muted text-primary font-semibold" : "font-medium";
  };

  const getButtonVariant = (href: string) => {
    if (href === '/') {
      return pathname === href ? 'secondary' : 'ghost';
    }
    return pathname.startsWith(href) ? 'secondary' : 'ghost';
  };


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <MenuIcon className="h-5 w-5" />
              <span className="sr-only">Alternar menu de navegação</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader className="mb-4">
               <Link href="/" className="flex items-center gap-2 text-left">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-primary">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
                <SheetTitle className="text-xl font-semibold text-primary">SysTulsi Caixa</SheetTitle>
              </Link>
            </SheetHeader>
            <nav className="grid gap-2 text-lg font-medium">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                    getLinkClassName(item.href)
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="hidden md:flex items-center gap-2">
         <Link href="/" className="flex items-center gap-2 mr-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-xl font-semibold text-primary">SysTulsi Caixa</h1>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Button
              key={item.label}
              asChild
              variant={getButtonVariant(item.href)}
              className="text-sm font-medium"
            >
              <Link href={item.href} className="flex items-center gap-2 px-3 py-2">
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </nav>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggleButton />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{userRole ? userRole.substring(0, 2).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">Sessão Iniciada</p>
                <p className="text-xs leading-none text-muted-foreground">
                  Função: {userRole || 'N/A'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userRole === 'administrator' && (
              <>
                <DropdownMenuItem onClick={() => router.push('/admin/settings/users')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil & Operadores</span>
                </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
