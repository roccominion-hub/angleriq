-- AnglerIQ — Cleanup bad technique records and embeddings
-- Removes non-bass, non-artificial-lure content that slipped through ingestion
-- Run in Supabase SQL Editor

-- ── 1. Delete bad bait_used records (and cascade to their technique_reports) ──

-- First identify bad technique_report IDs via bait_used
CREATE TEMP TABLE bad_report_ids AS
SELECT DISTINCT tr.id
FROM technique_report tr
LEFT JOIN bait_used bu ON bu.technique_report_id = tr.id
WHERE
  -- Non-artificial baits
  bu.bait_name ILIKE '%corn%'
  OR bu.bait_name ILIKE '%nightcrawler%'
  OR bu.bait_name ILIKE '%chicken liver%'
  OR bu.bait_name ILIKE '%cut bait%'
  OR bu.bait_name ILIKE '%stink bait%'
  OR bu.bait_name ILIKE '%cricket%'
  OR bu.bait_name ILIKE '%dough bait%'
  OR bu.bait_type ILIKE '%live bait%'
  OR bu.bait_type ILIKE '%natural bait%'
  -- Non-bass patterns/notes in technique_report itself
  OR tr.pattern    ILIKE '%trout%'
  OR tr.pattern    ILIKE '%catfish%'
  OR tr.pattern    ILIKE '%crappie%'
  OR tr.pattern    ILIKE '%walleye%'
  OR tr.notes      ILIKE '%trout%'
  OR tr.notes      ILIKE '%catfish%'
  OR tr.notes      ILIKE '%corn%'
  OR tr.notes      ILIKE '%nightcrawler%'
  OR tr.presentation ILIKE '%corn%'
  OR tr.presentation ILIKE '%nightcrawler%';

-- Delete cascades to bait_used and conditions via FK
DELETE FROM technique_report WHERE id IN (SELECT id FROM bad_report_ids);

-- ── 2. Delete bad RAG embeddings ─────────────────────────────────────────────

DELETE FROM technique_embeddings
WHERE
  content ILIKE '%corn%'
  OR content ILIKE '%trout%'
  OR content ILIKE '%catfish%'
  OR content ILIKE '%crappie%'
  OR content ILIKE '%walleye%'
  OR content ILIKE '%nightcrawler%'
  OR content ILIKE '%chicken liver%'
  OR content ILIKE '%cut bait%'
  OR content ILIKE '%stink bait%'
  OR content ILIKE '%live bait%'
  OR content ILIKE '%below the dam%'    -- trout-below-dam articles
  OR content ILIKE '%tailwater%'         -- tailwater trout fishing
  OR content ILIKE '%salmon%'
  OR content ILIKE '%panfish%'
  OR content ILIKE '%perch%';

-- ── 3. Report what was removed ────────────────────────────────────────────────
SELECT 'technique_reports removed' AS label, COUNT(*) FROM bad_report_ids
UNION ALL
SELECT 'Current technique_report count', COUNT(*) FROM technique_report
UNION ALL
SELECT 'Current technique_embeddings count', COUNT(*) FROM technique_embeddings;
