

'use server';

import { getDbPool, isMysqlConnected, USERS_TABLE_NAME } from '@/lib/mysql';
import type { User } from '@/lib/types';
import type mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

export async function findUser(username: string): Promise<User | null> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }
    try {
        const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME} WHERE username = ?`, [username]);
        if (rows.length === 0) return null;
        return rows[0] as User;
    } catch(dbError: any) {
        console.error(`Database error finding user ${username}:`, dbError);
        throw new Error(`Erro ao buscar usuário no banco de dados: ${dbError.message}`);
    }
}

export async function getAllUsers(): Promise<User[]> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }
    try {
        const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME}`);
        return rows as User[];
    } catch (dbError) {
        console.error('Database error fetching all users:', dbError);
        throw new Error(`Erro ao buscar usuários no banco de dados: ${dbError.message}`);
    }
}

export async function createUser(userData: Partial<User>): Promise<User> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }
    
    const userToCreate: User = {
        id: userData.id || uuidv4(),
        username: userData.username!,
        password: userData.password!,
        role: userData.role!,
        shifts: userData.role === 'administrator' ? [] : (userData.shifts || []),
        allowedPages: userData.role === 'administrator' ? ['dashboard', 'entry', 'reports'] : (userData.allowedPages || []),
    };

    try {
        const [existing] = await pool!.query<mysql.RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [userToCreate.username]);
        if (existing.length > 0) throw new Error('Nome de usuário já existe.');
        
        const sql = `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool!.query(sql, [userToCreate.id, userToCreate.username, userToCreate.password, userToCreate.role, JSON.stringify(userToCreate.shifts), JSON.stringify(userToCreate.allowedPages)]);
        return userToCreate;
    } catch(dbError: any) {
        if (dbError.code === 'ER_DUP_ENTRY') throw new Error('Nome de usuário já existe.');
        throw new Error(dbError.message || 'Falha ao criar usuário no banco de dados.');
    }
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const pool = await getDbPool();
     if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }
    try {
        const [currentUserResult] = await pool!.query<mysql.RowDataPacket[]>('SELECT * FROM users WHERE id = ?', [userId]);
        if (currentUserResult.length === 0) throw new Error('Usuário não encontrado.');
        
        const userToUpdate = { ...currentUserResult[0], ...userData };
        if (userToUpdate.role === 'administrator') {
            userToUpdate.shifts = [];
            userToUpdate.allowedPages = ['dashboard', 'entry', 'reports'];
        }
        if (!userData.password) {
            userToUpdate.password = currentUserResult[0].password;
        }

        const sql = `UPDATE ${USERS_TABLE_NAME} SET username = ?, password = ?, role = ?, shifts = ?, allowedPages = ? WHERE id = ?`;
        await pool!.query(sql, [userToUpdate.username, userToUpdate.password, userToUpdate.role, JSON.stringify(userToUpdate.shifts || []), JSON.stringify(userToUpdate.allowedPages || []), userId]);
        return userToUpdate as User;
    } catch(dbError: any) {
        throw new Error(dbError.message || 'Falha ao atualizar usuário no banco de dados.');
    }
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Banco de dados não conectado. Verifique as configurações.');
    }
    try {
        if (userId === '1') throw new Error('Não é possível remover a conta de administrador original.');
        
        const [result] = await pool!.execute<mysql.ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);
        if (result.affectedRows === 0) throw new Error('Usuário não encontrado.');
        
        return { message: 'Usuário removido com sucesso.' };
    } catch(dbError: any) {
        throw new Error(dbError.message || 'Falha ao remover usuário do banco de dados.');
    }
}
