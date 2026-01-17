import { supabase } from '@/lib/supabase';

export interface ModerationResult {
  allowed: boolean;
  flagged: boolean;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
  flaggedCategories?: string[];
}

export async function moderateContent(
  content: string,
  contentType: 'event' | 'profile' | 'chat' | 'comment',
  contentId: string
): Promise<ModerationResult> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.warn('Supabase config missing, allowing content');
      return { allowed: true, flagged: false, riskLevel: 'safe' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/moderate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({
        content,
        contentType,
        contentId,
      }),
    });

    if (!response.ok) {
      console.error('Moderation API error:', response.status);
      return { allowed: true, flagged: false, riskLevel: 'safe' };
    }

    const result = await response.json();

    const allowed = result.autoAction === 'approved';

    return {
      allowed,
      flagged: result.flagged,
      riskLevel: result.riskLevel,
      reason: result.flagged ? `Content flagged: ${result.flaggedCategories?.join(', ')}` : undefined,
      flaggedCategories: result.flaggedCategories,
    };
  } catch (error) {
    console.error('Moderation error:', error);
    return { allowed: true, flagged: false, riskLevel: 'safe' };
  }
}

export async function moderateEvent(
  title: string,
  description: string,
  eventId: string
): Promise<ModerationResult> {
  const combinedContent = `${title}\n\n${description}`;
  return moderateContent(combinedContent, 'event', eventId);
}

export async function moderateProfile(
  name: string,
  bio?: string,
  profileId?: string
): Promise<ModerationResult> {
  const combinedContent = bio ? `${name}\n${bio}` : name;
  return moderateContent(combinedContent, 'profile', profileId || 'profile-check');
}

export async function moderateChatMessage(
  message: string,
  messageId: string
): Promise<ModerationResult> {
  return moderateContent(message, 'chat', messageId);
}

export async function moderateComment(
  comment: string,
  commentId: string
): Promise<ModerationResult> {
  return moderateContent(comment, 'comment', commentId);
}

export async function createModerationQueue(params: {
  contentType: string;
  contentId: string;
  userId: string;
  riskLevel: string;
  flaggedCategories?: string[];
  originalContent: string;
}): Promise<void> {
  try {
    await supabase.from('moderation_queue').insert({
      content_type: params.contentType,
      content_id: params.contentId,
      user_id: params.userId,
      risk_level: params.riskLevel,
      flagged_categories: params.flaggedCategories || [],
      original_content: params.originalContent,
      status: 'pending',
    });
  } catch (error) {
    console.error('Error creating moderation queue entry:', error);
  }
}

export async function recordViolation(params: {
  userId: string;
  violationType: string;
  contentType: string;
  contentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
}): Promise<void> {
  try {
    await supabase.from('user_violations').insert({
      user_id: params.userId,
      violation_type: params.violationType,
      content_type: params.contentType,
      content_id: params.contentId,
      severity: params.severity,
      description: params.description,
    });

    await checkAndApplySuspension(params.userId);
  } catch (error) {
    console.error('Error recording violation:', error);
  }
}

async function checkAndApplySuspension(userId: string): Promise<void> {
  try {
    const { data: violations } = await supabase
      .from('user_violations')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    if (!violations) return;

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;
    const totalCount = violations.length;

    let suspensionDays = 0;
    let reason = '';

    if (criticalCount >= 1) {
      suspensionDays = 30;
      reason = 'Schwerwiegender Verstoß gegen Community-Richtlinien';
    } else if (highCount >= 3) {
      suspensionDays = 14;
      reason = 'Wiederholte Verstöße gegen Community-Richtlinien';
    } else if (totalCount >= 5) {
      suspensionDays = 7;
      reason = 'Mehrfache Verstöße gegen Community-Richtlinien';
    }

    if (suspensionDays > 0) {
      const suspendedUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);

      await supabase.from('profiles').update({
        suspended_until: suspendedUntil.toISOString(),
        suspension_reason: reason,
      }).eq('id', userId);
    }
  } catch (error) {
    console.error('Error checking suspension:', error);
  }
}
