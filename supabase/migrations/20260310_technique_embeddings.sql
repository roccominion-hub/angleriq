-- Technique report embeddings (1024-dim, voyage-3-lite)
create table if not exists technique_embeddings (
  id uuid primary key default extensions.uuid_generate_v4(),
  technique_report_id uuid not null references technique_report(id) on delete cascade,
  body_of_water_id uuid references body_of_water(id) on delete cascade,
  content text not null,
  embedding vector(512),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(technique_report_id)
);

-- Index for cosine similarity search
create index if not exists technique_embeddings_embedding_idx
  on technique_embeddings
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Index for lake filtering
create index if not exists technique_embeddings_bow_idx
  on technique_embeddings(body_of_water_id);

-- RPC: match technique embeddings by cosine similarity
create or replace function match_technique_embeddings(
  query_embedding vector(512),
  match_count int default 8,
  filter_lake_id uuid default null
)
returns table (
  id uuid,
  technique_report_id uuid,
  body_of_water_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    te.id,
    te.technique_report_id,
    te.body_of_water_id,
    te.content,
    1 - (te.embedding <=> query_embedding) as similarity
  from technique_embeddings te
  where te.embedding is not null
    and (filter_lake_id is null or te.body_of_water_id = filter_lake_id)
  order by te.embedding <=> query_embedding
  limit match_count;
$$;
