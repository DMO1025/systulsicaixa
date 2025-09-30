
"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { REPORTS_PATHS } from '@/lib/config/navigation';

// This page now acts as a redirector to the default report type.
export default function ReportsRootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the default report page which is 'month'
    router.replace(REPORTS_PATHS.MONTH);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}
