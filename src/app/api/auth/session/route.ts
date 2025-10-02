
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value);
    return NextResponse.json({ isAuthenticated: true, ...sessionData });
  } catch (error) {
    // If cookie is malformed for any reason
    return NextResponse.json({ isAuthenticated: false }, { status: 401 });
  }
}
