/**
 * Gateway de WhatsApp da Secretária (Nitro), feito com Baileys.
 *
 * Conecta UM número de WhatsApp comum (pareado por QR code, igual ao
 * WhatsApp Web) e expõe uma API HTTP mínima que o app chama:
 *
 *   POST /enviar                Authorization: Bearer <GATEWAY_TOKEN>
 *        { "telefone": "5511999999999", "mensagem": "..." }
 *   GET  /status                Authorization: Bearer <GATEWAY_TOKEN>
 *   GET  /?token=<GATEWAY_TOKEN>   página com o QR code / estado da conexão
 *
 * A sessão fica salva na pasta `sessao/` (não versionar): depois de
 * parear uma vez, reinícios reconectam sozinhos.
 */
import { createServer } from "node:http";
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pino from "pino";
import QRCode from "qrcode";
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";

const DIR = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(DIR, ".env"));
} catch {
  /* sem .env — usa só as variáveis do ambiente */
}

const PORTA = Number(process.env.PORT ?? 3333);
const TOKEN = process.env.GATEWAY_TOKEN ?? "";
const PASTA_SESSAO = process.env.PASTA_SESSAO ?? path.join(DIR, "sessao");

if (!TOKEN) {
  console.error("GATEWAY_TOKEN não definido (.env). Abortando.");
  process.exit(1);
}

const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

/** Estado atual, exibido na página e em /status. */
const estado = {
  conexao: "iniciando", // iniciando | aguardando_qr | conectado | desconectado
  qr: null, // string do QR atual (enquanto não pareado)
  numero: null, // número conectado
};

let sock = null;

async function conectar() {
  const { state, saveCreds } = await useMultiFileAuthState(PASTA_SESSAO);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({}));

  sock = makeWASocket({
    auth: state,
    version,
    logger,
    browser: Browsers.appropriate("Nitro"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      estado.conexao = "aguardando_qr";
      estado.qr = qr;
      console.log(`[gateway] QR novo — abra http://localhost:${PORTA}/?token=... para parear`);
    }

    if (connection === "open") {
      estado.conexao = "conectado";
      estado.qr = null;
      estado.numero = sock.user?.id?.split(":")[0]?.split("@")[0] ?? null;
      console.log(`[gateway] Conectado como ${estado.numero}`);
    }

    if (connection === "close") {
      const codigo = lastDisconnect?.error?.output?.statusCode;
      estado.conexao = "desconectado";
      estado.numero = null;

      if (codigo === DisconnectReason.loggedOut) {
        // Deslogado pelo celular: descarta a sessão e pede QR de novo.
        console.log("[gateway] Sessão encerrada no celular — gerando QR novo.");
        await rm(PASTA_SESSAO, { recursive: true, force: true });
      } else {
        console.log(`[gateway] Conexão caiu (código ${codigo ?? "?"}) — reconectando…`);
      }
      setTimeout(conectar, 2000);
    }
  });
}

/**
 * Resolve o JID real do número. No Brasil o WhatsApp às vezes registra
 * celulares sem o "9" extra — o `onWhatsApp` devolve a forma certa.
 */
async function resolverJid(telefone) {
  const digitos = String(telefone ?? "").replace(/\D/g, "");
  if (digitos.length < 10) return null;

  const candidatos = [digitos];
  // 55 + DDD + 9 + 8 dígitos  <->  55 + DDD + 8 dígitos
  if (digitos.startsWith("55") && digitos.length === 13 && digitos[4] === "9") {
    candidatos.push(digitos.slice(0, 4) + digitos.slice(5));
  } else if (digitos.startsWith("55") && digitos.length === 12) {
    candidatos.push(digitos.slice(0, 4) + "9" + digitos.slice(4));
  }

  for (const numero of candidatos) {
    const [r] = (await sock.onWhatsApp(`${numero}@s.whatsapp.net`)) ?? [];
    if (r?.exists) return r.jid;
  }
  return null;
}

async function enviar(telefone, mensagem) {
  if (estado.conexao !== "conectado" || !sock) {
    return { status: 503, corpo: { ok: false, erro: "WhatsApp do gateway não está conectado." } };
  }
  const jid = await resolverJid(telefone);
  if (!jid) {
    return { status: 422, corpo: { ok: false, erro: "Número não tem WhatsApp." } };
  }
  const r = await sock.sendMessage(jid, { text: mensagem });
  return { status: 200, corpo: { ok: true, id: r?.key?.id ?? null } };
}

// ---------------------------------------------------------------- HTTP

function autorizado(req, url) {
  const cab = req.headers.authorization ?? "";
  const bearer = cab.startsWith("Bearer ") ? cab.slice(7) : null;
  return bearer === TOKEN || url.searchParams.get("token") === TOKEN;
}

function json(res, status, corpo) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(corpo));
}

async function lerCorpo(req) {
  const partes = [];
  let tamanho = 0;
  for await (const p of req) {
    tamanho += p.length;
    if (tamanho > 64 * 1024) throw new Error("Corpo grande demais.");
    partes.push(p);
  }
  return JSON.parse(Buffer.concat(partes).toString("utf8") || "{}");
}

async function paginaStatus() {
  const qrImg = estado.qr ? await QRCode.toDataURL(estado.qr, { margin: 1, width: 300 }) : null;
  const corpo =
    estado.conexao === "conectado"
      ? `<p class="ok">✅ Conectado como <b>+${estado.numero}</b></p>
         <p>O gateway está pronto para enviar mensagens.</p>`
      : qrImg
        ? `<p>No celular: <b>WhatsApp → Aparelhos conectados → Conectar aparelho</b> e escaneie:</p>
           <img src="${qrImg}" alt="QR code" />
           <p class="dica">O QR muda a cada ~20 s — a página atualiza sozinha.</p>`
        : `<p>Estado: <b>${estado.conexao}</b>… aguarde.</p>`;

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${estado.conexao === "conectado" ? "" : '<meta http-equiv="refresh" content="5">'}
<title>Nitro · WhatsApp</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0f0e;color:#e8ece9;font:15px system-ui,sans-serif}
  main{max-width:360px;padding:24px;text-align:center}
  h1{font-size:20px;margin:0 0 16px}
  img{background:#fff;padding:8px;border-radius:8px;width:100%;max-width:300px}
  .ok{color:#4ade80;font-size:17px}.dica{color:#8a938d;font-size:13px}
</style></head><body><main><h1>Nitro · Gateway de WhatsApp</h1>${corpo}</main></body></html>`;
}

const servidor = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  try {
    if (req.method === "GET" && url.pathname === "/saude") {
      return json(res, 200, { ok: true });
    }

    if (!autorizado(req, url)) return json(res, 401, { ok: false, erro: "Não autorizado." });

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(await paginaStatus());
    }

    if (req.method === "GET" && url.pathname === "/status") {
      return json(res, 200, { conexao: estado.conexao, numero: estado.numero });
    }

    if (req.method === "POST" && url.pathname === "/enviar") {
      const { telefone, mensagem } = await lerCorpo(req);
      if (!telefone || !mensagem) {
        return json(res, 400, { ok: false, erro: "Informe telefone e mensagem." });
      }
      const r = await enviar(telefone, String(mensagem));
      return json(res, r.status, r.corpo);
    }

    return json(res, 404, { ok: false, erro: "Rota não encontrada." });
  } catch (e) {
    console.error("[gateway] erro:", e);
    return json(res, 500, { ok: false, erro: e instanceof Error ? e.message : String(e) });
  }
});

servidor.listen(PORTA, () => {
  console.log(`[gateway] Ouvindo na porta ${PORTA}`);
  conectar().catch((e) => {
    console.error("[gateway] falha ao conectar:", e);
    process.exit(1);
  });
});
