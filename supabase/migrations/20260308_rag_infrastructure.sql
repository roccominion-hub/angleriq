-- Enable pgvector
create extension if not exists vector;

-- Raw content storage (articles, transcripts, forum posts)
create table if not exists lake_content (
  id uuid primary key default extensions.uuid_generate_v4(),
  body_of_water_id uuid references body_of_water(id) on delete cascade,
  source_type text not null, -- 'article', 'video_transcript', 'forum_post', 'guide_report'
  source_url text,
  title text,
  author text,
  published_date date,
  raw_text text not null,
  season text, -- optional tag
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Chunked + embedded content for vector search
create table if not exists lake_content_chunks (
  id uuid primary key default extensions.uuid_generate_v4(),
  lake_content_id uuid references lake_content(id) on delete cascade,
  body_of_water_id uuid references body_of_water(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  embedding vector(512), -- Voyage AI voyage-3-lite dimensions
  token_count integer,
  created_at timestamptz default now()
);

-- Index for fast similarity search
create index if not exists lake_content_chunks_embedding_idx 
  on lake_content_chunks 
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for lake filtering
create index if not exists lake_content_chunks_bow_idx 
  on lake_content_chunks(body_of_water_id);

-- Precomputed lake similarity scores
create table if not exists lake_similarity (
  id uuid primary key default extensions.uuid_generate_v4(),
  lake_a_id uuid references body_of_water(id) on delete cascade,
  lake_b_id uuid references body_of_water(id) on delete cascade,
  similarity_score float not null, -- 0-1
  similarity_basis text default 'tournament_outcome', -- 'tournament_outcome', 'geography', 'combined'
  computed_at timestamptz default now(),
  unique(lake_a_id, lake_b_id)
);

-- RPC function for vector similarity search
create or replace function match_lake_chunks(
  query_embedding vector(512),
  target_lake_id uuid,
  match_count int default 8,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  body_of_water_id uuid,
  chunk_text text,
  lake_content_id uuid,
  similarity float
)
language sql stable
as $$
  select
    lcc.id,
    lcc.body_of_water_id,
    lcc.chunk_text,
    lcc.lake_content_id,
    1 - (lcc.embedding <=> query_embedding) as similarity
  from lake_content_chunks lcc
  where lcc.body_of_water_id = target_lake_id
    and lcc.embedding is not null
    and 1 - (lcc.embedding <=> query_embedding) > match_threshold
  order by lcc.embedding <=> query_embedding
  limit match_count;
$$;

-- RPC function to get similar lakes (fallback)
create or replace function get_similar_lakes(
  target_lake_id uuid,
  limit_count int default 3
)
returns table (
  lake_id uuid,
  lake_name text,
  similarity_score float
)
language sql stable
as $$
  select 
    bow.id as lake_id,
    bow.name as lake_name,
    ls.similarity_score
  from lake_similarity ls
  join body_of_water bow on bow.id = ls.lake_b_id
  where ls.lake_a_id = target_lake_id
  order by ls.similarity_score desc
  limit limit_count;
$$;
