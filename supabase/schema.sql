-- BioSchedule: tabelas e políticas de acesso.
-- Execute uma vez no SQL Editor do projeto Supabase. Pode ser reexecutado com segurança.
-- Cada usuário só lê e altera as próprias linhas (Row Level Security).

-- Grade por semestre: disciplinas selecionadas e concluídas.
create table if not exists public.plans (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  semester text not null check (semester ~ '^\d{4}\.[12]$'),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 32768),
  updated_at timestamptz not null default now(),
  primary key (user_id, semester)
);

-- Compromissos da agenda: provas, trabalhos e entregas por disciplina.
create table if not exists public.agenda_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  course_id text not null check (course_id ~ '^[A-Z]{4,6}\d{5}$'),
  kind text not null check (kind in ('prova', 'trabalho', 'atividade', 'outro')),
  title text not null check (char_length(title) between 1 and 120),
  due_date date not null,
  due_time time,
  max_score numeric(6, 2) check (max_score between 0 and 1000),
  score numeric(6, 2) check (score between 0 and 1000),
  notes text not null default '' check (char_length(notes) <= 2000),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agenda_items_user_date on public.agenda_items (user_id, due_date);

alter table public.plans enable row level security;
alter table public.agenda_items enable row level security;

-- Visitantes sem login não têm acesso algum.
revoke all on public.plans, public.agenda_items from anon;
grant select, insert, update, delete on public.plans, public.agenda_items to authenticated;

drop policy if exists "plans_owner" on public.plans;
create policy "plans_owner" on public.plans
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "agenda_owner" on public.agenda_items;
create policy "agenda_owner" on public.agenda_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Limite por usuário para evitar abuso de armazenamento.
create or replace function public.agenda_items_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.agenda_items where user_id = new.user_id) >= 2000 then
    raise exception 'Limite de compromissos atingido';
  end if;
  return new;
end;
$$;

drop trigger if exists agenda_items_limit on public.agenda_items;
create trigger agenda_items_limit
  before insert on public.agenda_items
  for each row execute function public.agenda_items_limit();

-- Exclusão da própria conta (LGPD). Apaga apenas o usuário que faz a chamada;
-- grade e agenda são removidas junto pelo "on delete cascade".
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
