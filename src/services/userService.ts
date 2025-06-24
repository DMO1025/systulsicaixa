
"use client";

import type { User } from '@/lib/types';

const API_BASE_URL = '/api/users';

async function handleResponse(response: Response, defaultError: string) {
    if (!response.ok) {
        let message = defaultError;
        try {
            const errorData = await response.json();
            message = errorData.message || message;
        } catch(e) {
        }
        throw new Error(message);
    }
    return response.json();
}

export async function getOperators(): Promise<User[]> {
  const response = await fetch(API_BASE_URL);
  return handleResponse(response, 'Falha ao buscar usuários.');
}

export async function createOperator(userData: Partial<User>): Promise<User> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(response, 'Falha ao criar usuário.');
}

export async function updateOperator(userId: string, userData: Partial<User>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  return handleResponse(response, 'Falha ao atualizar usuário.');
}

export async function deleteOperator(userId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/${userId}`, {
    method: 'DELETE',
  });
  return handleResponse(response, 'Falha ao remover usuário.');
}
