/**
 * Catálogo de imagens de fundo (estilo "capa" do Notion). Client-safe — sem
 * import de servidor. Cada usuário guarda só a `chave` em
 * `usuarios.imagem_fundo`; o arquivo pode mudar de lugar sem migração.
 *
 * Pra adicionar uma imagem nova: solta o arquivo em `public/fundos/` e
 * acrescenta uma entrada aqui.
 */
export type FundoOpcao = {
  chave: string;
  rotulo: string;
  arquivo: string;
};

export const FUNDOS: FundoOpcao[] = [
  {
    chave: "escritorio-noturno",
    rotulo: "Escritório à noite",
    arquivo: "/fundos/escritorio-noturno.png",
  },
  {
    chave: "equipe-em-acao",
    rotulo: "Equipe em ação",
    arquivo: "/fundos/equipe-em-acao.png",
  },
  {
    chave: "quadro-de-tarefas",
    rotulo: "Quadro de tarefas",
    arquivo: "/fundos/quadro-de-tarefas.png",
  },
  {
    chave: "vista-da-cidade",
    rotulo: "Vista da cidade",
    arquivo: "/fundos/vista-da-cidade.png",
  },
  {
    chave: "painel-multitela",
    rotulo: "Painel multitela",
    arquivo: "/fundos/painel-multitela.png",
  },
];

export const FUNDO_PADRAO = FUNDOS[0].chave;

/** Resolve a chave guardada no perfil pro caminho do arquivo — cai no padrão
 * se a chave for `null`/inválida (imagem removida do catálogo, por exemplo). */
export function arquivoDoFundo(chave: string | null): string {
  return FUNDOS.find((f) => f.chave === chave)?.arquivo ?? FUNDOS[0].arquivo;
}
