import { ConectarWhatsapp } from "./conectar-whatsapp";

export const metadata = { title: "Conectar WhatsApp" };

/**
 * Página pública (sem login) para outra pessoa parear o número de WhatsApp
 * da Secretária no gateway. Só funciona com o segredo no link (`?t=`) —
 * a checagem real é feita em `/api/whatsapp/qr`.
 */
export default async function PaginaConectarWhatsapp({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;

  return (
    <main className="tela-auth flex min-h-screen items-center justify-center px-4 py-10">
      <div className="cartao-auth w-full max-w-sm p-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Conectar o WhatsApp da Secretária
        </h1>
        <ConectarWhatsapp token={t ?? ""} />
      </div>
    </main>
  );
}
