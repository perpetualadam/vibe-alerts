import { NextResponse } from 'next/server';
import { requireDashboardUser } from '@/lib/security/dashboard-auth';
import { listCustomerInvoices } from '@/lib/stripe/billing';
import { resolveBillingEntitlement } from '@/lib/stripe/entitlements';

export const runtime = 'nodejs';

/** GET Stripe invoices for the authenticated customer's account */
export async function GET(request) {
  const auth = await requireDashboardUser(request);
  if (auth.error) return auth.error;

  const entitlement = await resolveBillingEntitlement(auth.user.id);
  if (!entitlement.customerId) {
    return NextResponse.json({ invoices: [] });
  }

  try {
    const invoices = await listCustomerInvoices(entitlement.customerId, { limit: 50 });
    return NextResponse.json({ invoices });
  } catch {
    return NextResponse.json({ error: 'Failed to load invoices' }, { status: 500 });
  }
}
