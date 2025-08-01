
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

const PATH_TO_PAGE_ID: Record<string, PageId | 'help' | 'admin'> = {
  '/': 'dashboard',
  '/entry': 'entry',
  '/controls': 'controls',
  '/reports': 'reports',
  '/help': 'help',
  '/admin': 'admin',
};

// Helper function to set a cookie
function setCookie(name: string, value: string, days: number) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

// Helper function to get a cookie
function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name: string) {   
    document.cookie = name+'=; Max-Age=-99999999; path=/;';  
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [operatorShift, setOperatorShift] = useState<OperatorShift | null>(null);
  const [allowedPages, setAllowedPages] = useState<PageId[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedRole = getCookie('userRole') as UserRole | null;
    const storedShift = getCookie('operatorShift') as OperatorShift | null;
    const storedPagesJSON = getCookie('allowedPages');
    
    if (storedRole) {
      setIsAuthenticated(true);
      setUserRole(storedRole);
      if (storedRole === 'operator' && storedShift) {
        setOperatorShift(storedShift);
      }
       if (storedPagesJSON) {
        try {
          const storedPages = JSON.parse(storedPagesJSON);
          setAllowedPages(storedPages);
        } catch (e) {
            console.error("Failed to parse allowedPages cookie", e);
            setAllowedPages(storedRole === 'administrator' ? ['dashboard', 'entry', 'reports', 'controls'] : []);
        }
      } else if (storedRole === 'administrator') {
        setAllowedPages(['dashboard', 'entry', 'reports', 'controls']);
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
        const sortedPaths = Object.keys(PATH_TO_PAGE_ID).sort((a, b) => b.length - a.length);
        const currentPagePath = sortedPaths.find(p => pathname.startsWith(p));
        
        let isAllowed = false;
        
        if (currentPagePath) {
          const pageId = PATH_TO_PAGE_ID[currentPagePath];
          if (pageId === 'admin') {
            isAllowed = false; // Operators are never allowed in admin
          } else if (pageId === 'help') {
            isAllowed = true; // All authenticated users can see help
          } else {
            isAllowed = allowedPages.includes(pageId as PageId);
          }
        } else {
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
    setCookie('userRole', role, 1);

    const pagesToStore = role === 'administrator' ? ['dashboard', 'entry', 'reports', 'controls'] : (pages || []);
    setAllowedPages(pagesToStore);
    setCookie('allowedPages', JSON.stringify(pagesToStore), 1);
    
    if (role === 'operator' && shift) {
      setOperatorShift(shift);
      setCookie('operatorShift', shift, 1);
    } else {
      setOperatorShift(null);
      eraseCookie('operatorShift');
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
    eraseCookie('userRole');
    eraseCookie('operatorShift');
    eraseCookie('allowedPages');
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
