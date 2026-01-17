import { supabase } from '@/lib/supabase';
import { recordViolation } from './moderationService';

export interface AdminActionParams {
  reportId: string;
  action: 'approve' | 'reject' | 'warn' | 'suspend';
  adminNotes?: string;
  suspensionDays?: number;
}

export async function takeAdminAction(params: AdminActionParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    const { data: report } = await supabase
      .from('reports')
      .select('*')
      .eq('id', params.reportId)
      .single();

    if (!report) {
      return { success: false, error: 'Report nicht gefunden' };
    }

    let status: 'reviewed' | 'action_taken' | 'dismissed' = 'reviewed';

    if (params.action === 'approve' || params.action === 'warn' || params.action === 'suspend') {
      status = 'action_taken';

      const severity = getSeverityFromAction(params.action, report.reason_category);

      if (report.reported_user_id) {
        await recordViolation({
          userId: report.reported_user_id,
          violationType: report.reason_category,
          contentType: report.reported_entity_type,
          contentId: report.reported_entity_id,
          severity,
          description: params.adminNotes || report.reason_text,
        });
      }

      if (params.action === 'suspend' && report.reported_user_id && params.suspensionDays) {
        const suspendedUntil = new Date(Date.now() + params.suspensionDays * 24 * 60 * 60 * 1000);

        await supabase
          .from('profiles')
          .update({
            suspended_until: suspendedUntil.toISOString(),
            suspension_reason: params.adminNotes || 'Verstoß gegen Community-Richtlinien',
          })
          .eq('id', report.reported_user_id);
      }

      if (params.action === 'approve') {
        await deleteReportedContent(report.reported_entity_type, report.reported_entity_id);
      }
    } else if (params.action === 'reject') {
      status = 'dismissed';
    }

    await supabase
      .from('reports')
      .update({
        status,
        admin_notes: params.adminNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.reportId);

    return { success: true };
  } catch (error) {
    console.error('Error taking admin action:', error);
    return { success: false, error: 'Fehler bei Admin-Aktion' };
  }
}

function getSeverityFromAction(action: string, reasonCategory: string): 'low' | 'medium' | 'high' | 'critical' {
  if (action === 'suspend') return 'critical';
  if (action === 'warn') return 'medium';

  if (reasonCategory === 'illegal' || reasonCategory === 'minor_protection') {
    return 'critical';
  }
  if (reasonCategory === 'harassment' || reasonCategory === 'inappropriate_content') {
    return 'high';
  }
  if (reasonCategory === 'fake_spam' || reasonCategory === 'scam') {
    return 'medium';
  }

  return 'low';
}

async function deleteReportedContent(entityType: string, entityId: string): Promise<void> {
  try {
    switch (entityType) {
      case 'event':
        await supabase.from('events').delete().eq('id', entityId);
        break;
      case 'comment':
        await supabase.from('comments').delete().eq('id', entityId);
        break;
      case 'chat':
        await supabase.from('live_chat_messages').delete().eq('id', entityId);
        break;
    }
  } catch (error) {
    console.error('Error deleting content:', error);
  }
}

export async function getModerationQueue() {
  try {
    const { data, error } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('status', 'pending')
      .order('risk_level', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching moderation queue:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return [];
  }
}

export async function approveModerationItem(itemId: string, adminNotes?: string): Promise<{ success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    await supabase
      .from('moderation_queue')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', itemId);

    return { success: true };
  } catch (error) {
    console.error('Error approving moderation item:', error);
    return { success: false };
  }
}

export async function rejectModerationItem(itemId: string, adminNotes?: string): Promise<{ success: boolean }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false };
    }

    const { data: item } = await supabase
      .from('moderation_queue')
      .select('*')
      .eq('id', itemId)
      .single();

    if (!item) {
      return { success: false };
    }

    await recordViolation({
      userId: item.user_id,
      violationType: 'ai_flagged_content',
      contentType: item.content_type,
      contentId: item.content_id,
      severity: item.risk_level === 'critical' ? 'critical' : item.risk_level === 'high' ? 'high' : 'medium',
      description: adminNotes || `AI flagged: ${item.flagged_categories.join(', ')}`,
    });

    await deleteReportedContent(item.content_type, item.content_id);

    await supabase
      .from('moderation_queue')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes,
      })
      .eq('id', itemId);

    return { success: true };
  } catch (error) {
    console.error('Error rejecting moderation item:', error);
    return { success: false };
  }
}
