export const schemaSql = `
pragma foreign_keys = on;

create table if not exists projects (
  id integer primary key autoincrement,
  title text not null,
  genre text default '',
  premise text default '',
  target_word_count integer default 0,
  pov text default '',
  tone text default '',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create table if not exists project_settings (
  project_id integer primary key,
  default_model text not null default 'gpt-4o-mini',
  embedding_model text not null default 'text-embedding-3-small',
  chapter_target_words integer not null default 2500,
  context_token_budget integer not null default 12000,
  style_strength real not null default 0.7,
  continuity_strictness real not null default 0.8,
  foreign key (project_id) references projects(id) on delete cascade
);

create table if not exists story_bibles (
  id integer primary key autoincrement,
  project_id integer not null,
  content_json text not null,
  version integer not null default 1,
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade
);

create table if not exists style_bibles (
  id integer primary key autoincrement,
  project_id integer not null,
  content_json text not null,
  style_fingerprint text not null default '',
  version integer not null default 1,
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade
);

create table if not exists volumes (
  id integer primary key autoincrement,
  project_id integer not null,
  volume_number integer not null,
  title text not null,
  outline_json text not null default '{}',
  status text not null default 'planned',
  foreign key (project_id) references projects(id) on delete cascade
);

create unique index if not exists idx_volumes_project_number on volumes(project_id, volume_number);

create table if not exists arc_packs (
  id integer primary key autoincrement,
  project_id integer not null,
  volume_id integer not null,
  start_chapter_number integer not null,
  end_chapter_number integer not null,
  outline_json text not null default '{}',
  status text not null default 'planned',
  foreign key (project_id) references projects(id) on delete cascade,
  foreign key (volume_id) references volumes(id) on delete cascade
);

create index if not exists idx_arc_packs_project_range on arc_packs(project_id, start_chapter_number, end_chapter_number);

create table if not exists chapters (
  id integer primary key autoincrement,
  project_id integer not null,
  volume_id integer,
  arc_pack_id integer,
  chapter_number integer not null,
  title text not null default '',
  outline_json text not null default '{}',
  scene_beats_json text not null default '[]',
  draft_text text,
  final_text text,
  summary text,
  status text not null default 'planned' check (status in ('planned', 'drafted', 'checked', 'accepted')),
  word_count integer not null default 0,
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade,
  foreign key (volume_id) references volumes(id) on delete set null,
  foreign key (arc_pack_id) references arc_packs(id) on delete set null
);

create unique index if not exists idx_chapters_project_number on chapters(project_id, chapter_number);

create table if not exists scenes (
  id integer primary key autoincrement,
  project_id integer not null,
  chapter_id integer not null,
  scene_number integer not null,
  summary text not null default '',
  location text,
  pov_character_id integer,
  involved_character_ids_json text not null default '[]',
  emotional_turn text default '',
  plot_function text default '',
  foreign key (project_id) references projects(id) on delete cascade,
  foreign key (chapter_id) references chapters(id) on delete cascade,
  foreign key (pov_character_id) references characters(id) on delete set null
);

create table if not exists characters (
  id integer primary key autoincrement,
  project_id integer not null,
  name text not null,
  aliases_json text not null default '[]',
  tier text not null default 'D' check (tier in ('S', 'A', 'B', 'C', 'D')),
  role text default '',
  first_chapter integer,
  last_seen_chapter integer,
  description text default '',
  appearance text default '',
  personality_json text not null default '[]',
  speech_style text default '',
  tags_json text not null default '[]',
  is_active integer not null default 1,
  foreign key (project_id) references projects(id) on delete cascade
);

create unique index if not exists idx_characters_project_name on characters(project_id, name);
create index if not exists idx_characters_project_tier on characters(project_id, tier);

create table if not exists character_states (
  id integer primary key autoincrement,
  project_id integer not null,
  character_id integer not null,
  chapter_number integer not null,
  alive_status text not null default 'unknown' check (alive_status in ('alive', 'dead', 'unknown', 'missing', 'undead', 'sealed')),
  location text default '',
  physical_state text default '',
  emotional_state text default '',
  current_goal text default '',
  faction text default '',
  relationship_to_protagonist text default '',
  knowledge_json text not null default '[]',
  secrets_json text not null default '[]',
  possessions_json text not null default '[]',
  injuries_json text not null default '[]',
  notes text default '',
  source_chapter integer,
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade,
  foreign key (character_id) references characters(id) on delete cascade
);

create index if not exists idx_character_states_latest on character_states(project_id, character_id, chapter_number desc, id desc);

create table if not exists entities (
  id integer primary key autoincrement,
  project_id integer not null,
  type text not null check (type in ('location', 'item', 'organization', 'ability', 'secret', 'rule', 'event', 'concept')),
  name text not null,
  aliases_json text not null default '[]',
  description text default '',
  first_seen_chapter integer,
  last_seen_chapter integer,
  foreign key (project_id) references projects(id) on delete cascade
);

create unique index if not exists idx_entities_project_type_name on entities(project_id, type, name);

create table if not exists relation_triples (
  id integer primary key autoincrement,
  project_id integer not null,
  subject_type text not null,
  subject_id integer,
  predicate text not null,
  object_type text not null,
  object_id integer,
  object_value text,
  source_chapter integer,
  source_scene integer,
  evidence_text text default '',
  confidence real not null default 0.7,
  valid_from_chapter integer,
  valid_to_chapter integer,
  importance text not null default 'medium' check (importance in ('low', 'medium', 'high', 'critical')),
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade
);

create index if not exists idx_relation_triples_project_valid on relation_triples(project_id, valid_from_chapter, valid_to_chapter);
create index if not exists idx_relation_triples_project_predicate on relation_triples(project_id, predicate);

create table if not exists timeline_events (
  id integer primary key autoincrement,
  project_id integer not null,
  chapter_number integer not null,
  scene_number integer,
  event_type text not null default '',
  title text not null,
  summary text not null default '',
  involved_character_ids_json text not null default '[]',
  involved_entity_ids_json text not null default '[]',
  impact_level text not null default 'medium' check (impact_level in ('low', 'medium', 'high', 'critical')),
  consequences_json text not null default '[]',
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade
);

create index if not exists idx_timeline_events_project_chapter on timeline_events(project_id, chapter_number desc);

create table if not exists memory_chunks (
  id integer primary key autoincrement,
  project_id integer not null,
  source_type text not null check (source_type in ('chapter', 'scene', 'bible', 'style', 'note')),
  source_id integer not null,
  chapter_number integer,
  text text not null,
  summary text default '',
  tags_json text not null default '[]',
  embedding_json text,
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade
);

create index if not exists idx_memory_chunks_project_chapter on memory_chunks(project_id, chapter_number desc);

create table if not exists continuity_reports (
  id integer primary key autoincrement,
  project_id integer not null,
  chapter_id integer not null,
  pass integer not null,
  issues_json text not null default '[]',
  created_at text not null default (datetime('now')),
  foreign key (project_id) references projects(id) on delete cascade,
  foreign key (chapter_id) references chapters(id) on delete cascade
);

create index if not exists idx_continuity_reports_project_chapter on continuity_reports(project_id, chapter_id, created_at desc);

create table if not exists generation_runs (
  id integer primary key autoincrement,
  project_id integer,
  run_type text not null,
  model text not null,
  prompt_summary text not null default '',
  input_json text not null default '{}',
  output_json text not null default '{}',
  created_at text not null default (datetime('now')),
  error text,
  foreign key (project_id) references projects(id) on delete set null
);
`;

