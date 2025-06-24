
"use client";

import type { UserRole, OperatorShift, PageId } from '@/lib/types';

export async function login(username: string, password?: string, selectedShift?: OperatorShift): Promise<{ role: UserRole, shift?: OperatorShift, allowedPages?: PageId[] }> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, selectedShift }),
  });

  if (!response.ok) {
    let errorMessage = 'Falha no login.';
    try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
    } catch (e) {
        errorMessage = response.statusText || `Erro HTTP ${response.status}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
