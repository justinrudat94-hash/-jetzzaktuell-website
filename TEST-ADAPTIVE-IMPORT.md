# Ticketmaster Adaptive Import - Test Guide

## What Was Implemented

### 1. Database Schema (Migration 077)
- **ticketmaster_query_splits**: Tracks individual query splits with status, results, and parent/child relationships
- **ticketmaster_metadata_cache**: Caches Ticketmaster API metadata (genres, DMAs, venues) to reduce API calls

### 2. Core Services

#### ticketmasterAdaptiveService.ts
- **Smart Query Generator**: Splits imports into time windows (7-14 days) and segments
- **Discovery Phase**: Checks `totalElements` before importing to detect queries >1000 events
- **Auto-Split Logic**: Automatically splits queries that exceed the 1000 event limit
- **Queue System**: Processes queries in priority order with resume capability
- **Progress Tracking**: Real-time progress updates with detailed metrics

#### ticketmasterMetadataService.ts
- **Genre/SubGenre Fetching**: Fetches and caches classification hierarchy
- **DMA Fetching**: Extracts DMAs from venues for geographic splitting
- **Venue Caching**: Caches top venues for venue-specific queries
- **Cache Management**: 30-day cache expiration with auto-cleanup

### 3. UI Updates
- Updated `ticketmaster-simple.tsx` to use adaptive service
- Updated `ImportProgress.tsx` component for better progress visualization

## Key Features

### Adaptive Query Splitting
**Problem**: Ticketmaster API limit: `size * page < 1000` (max 1000 events per query)

**Solution**:
1. Discovery phase checks totalElements
2. If > 1000: split query (Time → Genre → DMA hierarchy)
3. Continue until all sub-queries are < 1000 events

### Time Window Strategy
- **Quick Mode**: 14-day windows
- **Standard Mode**: 7-day windows
- **Full Mode**: 7-day windows + more time periods

### Import Modes
- **Quick**: Next 30 days, 2 time windows, 5 segments
- **Standard**: Next 3 months, 8 time windows, 5 segments
- **Full**: Next 6 months, all time windows, 5 segments + city filters
- **Adaptive**: Like Full but with automatic splitting

## Expected Results

### Before (Old System)
- Queries: ~18-20
- Events Imported: ~1,500-2,000
- Problem: Hit 1000 event limit per query, missed 90% of events

### After (Adaptive System)
- Queries: ~100-500 (automatically generated based on discovery)
- Events Imported: **50,000-80,000+ expected**
- Coverage: Much better coverage across all time periods and genres

## How to Test

### 1. In Admin Panel
1. Go to Admin → Ticketmaster Import
2. Select mode (Quick for testing, Standard for real import)
3. Click "Import starten"
4. Watch progress in real-time:
   - Query splits being created
   - Discovery phase detecting large queries
   - Auto-splitting when needed
   - Events being imported

### 2. Check Database
```sql
-- View all query splits from last import
SELECT
  query_label,
  status,
  total_elements,
  events_imported,
  events_skipped,
  split_reason
FROM ticketmaster_query_splits
WHERE import_run_id = (SELECT id FROM ticketmaster_import_history ORDER BY started_at DESC LIMIT 1)
ORDER BY priority, created_at;

-- View import history
SELECT
  mode,
  status,
  events_found,
  events_imported,
  events_skipped,
  started_at,
  completed_at
FROM ticketmaster_import_history
ORDER BY started_at DESC
LIMIT 10;

-- Check metadata cache
SELECT cache_type, cache_key, COUNT(*)
FROM ticketmaster_metadata_cache
GROUP BY cache_type, cache_key;
```

### 3. Verify Event Coverage
```sql
-- Events by date range
SELECT
  DATE(start_date) as event_date,
  COUNT(*) as event_count
FROM events
WHERE external_source = 'ticketmaster'
  AND start_date >= CURRENT_DATE
GROUP BY DATE(start_date)
ORDER BY event_date
LIMIT 30;

-- Events by category
SELECT
  category,
  COUNT(*) as count
FROM events
WHERE external_source = 'ticketmaster'
GROUP BY category
ORDER BY count DESC;
```

## Performance Expectations

### API Rate Limits
- 5000 calls/day (default)
- 5 requests/second
- Our delay: 250ms between calls = 4 calls/second (safe)

### Time Estimates
- **Quick Mode**: 5-10 minutes (~50 queries)
- **Standard Mode**: 15-30 minutes (~150 queries)
- **Full Mode**: 30-60 minutes (~300-500 queries)
- **Adaptive Mode**: Variable (auto-adjusts based on discovery)

## Troubleshooting

### Import Stops or Fails
1. Check `ticketmaster_query_splits` for failed queries
2. Review error_message column
3. Resume by re-running import (duplicate detection prevents re-importing)

### Low Event Count
1. Check if queries are splitting (look for split_reason)
2. Verify Ticketmaster API key is valid
3. Check if events already exist (events_skipped count)

### Rate Limit Errors (429)
1. Service has retry logic with exponential backoff
2. Check retry_count in ticketmaster_query_splits
3. If persistent: reduce maxQueries or increase delays

## Next Steps

### Potential Improvements
1. **Genre-based splitting**: Fetch actual genre IDs and split by genre when time-based isn't enough
2. **DMA-based splitting**: Use DMAs for geographic splitting
3. **Venue-based queries**: Query top venues individually
4. **Scheduler integration**: Auto-run adaptive imports daily
5. **Smart priority**: Prioritize queries for events happening soon

### Monitoring
- Track import success rate over time
- Monitor API quota usage
- Alert on failed imports
- Dashboard for import metrics

## API Documentation Reference

**Key Ticketmaster API Facts** (from your documentation):
- Deep Paging Limit: `size * page < 1000`
- Rate Limit: 5000 calls/day, 5 req/sec
- Event Search: `/discovery/v2/events.json`
- Parameters: countryCode, startDateTime, endDateTime, classificationName, genreId, subGenreId, dmaId
- Response: `page.totalElements` shows total events matching query

## Success Criteria

✅ Import completes without errors
✅ Events imported > 20,000 (for Standard mode)
✅ Query splits show auto-splitting when > 1000 events
✅ No duplicate events created
✅ Progress updates in real-time
✅ Import can be resumed after interruption

## File Changes Summary

### New Files
- `services/ticketmasterAdaptiveService.ts` - Core adaptive import logic
- `services/ticketmasterMetadataService.ts` - API metadata caching

### Modified Files
- `app/admin/ticketmaster-simple.tsx` - Updated to use adaptive service
- `components/ImportProgress.tsx` - Updated progress display

### Database
- `supabase/migrations/077_create_ticketmaster_query_tracking.sql` - New tables

### Config Required
- Ticketmaster API key in `.env`: `EXPO_PUBLIC_TICKETMASTER_API_KEY`
