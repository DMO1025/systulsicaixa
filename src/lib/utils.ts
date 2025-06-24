import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSafeNumericValue = (data: any, path: string, defaultValue: number = 0): number => {
  if (data === undefined || data === null) return defaultValue;
  const parts = path.split('.');
  let current = data;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  const numValue = current !== undefined && current !== null ? parseFloat(String(current)) : defaultValue;
  return isNaN(numValue) ? defaultValue : numValue;
};
