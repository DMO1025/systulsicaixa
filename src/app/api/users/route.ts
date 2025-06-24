
import { type NextRequest, NextResponse } from 'next/server';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import { getDbPool, isMysqlConnected, USERS_TABLE_NAME } from '@/lib/mysql';
import type { User } from '@/lib/types';
import type mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';


async function getAllUsers(): Promise<User[]> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        try {
            const [rows] = await pool!.query<mysql.RowDataPacket[]>(`SELECT * FROM ${USERS_TABLE_NAME}`);
            // mysql2 with JSON support enabled will automatically parse JSON fields.
            return rows as User[];
        } catch (dbError) {
            console.error('Erro no DB ao buscar usuários:', dbError);
            throw new Error('Falha ao buscar usuários do banco de dados.');
        }
    } else {
        return await getUsersFromFile();
    }
}

async function createUser(userData: Partial<User>): Promise<User> {
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
            if (existing.length > 0) {
                throw new Error('Nome de usuário já existe.');
            }
            
            const sql = `INSERT INTO ${USERS_TABLE_NAME} (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?)`;
            await pool!.query(sql, [
                userToCreate.id, userToCreate.username, userToCreate.password, userToCreate.role,
                JSON.stringify(userToCreate.shifts), JSON.stringify(userToCreate.allowedPages)
            ]);
            revalidateTag('users');
            return userToCreate;
        } catch(dbError: any) {
            if (dbError.code === 'ER_DUP_ENTRY') {
                throw new Error('Nome de usuário já existe.');
            }
            throw new Error(dbError.message || 'Falha ao criar usuário no banco de dados.');
        }
    } else {
        // Fallback
        const allUsers = await getUsersFromFile();
        if (allUsers.some(u => u.username.toLowerCase() === userToCreate.username.toLowerCase())) {
            throw new Error('Nome de usuário já existe.');
        }
        allUsers.push(userToCreate);
        await saveUsersToFile(allUsers);
        revalidateTag('users');
        return userToCreate;
    }
}

export async function GET(request: NextRequest) {
    try {
        const users = await getAllUsers();
        // Don't send passwords to the client
        const usersWithoutPasswords = users.map(({ password, ...user }) => user);
        return NextResponse.json(usersWithoutPasswords);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const newUser: Partial<User> = await request.json();

        if (!newUser.username || !newUser.password || !newUser.role) {
            return NextResponse.json({ message: 'Nome de usuário, senha e função são obrigatórios.' }, { status: 400 });
        }
        if (newUser.role === 'operator' && (!newUser.shifts || newUser.shifts.length === 0 || !newUser.allowedPages || !newUser.allowedPages.length === 0)) {
            return NextResponse.json({ message: 'Dados do operador incompletos. Todas as permissões são necessárias.' }, { status: 400 });
        }
        
        const createdUser = await createUser(newUser);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = createdUser;
        return NextResponse.json(userToReturn, { status: 201 });

    } catch (error: any) {
        const statusCode = error.message.includes('já existe') ? 409 : 500;
        return NextResponse.json({ message: error.message || 'Erro ao criar usuário.' }, { status: statusCode });
    }
}
