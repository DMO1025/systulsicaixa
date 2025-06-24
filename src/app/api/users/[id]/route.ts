
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from '@/lib/types';
import { getDbPool, isMysqlConnected, USERS_TABLE_NAME } from '@/lib/mysql';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import type mysql from 'mysql2/promise';
import { revalidateTag } from 'next/cache';

async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const [currentUserResult] = await pool!.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
            if (currentUserResult.length === 0) {
                throw new Error('Usuário não encontrado.');
            }
            
            const userToUpdate = { ...currentUserResult[0], ...userData };
            if (userToUpdate.role === 'administrator') {
                userToUpdate.shifts = [];
                userToUpdate.allowedPages = ['dashboard', 'entry', 'reports'];
            }
            if (!userData.password) {
                userToUpdate.password = currentUserResult[0].password;
            }

            const sql = `UPDATE ${USERS_TABLE_NAME} SET username = ?, password = ?, role = ?, shifts = ?, allowedPages = ? WHERE id = ?`;
            await pool!.query(sql, [
                userToUpdate.username, userToUpdate.password, userToUpdate.role,
                JSON.stringify(userToUpdate.shifts || []), JSON.stringify(userToUpdate.allowedPages || []),
                userId
            ]);
            revalidateTag('users');
            return userToUpdate as User;
        } catch(dbError: any) {
            throw new Error(dbError.message || 'Falha ao atualizar usuário no banco de dados.');
        }
    } else {
        // Fallback
        const allUsers = await getUsersFromFile();
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            throw new Error('Usuário não encontrado.');
        }
        const userToUpdate = { ...allUsers[userIndex], ...userData };
        if (userToUpdate.role === 'administrator') {
            userToUpdate.shifts = [];
            userToUpdate.allowedPages = ['dashboard', 'entry', 'reports'];
        }
        if (!userData.password) {
            userToUpdate.password = allUsers[userIndex].password;
        }
        allUsers[userIndex] = userToUpdate;
        await saveUsersToFile(allUsers);
        revalidateTag('users');
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = allUsers[userIndex];
        return userToReturn;
    }
}

async function deleteUser(userId: string): Promise<{ message: string }> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            if (userId === '1') {
                throw new Error('Não é possível remover a conta de administrador original.');
            }
            const [result] = await pool!.execute<mysql.ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);
            if (result.affectedRows === 0) {
                throw new Error('Usuário não encontrado.');
            }
            revalidateTag('users');
            return { message: 'Usuário removido com sucesso.' };
        } catch(dbError: any) {
            throw new Error(dbError.message || 'Falha ao remover usuário do banco de dados.');
        }
    } else {
        // Fallback
        const allUsers = await getUsersFromFile();
        const userToDelete = allUsers.find(u => u.id === userId);
        if (!userToDelete) {
            throw new Error('Usuário não encontrado.');
        }
        if (userToDelete.id === '1') {
            throw new Error('Não é possível remover a conta de administrador original.');
        }
        const newUsers = allUsers.filter(u => u.id !== userId);
        await saveUsersToFile(newUsers);
        revalidateTag('users');
        return { message: 'Usuário removido com sucesso.' };
    }
}


export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    const updatedData: Partial<User> = await request.json();
    const updatedUser = await updateUser(userId, updatedData);
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
    return NextResponse.json(result);
  } catch (error: any) {
    const statusCode = error.message.includes('não encontrado') ? 404 : 
                      error.message.includes('Não é possível remover') ? 403 : 500;
    return NextResponse.json({ message: error.message || 'Erro ao remover usuário.' }, { status: statusCode });
  }
}
