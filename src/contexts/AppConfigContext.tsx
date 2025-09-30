
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSetting } from '@/services/settingsService';

interface AppConfigContextType {
  appName: string;
  setAppName: (name: string) => void;
  isLoading: boolean;
}

export const AppConfigContext = createContext<AppConfigContextType | undefined>(undefined);

export const AppConfigProvider = ({ children }: { children: ReactNode }) => {
  const [appName, setAppName] = useState('Caixa Tulsi');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAppName() {
      try {
        const storedName = await getSetting('appName');
        if (storedName && typeof storedName === 'string') {
          setAppName(storedName);
        }
      } catch (error) {
        console.error("Failed to load app name setting, using default.", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadAppName();
  }, []);

  return (
    <AppConfigContext.Provider value={{ appName, setAppName, isLoading }}>
      {children}
    </AppConfigContext.Provider>
  );
};
