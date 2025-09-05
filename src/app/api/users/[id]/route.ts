
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from '@/lib/types';
import { updateUser, deleteUser } from '@/lib/data/users';
import { revalidateTag } from 'next/cache';
import { logAction } from '@/services/auditService';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    const updatedData: Partial<User> = await request.json();
    const updatedUser = await updateUser(userId, updatedData);
    
    const actorUsername = getCookie('username', { cookies }) || 'sistema';
    await logAction(actorUsername, 'UPDATE_USER', `Usuário '${updatedUser.username}' (ID: ${userId}) foi atualizado.`);

    revalidateTag('users');
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = updatedUser;
    return NextResponse.json(userToReturn);

  } catch (error: any) {
    const statusCode = error.message.includes('não encontrado') ? 404 : 500;
    return NextResponse.json({ message: error.message || 'Erro ao atualizar usuário.' }, { status: statusCode });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    const result = await deleteUser(userId);
    
    const actorUsername = getCookie('username', { cookies }) || 'sistema';
    await logAction(actorUsername, 'DELETE_USER', `Usuário com ID: ${userId} foi removido.`);

    revalidateTag('users');
    
    return NextResponse.json(result);
  } catch (error: any) {
    const statusCode = error.message.includes('não encontrado') ? 404 : 
                      error.message.includes('Não é possível remover') ? 403 : 500;
    return NextResponse.json({ message: error.message || 'Erro ao remover usuário.' }, { status: statusCode });
  }
}
