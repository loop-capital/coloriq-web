import { NextResponse } from 'next/server';
import { generateToken, setAuthCookie } from '@/lib/auth';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // HARD CLOSE (Jason, 2026-10-17): shared guest/beta credential retired.
    // No self-serve free access. Team/test use named grants.
    if (email.toLowerCase() === 'beta@colorgenius.co') {
      return NextResponse.json(
        { error: 'guest_retired', message: 'Guest access has been retired. COLORiq requires a subscription.' },
        { status: 403 }
      );
    }

    const user = await prisma.users.findFirst({
      where: { email, is_active: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const storedHash: string = user.password_hash || '';

    // Support bcrypt hashes ($2b$) and legacy SHA256 hashes during migration
    let passwordValid = false;
    if (storedHash.startsWith('$2')) {
      passwordValid = await bcrypt.compare(password, storedHash);
    } else {
      // Legacy SHA256 — check and upgrade to bcrypt on success
      const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
      passwordValid = storedHash === sha256Hash;
      if (passwordValid) {
        const newHash = await bcrypt.hash(password, 12);
        await prisma.users.update({
          where: { id: user.id },
          data: { password_hash: newHash },
        });
      }
    }

    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await generateToken({
      id: user.id,
      username: user.first_name || email.split('@')[0],
      email: user.email,
    } as any);

    await setAuthCookie(token);
    return NextResponse.json({ success: true, token, user: { email: user.email, username: user.first_name } });
  } catch (error: any) {
    return NextResponse.json({ error: 'Login failed: ' + error.message }, { status: 500 });
  }
}
