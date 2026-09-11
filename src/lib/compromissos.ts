/**
 * Tipos de compromissos (agenda pessoal — reuniões etc., separado das
 * demandas). Sem import de servidor: usado tanto em Server
 * Components/Actions quanto no formulário (Client Component).
 *
 * `data_hora` guarda data + horário (diferente de `demandas.data_entrega`,
 * que é só data) porque o lembrete futuro por WhatsApp (ainda não
 * implementado) vai precisar saber a que horas avisar.
 */
export type Compromisso = {
  id: string;
  usuario_id: string;
  titulo: string;
  descricao: string | null;
  data_hora: string;
  criado_em: string;
};
