-- =====================================================================
-- RevisãoOS (revisao-web) — Schema Supabase consolidado
-- Consolida supabase-schema.sql + updates 1/2/3 do app antigo (revisao-os)
-- e adiciona suporte MULTIEMPRESA de verdade (coluna company_id + RLS).
--
-- Seguro rodar em cima de um projeto Supabase JÁ EXISTENTE do RevisãoOS
-- antigo: todo "create table" é "if not exists", toda política é
-- recriada (drop + create), e a coluna company_id é adicionada com
-- backfill para linhas antigas (tratadas como da empresa "revisao").
-- Rode o arquivo inteiro no SQL Editor do seu projeto Supabase.
-- =====================================================================

-- ---------- 1. TABELAS ----------
create table if not exists public.departments        (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.teams              (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.users              (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.programs           (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.projects           (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.task_templates     (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.tasks              (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.recurring_activities(id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.weekly_objectives  (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.notifications      (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.link_templates      (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.meetings            (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.editais             (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.calendars           (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.calendar_events     (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.company_settings    (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_transactions        (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_accounts            (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_invoices            (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_payroll             (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_contractor_invoices (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_goals               (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.finance_sheet_links         (id text primary key, data jsonb not null, updated_at timestamptz default now());
-- app_settings NÃO é multiempresa (sem company_id) — é config do app inteiro
-- (ex: Client ID OAuth do Google, compartilhado por todas as empresas porque
-- é uma única origem/deploy). Uma linha só, id='global'.
create table if not exists public.app_settings                (id text primary key, data jsonb not null, updated_at timestamptz default now());
alter table public.app_settings enable row level security;
drop policy if exists app_settings_read on public.app_settings;
create policy app_settings_read on public.app_settings for select to authenticated using ( true );
drop policy if exists app_settings_admin on public.app_settings;
create policy app_settings_admin on public.app_settings for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- ---------- 2. MULTIEMPRESA: coluna company_id em toda tabela ----------
-- Linhas antigas (criadas antes desta coluna existir) pertencem à empresa
-- legada "revisao" — backfill abaixo preserva os dados já cadastrados.
do $$
declare t text;
begin
  foreach t in array array[
    'departments','teams','users','programs','projects','task_templates','tasks',
    'recurring_activities','weekly_objectives','notifications','link_templates',
    'meetings','editais','calendars','calendar_events','company_settings','finance_transactions','finance_accounts','finance_invoices',
    'finance_payroll','finance_contractor_invoices','finance_goals','finance_sheet_links'
  ]
  loop
    execute format('alter table public.%I add column if not exists company_id text;', t);
    execute format('update public.%I set company_id = %L where company_id is null;', t, 'revisao');
    execute format('alter table public.%I alter column company_id set not null;', t);
    execute format('alter table public.%I alter column company_id set default %L;', t, 'revisao');
    execute format('create index if not exists %I_company_idx on public.%I (company_id);', t, t);
  end loop;
end $$;

-- e-mail indexado para o login mapear o colaborador
create index if not exists users_email_idx on public.users ((lower(data->>'email')));
create index if not exists tasks_responsible_idx on public.tasks ((data->>'responsibleId'));
create index if not exists tasks_team_idx on public.tasks ((data->>'teamId'));
create index if not exists finance_transactions_due_idx on public.finance_transactions ((data->>'dueDate'));
create index if not exists finance_transactions_competence_idx on public.finance_transactions ((data->>'competenceMonth'));

-- ---------- 3. FUNÇÕES AUXILIARES (perfil do usuário logado) ----------
-- security definer: consultam public.users ignorando o RLS (evita recursão).
create or replace function public.app_email() returns text
  language sql stable as $$ select lower(auth.jwt()->>'email') $$;

create or replace function public.app_role() returns text
  language sql stable security definer set search_path=public as $$
  select data->>'role' from public.users where lower(data->>'email') = app_email() limit 1 $$;

create or replace function public.app_user_id() returns text
  language sql stable security definer set search_path=public as $$
  select id from public.users where lower(data->>'email') = app_email() limit 1 $$;

create or replace function public.app_team_id() returns text
  language sql stable security definer set search_path=public as $$
  select data->>'teamId' from public.users where lower(data->>'email') = app_email() limit 1 $$;

-- Empresa do usuário logado — chave de toda a isolação multiempresa abaixo.
create or replace function public.app_company_id() returns text
  language sql stable security definer set search_path=public as $$
  select company_id from public.users where lower(data->>'email') = app_email() limit 1 $$;

create or replace function public.is_admin() returns boolean
  language sql stable as $$ select public.app_role() = 'admin' $$;

-- Financeiro é um módulo sigiloso: leitura E escrita exigem autorização
-- explícita (data->>'financeAccess' = true no cadastro do colaborador),
-- não apenas "qualquer autenticado lê". Concedida pela aba Equipe.
create or replace function public.is_finance_authorized() returns boolean
  language sql stable security definer set search_path=public as $$
  select public.is_admin() or coalesce(
    (select (data->>'financeAccess')::boolean from public.users where lower(data->>'email') = app_email() limit 1),
    false
  ) $$;

-- ---------- 4. RLS ----------
do $$
declare t text;
begin
  foreach t in array array[
    'departments','teams','users','programs','projects','task_templates','tasks',
    'recurring_activities','weekly_objectives','notifications','link_templates',
    'meetings','editais','calendars','calendar_events','company_settings','finance_transactions','finance_accounts','finance_invoices',
    'finance_payroll','finance_contractor_invoices','finance_goals','finance_sheet_links'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- 4a. Tabelas de referência: qualquer autenticado da MESMA empresa LÊ;
-- só admin da MESMA empresa ESCREVE.
do $$
declare t text;
begin
  foreach t in array array['departments','teams','users','programs','task_templates','recurring_activities','weekly_objectives','link_templates','editais','calendars','calendar_events','company_settings']
  loop
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (company_id = public.app_company_id());', t, t);
    execute format('drop policy if exists %I_admin on public.%I;', t, t);
    execute format('create policy %I_admin on public.%I for all to authenticated using (company_id = public.app_company_id() and public.is_admin()) with check (company_id = public.app_company_id() and public.is_admin());', t, t);
  end loop;
end $$;

-- 4a2. PROJETOS: leitura por todos autenticados da empresa; criar/excluir só
-- admin; ATUALIZAR é aberto a todos autenticados da empresa (qualquer
-- colaborador do setor precisa poder colar o link do próprio setor no
-- Briefing). Proteção de QUAIS campos cada perfil pode mudar é no cliente.
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using ( company_id = public.app_company_id() );
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check ( company_id = public.app_company_id() and public.is_admin() );
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated using ( company_id = public.app_company_id() ) with check ( company_id = public.app_company_id() );
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated using ( company_id = public.app_company_id() and public.is_admin() );

-- 4b. TAREFAS: leitura por admin, responsável ou equipe (da mesma empresa);
-- escrita conforme perfil.
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using ( company_id = public.app_company_id()
          and (public.is_admin()
               or data->>'responsibleId' = public.app_user_id()
               or (data->>'teamId' is not null and data->>'teamId' = public.app_team_id())) );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check ( company_id = public.app_company_id() and public.is_admin() );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using ( company_id = public.app_company_id() and (public.is_admin() or data->>'responsibleId' = public.app_user_id()) )
  with check ( company_id = public.app_company_id() and (public.is_admin() or data->>'responsibleId' = public.app_user_id()) );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using ( company_id = public.app_company_id() and public.is_admin() );

-- 4b2. REUNIÕES: qualquer autenticado da empresa lê e cria; só admin edita/exclui.
drop policy if exists meetings_read on public.meetings;
create policy meetings_read on public.meetings for select to authenticated using ( company_id = public.app_company_id() );
drop policy if exists meetings_insert on public.meetings;
create policy meetings_insert on public.meetings for insert to authenticated with check ( company_id = public.app_company_id() );
drop policy if exists meetings_update on public.meetings;
create policy meetings_update on public.meetings for update to authenticated
  using ( company_id = public.app_company_id() and public.is_admin() ) with check ( company_id = public.app_company_id() and public.is_admin() );
drop policy if exists meetings_delete on public.meetings;
create policy meetings_delete on public.meetings for delete to authenticated using ( company_id = public.app_company_id() and public.is_admin() );

-- 4b3. FINANCEIRO: sigiloso — leitura E escrita exigem is_finance_authorized(),
-- sempre dentro da própria empresa.
do $$
declare t text;
begin
  foreach t in array array['finance_transactions','finance_accounts','finance_invoices','finance_payroll','finance_contractor_invoices','finance_goals','finance_sheet_links']
  loop
    execute format('drop policy if exists %I_rw on public.%I;', t, t);
    execute format('create policy %I_rw on public.%I for all to authenticated using (company_id = public.app_company_id() and public.is_finance_authorized()) with check (company_id = public.app_company_id() and public.is_finance_authorized());', t, t);
  end loop;
end $$;

-- 4c. NOTIFICAÇÕES: admin da empresa lê tudo; colaborador lê as que gerou.
-- Qualquer autenticado da empresa insere.
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select to authenticated
  using ( company_id = public.app_company_id() and (public.is_admin() or data->>'createdBy' = public.app_user_id()) );
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert to authenticated with check ( company_id = public.app_company_id() );
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using ( company_id = public.app_company_id() and (public.is_admin() or data->>'createdBy' = public.app_user_id()) )
  with check ( company_id = public.app_company_id() and (public.is_admin() or data->>'createdBy' = public.app_user_id()) );
drop policy if exists notif_delete on public.notifications;
create policy notif_delete on public.notifications for delete to authenticated using ( company_id = public.app_company_id() and public.is_admin() );

-- ---------- 5. STORAGE (anexos) ----------
insert into storage.buckets (id, name, public) values ('attachments','attachments', true)
  on conflict (id) do nothing;

drop policy if exists att_read on storage.objects;
create policy att_read on storage.objects for select using ( bucket_id = 'attachments' );
drop policy if exists att_upload on storage.objects;
create policy att_upload on storage.objects for insert to authenticated with check ( bucket_id = 'attachments' );
drop policy if exists att_delete on storage.objects;
create policy att_delete on storage.objects for delete to authenticated using ( bucket_id = 'attachments' );
-- Bucket PÚBLICO para simplicidade (links diretos). Para restringir, torne-o
-- privado e troque getPublicUrl por createSignedUrl no cliente.

-- ---------- 6. PRIMEIRO ADMINISTRADOR (só se o projeto for novo) ----------
-- Se você está migrando o projeto Supabase JÁ existente do RevisãoOS antigo,
-- pule este passo — seu usuário admin já existe (e recebeu company_id via
-- backfill acima). Se este é um projeto Supabase novo, descomente e edite:
--
-- insert into public.users (id, company_id, data) values (
--   'u_admin', 'revisao',
--   jsonb_build_object(
--     'id','u_admin','name','Administrador','shortName','Admin',
--     'email','SEU-EMAIL-ADMIN@exemplo.com','role','admin',
--     'jobTitle','Administrador','departmentId',null,'teamId',null,
--     'status','active','joinedAt', to_char(now(),'YYYY-MM-DD')
--   )
-- ) on conflict (id) do update set data = excluded.data;

-- Fim.
