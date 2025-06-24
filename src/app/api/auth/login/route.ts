
import { type NextRequest, NextResponse } from 'next/server';
import { getUsersFromFile } from '@/lib/fileDb';
import type { User, OperatorShift, PageId } from '@/lib/types';
import { getDbPool, isMysqlConnected, USERS_TABLE_NAME } from '@/lib/mysql';
import type mysql from 'mysql2/promise';

async function findUser(username: string): Promise<User | null> {
    const pool = await getDbPool();
    if (await isMysqlConnected(pool)) {
        const [rows] = await pool!.query<mysql.RowDataPacket[]> (`SELECT * FROM ${USERS_TABLE_NAME} WHERE username = ?`, [username]);
        if (rows.length === 0) return null;
        // mysql2 driver automatically parses JSON fields
        return rows[0] as User;
    } else {
        const allUsers = await getUsersFromFile();
        return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    }
}


export async function POST(request: NextRequest) {
  try {
    const { username, password, selectedShift } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Usuário e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await findUser(username);
    
    if (!user || user.password !== password) {
      return NextResponse.json({ message: 'Usuário ou senha inválidos.' }, { status: 401 });
    }
    
    if (user.role === 'operator') {
      if (!selectedShift) {
        return NextResponse.json({ message: 'Turno é obrigatório para operadores.' }, { status: 400 });
      }
      if (!user.shifts.includes(selectedShift as OperatorShift)) {
        return NextResponse.json({ message: 'Operador não tem permissão para este turno.' }, { status: 403 });
      }
      return NextResponse.json({ 
        role: user.role, 
        shift: selectedShift,
        allowedPages: user.allowedPages || [] 
      });
    }

    // For administrator
    return NextResponse.json({ 
      role: user.role,
      allowedPages: user.allowedPages || ['dashboard', 'entry', 'reports']
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ message: 'Ocorreu um erro no servidor durante o login.' }, { status: 500 });
  }
}
