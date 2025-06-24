
import { type NextRequest, NextResponse } from 'next/server';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import type { User } from '@/lib/types';
import { revalidateTag } from 'next/cache';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    const updatedData: Partial<User> = await request.json();
    const allUsers = await getUsersFromFile();
    
    const userIndex = allUsers.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    const userToUpdate = { ...allUsers[userIndex], ...updatedData };

    if (userToUpdate.role === 'administrator') {
        userToUpdate.shifts = [];
        userToUpdate.allowedPages = ['dashboard', 'entry', 'reports'];
    }

    if (!updatedData.password) {
        userToUpdate.password = allUsers[userIndex].password;
    }

    allUsers[userIndex] = userToUpdate;

    await saveUsersToFile(allUsers);
    
    revalidateTag('users');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = allUsers[userIndex];
    return NextResponse.json(userToReturn);

  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    return NextResponse.json({ message: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    const allUsers = await getUsersFromFile();
    
    const userToDelete = allUsers.find(u => u.id === userId);
    if (!userToDelete) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (userToDelete.id === '1') {
        return NextResponse.json({ message: 'Não é possível remover a conta de administrador original.' }, { status: 403 });
    }

    const newUsers = allUsers.filter(u => u.id !== userId);
    
    await saveUsersToFile(newUsers);

    revalidateTag('users');

    return NextResponse.json({ message: 'Operador removido com sucesso.' });
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    return NextResponse.json({ message: 'Erro ao remover usuário.' }, { status: 500 });
  }
}
