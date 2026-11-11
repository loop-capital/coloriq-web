import { validateHubToken } from '@/lib/consultation/hub-link';
import { CLIENT_REPORTABLE_FIELDS } from '@/lib/consultation/client-report-contract';
import GuestChat from './guest-chat';

/**
 * Door 2 hub page (server). Same token, same validation, same pending
 * semantics as the form door — only the collection UI differs (scripted
 * chat walk instead of a form). Invalid tokens get the invalid-link
 * message and no door.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const link = await validateHubToken(token);
  if (!link.ok) {
    return (
      <main className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-2">This link is invalid or expired.</h1>
        <p className="text-sm text-gray-700">
          Ask your stylist to send a fresh invitation link.
        </p>
      </main>
    );
  }
  return (
    <GuestChat
      token={token}
      appointmentId={link.appointmentId}
      clientName={link.clientName}
      stylistName={link.stylistName}
      scheduledAt={link.scheduledAt}
      fields={CLIENT_REPORTABLE_FIELDS}
    />
  );
}
