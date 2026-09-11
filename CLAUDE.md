@AGENTS.md

# Secretária — Gestão de Demandas Internas

App interno para a equipe registrar e acompanhar demandas da empresa.
No ar na Netlify (`https://inspiring-genie-d3a1a7.netlify.app`), deploy contínuo a cada `git push` em `main`.

## Stack

| Camada        | Tecnologia                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | Next.js 16 — App Router, TypeScript, `src/`            |
| Estilo        | Tailwind CSS v4 + design system da Central de Agentes (ver abaixo)|
| Ícones        | `lucide-react`                                          |
| Calendário    | `@fullcalendar/react` v6 (`ssr: false`)                 |
| Banco + Auth  | Supabase (`@supabase/supabase-js` + `@supabase/ssr`)   |
| Sessão        | Cookies gerenciados pelo `@supabase/ssr`               |
| Deploy        | Netlify + `@netlify/plugin-nextjs` (`netlify.toml`, Node 22) |

`node` 22+, `npm`. `npm run dev` para desenvolver, `npm run build` para checar tipos/produção.

## Design system (globals.css)

Mesma identidade da **Central de Agentes**: tema escuro fixo (preto carvão `#0D0D0D`),
verde de acento `#1DB954` (verde-hover `#169140`), raios pequenos (4–10px), bordas sutis
(`#2A2A2A`), fontes Inter (texto) + IBM Plex Mono (`--font-mono`, rótulos). Tokens em `:root`
(sem bloco de light mode — `color-scheme: dark`), expostos ao Tailwind via `@theme inline` →
utilitários `bg-background`, `bg-sidebar`, `bg-surface`/`raised`/`overlay`, `text-foreground`,
`text-fg-secondary`/`fg-tertiary`, `border-border`, `bg-accent`, `text-danger`, etc.
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
  proxy.ts                     # "middleware" do Next 16: renova sessão + exige login em /dashboard /calendario /onboarding /escritorio
  lib/
    auth.ts                    # requererUsuario() — checagem de sessão no servidor
    demandas.ts                # tipos, constantes e rótulos (client-safe, sem import de servidor)
    demandas-consultas.ts      # listarDemandas() (c/ nome do dono, filtro status+busca) / obterDemanda() — server-only
    listas.ts                  # tipo Lista (colunas personalizadas do quadro) — client-safe
    listas-consultas.ts        # listarListas() (do dono; chefe vê todas) — server-only
    comentarios-consultas.ts   # tipo Comentario + listarComentarios[PorDemanda]() — server-only
    perfil-consultas.ts        # obterPerfil() (id/email/nome/telefone/papel/escritorioId/whatsappAtivo) + requererEscritorio() — server-only
    escritorios.ts             # tipos Escritorio / Membro — client-safe
    escritorios-consultas.ts   # obterEscritorio() / listarMembros() — server-only
    whatsapp.ts                # tipos ConfigWhatsapp/TipoAvisoWhatsapp + normalizarTelefone() — client-safe
    whatsapp-consultas.ts      # obterConfigWhatsapp() — server-only
    whatsapp-envio.ts          # enviarMensagemWhatsapp() (POST genérico no gateway) + avisarDono() (silencioso) — server-only
    notificacoes.ts            # tipos Notificacao/TipoNotificacao + rótulos (client-safe)
    notificacoes-consultas.ts  # listarNotificacoes() / contarNaoLidas() — server-only
    supabase/
      client.ts                # criarClienteNavegador() — Client Components
      server.ts                # criarClienteServidor() — Server Components / Actions
      proxy.ts                 # atualizarSessao() — usado pelo src/proxy.ts
  app/
    layout.tsx                 # fonte Inter + tokens do tema
    page.tsx                   # redireciona para /dashboard
    _componentes/
      casca-app.tsx            # server: barra do topo + barra lateral + <main> (área logada)
      barra-topo.tsx           # client: logo + busca de demandas (?q=) + PainelNotificacoes + menu do perfil (sair)
      painel-notificacoes.tsx  # client: sino + painel suspenso (lista, "apenas não lidas", marcar todas como lidas)
      barra-lateral.tsx        # client: nav (Demandas, Calendário) — lateral no desktop, faixa no mobile
    auth/actions.ts            # Server Actions: entrar, cadastrar (→ /onboarding), sair
    login/ , cadastro/         # page.tsx (server) + formulario-*.tsx (client)
    onboarding/                # page.tsx (sem escritório) + actions.ts (criarEscritorio/entrarEscritorio, via RPC) + formularios (client, abas criar/entrar)
    escritorio/                # page.tsx (nome + código + membros, dentro da CascaApp) + actions.ts (sair/regenerar código/definir papel/remover membro)
                               #   _componentes: codigo-escritorio.tsx (copiar/gerar), sair-escritorio.tsx (confirm)
    ajustes/                   # page.tsx (dentro da CascaApp) + actions.ts. Seções:
                               #   "Reativar sistema" (só ADMIN_EMAILS): link p/ o painel do Supabase
                               #   "Seu WhatsApp" (todos): edita telefone + toggle whatsapp_ativo
                               #   "Integração do escritório" (só chefe): URL+token do gateway, 4 toggles de evento, botão "Enviar teste"
                               #   _componentes: preferencia-whatsapp.tsx, integracao-whatsapp.tsx
    calendario/
      page.tsx                 # calendário mensal (FullCalendar) das demandas por data_entrega
      _componentes/calendario-demandas.tsx  # client: FullCalendar + cor por dificuldade
    dashboard/
      layout.tsx               # aplica a CascaApp (barra do topo + barra lateral)
      page.tsx                 # server: busca dados, monta colunas (3 automáticas + 1 por lista) e passa pro <QuadroDemandas>
                               #   coluna automática: concluída→Concluídas; não concluída c/ prazo vencido→Pendentes; senão→Em andamento
                               #   demanda com lista_id vai pra essa lista (ignora a automática); "Iniciar" só no pendente inicial
      actions.ts               # Server Actions: demanda (criar/atualizar/status/apagar), comentário, notificações lidas,
                               #   lista (criarLista/renomearLista/apagarLista), moverDemanda(id, "status:<x>"|"lista:<id>")
                               #   arrastar p/ coluna automática troca o status; p/ lista só seta lista_id
                               #   atualizar/status/comentário chamam avisarDono() (WhatsApp) quem ator ≠ dono da demanda
      _componentes/            # quadro-demandas.tsx (client: colunas + drag-and-drop nativo + "Adicionar outra lista" + menu da lista;
                               #   card mostra só título/descrição/dificuldade/prazo/botão de status — resto num menu de contexto
                               #   aberto pelo lápis no hover ou botão direito: Editar / Comentário (modal) / Mover para / Excluir),
                               #   formulario-demanda.tsx, bloco-comentarios.tsx, marcar-lidas.tsx, modal.tsx…
      nova/page.tsx            # criar demanda
      [id]/editar/page.tsx     # editar demanda + comentários
      notificacoes/page.tsx    # lista de notificações (marca como lidas ao abrir)
supabase/
  migrations/                  # SQL versionado, prefixo numérico (0001_ … 0010_). Aplicar: supabase-aplicar.bat
                               #   0009 = MULTI-TENANT: tabela `escritorios`, `escritorio_id` em usuarios/demandas/listas/comentarios/notificacoes,
                               #          helper meu_escritorio(), RPCs (criar/entrar/sair/definir_papel/remover/regenerar), RLS reescrita
                               #          por escritório, trigger que trava troca de papel/escritório fora das RPCs. ZEROU os dados.
                               #   0010 = WhatsApp: `usuarios.whatsapp_ativo` + tabela `escritorio_whatsapp` (ativo/url/token/4 toggles), RLS chefe.
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

### Autenticação e multi-tenant

- `proxy.ts` faz a checagem **otimista** de sessão (redireciona rota protegida / rota de auth).
- A checagem **real** de sessão é `requererUsuario()` (`src/lib/auth.ts`); a de **escritório** é
  `requererEscritorio()` (`src/lib/perfil-consultas.ts`) — sem escritório → `/onboarding`.
  A `CascaApp` já chama `requererEscritorio()`, então toda a área logada é coberta. Nunca dependa só do proxy.
- **Multi-tenant:** cada `usuarios.escritorio_id` isola os dados. Toda RLS de `demandas`/`listas`/
  `comentarios`/`notificacoes` filtra por `escritorio_id = (select meu_escritorio())`. `eh_chefe()`
  passou a valer **dentro do escritório**. Inserts têm `escritorio_id` preenchido por trigger — o app
  não precisa mandar. Trocar `papel`/`escritorio_id` só pelas RPCs (`criar_escritorio`,
  `entrar_no_escritorio`, `sair_do_escritorio`, `definir_papel_membro`, `remover_membro`,
  `regenerar_codigo`) — um trigger `usuarios_guard` barra alteração direta pelo cliente.
- Cliente Supabase: `server.ts` no servidor, `client.ts` no navegador. Não misture.
- Em `src/lib/supabase/server.ts` e `proxy.ts`, **não coloque lógica entre criar o
  cliente e o `auth.getUser()`** — pode causar logout aleatório.

## Estado

- `.env.local` preenchido (inclui `ADMIN_EMAILS`); migrations `0001`–`0010` aplicadas.
- Confirmação de e-mail **desligada** (`mailer_autoconfirm = true`) — cadastro entra direto.
- **App é multi-empresa** (SaaS): cadastro público → `/onboarding` (criar escritório = vira chefe, ou
  entrar com código = funcionário) → `/dashboard` isolado por escritório. Isolamento multi-tenant testado (09/09).
- Site publicado na Netlify **público** (visibilidade Private + "Previews only", ou Public).
- `.github/workflows/keepalive.yml` pinga o site a cada 2 dias pro Supabase free não pausar.
- **WhatsApp (Fase 1 feita):** `/ajustes` com config por escritório (URL+token do gateway genérico) e
  preferência pessoal. Dispara em **status/edição** e **comentário** (quando ator ≠ dono). Envio genérico
  (`POST {url}` c/ `Authorization: Bearer {token}` e `{telefone, mensagem}`) — ajustar `whatsapp-envio.ts`
  quando vier a spec da Nandu (redirectmais.com.br). Sem retry/fila (fire-and-forget com timeout 6s).

## SMTP próprio + "esqueci minha senha" (Supabase Auth)

SMTP declarativo via `supabase/config.toml` (gerado com `supabase init` + `supabase config pull --force`
em 11/09 pra puxar o estado real do projeto antes de editar — evita sobrescrever config de produção com
defaults de dev). `[auth.email.smtp]` usa Gmail (`gabrielchaves0308@gmail.com` + senha de app), `pass`
via `env(SUPABASE_AUTH_EMAIL_SMTP_PASS)` (nunca hardcoded no arquivo, que é versionado). Aplicar/alterar:
rodar `supabase-configurar-smtp.bat` (pede a senha de app só no terminal, mostra `config diff` antes de
aplicar `config push --yes`). Rate limit de e-mail (`auth.rate_limit.email_sent`) deixado comentado de
propósito (o valor padrão do template, 2/h, é de dev e ficaria baixo demais em produção).

**Cuidado ao rodar `.bat` de config do Supabase:** `config push` pede confirmação campo a campo — o
`--yes` precisa estar depois de `supabase config push` (não só no `npx --yes`), senão nada é aplicado
mesmo sem erro aparente (aconteceu em 11/09, primeira tentativa não colou nada — sempre conferir com
`supabase config diff` depois). **Corrigido e testado em produção em 11/09**: SMTP aplicado
(`config diff` bate 100% no bloco `auth.email.smtp`) e fluxo de "esqueci a senha" funcionando ponta a
ponta (e-mail chega via Gmail com o template customizado, link cai em `/redefinir-senha`, senha nova
funciona).

Fluxo de "esqueci minha senha" (11/09): `/esqueci-senha` (pede e-mail, chama `resetPasswordForEmail` via
`solicitarRecuperacaoSenha` em `src/app/auth/actions.ts`) → e-mail usa template customizado
(`supabase/templates/recovery.html`, `[auth.email.template.recovery]` no config.toml) linkando pra
`{{ .SiteURL }}/auth/confirmar?token_hash=...&type=recovery&next=/redefinir-senha` → `src/app/auth/
confirmar/route.ts` (Route Handler) faz `verifyOtp({type, token_hash})`, cria sessão via cookies e
redireciona pra `next` → `/redefinir-senha` (só funciona com a sessão de recuperação ativa) chama
`redefinirSenha` (`updateUser({password})`) e manda pro `/dashboard`. `src/lib/origem.ts` monta a URL
absoluta (protocolo+host) a partir dos headers pra funcionar em prod e local sem hardcode. Link "Esqueci
minha senha" adicionado em `/login`.

## Pendências

- **WhatsApp Fase 2:** (a) recurso de o chefe **atribuir demanda a um funcionário** + gatilho "atribuição";
  (b) **job agendado** (pg_cron ou GitHub Actions) para os avisos de **prazo chegando/vencido**.
- Ajustar `whatsapp-envio.ts` ao formato real da Nandu (usuário vai trazer a doc/token).
- Drag-and-drop das listas é HTML5 nativo → não funciona por toque no celular; nesse caso usar o seletor
  "Mover para" no card.
- Melhorias de UI/UX (a base é funcional, sem capricho visual).
