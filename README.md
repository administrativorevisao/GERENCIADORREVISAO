# RevisãoOS — revisao-web

Plataforma interna de gestão de um grupo de empresas de **preparação para concursos jurídicos** (cursos online, sprints de véspera de prova, mentorias etc.). Cobre projetos/cursos, tarefas e processos, calendário, reuniões, equipe e **financeiro**, tudo isolado por empresa.

- **Produção:** https://megazordgeralrevisao.netlify.app
- **Repositório:** https://github.com/administrativorevisao/GERENCIADORREVISAO (branch `main`)
- **Idioma:** toda a UI, comentários e commits são em **português do Brasil**.
- **Origem:** reescrita do `../revisao-os/index.html` (app antigo de arquivo único). Esta versão React é a que está em produção.

## Stack

React 19 + Vite 8 + TypeScript 6 · React Router 7 · TanStack Query 5 · `@supabase/supabase-js` 2 (Postgres + Auth + RLS) · `xlsx` e `mammoth` (importação de planilhas/.docx). Sem biblioteca de UI: o design system é CSS próprio em `src/styles/global.css` (classes `.card`, `.btn`, `.input`, `.badge`, `.seg`, `.row`, `.stack`, `.grid`, ícones Material Symbols via `<span className="msi">`; tema claro/escuro e cor de destaque por empresa).

## Conceitos-chave (leia isto primeiro)

### 1. Multiempresa
Quatro empresas (`src/core/companies/companies.ts`): `revisao`, `meq`, `mac`, `vnd`. Cada linha de cada tabela tem `company_id`; o cliente sempre filtra por empresa (`jsonStore.ts`) e a **RLS no banco é a segunda camada**. Setores padrão (`STANDARD_DEPARTMENTS`): Diretoria, Pedagógico, Comercial, Marketing, Financeiro, Administrativo, CS/CX (ids `dep_dir`, `dep_ped`, `dep_com`, `dep_mkt`, `dep_fin`, `dep_adm`, `dep_cs`).

### 2. Banco "JSON-first"
Toda tabela tem o formato `(id text pk, company_id text, data jsonb, updated_at)`. **Não há colunas por campo**: o objeto TypeScript inteiro vai em `data`. O helper genérico `src/shared/lib/jsonStore.ts` (`listRows/getRow/createRow/updateRow/removeRow/newId`) é usado por todos os `api.ts`. Consequências:
- Adicionar um campo = só mudar o tipo TS (sem migração SQL). Registros antigos não têm o campo, então **normalize em `listX()`** (veja `normalizeCourse` em `src/core/projects/api.ts`).
- Queries são sempre por `id`/`company_id`; filtros e agregações acontecem no cliente.

### 3. Padrão de cada feature
`src/core/<feature>/` ou `src/modules/<setor>/` segue: `types.ts` (tipos + `emptyX`), `api.ts` (funções sobre `jsonStore`), `useX.ts` (hooks TanStack Query: query + mutations que invalidam o cache), `XPage.tsx`/`XModal.tsx` (UI). Mantenha esse padrão.

### 4. Permissões
`src/shared/auth/types.ts`: `Profile` (vem de `public.users.data`), `isAdmin`, `canView(profile, viewId)`. Papéis: `admin` e `collaborator`; `allowedViews` restringe telas por colaborador; `financeAccess` libera o Financeiro (que é sigiloso). No banco (`supabase/schema.sql`): `is_admin()`, `app_has_company()`, `is_finance_authorized()` + ~36 políticas RLS. Dados de salário/PIX ficam numa tabela separada `team_payment_info` (só admin/financeiro). Um trigger (`prevent_user_self_privilege_escalation`) impede alguém de se promover a admin/alterar o próprio papel.

### 5. Integração Google (100% no navegador, sem backend)
`src/shared/lib/googleSheets.ts`, `googleCalendar.ts`, `useGoogleImport.ts`: Google Identity Services (OAuth) + Google Picker + APIs REST do Sheets/Drive/Calendar. Client ID e API Key ficam na tabela `app_settings` (linha `global`), editáveis em **Administração**. Escopos: `spreadsheets.readonly`, `drive.file` (só os arquivos escolhidos no Picker) e `calendar.events`. O token é cacheado em memória; os seletores do Drive sempre forçam nova escolha de conta (`forceReprompt`). Duas agendas Google fixas (constantes em `googleCalendar.ts`): uma para o "Cronograma completo do curso" e outra para as datas da "Estrutura do curso".

### 6. Edge Function
`supabase/functions/admin-create-login/` cria/redefine login de colaborador (precisa da service role, por isso roda no servidor). É colada manualmente no painel do Supabase (instruções no topo do arquivo).

## Mapa de módulos

Rotas em `src/App.tsx`; menu em `src/shared/layout/nav.ts`.

| Rota | Código | O que faz |
|---|---|---|
| `/` | `core/dashboard` | Dashboard geral |
| `/calendario` | `core/calendar`, `core/calendars` | Calendário (mês/semana/dia, camadas, aniversários) |
| `/projetos`, `/projetos/:id` | `core/projects` | Programas → Subprogramas (concursos) → Projetos. Detalhe com abas: Briefing, Concurso, Curso (modalidade, Estrutura do curso, **Oferta**), Guias por setor, Datas-chave, Links, Documentos, Tarefas. Imagem de capa por upload ou link do Drive |
| `/sprints` | `core/sprints` | Dashboard dos "Sprints": um sprint é um Projeto cujo nome/programa contém "sprint"; a **fase é calculada** a partir das datas do curso, nunca guardada |
| `/tarefas`, `/processos` | `core/tasks` | Tarefas (hoje Kanban e Tabela; o calendário fica na rota `/calendario`) e Central de Processos |
| `/reunioes` | `core/meetings` | Reuniões e itens de ação |
| `/pedagogico` … `/cs` | `modules/*` | Áreas por setor. **Só Marketing está implementada**; Pedagógico, Comercial, Administrativo e CS são placeholders (`ComingSoon`, 5 linhas) à espera de cada dev |
| `/financeiro` | `modules/financeiro` | Dashboard, DRE (só itens pagos), Fluxo de Caixa, Contas a pagar/receber, Faturamento, Contas Bancárias, Folha (fixa), NFs de contratados, Metas, importação de planilhas/Google Sheets |
| `/equipe`, `/padroes-da-equipe` | `core/team`, `core/teamStandards` | Colaboradores (edição em lote, importação), cargos, procedimentos padrão |
| `/admin` | `shared/admin` | Só admin: identidade visual (logos) e credenciais Google (Client ID / API Key) |

## Regras de produto já decididas (não reverter sem perguntar)

- **Toda tela de trabalho deve oferecer Tabela, Kanban e Calendário**, não só Kanban (diretriz do usuário; `/tarefas` ainda não tem a visão Calendário embutida).
- **DRE só conta itens já pagos.**
- **Data da prova chave** (aba Concurso) gera/atualiza automaticamente uma tarefa para o Financeiro fechar o curso; **Tempo de acesso = prova + 15 dias** (sempre calculado); **duração do cronograma** em semanas também é calculada.
- Modalidades do curso são uma **lista fechada de 8** (`MODALIDADE_LABEL`); só Objetiva/Discursiva têm "Estrutura do curso"; só modalidades com correção opcional têm preço duplo na Oferta.
- Histórico de saldo de contas bancárias: o usuário pediu para **não mexer por enquanto**.

## Rodando localmente

Node.js 22+ e um projeto Supabase.

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev                  # http://localhost:5173
```

O login é Supabase Auth (e-mail/senha): o usuário precisa existir em Authentication → Users **e** em `public.users` (mesmo e-mail, minúsculo). `.env.local` não é versionado (`*.local` no `.gitignore`).

### Banco de dados
`supabase/schema.sql` é o schema consolidado (tabelas + RLS multiempresa + funções + triggers); pode ser rodado inteiro no SQL Editor porque é idempotente (`if not exists`, `drop policy if exists`). Mudanças de estrutura/segurança são aplicadas **manualmente** no SQL Editor do Supabase de produção e devem ser refletidas em `schema.sql`. O projeto Supabase está no plano **Free**: pausa sozinho após ~7 dias sem uso (restaurar no painel).

## Verificar, versionar e publicar (IMPORTANTE)

1. **Verificação real = `npm run build`** (`tsc -b && vite build`).
   `npx tsc --noEmit` sem `-p` **não checa nada** neste repo (o `tsconfig.json` raiz tem `files: []`); se quiser checagem rápida use `npx tsc --noEmit -p tsconfig.app.json`.
2. **Git:** commit em `main` e `git push origin main`; antes de dar push, mesclar quaisquer outras branches em `main`. Mensagens de commit em português, explicando o porquê.
3. **Deploy é MANUAL — o push NÃO publica nada.** O Netlify (site `megazordgeralrevisao`, id `aae093e4-c6f1-47d4-a240-fece980f3359`) não tem integração com o GitHub. Depois do build:
   ```bash
   npx --yes netlify-cli deploy --prod --dir=dist
   ```
   Se isso retornar `JSONHTTPError: Forbidden` (o Netlify passou a bloquear criação de deploys de produção via CLI), use o contorno que funciona: subir como rascunho e promover:
   ```bash
   DID=$(npx --yes netlify-cli deploy --dir=dist --json | python3 -c "import json,sys;print(json.load(sys.stdin)['deploy_id'])")
   npx --yes netlify-cli api restoreSiteDeploy --data "{\"site_id\":\"aae093e4-c6f1-47d4-a240-fece980f3359\",\"deploy_id\":\"$DID\"}"
   ```
4. **Confirme que entrou no ar** buscando o bundle publicado e procurando uma string característica da mudança (o hash do bundle mudar não prova a feature). URLs de rascunho exigem login Netlify, então verifique na URL de produção.
5. Ao terminar cada correção/funcionalidade, **pergunte ao usuário se deve publicar** e avise se a produção estiver desatualizada em relação ao `main`.

## Convenções de código

- Comentários só quando explicam um porquê não óbvio, em português, curtos.
- Links vindos de campos de texto livre passam por `safeHref()` (`shared/lib/safeUrl.ts`) — nunca renderize `href` cru (risco de `javascript:`).
- Imagens são comprimidas no cliente (`shared/lib/imageUpload.ts`) e guardadas como data URL no JSON; não há uso de Storage hoje (o bucket `attachments` é privado).
- Importação de planilhas: o parser detecta a linha de cabeçalho automaticamente e tolera espaços nos títulos (`googleSheets.ts`, `importCells.ts`).
- Segurança: não exponha chaves de serviço no cliente; dados sensíveis (salário/PIX) nunca vão em `users.data`.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` (Oxlint) · `npm run preview`
