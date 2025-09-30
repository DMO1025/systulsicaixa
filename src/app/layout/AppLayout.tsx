
"use client";

import React, { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Breadcrumbs from './Breadcrumbs'; // Import the new component
import { useAuth } from '@/contexts/AuthContext';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { appName, isLoading: configLoading } = useAppConfig();

  useEffect(() => {
    if(appName) {
      document.title = appName;
    }
  }, [appName]);

  const isLoading = authLoading || configLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Skeleton className="h-16 w-full" />
        <div className="flex flex-1">
          {/* No sidebar skeleton needed anymore */}
          <div className="flex-1 p-4">
            <Skeleton className="w-full h-32 mb-4" />
            <Skeleton className="w-full h-64" />
          </div>
        </div>
      </div>
    );
  }

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background overflow-auto">
        <Breadcrumbs /> {/* Add Breadcrumbs here */}
        {children}
      </main>
    </div>
  );
}
