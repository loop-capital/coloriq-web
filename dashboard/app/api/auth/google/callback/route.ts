import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=missing_code', request.url)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://coloriq.co/api/auth/google/callback';

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error('[Google OAuth] Token exchange failed:', err);
      return NextResponse.redirect(
        new URL('/login?error=token_exchange_failed', request.url)
      );
    }

    const tokens = await tokenRes.json();

    // Get user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoRes.ok) {
      console.error('[Google OAuth] Failed to fetch user info');
      return NextResponse.redirect(
        new URL('/login?error=userinfo_failed', request.url)
      );
    }

    const userInfo = await userInfoRes.json();
    const googleUserId = userInfo.sub;
    const email = userInfo.email;
    const firstName = userInfo.given_name || '';
    const lastName = userInfo.family_name || '';

    // Look up user by email (google_id not in schema)
    let user = email
      ? await prisma.users.findFirst({ where: { email } })
      : null;

    if (!user && email) {
      user = await prisma.users.create({
        data: {
          email,
          first_name: firstName,
          last_name: lastName,
          // Placeholder — Google users never use password login
          password_hash: `$GOOGLE$${googleUserId}`,
          is_active: true,
        },
      });
    }

    if (!user) {
      return NextResponse.redirect(
        new URL('/login?error=account_creation_failed', request.url)
      );
    }

    // Issue our own session JWT
    const { JWT_SECRET_KEY: jwtSecret } = await import('@/lib/auth');

    const sessionToken = await new SignJWT({
      userId: user.id,
      email: user.email,
      username: user.first_name || email.split('@')[0],
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(jwtSecret);

    const cookieStore = await cookies();
    cookieStore.set('colorgenius_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err: any) {
    console.error('[Google OAuth] Error:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}
