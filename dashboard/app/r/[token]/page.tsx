import { validateHubToken } from '@/lib/consultation/hub-link';
import { CLIENT_REPORTABLE_FIELDS } from '@/lib/consultation/client-report-contract';
import ClientReportForm from './client-report-form';

/**
 * Door 1 hub page (server). The form renders ONLY for a valid, unexpired,
 * unrevoked token on a scheduled appointment; anything else gets the
 * invalid-link message and no form, no data.
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
    <ClientReportForm
      token={token}
      appointmentId={link.appointmentId}
      clientName={link.clientName}
      stylistName={link.stylistName}
      scheduledAt={link.scheduledAt}
      fields={CLIENT_REPORTABLE_FIELDS}
    />
  );
}
