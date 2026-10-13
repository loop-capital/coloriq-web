import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAuthTokenCookie } from '@/lib/cookie-keys';

// Server-side gate for the whole /admin area — previously nothing guarded
// this at all; /admin/account-types was reachable by anyone who knew the
// URL, and its own API only checked "is logged in," not "is admin."
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = getAuthTokenCookie((n) => cookieStore.get(n)?.value);
  const payload = token ? await verifyToken(token) : null;

  const user = payload
    ? await prisma.users.findUnique({ where: { id: payload.userId }, select: { role: true } })
    : null;

  if (user?.role !== 'admin') {
    redirect('/login');
  }

  return <>{children}</>;
}
