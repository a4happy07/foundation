create table if not exists entries (
  id bigserial primary key,
  owner_sub text not null,
  stage text not null check (stage in ('production', 'preview')),
  body text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists entries_owner_stage_created_idx
  on entries (owner_sub, stage, created_at desc);
