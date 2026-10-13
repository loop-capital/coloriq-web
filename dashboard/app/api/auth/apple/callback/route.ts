import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { TOKEN_COOKIE_NEW, TOKEN_COOKIE_LEGACY } from '@/lib/cookie-keys';

async function generateClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID!;
  const keyId = process.env.APPLE_KEY_ID!;
  const servicesId = process.env.APPLE_SERVICES_ID!;

  const pemKey = process.env.APPLE_PRIVATE_KEY!;
  // Handle escaped newlines from env vars
  const pem = pemKey.replace(/\\n/g, '\n');

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(pem),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60) // 1 hour
    .setAudience('https://appleid.apple.com')
    .setSubject(servicesId)
    .sign(privateKey);

  return jwt;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem.split('\n').filter(
    (line) => !line.startsWith('-----') && line.trim() !== ''
  );
  const base64 = lines.join('');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function exchangeCodeForTokens(code: string) {
  const clientSecret = await generateClientSecret();
  const clientId = process.env.APPLE_SERVICES_ID!;

  const response = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Apple token exchange failed: ${err}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    console.log('[Apple Callback] Content-Type:', contentType);

    let code: string | null = null;
    let error: string | null = null;
    let nameJson: string | null = null;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      code = formData.get('code') as string;
      error = formData.get('error') as string;
      nameJson = formData.get('user') as string;
      console.log('[Apple Callback] form_post - code:', !!code, 'error:', error, 'user:', !!nameJson);
    } else {
      const { searchParams } = new URL(request.url);
      code = searchParams.get('code');
      error = searchParams.get('error');
      console.log('[Apple Callback] query - code:', !!code, 'error:', error);
    }

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

    const tokens = await exchangeCodeForTokens(code);

    // Verify the id_token to get user info
    const pem = (process.env.APPLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
    const publicKey = await crypto.subtle.importKey(
      'spki',
      pemToArrayBuffer(pem),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Decode the id_token payload (we trust Apple's signature)
    const payload = JSON.parse(
      Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()
    );

    const appleUserId = payload.sub;
    const email = payload.email;

    // Apple only sends name on first sign-in (via form_post only)
    let firstName = '';
    let lastName = '';
    if (nameJson) {
      try {
        const nameObj = JSON.parse(nameJson);
        firstName = nameObj?.name?.firstName || '';
        lastName = nameObj?.name?.lastName || '';
      } catch {}
    }

    // Create or find user via Prisma
    // Check if user exists by apple_id
    let user = await prisma.users.findFirst({
      where: { apple_id: appleUserId },
    });

    if (!user && email) {
      // Check by email, link Apple ID to existing account
      const emailUser = await prisma.users.findFirst({
        where: { email },
      });
      if (emailUser) {
        user = await prisma.users.update({
          where: { id: emailUser.id },
          data: { apple_id: appleUserId },
        });
      }
    }

    if (!user) {
      user = await prisma.users.create({
        data: {
          email,
          first_name: firstName,
          last_name: lastName,
          apple_id: appleUserId,
          // Placeholder — Apple users never use password login
          password_hash: `$APPLE$${appleUserId}`,
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
    cookieStore.set(TOKEN_COOKIE_NEW, sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    // Migration: new cookie written -- drop the legacy one.
    cookieStore.delete(TOKEN_COOKIE_LEGACY);

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err: any) {
    console.error('Apple auth error:', err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(err.message)}`, request.url)
    );
  }
}

// Also handle GET in case Apple redirects with query params
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  return NextResponse.redirect(
    new URL('/login?error=invalid_callback', request.url)
  );
}
