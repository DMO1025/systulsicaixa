

'use server';

import type { User, UserRole, OperatorShift } from '@/lib/types';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import { getDbPool, isMysqlConnected, USERS_TABLE_NAME } from '@/lib/mysql';
import { v4 as uuidv4 } from 'uuid';
import mysql, { type RowDataPacket } from 'mysql2/promise';

async function getUsersFromDb(pool: mysql.Pool): Promise<User[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME}`);
    return rows.map(row => ({
        ...row,
        shifts: row.shifts ? JSON.parse(row.shifts) : [],
        allowedPages: row.allowedPages ? JSON.parse(row.allowedPages) : [],
    })) as User[];
}

export async function getAllUsers(): Promise<User[]> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        return await getUsersFromDb(pool!);
    } else {
        return await getUsersFromFile();
    }
}

async function saveUsersToDb(pool: mysql.Pool, users: User[]): Promise<void> {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(`DELETE FROM ${USERS_TABLE_NAME}`);
        for (const user of users) {
             await connection.query(
                `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?)`,
                [user.id, user.username, user.password, user.role, JSON.stringify(user.shifts || []), JSON.stringify(user.allowedPages || [])]
            );
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function saveAllUsers(users: User[]): Promise<void> {
    const pool = await getDbPool();
     if (await isMysqlConnected(pool)) {
        await saveUsersToDb(pool!, users);
    } else {
        await saveUsersToFile(users);
    }
}


export async function findUser(username: string): Promise<User | undefined> {
  const allUsers = await getAllUsers();
  return allUsers.find(user => user.username.toLowerCase() === username.toLowerCase());
}

export async function createUser(userData: Partial<User>): Promise<User> {
    const allUsers = await getAllUsers();
    if (allUsers.some(u => u.username.toLowerCase() === userData.username?.toLowerCase())) {
        throw new Error(`Usuário "${userData.username}" já existe.`);
    }

    const newUser: User = {
        id: userData.id || uuidv4(),
        username: userData.username!,
        password: userData.password!,
        role: userData.role || 'operator',
        shifts: userData.shifts || [],
        allowedPages: userData.allowedPages || [],
        createdAt: new Date(),
    };
    
    allUsers.push(newUser);
    await saveAllUsers(allUsers);
    return newUser;
}

export async function updateUser(userId: string, updatedData: Partial<User>): Promise<User> {
    const allUsers = await getAllUsers();
    const userIndex = allUsers.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error(`Usuário com ID ${userId} não encontrado.`);
    }

    const updatedUser = { ...allUsers[userIndex], ...updatedData };
    // Don't update password if it's empty
    if (updatedData.password === "" || updatedData.password === null || updatedData.password === undefined) {
        delete updatedUser.password;
    }
    allUsers[userIndex] = updatedUser;
    
    await saveAllUsers(allUsers);
    return updatedUser;
}

export async function deleteUser(userId: string): Promise<{ message: string }> {
    const allUsers = await getAllUsers();
    if (userId === '1' && allUsers.find(u => u.id === '1')?.role === 'administrator') {
        throw new Error("Não é possível remover o usuário administrador principal.");
    }
    
    const initialLength = allUsers.length;
    const updatedUsers = allUsers.filter(u => u.id !== userId);

    if (updatedUsers.length === initialLength) {
        throw new Error(`Usuário com ID ${userId} não encontrado.`);
    }

    await saveAllUsers(updatedUsers);
    return { message: "Usuário removido com sucesso." };
}
