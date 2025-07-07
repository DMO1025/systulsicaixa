
'use server';

import { getDbPool, isMysqlConnected, USERS_TABLE_NAME } from '@/lib/mysql';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import type { User } from '@/lib/types';
import type mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

export async function findUser(username: string): Promise<User | null> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME} WHERE username = ?`, [username]);
            if (rows.length === 0) return null;
            return rows[0] as User;
        } catch(dbError) {
            console.error(`Database error finding user ${username}, falling back to file:`, dbError);
            const allUsers = await getUsersFromFile();
            return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
        }
    } else {
        const allUsers = await getUsersFromFile();
        return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    }
}

export async function getAllUsers(): Promise<User[]> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME}`);
            return rows as User[];
        } catch (dbError) {
            console.error('Database error fetching all users, falling back to file:', dbError);
            return getUsersFromFile();
        }
    } else {
        return getUsersFromFile();
    }
}

export async function createUser(userData: Partial<User>): Promise<User> {
    const pool = await getDbPool();
    
    const userToCreate: User = {
        id: userData.id || uuidv4(),
        username: userData.username!,
        password: userData.password!,
        role: userData.role!,
        shifts: userData.role === 'administrator' ? [] : (userData.shifts || []),
        allowedPages: userData.role === 'administrator' ? ['dashboard', 'entry', 'reports'] : (userData.allowedPages || []),
    };

    if (await isMysqlConnected(pool)) {
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
    } else {
        const allUsers = await getUsersFromFile();
        if (allUsers.some(u => u.username.toLowerCase() === userToCreate.username.toLowerCase())) throw new Error('Nome de usuário já existe.');
        allUsers.push(userToCreate);
        await saveUsersToFile(allUsers);
        return userToCreate;
    }
}

export async function updateUser(userId: string, userData: Partial<User>): Promise<User> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
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
    } else {
        const allUsers = await getUsersFromFile();
        const userIndex = allUsers.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error('Usuário não encontrado.');
        
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
        return allUsers[userIndex];
    }
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            if (userId === '1') throw new Error('Não é possível remover a conta de administrador original.');
            
            const [result] = await pool!.execute<mysql.ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);
            if (result.affectedRows === 0) throw new Error('Usuário não encontrado.');
            
            return { message: 'Usuário removido com sucesso.' };
        } catch(dbError: any) {
            throw new Error(dbError.message || 'Falha ao remover usuário do banco de dados.');
        }
    } else {
        const allUsers = await getUsersFromFile();
        const userToDelete = allUsers.find(u => u.id === userId);
        if (!userToDelete) throw new Error('Usuário não encontrado.');
        if (userToDelete.id === '1') throw new Error('Não é possível remover a conta de administrador original.');
        
        const newUsers = allUsers.filter(u => u.id !== userId);
        await saveUsersToFile(newUsers);
        return { message: 'Usuário removido com sucesso.' };
    }
}
