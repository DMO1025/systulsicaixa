

'use server';
import 'server-only';

import { getDbPool, isMysqlConnected, USERS_TABLE_NAME, safeParse, safeStringify } from '@/lib/mysql';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import type { User, UserRole, OperatorShift, PageId } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import type mysql from 'mysql2/promise';

async function getUsersFromDb(): Promise<User[]> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        // If DB is not connected, gracefully return an empty array instead of throwing an error.
        // This prevents crashes on pages like Login that try to fetch users.
        console.warn('DB not connected, returning empty user list from DB source.');
        return [];
    }
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME}`);
    return (rows as User[]).map(user => ({
        ...user,
        shifts: user.shifts ? safeParse<OperatorShift[]>(user.shifts) || [] : [],
        allowedPages: user.allowedPages ? safeParse<PageId[]>(user.allowedPages) || [] : [],
    }));
}

async function saveUsersToDb(users: User[]): Promise<void> {
    const pool = await getDbPool();
    if (!pool || !(await isMysqlConnected(pool))) {
        throw new Error('Database not connected. Cannot save users.');
    }
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // For simplicity, we'll just replace all users. A more complex system might do individual inserts/updates.
        await connection.query(`DELETE FROM ${USERS_TABLE_NAME}`);
        for (const user of users) {
            const { id, username, password, role, shifts, allowedPages } = user;
            if (!password) continue; // Should not happen for new users, but a safeguard.
            const sql = `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?)`;
            await connection.query(sql, [id, username, password, role, safeStringify(shifts), safeStringify(allowedPages)]);
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function getDataSource() {
    const pool = await getDbPool();
    return await isMysqlConnected(pool) ? 'db' : 'file';
}

export async function getAllUsers(): Promise<User[]> {
    const source = await getDataSource();
    if (source === 'db') {
        return getUsersFromDb();
    } else {
        return getUsersFromFile();
    }
}

export async function findUser(username: string): Promise<User | undefined> {
    const users = await getAllUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase());
}

export async function findUserById(id: string): Promise<User | undefined> {
    const users = await getAllUsers();
    return users.find(u => u.id === id);
}

export async function createUser(userData: Partial<User>): Promise<User> {
    const users = await getAllUsers();
    if (users.some(u => u.username.toLowerCase() === userData.username?.toLowerCase())) {
        throw new Error(`Usuário '${userData.username}' já existe.`);
    }

    const newUser: User = {
        id: userData.id || uuidv4(),
        username: userData.username!,
        password: userData.password!,
        role: userData.role!,
        shifts: userData.shifts || [],
        allowedPages: userData.allowedPages || [],
    };
    
    users.push(newUser);

    const source = await getDataSource();
    if (source === 'db') {
        // In DB mode, we can insert just the new user for efficiency
        const pool = await getDbPool();
        const sql = `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?)`;
        await pool!.query(sql, [newUser.id, newUser.username, newUser.password, newUser.role, safeStringify(newUser.shifts), safeStringify(newUser.allowedPages)]);
    } else {
        await saveUsersToFile(users);
    }
    
    return newUser;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const users = await getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('Usuário não encontrado para atualização.');
    }

    // Prevent username change if it already exists
    if (updates.username && users.some(u => u.username.toLowerCase() === updates.username!.toLowerCase() && u.id !== userId)) {
        throw new Error(`Nome de usuário '${updates.username}' já está em uso.`);
    }

    const updatedUser = { ...users[userIndex], ...updates };
    // Don't save an empty password, keep the old one if not provided
    if (updates.password === '' || updates.password === null || updates.password === undefined) {
        updatedUser.password = users[userIndex].password;
    }
    users[userIndex] = updatedUser;

    const source = await getDataSource();
    if (source === 'db') {
        const { id, username, password, role, shifts, allowedPages } = updatedUser;
        const pool = await getDbPool();
        const sql = `UPDATE ${USERS_TABLE_NAME} SET username = ?, password = ?, role = ?, shifts = ?, allowedPages = ? WHERE id = ?`;
        await pool!.query(sql, [username, password, role, safeStringify(shifts), safeStringify(allowedPages), id]);
    } else {
        await saveUsersToFile(users);
    }
    
    return updatedUser;
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
    if (userId === '1') {
        throw new Error("Não é possível remover o usuário administrador padrão.");
    }
    const users = await getAllUsers();
    const newUsers = users.filter(u => u.id !== userId);

    if (users.length === newUsers.length) {
        throw new Error('Usuário não encontrado para remoção.');
    }
    
    const source = await getDataSource();
     if (source === 'db') {
        const pool = await getDbPool();
        await pool!.query(`DELETE FROM ${USERS_TABLE_NAME} WHERE id = ?`, [userId]);
    } else {
        await saveUsersToFile(newUsers);
    }

    return { message: 'Usuário removido com sucesso.' };
}
