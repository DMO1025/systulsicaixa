"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { BASE_NAV_ITEMS, ADMIN_SETTINGS_GROUPS, REPORTS_GROUPS, PATHS } from '@/lib/config/navigation';

interface BreadcrumbPart {
  label: string;
  href: string;
  isCurrent: boolean;
}

const findLabel = (segment: string) => {
    const allNavItems = [
        ...BASE_NAV_ITEMS,
        ...ADMIN_SETTINGS_GROUPS.flatMap(g => g.items),
        ...REPORTS_GROUPS.flatMap(g => g.items)
    ];

    const navItem = allNavItems.find(item => item.href.endsWith(segment));
    if (navItem) return navItem.label;

    const period = PERIOD_DEFINITIONS.find(p => p.id === segment);
    if (period) return period.label;
    
    return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};


const Breadcrumbs: React.FC = () => {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const parts: BreadcrumbPart[] = [];
    if (!pathname || pathname === '/') return parts;

    const pathSegments = pathname.split('/').filter(segment => segment);
    
    let currentPath = '';

    // Add a root "Início" link
    parts.push({
        label: "Início",
        href: PATHS.DASHBOARD,
        isCurrent: pathname === PATHS.DASHBOARD || pathname === '/',
    });
    
    pathSegments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const isLast = index === pathSegments.length - 1;
        
        let label = findLabel(segment);
        let href = currentPath;
        
        if(segment === 'entry' || segment === 'controls' || segment === 'estornos' || segment === 'reports' || segment === 'admin') {
            const baseItem = BASE_NAV_ITEMS.find(item => item.href === href);
            if(baseItem) label = baseItem.label;
        }

        // Avoid duplicating "Início" if dashboard is the only segment
        if (segment === 'dashboard' && pathSegments.length === 1) {
            return;
        }

        parts.push({
            label: label,
            href: href,
            isCurrent: isLast,
        });
    });

    return parts;
  }, [pathname]);

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <div className="mb-4 flex items-center space-x-1 text-sm text-muted-foreground">
      {breadcrumbs.map((part, index) => (
        <React.Fragment key={part.href}>
          <Link
            href={part.href}
            className={cn(
              "hover:text-primary transition-colors",
              part.isCurrent ? "font-semibold text-foreground" : ""
            )}
          >
            {part.label}
          </Link>
          {!part.isCurrent && (
            <ChevronRight className="h-4 w-4" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Breadcrumbs;
