
import { type NextRequest, NextResponse } from 'next/server';
import { getUsersFromFile, saveUsersToFile } from '@/lib/fileDb';
import type { User, UserRole } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import { unstable_cache as cache, revalidateTag } from 'next/cache';

const getUsers = cache(
  async () => {
    try {
      const allUsers = await getUsersFromFile();
      return allUsers.map(({ password, ...user }) => user); // Exclude passwords from response
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Erro ao buscar usuários.');
    }
  },
  ['users'],
  { tags: ['users'], revalidate: 60 }
);

export async function GET(request: NextRequest) {
  try {
    const users = await getUsers();
    return NextResponse.json(users);
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
        if (newUser.role === 'operator' && (!newUser.shifts || newUser.shifts.length === 0 || !newUser.allowedPages || newUser.allowedPages.length === 0)) {
            return NextResponse.json({ message: 'Dados do operador incompletos. Todas as permissões são necessárias.' }, { status: 400 });
        }

        const allUsers = await getUsersFromFile();

        if (allUsers.some(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
            return NextResponse.json({ message: 'Nome de usuário já existe.' }, { status: 409 });
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

        allUsers.push(userToSave);
        await saveUsersToFile(allUsers);
        
        revalidateTag('users');

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userToReturn } = userToSave;
        return NextResponse.json(userToReturn, { status: 201 });

    } catch (error) {
        console.error('Error creating user:', error);
        return NextResponse.json({ message: 'Erro ao criar usuário.' }, { status: 500 });
    }
}
