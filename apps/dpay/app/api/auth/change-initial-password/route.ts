import { NextResponse } from 'next/server';
import { changeInitialPassword } from '@/lib/helpers/auth/change-initial-password';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await changeInitialPassword({
      identifier: typeof body?.email === 'string' ? body.email.trim() : '',
      currentPassword: typeof body?.currentPassword === 'string' ? body.currentPassword : '',
      newPassword: typeof body?.newPassword === 'string' ? body.newPassword : '',
    });
    if (!result.success) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
