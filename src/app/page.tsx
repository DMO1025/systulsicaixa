
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { PAGE_ID_TO_PATH } from '@/lib/config/navigation';

export default function RootPage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, allowedPages, userRole } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const primaryPageId = allowedPages?.[0] || (userRole === 'administrator' ? 'dashboard' : 'entry');
      const redirectTo = PAGE_ID_TO_PATH[primaryPageId] || '/dashboard';
      router.replace(redirectTo);
    }
  }, [isLoading, isAuthenticated, router, allowedPages, userRole]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
