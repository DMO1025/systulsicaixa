
import { type NextRequest, NextResponse } from 'next/server';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import { getDbPool, isMysqlConnected, USERS_TABLE_NAME, safeStringify } from '@/lib/mysql';
import type { User } from '@/lib/types';
import { revalidateTag } from 'next/cache';
import type mysql from 'mysql2/promise';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    const updatedData: Partial<User> = await request.json();
    const pool = await getDbPool();

    let finalUser: User;

    if (await isMysqlConnected(pool)) {
      const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM \`${USERS_TABLE_NAME}\` WHERE id = ?`, [userId]);
      if (rows.length === 0) {
        return NextResponse.json({ message: 'Usuário não encontrado no banco de dados.' }, { status: 404 });
      }
      
      const existingUser = rows[0] as User;
      const userToUpdate: Partial<User> = { ...updatedData };
      if (!userToUpdate.password) {
          userToUpdate.password = existingUser.password;
      }
      if (userToUpdate.role === 'administrator') {
          userToUpdate.shifts = [];
          userToUpdate.allowedPages = ['dashboard', 'entry', 'reports'];
      }

      finalUser = { ...existingUser, ...userToUpdate };

      const { username, password, role, shifts, allowedPages } = finalUser;
      const sql = `UPDATE \`${USERS_TABLE_NAME}\` SET username = ?, password = ?, role = ?, shifts = ?, allowedPages = ? WHERE id = ?`;
      await pool!.query(sql, [username, password, role, safeStringify(shifts), safeStringify(allowedPages), userId]);
    } else {
      const allUsers = await getUsersFromFile();
      const userIndex = allUsers.findIndex(u => u.id === userId);
      if (userIndex === -1) {
        return NextResponse.json({ message: 'Usuário não encontrado no arquivo.' }, { status: 404 });
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
      finalUser = userToUpdate;
      await saveUsersToFile(allUsers);
    }
    
    revalidateTag('users');

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userToReturn } = finalUser;
    return NextResponse.json(userToReturn);

  } catch (error: any) {
    console.error(`Error updating user ${userId}:`, error);
    return NextResponse.json({ message: `Erro ao atualizar usuário: ${error.message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  try {
    if (userId === '1') {
      return NextResponse.json({ message: 'Não é possível remover a conta de administrador original.' }, { status: 403 });
    }
    
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
      const [result] = await pool!.execute<mysql.ResultSetHeader>(`DELETE FROM \`${USERS_TABLE_NAME}\` WHERE id = ?`, [userId]);
      if (result.affectedRows === 0) {
        return NextResponse.json({ message: 'Usuário não encontrado no banco de dados.' }, { status: 404 });
      }
    } else {
      const allUsers = await getUsersFromFile();
      const initialLength = allUsers.length;
      const newUsers = allUsers.filter(u => u.id !== userId);
      if (newUsers.length === initialLength) {
        return NextResponse.json({ message: 'Usuário não encontrado no arquivo.' }, { status: 404 });
      }
      await saveUsersToFile(newUsers);
    }

    revalidateTag('users');
    return NextResponse.json({ message: 'Usuário removido com sucesso.' });
  } catch (error: any) {
    console.error(`Error deleting user ${userId}:`, error);
    return NextResponse.json({ message: `Erro ao remover usuário: ${error.message}` }, { status: 500 });
  }
}
