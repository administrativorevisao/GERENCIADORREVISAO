# RevisãoOS — revisao-web

Reescrita do RevisãoOS (antes um único `index.html`) como projeto
**React + Vite + TypeScript**, organizado em módulos por setor para permitir
vários desenvolvedores trabalhando em paralelo. Backend: Supabase (Postgres +
Auth + Storage).

> O app antigo (`../revisao-os/index.html`) continua rodando em produção sem
> alterações até que esta reescrita cubra todas as funcionalidades (ver
> roteiro de fases abaixo). Não é operação em paralelo — é reescrever tudo
> antes de trocar.

## Regra de convivência entre devs

- **Dentro de `src/modules/<setor>`** (pedagogico, comercial, marketing,
  administrativo, cs, financeiro): cada dev mexe livre, sem precisar de
  aprovação alheia.
- **`src/core/*`** (projects, tasks, calendar, meetings, notifications,
  companies) e **`src/shared/*`** (auth, layout, ui, lib): são objetos/
  infraestrutura que a empresa toda depende — mudanças aqui afetam todos os
  módulos, então exigem alinhamento com o time antes de mergear.
- Um `feature/<frente>` por desenvolvedor, PR para `main`. Deploy automático
  no Netlify a partir de `main`.

## Estrutura

```
src/
├── modules/        # pedagogico, comercial, marketing, administrativo, cs, financeiro
├── core/           # projects, tasks, calendar, meetings, notifications, companies, dashboard, team
├── shared/         # auth, layout, ui, lib, admin
├── App.tsx
└── main.tsx
supabase/
└── schema.sql      # schema consolidado (tabelas + RLS + multiempresa)
```

## Rodando localmente

Pré-requisitos: Node.js 22+ e uma conta no seu projeto Supabase existente.

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Abre em `http://localhost:5173`. Login usa Supabase Auth (e-mail/senha) — é
preciso já existir um usuário em **Authentication → Users** no seu projeto
Supabase, com um cadastro correspondente na tabela `public.users` (mesmo
e-mail, em minúsculas).

### Banco de dados

Rode `supabase/schema.sql` inteiro no SQL Editor do seu projeto Supabase.
É seguro rodar em cima do projeto que já existe do RevisãoOS antigo — as
tabelas usam `create table if not exists`, as políticas são recriadas
(`drop policy if exists` + `create policy`), e a coluna `company_id` nova é
adicionada com backfill automático (linhas antigas viram da empresa
`"revisao"`).

## Roteiro

- **Fase 0** (esta) — esqueleto do projeto, design system portado,
  autenticação, layout (sidebar/topbar), placeholders de todos os módulos,
  schema multiempresa.
- **Fase 1** — portar `core` completo (Projetos/Tarefas/Calendário/Briefing).
- **Fase 2** — portar o módulo Financeiro inteiro.
- **Fase 3** — portar os módulos de setor restantes + Administração.
- **Fase 4** — QA de ponta a ponta e só então a troca de fato em produção.

## Scripts

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção (`tsc -b && vite build`).
- `npm run lint` — Oxlint.
- `npm run preview` — servir o build de produção localmente.
