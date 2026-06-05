-- AnglerIQ Lure Catalog
-- Stores brand + product data for major bass fishing lure manufacturers.
-- Powers RAG in chat and report generation so the AI can accurately describe
-- specific baits (diving depth, technique, colors, material, etc.)

-- Table
CREATE TABLE IF NOT EXISTS lure_catalog (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand         text NOT NULL,
  name          text NOT NULL,           -- canonical product name
  aliases       text[],                  -- alternate names the AI might use
  bait_type     text,                    -- crankbait | jig | soft_plastic | topwater | swimbait | etc.
  sub_type      text,                    -- squarebill | football | swim_jig | lipless | etc.
  chunk_text    text NOT NULL,           -- rich natural-language description — the text we embed
  embedding     vector(512),
  sizes         text[],                  -- e.g. ["3 inch", "4 inch", "5 inch"] or ["3/8oz", "1/2oz"]
  colors        text[],                  -- canonical color names
  depth_ft_min  numeric,                 -- typical min running depth (NULL = surface/topwater)
  depth_ft_max  numeric,                 -- typical max running depth
  techniques    text[],                  -- primary fishing techniques
  structure     text[],                  -- best structures (laydown, dock, ledge, grass...)
  seasons       text[],                  -- best seasons
  source_url    text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS lure_catalog_embedding_idx
  ON lure_catalog USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- RPC for semantic lure lookup
CREATE OR REPLACE FUNCTION match_lure_catalog(
  query_embedding vector(512),
  match_count     int     DEFAULT 5,
  match_threshold float   DEFAULT 0.3
)
RETURNS TABLE (
  id         uuid,
  brand      text,
  name       text,
  bait_type  text,
  sub_type   text,
  chunk_text text,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    lc.id,
    lc.brand,
    lc.name,
    lc.bait_type,
    lc.sub_type,
    lc.chunk_text,
    1 - (lc.embedding <=> query_embedding) AS similarity
  FROM lure_catalog lc
  WHERE lc.embedding IS NOT NULL
    AND 1 - (lc.embedding <=> query_embedding) > match_threshold
  ORDER BY lc.embedding <=> query_embedding
  LIMIT match_count;
$$;
