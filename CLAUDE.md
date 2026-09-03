@AGENTS.md

# Secretária — Gestão de Demandas Internas

App interno para a equipe registrar e acompanhar demandas da empresa.
No ar na Netlify (`https://inspiring-genie-d3a1a7.netlify.app`), deploy contínuo a cada `git push` em `main`.

## Stack

| Camada        | Tecnologia                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | Next.js 16 — App Router, TypeScript, `src/`            |
| Estilo        | Tailwind CSS v4 + design system Notion-like (ver abaixo)|
| Ícones        | `lucide-react`                                          |
| Calendário    | `@fullcalendar/react` v6 (`ssr: false`)                 |
| Banco + Auth  | Supabase (`@supabase/supabase-js` + `@supabase/ssr`)   |
| Sessão        | Cookies gerenciados pelo `@supabase/ssr`               |
| Deploy        | Netlify + `@netlify/plugin-nextjs` (`netlify.toml`, Node 22) |

`node` 22+, `npm`. `npm run dev` para desenvolver, `npm run build` para checar tipos/produção.

## Design system (globals.css)

Inspirado no Notion: neutro quente, azul de acento `#2383e2`, raios pequenos (4–10px),
sombras sutis, fonte Inter. Tokens em `:root` (+ bloco `@media (prefers-color-scheme: dark)`),
expostos ao Tailwind via `@theme inline` → utilitários `bg-background`, `bg-sidebar`, `bg-surface`,
`text-foreground`, `text-fg-secondary`/`fg-tertiary`, `border-border`, `bg-accent`, `text-danger`, etc.
Classes de componente no próprio globals.css: `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-sm`,
`.campo` (inputs), `.cartao`, `.rotulo`, e `.pill`/`.pill-{gray,blue,green,yellow,red}` (mapeadas em
`PILL_STATUS` / `PILL_DIFICULDADE` em `src/lib/demandas.ts`).
Casca da área logada: `src/app/_componentes/casca-app.tsx` (barra lateral + conteúdo), usada pelo
`dashboard/layout.tsx` e pela página `/calendario`. Barra lateral: `_componentes/barra-lateral.tsx` (client).

## Variáveis de ambiente

`.env.local` (não versionado) — veja `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Estrutura

```
src/
  proxy.ts                     # "middleware" do Next 16: renova sessão + protege /dashboard e /calendario
  lib/
    auth.ts                    # requererUsuario() — checagem de sessão no servidor
    demandas.ts                # tipos, constantes e rótulos (client-safe, sem import de servidor)
    demandas-consultas.ts      # listarDemandas() (c/ nome do dono) / obterDemanda() — server-only
    comentarios-consultas.ts   # tipo Comentario + listarComentarios[PorDemanda]() — server-only
    perfil-consultas.ts        # obterPerfil() — id/email/nome/papel do usuário logado — server-only
    notificacoes-consultas.ts  # listarNotificacoes() / contarNaoLidas() — server-only
    supabase/
      client.ts                # criarClienteNavegador() — Client Components
      server.ts                # criarClienteServidor() — Server Components / Actions
      proxy.ts                 # atualizarSessao() — usado pelo src/proxy.ts
  app/
    layout.tsx                 # fonte Inter + tokens do tema
    page.tsx                   # redireciona para /dashboard
    _componentes/
      casca-app.tsx            # server: barra lateral + <main> (área logada)
      barra-lateral.tsx        # client: nav Notion-like, contador de notificações, sair
    auth/actions.ts            # Server Actions: entrar, cadastrar, sair
    login/ , cadastro/         # page.tsx (server) + formulario-*.tsx (client)
    calendario/
      page.tsx                 # calendário mensal (FullCalendar) das demandas por data_entrega
      _componentes/calendario-demandas.tsx  # client: FullCalendar + cor por dificuldade
    dashboard/
      layout.tsx               # barra do topo: Calendário, Notificações (c/ contador), Sair
      page.tsx                 # lista demandas (chefe vê todas) + filtro status + comentários recolhíveis
      actions.ts               # Server Actions: criar/atualizar/status/apagar demanda, comentário, marcar notificações lidas
      _componentes/            # formulario-demanda.tsx, bloco-comentarios.tsx, marcar-lidas.tsx
      nova/page.tsx            # criar demanda
      [id]/editar/page.tsx     # editar demanda + comentários
      notificacoes/page.tsx    # lista de notificações (marca como lidas ao abrir)
supabase/
  migrations/                  # SQL versionado, prefixo numérico (0001_ … 0006_). Aplicar: supabase-aplicar.bat
```

## Convenções

### Idioma

- **Tudo em português**: nomes de arquivo, funções, variáveis, comentários, textos de UI, tabelas e colunas.

### Nomenclatura

- **Banco de dados: `snake_case`** — tabelas no plural (`usuarios`), colunas `snake_case`
  (`criado_em`), policies com nome descritivo (`usuarios_select_proprio`).
- **TypeScript/React: `camelCase`** para funções e variáveis (`criarClienteServidor`,
  `requererUsuario`), **`PascalCase`** para componentes (`FormularioLogin`).
- Arquivos de componente/rota em `kebab-case` (`formulario-login.tsx`).
- Migrations: `NNNN_verbo_no_infinitivo_alvo.sql` (`0001_criar_tabela_usuarios.sql`).

### Banco de dados / Supabase

- **Toda tabela nova nasce com Row Level Security ativado.** Sem exceção:
  ```sql
  alter table public.<nome> enable row level security;
  ```
  Logo em seguida, escreva as policies. Uma tabela com RLS ligado e **sem** policy
  fica inacessível — isso é proposital, não esqueça de adicionar as policies.
- Prefira `(select auth.uid())` dentro das policies (melhor plano de query).
- Colunas de data/hora: `timestamptz`, default `now()`, sufixo `_em` (`criado_em`, `atualizado_em`).
- Toda alteração de schema vira uma migration nova em `supabase/migrations/` — nunca edite uma migration já aplicada.
- Dados derivados de `auth.users` (perfil) são preenchidos por trigger `security definer`
  lendo `raw_user_meta_data` (ver `handle_new_user`).

### Autenticação

- `proxy.ts` faz a checagem **otimista** (redireciona rota protegida / rota de auth).
- A checagem **real** de cada página/ação protegida é `requererUsuario()` de `src/lib/auth.ts`.
  Nunca dependa só do proxy.
- Cliente Supabase: `server.ts` no servidor, `client.ts` no navegador. Não misture.
- Em `src/lib/supabase/server.ts` e `proxy.ts`, **não coloque lógica entre criar o
  cliente e o `auth.getUser()`** — pode causar logout aleatório.

## Estado

- `.env.local` preenchido; migrations `0001` e `0002` aplicadas.
- Confirmação de e-mail **desligada** (`mailer_autoconfirm = true`) — cadastro entra direto.
- Auth e demandas (CRUD + filtro por status + RLS por dono) funcionando e testados.

## Pendências

- SMTP próprio não configurado — o e-mail do Supabase é só o de desenvolvimento (rate limit baixo).
- Sem versionamento git ainda.
- Melhorias de UI/UX (a base é funcional, sem capricho visual).
