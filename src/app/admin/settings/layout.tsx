

"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingsIcon, Eye, DollarSign, Database, ArrowRightLeft, LayoutList, ListChecks, Users, FileSpreadsheet, Upload, Briefcase, KeyRound, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const userAndUIGroup = [
  { id: 'users', title: 'Perfil & Operadores', href: '/admin/settings/users', icon: Users },
  { id: 'visibility', title: 'Visibilidade dos Cards', href: '/admin/settings/visibility', icon: Eye },
  { id: 'dashboard-visibility', title: 'Visibilidade do Dashboard', href: '/admin/settings/dashboard-visibility', icon: LayoutList },
  { id: 'summary-card', title: 'Itens do Resumo', href: '/admin/settings/summary-card', icon: ListChecks },
];

const dataAndConfigGroup = [
  { id: 'billed-clients', title: 'Pessoas/Setores Faturados', href: '/admin/settings/billed-clients', icon: Briefcase },
  { id: 'noshow-clients', title: 'Clientes No-Show', href: '/admin/settings/noshow-clients', icon: UserMinus },
  { id: 'unit-prices', title: 'Preços Unitários', href: '/admin/settings/unit-prices', icon: DollarSign },
  { id: 'data-templates', title: 'Modelos de Dados', href: '/admin/settings/data-templates', icon: FileSpreadsheet },
  { id: 'data-import', title: 'Importação de Dados', href: '/admin/settings/data-import', icon: Upload },
  { id: 'migration', title: 'Migração de Dados', href: '/admin/settings/migration', icon: ArrowRightLeft },
  { id: 'database', title: 'Banco de Dados', href: '/admin/settings/database', icon: Database },
  { id: 'api-access', title: 'Acesso API', href: '/admin/settings/api-access', icon: KeyRound },
];


export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      router.push('/');
    }
  }, [userRole, authLoading, router]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null; 
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside className="w-64 border-r bg-muted/20 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-6 flex-shrink-0">
          <SettingsIcon className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Configurações</h2>
        </div>
        <ScrollArea className="flex-grow">
            <nav className="flex flex-col gap-4 pr-4">
            <div>
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Interface e Acesso</h3>
                <div className="flex flex-col gap-1">
                {userAndUIGroup.map((link) => (
                    <Link
                    key={link.id}
                    href={link.href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                        pathname.startsWith(link.href) ? "bg-primary/20 text-primary font-semibold" : "font-medium"
                    )}
                    >
                    <link.icon className="h-5 w-5" />
                    {link.title}
                    </Link>
                ))}
                </div>
            </div>
            <div>
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Dados e Configuração</h3>
                <div className="flex flex-col gap-1">
                {dataAndConfigGroup.map((link) => (
                    <Link
                    key={link.id}
                    href={link.href}
                    className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                        pathname.startsWith(link.href) ? "bg-primary/20 text-primary font-semibold" : "font-medium"
                    )}
                    >
                    <link.icon className="h-5 w-5" />
                    {link.title}
                    </Link>
                ))}
                </div>
            </div>
            </nav>
        </ScrollArea>
      </aside>
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
