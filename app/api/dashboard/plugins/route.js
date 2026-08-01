import { getPluginCatalog } from '@/lib/notifications';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';

/** GET plugin catalog for dashboard (metadata + config schemas only) */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  return Response.json({ plugins: getPluginCatalog() });
}
