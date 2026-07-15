import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mci_session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const sessionData = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('ascii'));
    return NextResponse.json({ success: true, user: sessionData });

  } catch (error) {
    return NextResponse.json({ success: false, message: 'Authentication error' }, { status: 401 });
  }
}
