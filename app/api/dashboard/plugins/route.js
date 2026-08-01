import { getPluginCatalog } from '@/lib/notifications';

/** GET plugin catalog for dashboard (metadata + config schemas only) */
export async function GET() {
  return Response.json({ plugins: getPluginCatalog() });
}
