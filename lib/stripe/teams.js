/**
 * Team billing — owner pays; members share subscription entitlement.
 */

import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlan } from '@/lib/stripe/plans';

/**
 * @param {string} userId
 */
export async function getTeamForUser(userId) {
  const supabase = createAdminClient();

  const { data: owned } = await supabase
    .from('billing_teams')
    .select('*')
    .eq('owner_user_id', userId)
    .maybeSingle();

  if (owned) {
    const members = await listTeamMembers(owned.id);
    return { team: owned, members, role: 'owner' };
  }

  const { data: membership } = await supabase
    .from('billing_team_members')
    .select('role, status, team_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!membership) return { team: null, members: [], role: null };

  const { data: team } = await supabase
    .from('billing_teams')
    .select('*')
    .eq('id', membership.team_id)
    .single();

  const members = await listTeamMembers(membership.team_id);
  return { team, members, role: membership.role };
}

/**
 * @param {string} teamId
 */
export async function listTeamMembers(teamId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('billing_team_members')
    .select('id, user_id, invited_email, role, status, created_at')
    .eq('team_id', teamId)
    .neq('status', 'revoked')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * @param {string} userId
 * @param {string} name
 */
export async function createBillingTeam(userId, name) {
  const supabase = createAdminClient();
  const trimmed = String(name || '').trim().slice(0, 80);
  if (!trimmed) {
    return { ok: false, status: 400, error: 'Team name is required' };
  }

  const existing = await getTeamForUser(userId);
  if (existing.team) {
    return { ok: false, status: 409, error: 'You already belong to a billing team' };
  }

  const { data: team, error } = await supabase
    .from('billing_teams')
    .insert({
      name: trimmed,
      owner_user_id: userId,
      seat_limit: getPlan('pro')?.seatLimit ?? 10,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('billing_team_members').insert({
    team_id: team.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
    invited_email: null,
  });

  await supabase.from('profiles').update({ team_id: team.id }).eq('id', userId);

  return { ok: true, status: 200, team };
}

/**
 * @param {string} ownerUserId
 * @param {string} email
 */
export async function inviteTeamMember(ownerUserId, email) {
  const supabase = createAdminClient();
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, status: 400, error: 'Valid email is required' };
  }

  const { team, members } = await getTeamForUser(ownerUserId);
  if (!team || team.owner_user_id !== ownerUserId) {
    return { ok: false, status: 403, error: 'Only the team owner can invite members' };
  }

  const activeCount = members.filter((m) => m.status === 'active' || m.status === 'invited')
    .length;
  const seatLimit = team.seat_limit || getPlan(team.billing_plan)?.seatLimit || 3;
  if (activeCount >= seatLimit) {
    return {
      ok: false,
      status: 400,
      error: `Seat limit reached (${seatLimit}). Upgrade your plan for more seats.`,
    };
  }

  const token = crypto.randomBytes(24).toString('hex');
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle();

  const { data, error } = await supabase
    .from('billing_team_members')
    .upsert(
      {
        team_id: team.id,
        user_id: profile?.id || null,
        invited_email: normalized,
        role: 'member',
        status: 'invited',
        invite_token: token,
      },
      { onConflict: 'team_id,invited_email' }
    )
    .select('*')
    .single();

  if (error) throw error;

  return {
    ok: true,
    status: 200,
    invite: {
      email: normalized,
      token,
      acceptPath: `/dashboard/billing?invite=${token}`,
    },
    member: data,
  };
}

/**
 * @param {string} userId
 * @param {string} token
 */
export async function acceptTeamInvite(userId, token) {
  const supabase = createAdminClient();
  if (!token) {
    return { ok: false, status: 400, error: 'Invite token is required' };
  }

  const { data: invite } = await supabase
    .from('billing_team_members')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'invited')
    .maybeSingle();

  if (!invite) {
    return { ok: false, status: 404, error: 'Invite not found or already used' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  if (
    invite.invited_email &&
    profile?.email &&
    invite.invited_email.toLowerCase() !== profile.email.toLowerCase()
  ) {
    return { ok: false, status: 403, error: 'This invite was sent to a different email' };
  }

  const existing = await getTeamForUser(userId);
  if (existing.team && existing.team.id !== invite.team_id) {
    return { ok: false, status: 409, error: 'Leave your current team before accepting' };
  }

  const { error } = await supabase
    .from('billing_team_members')
    .update({
      user_id: userId,
      status: 'active',
      invite_token: null,
    })
    .eq('id', invite.id);

  if (error) throw error;

  await supabase.from('profiles').update({ team_id: invite.team_id }).eq('id', userId);

  return { ok: true, status: 200, teamId: invite.team_id };
}
