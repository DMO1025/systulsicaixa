
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { BarChartBig, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { REPORTS_GROUPS, PATHS } from '@/lib/config/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";


export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userRole, isLoading: authLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!authLoading && userRole !== 'administrator') {
      router.push(PATHS.HOME);
    }
  }, [userRole, authLoading, router]);

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (userRole !== 'administrator') {
    return null;
  }
  
  const getAccordionDefaultValues = () => {
    const defaultValues = [];
    for (const group of REPORTS_GROUPS) {
        for (const item of group.items) {
             if (pathname.startsWith(item.href.split('?')[0]) || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href.split('?')[0])))) {
                defaultValues.push(group.title);
                break; 
            }
        }
    }
    if (defaultValues.length === 0) {
        defaultValues.push('Relatórios Financeiros'); // Fallback to the first group
    }
    return defaultValues;
  };

  const getActiveSubAccordionValue = () => {
    for (const group of REPORTS_GROUPS) {
      const activeParent = group.items.find(item => item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href.split('?')[0])));
      if (activeParent) {
        return `sub-${activeParent.id}`;
      }
    }
    return undefined;
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <aside className="w-64 border-r bg-muted/20 p-4 hidden md:flex flex-col">
        <div className="flex items-center gap-2 mb-6 flex-shrink-0">
          <BarChartBig className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold">Relatórios</h2>
        </div>
        <ScrollArea className="flex-grow">
            <Accordion type="multiple" className="w-full" defaultValue={getAccordionDefaultValues()}>
              {REPORTS_GROUPS.map((group) => (
                <AccordionItem value={group.title} key={group.title} className="border-none">
                  <AccordionTrigger className="text-xs font-semibold uppercase text-muted-foreground tracking-wider px-3 py-2 hover:no-underline [&[data-state=open]>svg]:-rotate-180">
                    <div className="flex items-center gap-2">
                        {group.title}
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <Accordion type="single" collapsible defaultValue={getActiveSubAccordionValue()} className="w-full">
                    <div className="flex flex-col gap-1 mt-1">
                      {group.items.map((link) => {
                        if (link.subItems) {
                            const isParentActive = link.subItems.some(sub => {
                                const currentView = searchParams.get('view');
                                const subLinkView = new URLSearchParams(sub.href.split('?')[1] || '').get('view');
                                return pathname.startsWith(sub.href.split('?')[0]) && (!subLinkView || currentView === subLinkView);
                            });
                            
                            return (
                                <AccordionItem value={`sub-${link.id}`} key={link.id} className="border-none">
                                    <AccordionTrigger className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10 w-full hover:no-underline",
                                        isParentActive && "bg-primary/10"
                                    )}>
                                        <div className="flex items-center gap-3 flex-1">
                                            <link.icon className={cn("h-5 w-5", isParentActive && "text-primary")} />
                                            <span className={cn("font-medium", isParentActive && "text-primary font-semibold")}>{link.title}</span>
                                        </div>
                                         <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isParentActive && "text-primary")} />
                                    </AccordionTrigger>
                                    <AccordionContent className="pl-6 pt-1 pb-0">
                                        <div className="flex flex-col gap-1 border-l-2 border-primary/20">
                                            {link.subItems.map(subLink => {
                                                const currentView = searchParams.get('view');
                                                const subLinkView = new URLSearchParams(subLink.href.split('?')[1] || '').get('view');
                                                const isSubActive = pathname.startsWith(subLink.href.split('?')[0]) && currentView === subLinkView;

                                                return (
                                                    <Link
                                                        key={subLink.id}
                                                        href={subLink.href}
                                                        className={cn("flex items-center gap-3 rounded-r-lg pl-4 pr-2 py-2 text-muted-foreground transition-all text-sm hover:text-primary hover:bg-primary/10",
                                                            isSubActive ? "bg-primary/10 text-primary font-semibold" : "font-medium"
                                                        )}
                                                    >
                                                        <subLink.icon className="h-4 w-4"/>
                                                        {subLink.title}
                                                    </Link>
                                                )
                                            })}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        }
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.id}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-primary/10",
                                pathname === link.href ? "bg-primary/20 text-primary font-semibold" : "font-medium"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {link.title}
                          </Link>
                        );
                      })}
                    </div>
                    </Accordion>
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
