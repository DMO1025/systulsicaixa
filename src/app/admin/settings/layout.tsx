
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ADMIN_SETTINGS_GROUPS } from '@/lib/config/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


export default function AdminSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      router.push('/');
    }
  }, [userRole, authLoading, router]);

  const activeGroup = React.useMemo(() => {
    for (const group of ADMIN_SETTINGS_GROUPS) {
      if (group.items.some(item => pathname.startsWith(item.href))) {
        return group.title;
      }
    }
    return ADMIN_SETTINGS_GROUPS[0]?.title; // Default to the first group
  }, [pathname]);


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
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Configurações</h2>
        </div>
        <ScrollArea className="flex-grow">
            <Accordion type="multiple" className="w-full" defaultValue={[activeGroup || '']}>
              {ADMIN_SETTINGS_GROUPS.map((group) => (
                <AccordionItem value={group.title} key={group.title} className="border-none">
                  <AccordionTrigger className="text-xs font-semibold uppercase text-muted-foreground tracking-wider px-3 py-2 hover:no-underline [&[data-state=open]>svg]:-rotate-180">
                    <div className="flex items-center gap-2">
                        {group.title}
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="flex flex-col gap-1 mt-1">
                      {group.items.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.id}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                                pathname.startsWith(link.href) ? "bg-primary/20 text-primary font-semibold" : "font-medium"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {link.title}
                          </Link>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        </ScrollArea>
      </aside>
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
