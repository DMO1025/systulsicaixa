
"use client";

import { useContext } from 'react';
import { AppConfigContext } from '@/contexts/AppConfigContext';

export const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (context === undefined) {
    throw new Error('useAppConfig must be used within an AppConfigProvider');
  }
  return context;
};
