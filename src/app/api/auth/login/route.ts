
import { type NextRequest, NextResponse } from 'next/server';
import type { OperatorShift } from '@/lib/types';
import { findUser } from '@/lib/data/users';
import { logAction } from '@/services/auditService';

export async function POST(request: NextRequest) {
  try {
    const { username, password, selectedShift } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await findUser(username);
    
    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Usuário ou senha inválidos.' }, { status: 401 });
    }
    
    // Log successful login
    await logAction(username, 'LOGIN_SUCCESS', `Usuário '${username}' logado com sucesso.`);

    if (user.role === 'operator') {
      if (!selectedShift) {
        return NextResponse.json({ message: 'Turno é obrigatório para operadores.' }, { status: 400 });
      }
      if (!user.shifts.includes(selectedShift as OperatorShift)) {
        return NextResponse.json({ message: 'Operador não tem permissão para este turno.' }, { status: 403 });
      }
      return NextResponse.json({ 
        role: user.role, 
        shift: selectedShift,
        allowedPages: user.allowedPages || [] 
      });
    }

    // For administrator
    return NextResponse.json({ 
      role: user.role,
      allowedPages: user.allowedPages || ['dashboard', 'entry', 'reports', 'controls', 'estornos']
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor durante o login.' }, { status: 500 });
  }
}

    