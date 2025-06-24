
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserRole, OperatorShift, PageId } from '@/lib/types';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  operatorShift: OperatorShift | null;
  allowedPages: PageId[] | null;
  login: (role: UserRole, shift?: OperatorShift, allowedPages?: PageId[]) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PATH_TO_PAGE_ID: Record<string, PageId> = {
  '/': 'dashboard',
  '/entry': 'entry',
  '/reports': 'reports'
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [operatorShift, setOperatorShift] = useState<OperatorShift | null>(null);
  const [allowedPages, setAllowedPages] = useState<PageId[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedRole = localStorage.getItem('userRole') as UserRole | null;
    const storedShift = localStorage.getItem('operatorShift') as OperatorShift | null;
    const storedPages = localStorage.getItem('allowedPages');
    
    if (storedRole) {
      setIsAuthenticated(true);
      setUserRole(storedRole);
      if (storedRole === 'operator' && storedShift) {
        setOperatorShift(storedShift);
      }
      if (storedPages) {
        setAllowedPages(JSON.parse(storedPages));
      } else if (storedRole === 'administrator') {
        setAllowedPages(['dashboard', 'entry', 'reports']);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      const primaryPageId = allowedPages?.[0] || (userRole === 'administrator' ? 'dashboard' : 'entry');
      const primaryRedirectPath = Object.entries(PATH_TO_PAGE_ID).find(([_, pageId]) => pageId === primaryPageId)?.[0] || '/';

      if (pathname === '/login') {
        router.push(primaryRedirectPath);
        return;
      }
      
      if (userRole === 'operator' && allowedPages) {
        // Sort paths by length (desc) to find the most specific match first.
        // e.g., for '/entry/madrugada', it will match '/entry' before '/'.
        const sortedPaths = Object.keys(PATH_TO_PAGE_ID).sort((a, b) => b.length - a.length);
        const currentPagePath = sortedPaths.find(p => pathname.startsWith(p));
        
        let isAllowed = false;

        // Explicitly block admin pages
        if (pathname.startsWith('/admin')) {
            isAllowed = false;
        } else if (currentPagePath) {
            const pageId = PATH_TO_PAGE_ID[currentPagePath];
            isAllowed = allowedPages.includes(pageId);
        } else {
            // Path is not a known page, consider it not allowed for operators
            isAllowed = false;
        }

        if (!isAllowed) {
            router.push(primaryRedirectPath);
        }
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, userRole, allowedPages]);

  const login = (role: UserRole, shift?: OperatorShift, pages?: PageId[]) => {
    setIsAuthenticated(true);
    setUserRole(role);
    localStorage.setItem('userRole', role);

    const pagesToStore = role === 'administrator' ? ['dashboard', 'entry', 'reports'] : (pages || []);
    setAllowedPages(pagesToStore);
    localStorage.setItem('allowedPages', JSON.stringify(pagesToStore));
    
    if (role === 'operator' && shift) {
      setOperatorShift(shift);
      localStorage.setItem('operatorShift', shift);
    } else {
      setOperatorShift(null);
      localStorage.removeItem('operatorShift');
    }

    const primaryPage = pagesToStore[0] || (role === 'administrator' ? 'dashboard' : 'entry');
    const redirectTo = Object.entries(PATH_TO_PAGE_ID).find(([_, pageId]) => pageId === primaryPage)?.[0] || '/';
    router.push(redirectTo);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    setOperatorShift(null);
    setAllowedPages(null);
    localStorage.removeItem('userRole');
    localStorage.removeItem('operatorShift');
    localStorage.removeItem('allowedPages');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userRole, operatorShift, login, logout, isLoading, allowedPages }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
