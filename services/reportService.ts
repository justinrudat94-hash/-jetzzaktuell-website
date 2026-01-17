import { supabase } from '@/lib/supabase';

export type EntityType = 'profile' | 'event' | 'livestream' | 'comment' | 'message';

export type ReportReason =
  | 'hate_speech'
  | 'harassment'
  | 'threats'
  | 'sexual_content'
  | 'violence'
  | 'discrimination'
  | 'spam'
  | 'profanity'
  | 'misinformation'
  | 'self_harm'
  | 'scam'
  | 'minor_protection'
  | 'copyright'
  | 'illegal'
  | 'technical'
  | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'action_taken' | 'dismissed';

export interface Report {
  id: string;
  reporter_id: string;
  reported_entity_type: EntityType;
  reported_entity_id: string;
  reported_user_id?: string;
  reason_category: ReportReason;
  reason_text?: string;
  status: ReportStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  ai_pre_checked: boolean;
  ai_confidence?: number;
  priority_score: number;
  created_at: string;
}

export interface CreateReportParams {
  reportedEntityType: EntityType;
  reportedEntityId: string;
  reportedUserId?: string;
  reasonCategory: ReportReason;
  reasonText?: string;
}

export const reportReasons: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'hate_speech',
    label: 'Hassrede',
    description: 'Nazi-Symbolik, Rassismus, extremistische Inhalte'
  },
  {
    value: 'harassment',
    label: 'Belästigung',
    description: 'Beleidigungen, persönliche Angriffe'
  },
  {
    value: 'threats',
    label: 'Bedrohungen',
    description: 'Gewaltandrohungen, Morddrohungen, Angriffe'
  },
  {
    value: 'sexual_content',
    label: 'Sexueller Inhalt',
    description: 'Explizite sexuelle Inhalte, Nacktheit'
  },
  {
    value: 'violence',
    label: 'Gewaltverherrlichung',
    description: 'Blut, Massaker, Kriegsverbrechen'
  },
  {
    value: 'discrimination',
    label: 'Diskriminierung',
    description: 'Religiös, ethnisch, sexuelle Orientierung'
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Wiederholte Nachrichten, URLs, Werbung'
  },
  {
    value: 'profanity',
    label: 'Vulgäre Sprache',
    description: 'Schimpfwörter, beleidigende Ausdrücke'
  },
  {
    value: 'misinformation',
    label: 'Fehlinformation',
    description: 'Fake News, Verschwörungstheorien'
  },
  {
    value: 'self_harm',
    label: 'Selbstverletzung',
    description: 'Suizid-Inhalte, Selbstmord-Androhungen'
  },
  {
    value: 'scam',
    label: 'Betrug',
    description: 'Scam-Versuche, betrügerische Aktivitäten'
  },
  {
    value: 'minor_protection',
    label: 'Jugendschutz',
    description: 'Jugendgefährdende Inhalte'
  },
  {
    value: 'copyright',
    label: 'Urheberrecht',
    description: 'Urheberrechtsverletzung'
  },
  {
    value: 'illegal',
    label: 'Illegale Inhalte',
    description: 'Drogen, Waffen, illegale Aktivitäten'
  },
  {
    value: 'technical',
    label: 'Technisches Problem',
    description: 'Fehlerhafte Anzeige, technischer Fehler'
  },
  {
    value: 'other',
    label: 'Sonstiges',
    description: 'Andere Gründe'
  },
];

export async function createReport(params: CreateReportParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/process-report`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': anonKey || '',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: result.error || 'Zu viele Meldungen. Bitte warte einen Moment.' };
      }
      if (response.status === 409) {
        return { success: false, error: 'Du hast diesen Inhalt bereits gemeldet' };
      }
      return { success: false, error: result.error || 'Fehler beim Erstellen der Meldung' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating report:', error);
    return { success: false, error: 'Netzwerkfehler beim Senden der Meldung' };
  }
}

export async function getUserReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user reports:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user reports:', error);
    return [];
  }
}

export async function checkIfAlreadyReported(
  entityType: EntityType,
  entityId: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return false;
    }

    const { data, error } = await supabase
      .from('reports')
      .select('id')
      .eq('reporter_id', user.id)
      .eq('reported_entity_type', entityType)
      .eq('reported_entity_id', entityId)
      .maybeSingle();

    if (error) {
      console.error('Error checking if already reported:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking if already reported:', error);
    return false;
  }
}

export async function getAllReports(): Promise<Report[]> {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('priority_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all reports:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching all reports:', error);
    return [];
  }
}

export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Nicht angemeldet' };
    }

    const { error } = await supabase
      .from('reports')
      .update({
        status,
        admin_notes: adminNotes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reportId);

    if (error) {
      console.error('Error updating report:', error);
      return { success: false, error: 'Fehler beim Aktualisieren der Meldung' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating report:', error);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

export async function deleteReportedContent(
  entityType: EntityType,
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let error;

    switch (entityType) {
      case 'event':
        ({ error } = await supabase.from('events').delete().eq('id', entityId));
        break;
      case 'profile':
        return { success: false, error: 'Profile können nicht gelöscht werden' };
      default:
        return { success: false, error: 'Unbekannter Inhaltstyp' };
    }

    if (error) {
      console.error('Error deleting content:', error);
      return { success: false, error: 'Fehler beim Löschen des Inhalts' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting content:', error);
    return { success: false, error: 'Netzwerkfehler' };
  }
}

export async function checkUserSuspension(userId?: string): Promise<{ suspended: boolean; reason?: string; suspended_until?: string; days_remaining?: number }> {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!targetUserId) {
      return { suspended: false };
    }

    const { data, error } = await supabase.rpc('check_user_suspension', {
      p_user_id: targetUserId,
    });

    if (error) {
      console.error('Error checking suspension:', error);
      return { suspended: false };
    }

    return data || { suspended: false };
  } catch (error) {
    console.error('Error checking suspension:', error);
    return { suspended: false };
  }
}

export async function getUserViolations(userId?: string) {
  try {
    const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!targetUserId) {
      return [];
    }

    const { data, error } = await supabase
      .from('user_violations')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching violations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching violations:', error);
    return [];
  }
}

export async function canUserReport(): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, reason: 'Nicht angemeldet' };
    }

    const { data, error } = await supabase.rpc('can_user_report', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('Error checking report permission:', error);
      return { allowed: true };
    }

    if (data && typeof data === 'object' && 'allowed' in data) {
      return {
        allowed: data.allowed,
        reason: data.reason || undefined
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking report permission:', error);
    return { allowed: true };
  }
}
