'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardMutationHeaders } from '@/lib/security/client-headers';

function formatMoney(cents, currency = 'usd') {
  if (cents == null) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleDateString();
}

/**
 * Full billing management panel — plans, usage, promo, portal, invoices, team.
 */
export default function BillingPanel({ onToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [interval, setInterval] = useState('month');
  const [promoCode, setPromoCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/billing');
      if (!res.ok) throw new Error('Failed to load billing');
      setData(await res.json());
    } catch (err) {
      onToast?.(err.message || 'Could not load billing', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      (async () => {
        try {
          const res = await fetch('/api/dashboard/billing/team', {
            method: 'POST',
            headers: dashboardMutationHeaders(),
            body: JSON.stringify({ action: 'accept', token: invite }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Invite failed');
          onToast?.('Joined billing team', 'success');
          window.history.replaceState({}, '', '/dashboard/billing');
          load();
        } catch (err) {
          onToast?.(err.message, 'error');
        }
      })();
    }
  }, [load, onToast]);

  const startCheckout = async (planId) => {
    setBusy(`checkout-${planId}`);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({
          plan: planId,
          interval,
          promoCode: promoCode.trim() || undefined,
          teamId: data?.team?.id || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Checkout failed');
      window.location.href = json.url;
    } catch (err) {
      onToast?.(err.message, 'error');
      setBusy(null);
    }
  };

  const changePlan = async (planId) => {
    setBusy(`change-${planId}`);
    try {
      const res = await fetch('/api/dashboard/billing/change-plan', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ plan: planId, interval }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Plan change failed');
      onToast?.(`Plan updated to ${planId} (${interval})`, 'success');
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async (flow = null) => {
    setBusy(flow || 'portal');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify(flow ? { flow } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Portal failed');
      window.location.href = json.url;
    } catch (err) {
      onToast?.(err.message, 'error');
      setBusy(null);
    }
  };

  const createTeam = async () => {
    setBusy('team-create');
    try {
      const res = await fetch('/api/dashboard/billing/team', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ action: 'create', name: teamName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not create team');
      onToast?.('Team created', 'success');
      setTeamName('');
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const inviteMember = async () => {
    setBusy('team-invite');
    try {
      const res = await fetch('/api/dashboard/billing/team', {
        method: 'POST',
        headers: dashboardMutationHeaders(),
        body: JSON.stringify({ action: 'invite', email: inviteEmail }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invite failed');
      const link = json.invite?.acceptPath
        ? `${window.location.origin}${json.invite.acceptPath}`
        : '';
      if (link) {
        await navigator.clipboard.writeText(link);
        onToast?.('Invite link copied to clipboard', 'success');
      } else {
        onToast?.('Invite created', 'success');
      }
      setInviteEmail('');
      await load();
    } catch (err) {
      onToast?.(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-vibe-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-vibe-muted">Could not load billing.</p>;
  }

  const { entitlement, usage, plans, trialLabel, invoices, team } = data;
  const active = entitlement.active;

  return (
    <div className="space-y-6">
      <section className="glass rounded-xl p-5 sm:p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Current plan</h2>
            <p className="text-sm text-vibe-muted mt-1">
              {active
                ? `${entitlement.planId} · billed ${entitlement.interval || 'month'}ly${
                    entitlement.source === 'team' ? ' (team)' : ''
                  }`
                : 'No active subscription'}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full ring-1 ${
              active
                ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30'
                : 'bg-white/5 text-vibe-muted ring-vibe-border'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {entitlement.trialEndsAt && (
          <p className="text-xs text-vibe-muted">
            Trial ends {formatDate(entitlement.trialEndsAt)}
            {trialLabel ? ` · ${trialLabel}` : ''}
          </p>
        )}
        {entitlement.currentPeriodEnd && (
          <p className="text-xs text-vibe-muted">
            Current period ends {formatDate(entitlement.currentPeriodEnd)}
            {entitlement.cancelAtPeriodEnd ? ' · Cancels at period end' : ''}
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {active && (
            <>
              <button
                type="button"
                onClick={() => openPortal()}
                disabled={Boolean(busy)}
                className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
              >
                Customer Portal
              </button>
              <button
                type="button"
                onClick={() => openPortal('subscription_update')}
                disabled={Boolean(busy)}
                className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm"
              >
                Change plan in Portal
              </button>
            </>
          )}
        </div>
      </section>

      <section className="glass rounded-xl p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold">Webhook usage</h2>
        <p className="text-sm text-vibe-muted">
          {usage.webhookCount.toLocaleString()} /{' '}
          {usage.limit != null ? usage.limit.toLocaleString() : '∞'} this month ({usage.periodYm})
        </p>
        {usage.limit != null && (
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full ${usage.limited ? 'bg-amber-400' : 'bg-vibe-accent'}`}
              style={{
                width: `${Math.min(100, Math.round((usage.webhookCount / usage.limit) * 100))}%`,
              }}
            />
          </div>
        )}
        {usage.limited && (
          <p className="text-xs text-amber-300">
            {usage.allowed
              ? 'Over included quota — overage may be metered on Pro.'
              : 'Limit reached. Upgrade to continue receiving webhooks.'}
          </p>
        )}
      </section>

      <section className="glass rounded-xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Plans</h2>
            <p className="text-sm text-vibe-muted mt-1">
              Monthly or annual. Promo codes apply at checkout.
            </p>
          </div>
          <div className="flex rounded-lg border border-vibe-border p-0.5">
            {['month', 'year'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setInterval(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                  interval === key ? 'bg-white/10 text-white' : 'text-vibe-muted'
                }`}
              >
                {key === 'month' ? 'Monthly' : 'Annual'}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-sm max-w-sm">
          <span className="text-xs text-vibe-muted mb-1.5 block">Promo code (optional)</span>
          <input
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="LAUNCH20"
            className="w-full bg-black/30 border border-vibe-border rounded-lg px-3 py-2 text-sm font-mono"
          />
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          {(plans || []).map((plan) => {
            const price = plan.prices?.[interval];
            const isCurrent =
              active &&
              entitlement.planId === plan.id &&
              (entitlement.interval === interval ||
                (!entitlement.interval && interval === 'month'));
            return (
              <article
                key={plan.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  isCurrent ? 'border-vibe-accent bg-vibe-accent/5' : 'border-vibe-border'
                }`}
              >
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-xs text-vibe-muted mt-1">{plan.description}</p>
                </div>
                <p className="text-2xl font-bold">{price?.label || '—'}</p>
                <ul className="text-xs text-vibe-muted space-y-1">
                  <li>
                    {plan.webhookLimitMonthly?.toLocaleString()} webhooks / month
                    {plan.overageAllowed ? ' + overage' : ''}
                  </li>
                  <li>{plan.seatLimit} team seat{plan.seatLimit === 1 ? '' : 's'}</li>
                </ul>
                {isCurrent ? (
                  <p className="text-xs text-emerald-400">Current plan</p>
                ) : active ? (
                  <button
                    type="button"
                    disabled={!price?.configured || busy === `change-${plan.id}`}
                    onClick={() => changePlan(plan.id)}
                    className="w-full px-3 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm disabled:opacity-50"
                  >
                    {busy === `change-${plan.id}` ? 'Updating…' : 'Switch to this plan'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!price?.configured || busy === `checkout-${plan.id}`}
                    onClick={() => startCheckout(plan.id)}
                    className="w-full px-3 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
                  >
                    {busy === `checkout-${plan.id}`
                      ? 'Redirecting…'
                      : trialLabel
                        ? `Start ${trialLabel}`
                        : 'Subscribe'}
                  </button>
                )}
                {!price?.configured && (
                  <p className="text-[11px] text-amber-300">Price ID not configured for this interval</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="glass rounded-xl p-5 sm:p-6 space-y-3">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {(!invoices || invoices.length === 0) && (
          <p className="text-sm text-vibe-muted">No invoices yet.</p>
        )}
        <ul className="divide-y divide-vibe-border">
          {(invoices || []).map((inv) => (
            <li
              key={inv.id}
              className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
            >
              <div>
                <p className="font-medium">{inv.number || inv.id}</p>
                <p className="text-xs text-vibe-muted">
                  {formatDate(inv.created)} · {inv.status}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span>{formatMoney(inv.total, inv.currency)}</span>
                {inv.hostedInvoiceUrl && (
                  <a
                    href={inv.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-vibe-accent hover:underline text-xs"
                  >
                    View
                  </a>
                )}
                {inv.invoicePdf && (
                  <a
                    href={inv.invoicePdf}
                    target="_blank"
                    rel="noreferrer"
                    className="text-vibe-accent hover:underline text-xs"
                  >
                    PDF
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
        {active && (
          <button
            type="button"
            onClick={() => openPortal()}
            className="text-sm text-vibe-accent hover:underline"
          >
            Open full invoice history in Customer Portal
          </button>
        )}
      </section>

      <section className="glass rounded-xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Team billing</h2>
          <p className="text-sm text-vibe-muted mt-1">
            Share one subscription across seats. Owner pays; members inherit access.
          </p>
        </div>

        {!team ? (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team name"
              className="flex-1 bg-black/30 border border-vibe-border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={createTeam}
              disabled={!teamName.trim() || busy === 'team-create'}
              className="px-4 py-2 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium disabled:opacity-50"
            >
              {busy === 'team-create' ? 'Creating…' : 'Create team'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium">{team.name}</span>
              <span className="text-vibe-muted">
                {' '}
                · {team.role} · {team.members?.length || 0}/{team.seatLimit} seats
              </span>
            </p>
            <ul className="text-sm space-y-1">
              {(team.members || []).map((m) => (
                <li key={m.id} className="text-vibe-muted">
                  {m.invited_email || m.user_id} · {m.role} · {m.status}
                </li>
              ))}
            </ul>
            {team.role === 'owner' && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="flex-1 bg-black/30 border border-vibe-border rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={inviteMember}
                  disabled={!inviteEmail.trim() || busy === 'team-invite'}
                  className="px-4 py-2 rounded-lg border border-vibe-border hover:bg-white/5 text-sm disabled:opacity-50"
                >
                  {busy === 'team-invite' ? 'Inviting…' : 'Invite & copy link'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
