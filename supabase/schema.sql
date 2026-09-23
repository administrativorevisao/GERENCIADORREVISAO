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
-- Saldo observado de uma conta bancária numa data (relatórios reais com
-- histórico diário de saldo em vez de lista de contas com saldo inicial).
create table if not exists public.finance_account_balances    (id text primary key, data jsonb not null, updated_at timestamptz default now());
-- Perfis de acesso ("modelos de usuário") definidos livremente em
-- Administração — cada um empacota isAdmin/financeAccess/allowedViews,
-- aplicados ao colaborador que o tiver atribuído (users.roleId).
create table if not exists public.roles                       (id text primary key, data jsonb not null, updated_at timestamptz default now());
-- Procedimentos Padrão da equipe (Gestão → Padrões da equipe): o modelo
-- (etapas em ordem, cada uma com responsável) e as execuções em andamento.
create table if not exists public.procedures                  (id text primary key, data jsonb not null, updated_at timestamptz default now());
create table if not exists public.procedure_runs              (id text primary key, data jsonb not null, updated_at timestamptz default now());
-- Backlog de lançamentos do Marketing (Marketing → Backlog de lançamentos).
create table if not exists public.launches                    (id text primary key, data jsonb not null, updated_at timestamptz default now());
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
    'finance_payroll','finance_contractor_invoices','finance_goals','finance_sheet_links','finance_account_balances','roles','procedures','procedure_runs','launches'
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
create index if not exists finance_account_balances_lookup_idx on public.finance_account_balances ((data->>'accountId'), (data->>'date'));

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

-- Empresa "principal" do usuário logado (users.company_id) — continua
-- existindo pra identidade/perfil, mas não é mais o único critério de
-- acesso: ver app_has_company() logo abaixo.
create or replace function public.app_company_id() returns text
  language sql stable security definer set search_path=public as $$
  select company_id from public.users where lower(data->>'email') = app_email() limit 1 $$;

create or replace function public.is_admin() returns boolean
  language sql stable as $$ select public.app_role() = 'admin' $$;

-- Colaborador membro de mais de uma empresa (login único, troca pelo
-- seletor de empresa) — cada linha extra fica em public.user_companies,
-- além da empresa "principal" em users.company_id.
create table if not exists public.user_companies (
  id text primary key,
  user_id text not null,
  company_id text not null,
  created_at timestamptz default now(),
  unique (user_id, company_id)
);
alter table public.user_companies enable row level security;

-- Verdadeiro se o usuário logado pode acessar a empresa "target" — admin
-- acessa qualquer uma; os demais, a própria empresa principal ou qualquer
-- uma cadastrada em user_companies. É esta função (não mais a igualdade
-- direta com app_company_id()) que toda política de RLS abaixo usa.
create or replace function public.app_has_company(target text) returns boolean
  language sql stable security definer set search_path=public as $$
  select public.is_admin()
    or target = public.app_company_id()
    or exists (
      select 1 from public.user_companies uc
      where uc.user_id = public.app_user_id() and uc.company_id = target
    )
$$;

drop policy if exists user_companies_self_read on public.user_companies;
create policy user_companies_self_read on public.user_companies for select to authenticated
  using ( user_id = public.app_user_id() or public.is_admin() );
drop policy if exists user_companies_admin_write on public.user_companies;
create policy user_companies_admin_write on public.user_companies for all to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );

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
    'finance_payroll','finance_contractor_invoices','finance_goals','finance_sheet_links','finance_account_balances','roles','procedures','procedure_runs','launches'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end $$;

-- 4a. Tabelas de referência: qualquer autenticado da MESMA empresa LÊ;
-- só admin ESCREVE. Admin é tratado como "admin do grupo" (Revisão/MEQ/
-- MAC/VND são marcas do mesmo grupo com um administrativo só, que troca de
-- empresa pelo seletor da barra lateral) — por isso lê/escreve em QUALQUER
-- empresa, não só a da própria conta. Colaborador comum (não-admin)
-- continua travado na própria empresa nas leituras.
do $$
declare t text;
begin
  foreach t in array array['departments','teams','users','programs','task_templates','recurring_activities','weekly_objectives','link_templates','editais','calendars','calendar_events','company_settings','roles','procedures']
  loop
    execute format('drop policy if exists %I_read on public.%I;', t, t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.app_has_company(company_id));', t, t);
    execute format('drop policy if exists %I_admin on public.%I;', t, t);
    execute format('create policy %I_admin on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin());', t, t);
  end loop;
end $$;

-- 4a1. USERS: além da regra de referência acima (só admin escreve), cada
-- colaborador também pode atualizar a PRÓPRIA linha (casada por e-mail) —
-- usado por "Meu perfil" (foto, data de nascimento). Como em Projetos,
-- quais campos cada perfil deve mexer é responsabilidade do cliente.
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users for update to authenticated
  using ( public.app_has_company(company_id) and lower(data->>'email') = public.app_email() )
  with check ( public.app_has_company(company_id) and lower(data->>'email') = public.app_email() );

-- 4a1b. TRAVA CONTRA AUTOPROMOÇÃO: a policy acima permite qualquer UPDATE
-- na própria linha (RLS é por linha, não por coluna) — sem isto, qualquer
-- colaborador logado poderia chamar a API do Supabase direto (fora da UI,
-- que só deixa admin editar esses campos) e setar "role":"admin" em si
-- mesmo, virando admin de verdade (app_role()/is_admin() leem esse mesmo
-- campo, então isso destrancaria TUDO — todas as políticas RLS e até a
-- Edge Function admin-create-login). Trigger bloqueia qualquer mudança
-- nos campos sensíveis quando quem está atualizando não é admin.
create or replace function public.prevent_user_self_privilege_escalation() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if coalesce(new.data->>'role', '') is distinct from coalesce(old.data->>'role', '')
     or coalesce(new.data->>'roleId', '') is distinct from coalesce(old.data->>'roleId', '')
     or coalesce(new.data->'allowedViews', 'null'::jsonb) is distinct from coalesce(old.data->'allowedViews', 'null'::jsonb)
     or coalesce((new.data->>'financeAccess')::boolean, false) is distinct from coalesce((old.data->>'financeAccess')::boolean, false)
     or coalesce(new.data->>'departmentId', '') is distinct from coalesce(old.data->>'departmentId', '')
     or coalesce(new.data->>'teamId', '') is distinct from coalesce(old.data->>'teamId', '')
     or coalesce(new.data->>'paymentType', '') is distinct from coalesce(old.data->>'paymentType', '')
     or coalesce((new.data->>'paymentAmount')::numeric, -1) is distinct from coalesce((old.data->>'paymentAmount')::numeric, -1)
     or coalesce(new.data->>'paymentBankInfo', '') is distinct from coalesce(old.data->>'paymentBankInfo', '')
     or coalesce((new.data->>'hasLogin')::boolean, false) is distinct from coalesce((old.data->>'hasLogin')::boolean, false)
  then
    raise exception 'Você não tem permissão para alterar esse campo. Peça a um administrador.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_prevent_user_self_privilege_escalation on public.users;
create trigger trg_prevent_user_self_privilege_escalation
  before update on public.users
  for each row execute function public.prevent_user_self_privilege_escalation();

-- 4a2. PROJETOS: leitura por todos autenticados da empresa; criar/excluir só
-- admin; ATUALIZAR é aberto a todos autenticados da empresa (qualquer
-- colaborador do setor precisa poder colar o link do próprio setor no
-- Briefing). Proteção de QUAIS campos cada perfil pode mudar é no cliente.
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select to authenticated using ( public.app_has_company(company_id) );
drop policy if exists projects_insert on public.projects;
create policy projects_insert on public.projects for insert to authenticated with check ( public.is_admin() );
drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects for update to authenticated using ( public.app_has_company(company_id) ) with check ( public.app_has_company(company_id) );
drop policy if exists projects_delete on public.projects;
create policy projects_delete on public.projects for delete to authenticated using ( public.is_admin() );

-- 4b. TAREFAS: leitura por admin, responsável ou equipe (da mesma empresa);
-- escrita conforme perfil.
drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using ( public.is_admin()
          or (public.app_has_company(company_id)
              and (data->>'responsibleId' = public.app_user_id()
                   or (data->>'teamId' is not null and data->>'teamId' = public.app_team_id()))) );

-- Inserção aberta a qualquer autenticado da empresa (não só admin): a tela
-- de Tarefas já mostra "+ Nova tarefa" para todo mundo, e o avanço
-- automático de um Procedimento Padrão (ver 4b3 abaixo) precisa poder
-- criar a tarefa da próxima etapa a partir da ação de QUALQUER colaborador
-- que concluiu a etapa anterior — não só quando for um admin.
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert to authenticated
  with check ( public.app_has_company(company_id) );

drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks for update to authenticated
  using ( public.is_admin() or (public.app_has_company(company_id) and data->>'responsibleId' = public.app_user_id()) )
  with check ( public.is_admin() or (public.app_has_company(company_id) and data->>'responsibleId' = public.app_user_id()) );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete to authenticated
  using ( public.is_admin() );

-- 4b2. REUNIÕES: qualquer autenticado da empresa lê e cria; só admin edita/exclui.
drop policy if exists meetings_read on public.meetings;
create policy meetings_read on public.meetings for select to authenticated using ( public.app_has_company(company_id) );
drop policy if exists meetings_insert on public.meetings;
create policy meetings_insert on public.meetings for insert to authenticated with check ( public.app_has_company(company_id) );
drop policy if exists meetings_update on public.meetings;
create policy meetings_update on public.meetings for update to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );
drop policy if exists meetings_delete on public.meetings;
create policy meetings_delete on public.meetings for delete to authenticated using ( public.is_admin() );

-- 4b3. EXECUÇÕES DE PROCEDIMENTO PADRÃO: leitura aberta à empresa; criar e
-- atualizar também abertos a qualquer autenticado da empresa (iniciar uma
-- execução, e o avanço automático de etapa, podem ser disparados por
-- qualquer colaborador — não só admin); excluir é só admin. O MODELO do
-- procedimento (tabela "procedures") já segue a regra padrão de tabela de
-- referência (só admin escreve), aplicada no loop da seção 4a.
drop policy if exists procedure_runs_read on public.procedure_runs;
create policy procedure_runs_read on public.procedure_runs for select to authenticated using ( public.app_has_company(company_id) );
drop policy if exists procedure_runs_insert on public.procedure_runs;
create policy procedure_runs_insert on public.procedure_runs for insert to authenticated with check ( public.app_has_company(company_id) );
drop policy if exists procedure_runs_update on public.procedure_runs;
create policy procedure_runs_update on public.procedure_runs for update to authenticated
  using ( public.app_has_company(company_id) ) with check ( public.app_has_company(company_id) );
drop policy if exists procedure_runs_delete on public.procedure_runs;
create policy procedure_runs_delete on public.procedure_runs for delete to authenticated using ( public.is_admin() );

-- 4b4. BACKLOG DE LANÇAMENTOS (Marketing): leitura, criação e atualização
-- abertas a qualquer autenticado da empresa (é um quadro colaborativo do
-- time); excluir é só admin.
drop policy if exists launches_read on public.launches;
create policy launches_read on public.launches for select to authenticated using ( public.app_has_company(company_id) );
drop policy if exists launches_insert on public.launches;
create policy launches_insert on public.launches for insert to authenticated with check ( public.app_has_company(company_id) );
drop policy if exists launches_update on public.launches;
create policy launches_update on public.launches for update to authenticated
  using ( public.app_has_company(company_id) ) with check ( public.app_has_company(company_id) );
drop policy if exists launches_delete on public.launches;
create policy launches_delete on public.launches for delete to authenticated using ( public.is_admin() );

-- 4b3. FINANCEIRO: sigiloso — leitura E escrita exigem is_finance_authorized(),
-- dentro da própria empresa; admin do grupo tem acesso a qualquer empresa
-- (mesmo raciocínio da seção 4a — um administrativo só cuida do financeiro
-- de Revisão/MEQ/MAC/VND, trocando de empresa pelo seletor).
do $$
declare t text;
begin
  foreach t in array array['finance_transactions','finance_accounts','finance_invoices','finance_payroll','finance_contractor_invoices','finance_goals','finance_sheet_links','finance_account_balances']
  loop
    execute format('drop policy if exists %I_rw on public.%I;', t, t);
    execute format('create policy %I_rw on public.%I for all to authenticated using (public.is_admin() or (public.app_has_company(company_id) and public.is_finance_authorized())) with check (public.is_admin() or (public.app_has_company(company_id) and public.is_finance_authorized()));', t, t);
  end loop;
end $$;

-- 4b4. SALÁRIO/PIX DO COLABORADOR: mesma trava do financeiro acima — vive
-- fora de "users" porque users_read (seção 4a) deixa QUALQUER colega
-- autenticado da empresa ler a tabela inteira (é assim que a tela Equipe
-- lista todo mundo); salário e dado bancário não podiam ficar expostos a
-- todo mundo só por estarem no mesmo JSON.
create table if not exists public.team_payment_info (id text primary key, data jsonb not null, updated_at timestamptz default now());
alter table public.team_payment_info add column if not exists company_id text;
update public.team_payment_info set company_id = 'revisao' where company_id is null;
alter table public.team_payment_info alter column company_id set not null;
alter table public.team_payment_info alter column company_id set default 'revisao';
create index if not exists team_payment_info_company_idx on public.team_payment_info (company_id);
create unique index if not exists team_payment_info_user_idx on public.team_payment_info ((data->>'userId'));

-- Migra o que já existia direto no JSON de "users" pra esta tabela nova, e
-- depois apaga esses 3 campos de "users" — sem isso a exposição continua.
insert into public.team_payment_info (id, data, company_id)
select 'tpay_' || substr(md5(u.id), 1, 8),
       jsonb_build_object(
         'id', 'tpay_' || substr(md5(u.id), 1, 8),
         'userId', u.id,
         'paymentType', u.data->>'paymentType',
         'paymentAmount', (u.data->>'paymentAmount')::numeric,
         'paymentBankInfo', coalesce(u.data->>'paymentBankInfo', '')
       ),
       u.company_id
from public.users u
where u.data->>'paymentType' is not null or u.data->>'paymentAmount' is not null or coalesce(u.data->>'paymentBankInfo', '') <> ''
on conflict do nothing;

update public.users set data = data - 'paymentType' - 'paymentAmount' - 'paymentBankInfo';

alter table public.team_payment_info enable row level security;
drop policy if exists team_payment_info_rw on public.team_payment_info;
create policy team_payment_info_rw on public.team_payment_info for all to authenticated
  using (public.is_admin() or (public.app_has_company(company_id) and public.is_finance_authorized()))
  with check (public.is_admin() or (public.app_has_company(company_id) and public.is_finance_authorized()));

-- 4c. NOTIFICAÇÕES: admin da empresa lê tudo; colaborador lê as que gerou.
-- Qualquer autenticado da empresa insere.
drop policy if exists notif_read on public.notifications;
create policy notif_read on public.notifications for select to authenticated
  using ( public.is_admin() or (public.app_has_company(company_id) and data->>'createdBy' = public.app_user_id()) );
drop policy if exists notif_insert on public.notifications;
create policy notif_insert on public.notifications for insert to authenticated with check ( public.app_has_company(company_id) );
drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications for update to authenticated
  using ( public.is_admin() or (public.app_has_company(company_id) and data->>'createdBy' = public.app_user_id()) )
  with check ( public.is_admin() or (public.app_has_company(company_id) and data->>'createdBy' = public.app_user_id()) );
drop policy if exists notif_delete on public.notifications;
create policy notif_delete on public.notifications for delete to authenticated using ( public.is_admin() );

-- ---------- 5. STORAGE (anexos) ----------
-- Nenhuma tela do app usa este bucket hoje (avatar é data URL inline,
-- documento de projeto é link do Drive) — criado achando futuro, nunca
-- usado. Antes era público (bucket "public: true" + política de leitura
-- sem "to authenticated"), ou seja, QUALQUER PESSOA NA INTERNET, sem login
-- nenhum, conseguia listar/baixar qualquer arquivo aqui, e qualquer usuário
-- autenticado (de qualquer uma das 4 empresas) podia subir arquivo aqui sem
-- nenhum limite de tamanho/tipo. Trocado pra privado + só autenticado.
update storage.buckets set public = false where id = 'attachments';
insert into storage.buckets (id, name, public) values ('attachments','attachments', false)
  on conflict (id) do nothing;

drop policy if exists att_read on storage.objects;
create policy att_read on storage.objects for select to authenticated using ( bucket_id = 'attachments' );
drop policy if exists att_upload on storage.objects;
create policy att_upload on storage.objects for insert to authenticated with check ( bucket_id = 'attachments' );
drop policy if exists att_delete on storage.objects;
create policy att_delete on storage.objects for delete to authenticated using ( bucket_id = 'attachments' );
-- Se um dia usar este bucket, troque getPublicUrl por createSignedUrl no
-- cliente (bucket privado não serve URL pública direta).

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
