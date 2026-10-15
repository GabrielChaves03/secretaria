@AGENTS.md

# Secretária — Gestão de Demandas Internas

App interno para a equipe registrar e acompanhar demandas da empresa.
No ar na **Vercel** (`https://secretaria-chaves5.vercel.app`), deploy contínuo a cada `git push` em `main`
(migrado da Netlify em 24/09 — ver "Deploy: por que Vercel" abaixo).

## Nota: ManyChat e Editor de Vídeos removidos (05/10)

Os dois eram integrações dentro da Secretária e foram **retirados do app** — cada um é um projeto
separado com repo próprio: **ManyChat** = `dev/ManyChat Claude` (`GabrielChaves03/manychat-claude`);
**Editor de Vídeos** = `dev/GitHub Editor de Videos` (`GOMAPET/dashboard-edicao-video`). Removido da
Secretária: rotas (`/manychat`, `/editor-de-videos`), `src/app/api/manychat/`, `src/lib/manychat/`,
`src/lib/manychat-*`, `src/lib/video-pedidos*`, itens do menu, env `INSTAGRAM_*` e os pg_cron
`manychat-drenar-fila`/`manychat-renovar-token`. **Mantidos no Supabase** (dados, reversível): tabelas
`instagram_accounts`/`automations`/`followups`/`contacts`/`queue`/`events`/`video_pedidos` (migrations
0013–0015) e o bucket `videos-pedidos`. `cron-auth` virou `src/lib/cron-auth.ts` (o cron do WhatsApp usa).

## Stack

| Camada        | Tecnologia                                              |
| ------------- | ------------------------------------------------------- |
| Framework     | Next.js 16 — App Router, TypeScript, `src/`            |
| Estilo        | Tailwind CSS v4 + design system da Central de Agentes (ver abaixo)|
| Ícones        | `lucide-react`                                          |
| Calendário    | `@fullcalendar/react` v6 (`ssr: false`)                 |
| Banco + Auth  | Supabase (`@supabase/supabase-js` + `@supabase/ssr`)   |
| Sessão        | Cookies gerenciados pelo `@supabase/ssr`               |
| Deploy        | Vercel (projeto `chaves5/secretaria`, Node 24), ligada ao GitHub — push em `main` publica |
| WhatsApp      | `gateway-whatsapp/` — serviço Node separado com Baileys (não roda na Vercel) |

`node` 22+, `npm`. `npm run dev` para desenvolver, `npm run build` para checar tipos/produção.

## Design system (globals.css) — redesign "Nitro" (11/09)

Tema escuro fixo, carvão com leve viés frio (`#05060a`), verde de acento `#17C964`
(hover `#12A852`, com `--accent-glow` pra focos/hovers), raios 5–13px, bordas frias
(`#24272e`), fontes Inter (texto) + IBM Plex Mono (`--font-mono`, rótulos) + **Anton**
(`--font-display`, só nos títulos grandes das telas de autenticação — nunca em texto
corrido). Tokens em `:root` (sem bloco de light mode — `color-scheme: dark`), expostos
ao Tailwind via `@theme inline` → utilitários `bg-background`, `bg-sidebar`,
`bg-surface`/`raised`/`overlay`, `text-foreground`, `text-fg-secondary`/`fg-tertiary`,
`border-border`, `bg-accent`, `text-danger`, etc.
Classes de componente no próprio globals.css: `.btn`/`.btn-primary`/`.btn-secondary`/`.btn-ghost`/`.btn-sm`,
`.campo` (inputs), `.cartao`, `.rotulo`, `.pill`/`.pill-{gray,blue,green,yellow,red}` (mapeadas em
`PILL_STATUS` / `PILL_DIFICULDADE` em `src/lib/demandas.ts`), e as novas `.marca*` (ícone +
wordmark do Nitro, ver `_componentes/marca.tsx`) e `.tela-auth`/`.cartao-auth` (telas de login).
`body` tem um **fundo de tela pessoal** (imagem pixel art + véu escuro + brilhos sutis + grão +
scanlines) — ver seção "Aparência" abaixo; `bg-sidebar`/`bg-overlay` ganham `backdrop-filter`
(vidro fosco) direto no CSS, sem precisar tocar nos componentes que já usam essas classes.
Casca da área logada: `src/app/_componentes/casca-app.tsx` (barra lateral + conteúdo), usada pelo
`dashboard/layout.tsx` e pela página `/calendario`. Barra lateral: `_componentes/barra-lateral.tsx` (client).

### Aparência: fundo de tela pessoal (estilo capa do Notion)

`usuarios.imagem_fundo` (migration `0011`, texto — guarda uma **chave**, não a URL) — cada
usuário escolhe o próprio fundo em **Ajustes → Aparência** (`_componentes/escolher-fundo.tsx`,
clique já aplica, sem botão salvar). Catálogo em `src/lib/aparencia.ts` (client-safe: chave +
rótulo + arquivo em `public/fundos/`) — pra adicionar uma imagem nova: solta o arquivo em
`public/fundos/` e acrescenta uma entrada no array `FUNDOS`. `src/lib/aparencia-consultas.ts`
(server-only) resolve a chave do usuário logado pra URL, com fallback pro padrão (sem sessão
ou chave inválida). O `RootLayout` (`layout.tsx`) busca essa URL e injeta como custom property
(`style={{ "--fundo-imagem": ... }}` no `<body>`); `globals.css` usa
`var(--fundo-imagem, url(padrão))` no background do `body` — assim o mesmo véu escuro/brilhos
já definidos no CSS se aplicam a qualquer imagem escolhida, sem trabalho extra por imagem.
Ação: `salvarAparencia()` em `ajustes/actions.ts` (valida a chave contra o catálogo,
`revalidatePath("/", "layout")` porque o fundo é lido no layout raiz).

## Variáveis de ambiente

`.env.local` (não versionado) — veja `.env.local.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — usada só pelo cron de avisos de WhatsApp (`src/lib/whatsapp-agendados.ts`,
  via `src/lib/supabase/admin.ts`), que roda sem sessão de usuário. **Nunca** exposta ao navegador.
- `CRON_SECRET` — segredo compartilhado entre o `pg_cron` do Supabase e a rota
  `/api/whatsapp/cron` (no Vault do Supabase: `manychat_cron_secret`, nome herdado).
- `WHATSAPP_GATEWAY_URL` / `WHATSAPP_GATEWAY_TOKEN` — gateway padrão, usado quando o escritório não
  preencheu URL própria em Ajustes. **Desde 28/09 = Evolution API v2.3.7 do programador sênior parceiro,
  servidor `https://evolution-api-k91lv.169.58.90.253.sslip.io`** (painel em `/manager`), **instância
  `secretaria`** criada só pra nós (a instância "Gabriel Whatsapp" é o número pessoal dele — NÃO usar).
  `WHATSAPP_GATEWAY_URL` = `.../message/sendText/secretaria`; `WHATSAPP_GATEWAY_TOKEN` = **token da
  instância** (só enxerga/controla a `secretaria`), não a apikey global — a global não fica guardada no
  projeto. Cadastradas no `.env.local` e na Vercel (Production). O servidor antigo
  (`159.112.178.84:8080`, HTTP) travou em 27/09 e foi abandonado. `whatsapp-envio.ts` detecta Evolution pela URL
  (`/message/sendText/{instancia}`) e manda header `apikey` + `{number, text}`; qualquer outra URL usa o
  formato genérico do `gateway-whatsapp/` (Bearer + `{telefone, mensagem}`), que virou fallback.
- `WHATSAPP_QR_SEGREDO` — libera a página pública `/conectar-whatsapp?t=<segredo>` (QR que se renova
  sozinho, para outra pessoa parear o número). A `apikey` fica só no servidor (`/api/whatsapp/qr`
  faz de proxy pra Evolution). Pra invalidar um link já enviado: trocar o valor na Vercel e redeployar.
  `SUPABASE_SERVICE_ROLE_KEY` também é usada pelo cron do WhatsApp (`whatsapp-agendados.ts`).

## Estrutura

> **Grupo de rotas `src/app/(app)/` (desde 30/09):** `dashboard/`, `calendario/`, `ajustes/`,
> `escritorio/`, `manychat/` e `editor-de-videos/` ficam dentro de `(app)/` (o grupo não aparece na URL).
> `(app)/layout.tsx` aplica a `CascaApp` UMA vez pra toda a área logada — trocar de aba não remonta a
> barra do topo/lateral nem refaz as consultas do sino — e `(app)/loading.tsx` mostra um esqueleto na
> hora enquanto a página nova carrega. Imports: `@/app/(app)/dashboard/...`. A árvore abaixo omite o
> `(app)/` por brevidade. Página nova da área logada: criar dentro de `(app)/`, sem envolver em `CascaApp`.

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
    whatsapp-envio.ts          # enviarMensagemWhatsapp() (POST no gateway do escritório ou no padrão do env) +
                               #   avisarDono() (silencioso, monta saudação Nitro + link) + temGatewayPadrao() — server-only
    whatsapp-agendados.ts      # processarAvisosAgendados(): prazo (amanhã/hoje/ontem, ≥8h) + compromisso (≤30 min),
                               #   service role, trava anti-duplicata em `whatsapp_avisos_enviados` — server-only
    notificacoes.ts            # tipos Notificacao/TipoNotificacao + rótulos (client-safe)
    notificacoes-consultas.ts  # listarNotificacoes() / contarNaoLidas() — server-only
    admin.ts                    # ehAdmin(email) — checa ADMIN_EMAILS (client-safe, só lê process.env);
                               #   usado em ajustes/page.tsx e no Editor de Vídeos
    video-pedidos.ts            # tipos VideoPedido/VideoPedidoAdmin, status/pílulas (client-safe)
    video-pedidos-consultas.ts  # listarPedidosVideo() (RLS) / listarFilaGlobalAdmin() (service role, só admin) — server-only
    manychat-contas.ts          # tipo ContaInstagram + formatarDataHoraBR() (client-safe)
    manychat-contas-consultas.ts # listarContas()/obterConta() (RLS) + conectarContaInstagram() (OAuth) — server-only
    manychat-automacoes.ts       # tipos Automacao/AutomacaoInput + rotulosGatilho() (client-safe)
    manychat-automacoes-consultas.ts # listarAutomacoes(contaId)/obterAutomacao() — server-only
    manychat/                   # MOTOR do ManyChat — só service role, sem sessão de usuário
                               #   (webhook/drenador/cron; painel e OAuth usam os arquivos acima,
                               #   com RLS normal). instagram.ts (Graph API), instagram-accounts.ts
                               #   (busca cross-tenant por ig_user_id, só o motor), contacts.ts,
                               #   webhook-processing.ts, queue.ts, drain.ts, text-match.ts,
                               #   webhook-signature.ts, cron-auth.ts
    supabase/
      client.ts                # criarClienteNavegador() — Client Components
      server.ts                # criarClienteServidor() — Server Components / Actions
      proxy.ts                 # atualizarSessao() — usado pelo src/proxy.ts
      admin.ts                  # supabaseAdmin() — service role, só usado por lib/manychat/
  app/
    layout.tsx                 # fonte Inter + tokens do tema
    page.tsx                   # redireciona para /dashboard
    _componentes/
      casca-app.tsx            # server: barra do topo + barra lateral + <main> (área logada)
      barra-topo.tsx           # client: logo + busca de demandas (?q=) + PainelNotificacoes + menu do perfil (sair)
      painel-notificacoes.tsx  # client: sino + painel suspenso (lista, "apenas não lidas", marcar todas como lidas)
      barra-lateral.tsx        # client: nav (Demandas, Calendário, ManyChat, Editor de Vídeos) — lateral no desktop, faixa no mobile.
                               #   Chefe: "Demandas" vira grupo recolhível → Demandas Pessoais (/dashboard) + Demandas Funcionários (/dashboard/equipe)
    auth/actions.ts            # Server Actions: entrar, cadastrar (→ /onboarding), sair
    login/ , cadastro/         # page.tsx (server) + formulario-*.tsx (client)
    onboarding/                # page.tsx (sem escritório) + actions.ts (criarEscritorio/entrarEscritorio, via RPC) + formularios (client, abas criar/entrar)
    escritorio/                # page.tsx (nome + código + membros, dentro da CascaApp) + actions.ts (sair/regenerar código/definir papel/remover membro)
                               #   _componentes: codigo-escritorio.tsx (copiar/gerar), sair-escritorio.tsx (confirm)
    ajustes/                   # page.tsx (dentro da CascaApp) + actions.ts. Seções:
                               #   "Aparência" (todos): galeria de fundos de tela (clique já aplica) — salvarAparencia()
                               #   "Reativar sistema" (só ADMIN_EMAILS): link p/ o painel do Supabase
                               #   "Seu WhatsApp" (todos): edita telefone + toggle whatsapp_ativo
                               #   "Integração do escritório" (só chefe): URL+token do gateway, 4 toggles de evento, botão "Enviar teste"
                               #   _componentes: escolher-fundo.tsx, preferencia-whatsapp.tsx, integracao-whatsapp.tsx
    calendario/
      page.tsx                 # calendário mensal (FullCalendar) das demandas (por data_entrega) + compromissos
                               #   botão "Novo compromisso" (BotaoNovoCompromisso) abre modal de criação
      actions.ts               # Server Actions: criarCompromisso/atualizarCompromisso/apagarCompromisso
                               #   data+hora juntadas com fuso fixo -03:00 (Brasil não tem mais horário de verão)
      _componentes/calendario-demandas.tsx  # client: FullCalendar, demanda (cor por dificuldade) + compromisso (azul,
                               #   com hora) — clique em demanda navega pra editar, clique em compromisso abre
                               #   modal de editar/excluir (mesmo FormularioCompromisso do criar)
                               #   cartao-calendario (globals.css): cartão maior, opaco, cobrindo o fundo pixelado
    dashboard/
      page.tsx                 # server: quadro PESSOAL (só demandas/listas do usuário logado, inclusive do chefe) —
                               #   monta colunas (4 automáticas + 1 por lista) e passa pro <QuadroDemandas>
                               #   coluna automática: concluída→Concluídas; não concluída c/ prazo vencido→Pendentes;
                               #   status 'pendente'→A iniciar (toda demanda nova nasce aqui); 'em_andamento'→Em andamento.
                               #   "Pendentes" é só por prazo: não aceita soltar card (destino ""). Status 'pendente' no
                               #   banco = rótulo "A iniciar" na UI/notificações (migration 0018)
                               #   demanda com lista_id vai pra essa lista (ignora a automática); "Iniciar" só no pendente inicial
      actions.ts               # Server Actions: demanda (criar/atualizar/status/apagar), comentário, notificações lidas,
                               #   lista (criarLista/renomearLista/apagarLista), moverDemanda(id, "status:<x>"|"lista:<id>")
                               #   arrastar p/ coluna automática troca o status; p/ lista só seta lista_id
                               #   atualizar/status/comentário chamam avisarDono() (WhatsApp) quem ator ≠ dono da demanda
      _componentes/            # quadro-demandas.tsx (client: colunas + drag-and-drop nativo + "Adicionar outra lista" + menu da lista;
                               #   card mostra só título/descrição/dificuldade/prazo/botão de status — resto num menu de contexto
                               #   aberto pelo lápis no hover ou botão direito: Editar / Comentário (modal) / Mover para / Excluir),
                               #   formulario-demanda.tsx, bloco-comentarios.tsx, marcar-lidas.tsx, modal.tsx…
      equipe/page.tsx          # SÓ CHEFE: uma coluna por membro (menos ele) com as demandas dele; filtro no topo
                               #   (?filtro=todas|a_iniciar|em_andamento|concluidas|pendentes) + busca ?q. Usa o
                               #   <QuadroDemandas modo="equipe">: sem arrastar, sem listas, faixa de cor por situação do card
      nova/page.tsx            # criar demanda
      [id]/editar/page.tsx     # editar demanda + comentários
      notificacoes/page.tsx    # lista de notificações (marca como lidas ao abrir)
    manychat/                  # ManyChat — automação de DM do Instagram por palavra-chave (SEM IA),
                               #   portado do app separado ig-dm-automacao (ver histórico da sessão de
                               #   integração). Cada escritório conecta sua própria conta Instagram.
      layout.tsx                 # aplica a CascaApp
      page.tsx                   # lista as contas do escritório logado + "Conectar Instagram"
      contas/[id]/
        page.tsx                   # conexão (avatar, validade do token, reconectar) + KPIs + lista de automações
        actions.ts                  # Server Actions: automação (criar/atualizar/apagar/ativar-pausar),
                               #     sincronizarFollowups() (recria a sequência link→lembrete)
        _componentes/                # formulario-automacao.tsx, lista-automacoes.tsx, seletor-midia.tsx
        automations/novo|[automationId]/page.tsx
    editor-de-videos/          # fila manual de edição de vídeo — SEM automação (ver "Estado" abaixo)
      layout.tsx                 # aplica a CascaApp
      page.tsx                   # server: pedidos do escritório + (se admin) fila global
      actions.ts                  # Server Actions: criarPedidoVideo (upload original + insert),
                               #     apagarPedidoVideo (dono/chefe), e só-admin: marcarEmEdicao,
                               #     concluirPedidoVideo (upload editado + status=concluido, via supabaseAdmin())
      _componentes/                # formulario-envio.tsx (dropzone + instruções + botão de legenda
                               #     reservado/desabilitado), lista-pedidos.tsx (histórico do
                               #     escritório + baixar/apagar), fila-admin.tsx (só ADMIN_EMAILS:
                               #     pedidos de todos os escritórios, baixar original, subir editado)
  api/manychat/
    webhook/route.ts            # GET (handshake da Meta) + POST (recebe evento, processa, drena a fila)
    oauth/login|callback/route.ts # conectar Instagram — exige escritório; grava com sessão normal (RLS)
    cron/drain|refresh-token/route.ts # batidos pelo pg_cron do Supabase; usam o motor (service role)
    instagram/media/route.ts     # seletor de posts do formulário de automação
  api/whatsapp/cron/route.ts   # batido pelo pg_cron a cada 5 min (migration 0016/0017) → avisos agendados
supabase/
> **Planilhas + aninhamento (migration 0021):** um quadro pode ser `tipo='planilha'` (tabela livre:
> colunas em `quadros.planilha_colunas` jsonb, linhas em `planilha_linhas`) e pode ter `quadro_pai_id`
> (aparece aninhado sob outro quadro no menu). Ex.: a planilha "Referências Criativos" é filha do
> quadro "Gomapet". Páginas: `/dashboard/planilha/[id]` (editor); libs `planilha.ts`/`planilha-consultas.ts`;
> actions `planilha-actions.ts`. RLS de `planilha_linhas`: qualquer membro do escritório lê e edita.
> **Importada do Avant em 05/10** (133 linhas) lendo o Firestore `gestao-avant` só dessa planilha; o dump
> completo da base foi descartado logo após (tinha dados sensíveis).

  migrations/                  # SQL versionado, prefixo numérico (0001_ … 0018_). Aplicar: supabase-aplicar.bat
                               #   0009 = MULTI-TENANT: tabela `escritorios`, `escritorio_id` em usuarios/demandas/listas/comentarios/notificacoes,
                               #          helper meu_escritorio(), RPCs (criar/entrar/sair/definir_papel/remover/regenerar), RLS reescrita
                               #          por escritório, trigger que trava troca de papel/escritório fora das RPCs. ZEROU os dados.
                               #   0010 = WhatsApp: `usuarios.whatsapp_ativo` + tabela `escritorio_whatsapp` (ativo/url/token/4 toggles), RLS chefe.
                               #   0011 = Aparência: `usuarios.imagem_fundo` (chave do catálogo em src/lib/aparencia.ts).
                               #   0012 = tabela `compromissos` (agenda pessoal — reuniões etc., separada de demandas;
                               #          data_hora com hora, pro lembrete futuro por WhatsApp), RLS igual demandas.
                               #   0013 = ManyChat: `instagram_accounts`/`automations`/`followups` — RLS por
                               #          escritório de verdade (o app antigo não tinha nenhuma policy, só service
                               #          role). Upsert de conta por `ig_user_id` de outro escritório falha sozinho
                               #          (viola a policy de UPDATE) — não precisa checagem manual de "roubo" de conta.
                               #   0014 = ManyChat: `contacts`/`queue`/`events` + RPC `claim_queue_batch` — só
                               #          SELECT tem policy (INSERT/UPDATE são exclusivos da service role, sem
                               #          sessão de usuário pra aplicar RLS de qualquer forma).
                               #   0015 = Editor de Vídeos: tabela `video_pedidos` (fila manual, SEM policy de
                               #          UPDATE — só o admin via service role muda status/anexa o editado) +
                               #          bucket privado `videos-pedidos` (file_size_limit 2GiB, isolado por
                               #          pasta = escritorio_id).
                               #   0016 = WhatsApp Fase 2: chefe atribui demanda a membro do escritório (RLS de
                               #          demandas + helper eh_membro_do_meu_escritorio), notificação 'atribuicao',
                               #          escritorio_whatsapp.notif_compromisso, tabela whatsapp_avisos_enviados
                               #          (sem policy — só service role) e pg_cron 'whatsapp-avisos-agendados'.
                               #   0017 = reaponta esse cron pra URL da Vercel.
                               #   0018 = rotulo_status('pendente') = 'A iniciar' (coluna nova do quadro).
gateway-whatsapp/              # serviço Node SEPARADO (Baileys): pareia um número por QR e expõe
                               #   POST /enviar {telefone, mensagem} (Bearer GATEWAY_TOKEN), GET /status,
                               #   GET /?token= (página do QR). Sessão em sessao/ (não versionada).
                               #   iniciar-gateway.bat roda local. Fora do tsconfig/eslint/.vercelignore.
  config.toml                  # config declarativo do projeto (SMTP, templates de e-mail) — supabase-configurar-smtp.bat
  templates/recovery.html      # template do e-mail de redefinição de senha
public/
  fundos/                       # imagens do seletor de fundo (Ajustes → Aparência) — catálogo em src/lib/aparencia.ts
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

- `.env.local` preenchido (inclui `ADMIN_EMAILS`); migrations `0001`–`0018` aplicadas.
- **Redesign "Nitro" (11/09):** marca (ícone + wordmark) trocou "Secretária" pelo logo do Nitro,
  fundo de tela em pixel art (agora escolhível por usuário — ver "Aparência" acima), vidro fosco
  na barra/menus, glow no acento, SMTP/templates de e-mail já cobertos noutra seção.
- Confirmação de e-mail **desligada** (`mailer_autoconfirm = true`) — cadastro entra direto.
- **App é multi-empresa** (SaaS): cadastro público → `/onboarding` (criar escritório = vira chefe, ou
  entrar com código = funcionário) → `/dashboard` isolado por escritório. Isolamento multi-tenant testado (09/09).
- Site publicado na Vercel, público.
- `.github/workflows/keepalive.yml` pinga o site a cada 2 dias pro Supabase free não pausar.
- **WhatsApp (Fases 1 e 2 — código pronto, falta hospedar o gateway):** canal = **Baileys** (WhatsApp
  Web não oficial, indicado por um programador conhecido do usuário) em `gateway-whatsapp/`. Mensagem
  grátis (não é a API oficial da Meta); custo só de hospedagem + chip. Risco: ban do número → usar chip
  dedicado. Avisos imediatos (ator ≠ dono): **atribuição** (chefe escolhe "Responsável" no formulário),
  **status** (botões e arrastar card), **edição**, **comentário**. Agendados (pg_cron 5 min →
  `/api/whatsapp/cron`): **prazo** vence amanhã/hoje/venceu ontem (a partir das 8h) e **compromisso**
  30 min antes. Voz do Nitro: "Bom dia/tarde/noite, Chefe!" ou primeiro nome do funcionário + link.
  Escritório liga em Ajustes → Integração (URL/token opcionais se houver gateway padrão no env).
  Sem fila para os imediatos (fire-and-forget, timeout 10s); agendados refazem na próxima rodada se o
  gateway estiver fora (erro 4xx = definitivo, não repete).

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

## Deploy: por que Vercel (migrado em 24/09)

A conta da **Netlify estourou os créditos do plano grátis em 13/09** ("Skipped due to account credit
usage exceeded") e desde então **nenhum deploy foi publicado lá** — o site da Netlify
(`inspiring-genie-d3a1a7.netlify.app`) ficou congelado no commit `1eba1ef` (12/09). Foi por isso que em
14/09 o app foi publicado na Vercel (e o Supabase Auth `site_url` + os crons do ManyChat já foram
apontados pra lá nesse dia). Uma nota de 21/09 aqui dizia que "a Netlify continuava oficial" — estava
errada, não tinha checado o estado dos deploys. **Decisão do usuário em 24/09: tudo na Vercel.**
O site da Netlify foi **apagado em 25/09** (e o `netlify.toml` removido do repo).

- Projeto `chaves5/secretaria` (conta Vercel `gabrielchaves03`), env vars de Production já cadastradas.
- Plano **Hobby** (grátis) — os termos dele são para uso não comercial; se o SaaS passar a cobrar
  clientes, migrar pro Pro.
- `supabase/config.toml` alinhado com o remoto (site_url Vercel). **Não** rodar `config push` à toa: há
  uma diferença pré-existente de `auth.sms.twilio.enabled` (remoto true) e a senha do SMTP vem de env.
- `.vercelignore` exclui `gateway-whatsapp/` e `.env*`.
- **Funções rodam em `gru1` (São Paulo)** via `vercel.json` (`regions`), ao lado do Supabase (`sa-east-1`).
  Antes (30/09) rodavam no padrão `iad1` (Washington) e cada consulta ao banco cruzava o continente —
  navegar entre abas levava ~1 s+. Não voltar para outra região sem motivo.
- **Autor dos commits TEM que ser `gabrielchaves0308@gmail.com`** (e-mail da conta Vercel). No Hobby a
  Vercel bloqueia (`BLOCKED` / `TEAM_ACCESS_REQUIRED`) deploy de commit de outro autor — foi o que
  travou os deploys de 22/09 e 24/09 (commits saíam como `igintermediacoesbrasil@gmail.com`). O
  `git config --local user.email` deste repo já está certo desde 24/09.

## Pendências

- **WhatsApp:** instância `secretaria` conectada em 29/09 a um **número de TESTE** (+55 83 9960-8848,
  perfil "Ana - Suporte Gomapet" — número da GomaPet reaproveitado só pra montar/testar as mensagens).
  Pra trocar pelo definitivo: desconectar o aparelho no celular e escanear o QR de novo pelo link
  `/conectar-whatsapp?t=<WHATSAPP_QR_SEGREDO>` — nada muda no código/env. **Teste ponta a ponta OK em 30/09**
  (integração ligada no escritório "Milhões", "Enviar teste" chegou). Falta: refinar os textos das mensagens.
- Vercel ligada ao GitHub desde 25/09 (push em `main` publica sozinho).
- Gateway alternativo: **Redirect/Nandu** (redirectmais.com.br) — se um dia destravar, é só preencher
  URL+token em Ajustes → Integração do escritório. **ManyChat descartado** pra esse uso: o canal WhatsApp dele roda sobre a API oficial da Meta
  (não evita o custo que o usuário quer evitar) e só manda mensagem pra quem já iniciou conversa (modelo de
  assinante/opt-in) — não serve pra notificação automática pra um número qualquer. Alternativa gratuita
  discutida, ainda não implementada: self-hostar **Evolution API** (open source, mesmo formato de POST
  genérico) como fallback enquanto o Redirect não libera acesso.
- Drag-and-drop das listas é HTML5 nativo → não funciona por toque no celular; nesse caso usar o seletor
  "Mover para" no card.
- Melhorias de UI/UX (a base é funcional, sem capricho visual).

## Tabelas largas e colunas personalizadas (15/10)

- **Rolagem lateral de tabela:** sempre `<TabelaRolavel>` (`dashboard/_componentes/tabela-rolavel.tsx`,
  barra extra no topo sincronizada) ou a classe `.rolagem-tabela` (globals.css). Sem isso a tabela
  "rasga" ao rolar (fundo `fixed` + grão com blend). Dentro dela **não** usar overlay `fixed inset-0`
  pra fechar menu (o transform prende o fixed à tabela) — usar listener de `mousedown` fora.
- **Colunas das demandas são POR QUADRO** (migration 0023): `quadros.colunas_demandas` jsonb = lista
  completa e ordenada (sistema: responsavel/status/prazo/prioridade/notas/link — renomeáveis e EXCLUÍVEIS (inclusive
  responsavel/status; voltam pelo "+" → "Recolocar coluna"); personalizadas: id `c_xxxxxxxx`, tipos texto/numero/data/link/selecao
  + `opcoes` + `cores`). NULL = padrão (`colunasDoQuadro`/`configDoQuadro` em `lib/demandas-config.ts`).
  Editadas direto no cabeçalho da visão Tabela (`board-tabela.tsx`: CabecalhoColuna / BotaoNovaColuna)
  por QUALQUER membro, via RPC `salvar_colunas_quadro` (`quadro-colunas-actions.ts`). Valores em
  `demandas.campos[id]`; célula edita inline via `salvarCampoDemanda()` (sem aviso WhatsApp). Excluir
  coluna só some da tela — os valores ficam em `campos`. Menus dentro da tabela usam `<Popover>`
  (`_componentes/popover.tsx`, portal no body). Ajustes não mexe mais em colunas (só status).

## Métricas (Fase C, 15/10)

`/metricas` (`src/app/(app)/metricas/page.tsx`, item "Métricas" na barra lateral): KPIs (total, em aberto,
concluídas, atrasadas, vencem em 7 dias) + **Por operação** (cada quadro de tarefas com barra empilhada nas
cores dos status) + **Por colaborador** + **Prazos da semana** (atrasadas / hoje / próximos 7 dias).
Chefe vê o escritório; funcionário vê só os próprios números (RLS + filtro `donoId`). Sem data de
conclusão no banco — métricas de evolução no tempo ficaram de fora de propósito (usuário não pediu).
