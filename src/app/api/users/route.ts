
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from '@/lib/types';
import { getAllUsers, createUser } from '@/lib/data/users';
import { revalidateTag } from 'next/cache';
import { logAction } from '@/services/auditService';
import { getCookie } from 'cookies-next';
import { cookies } from 'next/headers';

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

        const actorUsername = getCookie('username', { cookies }) || 'desconhecido';
        await logAction(actorUsername, 'CREATE_USER', `Novo usuário '${createdUser.username}' foi criado.`);
        
        revalidateTag('users');

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = createdUser;
        return NextResponse.json(userToReturn, { status: 201 });

    } catch (error: any) {
        const statusCode = error.message.includes('já existe') ? 409 : 500;
        return NextResponse.json({ message: error.message || 'Erro ao criar usuário.' }, { status: statusCode });
    }
}
