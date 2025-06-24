
import { type NextRequest, NextResponse } from 'next/server';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import { getDbPool, isMysqlConnected, USERS_TABLE_NAME, safeStringify, safeParse } from '@/lib/mysql';
import type { User, UserRole } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { revalidateTag } from 'next/cache';
import type mysql from 'mysql2/promise';


async function getUsersFromDb(pool: mysql.Pool): Promise<User[]> {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(`SELECT id, username, role, shifts, allowedPages, createdAt, lastModifiedAt FROM \`${USERS_TABLE_NAME}\` ORDER BY createdAt ASC`);
    return rows.map(row => ({
      ...row,
      shifts: safeParse(row.shifts), 
      allowedPages: safeParse(row.allowedPages)
    })) as User[];
}


export async function GET(request: NextRequest) {
  try {
    const pool = await getDbPool();
    let users;
    if (await isMysqlConnected(pool)) {
        users = await getUsersFromDb(pool!);
    } else {
      users = (await getUsersFromFile()).map(({ password, ...user }) => user);
    }
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('API GET (users) Erro:', error);
    return NextResponse.json({ message: `Erro ao buscar usuários: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
    try {
        const newUser: Partial<User> = await request.json();

        if (!newUser.username || !newUser.password || !newUser.role) {
            return NextResponse.json({ message: 'Nome de usuário, senha e função são obrigatórios.' }, { status: 400 });
        }
        if (newUser.role === 'operator' && (!newUser.shifts || newUser.shifts.length === 0 || !newUser.allowedPages || newUser.allowedPages.length === 0)) {
            return NextResponse.json({ message: 'Dados do operador incompletos. Todas as permissões são necessárias.' }, { status: 400 });
        }
        
        const isAdmin = newUser.role === 'administrator';
        const userToSave: User = {
            id: uuidv4(),
            username: newUser.username,
            password: newUser.password,
            role: newUser.role,
            shifts: isAdmin ? [] : newUser.shifts || [],
            allowedPages: isAdmin ? ['dashboard', 'entry', 'reports'] : newUser.allowedPages || [],
        };
        
        const pool = await getDbPool();

        if (await isMysqlConnected(pool)) {
            const [existing] = await pool.query<mysql.RowDataPacket[]>(`SELECT id FROM \`${USERS_TABLE_NAME}\` WHERE username = ?`, [userToSave.username]);
            if (existing.length > 0) {
                 return NextResponse.json({ message: 'Nome de usuário já existe.' }, { status: 409 });
            }
            const { id, username, password, role, shifts, allowedPages } = userToSave;
            await pool.query(
                `INSERT INTO \`${USERS_TABLE_NAME}\` (id, username, password, role, shifts, allowedPages) VALUES (?, ?, ?, ?, ?, ?)`,
                [id, username, password, role, safeStringify(shifts), safeStringify(allowedPages)]
            );
        } else {
            const allUsers = await getUsersFromFile();
            if (allUsers.some(u => u.username.toLowerCase() === newUser.username!.toLowerCase())) {
                return NextResponse.json({ message: 'Nome de usuário já existe.' }, { status: 409 });
            }
            allUsers.push(userToSave);
            await saveUsersToFile(allUsers);
        }
        
        revalidateTag('users');

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = userToSave;
        return NextResponse.json(userToReturn, { status: 201 });

    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ message: `Erro ao criar usuário: ${error.message}` }, { status: 500 });
    }
}
