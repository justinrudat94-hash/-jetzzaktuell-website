/*
  # Create Demo Moderation Data

  This creates test data for the moderation system:
  1. Demo report from a user
  2. Demo problematic content in moderation queue

  You can use this to test the admin/moderation features.
*/

-- ============================================================================
-- 1. INSERT DEMO REPORT
-- ============================================================================
-- This creates a report as if a user reported an event

INSERT INTO reports (
  id,
  reporter_id,
  reported_entity_type,
  reported_entity_id,
  reported_user_id,
  reason_category,
  reason_text,
  status,
  ai_pre_checked,
  ai_confidence,
  priority_score,
  created_at
)
SELECT
  '11111111-1111-1111-1111-111111111111'::uuid,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1), -- First user as reporter
  'event'::entity_type,
  (SELECT id FROM events ORDER BY created_at DESC LIMIT 1), -- Most recent event
  (SELECT creator_id FROM events ORDER BY created_at DESC LIMIT 1), -- Event creator
  'fake_spam'::report_reason,
  'Dieses Event sieht aus wie Spam. Die Beschreibung macht keinen Sinn und die Location ist falsch.',
  'pending'::report_status,
  true,
  0.85,
  75,
  now() - INTERVAL '2 hours'
WHERE NOT EXISTS (SELECT 1 FROM reports WHERE id = '11111111-1111-1111-1111-111111111111');

-- ============================================================================
-- 2. INSERT DEMO MODERATION QUEUE ITEM
-- ============================================================================
-- This creates a flagged content item as if AI detected something suspicious

INSERT INTO moderation_queue (
  id,
  content_type,
  content_id,
  user_id,
  risk_level,
  flagged_categories,
  status,
  original_content,
  created_at
)
SELECT
  '22222222-2222-2222-2222-222222222222'::uuid,
  'event',
  (SELECT id FROM events ORDER BY created_at DESC LIMIT 1)::text, -- Most recent event
  (SELECT creator_id FROM events ORDER BY created_at DESC LIMIT 1), -- Event creator
  'high',
  ARRAY['spam', 'suspicious_content', 'misleading_info'],
  'pending',
  'MEGA PARTY!!! KOMMT ALLE!!! GRATIS DRINKS UND 1000€ GEWINNSPIEL!!! JETZT ANMELDEN!!!',
  now() - INTERVAL '1 hour'
WHERE NOT EXISTS (SELECT 1 FROM moderation_queue WHERE id = '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- 3. INSERT SECOND DEMO REPORT (Different reason)
-- ============================================================================

INSERT INTO reports (
  id,
  reporter_id,
  reported_entity_type,
  reported_entity_id,
  reported_user_id,
  reason_category,
  reason_text,
  status,
  ai_pre_checked,
  ai_confidence,
  priority_score,
  created_at
)
SELECT
  '33333333-3333-3333-3333-333333333333'::uuid,
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1 OFFSET 1), -- Second user
  'event'::entity_type,
  (SELECT id FROM events ORDER BY created_at DESC LIMIT 1 OFFSET 1), -- Second most recent event
  (SELECT creator_id FROM events ORDER BY created_at DESC LIMIT 1 OFFSET 1),
  'inappropriate_content'::report_reason,
  'Enthält unangemessene Inhalte und verstößt gegen die Community-Richtlinien.',
  'pending'::report_status,
  true,
  0.92,
  88,
  now() - INTERVAL '30 minutes'
WHERE NOT EXISTS (SELECT 1 FROM reports WHERE id = '33333333-3333-3333-3333-333333333333')
  AND (SELECT COUNT(*) FROM profiles) >= 2
  AND (SELECT COUNT(*) FROM events) >= 2;

-- ============================================================================
-- 4. INSERT CRITICAL RISK ITEM IN MODERATION QUEUE
-- ============================================================================

INSERT INTO moderation_queue (
  id,
  content_type,
  content_id,
  user_id,
  risk_level,
  flagged_categories,
  status,
  original_content,
  created_at
)
SELECT
  '44444444-4444-4444-4444-444444444444'::uuid,
  'comment',
  gen_random_uuid()::text, -- Random comment ID
  (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1),
  'critical',
  ARRAY['harassment', 'hate_speech', 'threats'],
  'pending',
  'Du bist so dumm! Ich hasse dich und alle wie dich!',
  now() - INTERVAL '10 minutes'
WHERE NOT EXISTS (SELECT 1 FROM moderation_queue WHERE id = '44444444-4444-4444-4444-444444444444');

-- ============================================================================
-- 5. INSERT LOW RISK ITEM (should be easy to approve)
-- ============================================================================

INSERT INTO moderation_queue (
  id,
  content_type,
  content_id,
  user_id,
  risk_level,
  flagged_categories,
  status,
  original_content,
  created_at
)
SELECT
  '55555555-5555-5555-5555-555555555555'::uuid,
  'event',
  (SELECT id FROM events ORDER BY created_at DESC LIMIT 1 OFFSET 2)::text,
  (SELECT creator_id FROM events ORDER BY created_at DESC LIMIT 1 OFFSET 2),
  'low',
  ARRAY['needs_review'],
  'pending',
  'Entspannter Grillabend am See. Bringt gute Laune mit :)',
  now() - INTERVAL '5 minutes'
WHERE NOT EXISTS (SELECT 1 FROM moderation_queue WHERE id = '55555555-5555-5555-5555-555555555555')
  AND (SELECT COUNT(*) FROM events) >= 3;
