// src/api/types/conferencia.ts

export type Conferente = {
  codUsuario: number; // ✅ igual ao backend
  nome: string;       // ✅ igual ao backend
};

export interface ItemConferencia {
  sequencia: number;
  codProd: number;
  descricao: string;
  unidade: string;
  qtdNeg: number;
  vlrUnit: number;
  vlrTot: number;
}

export interface ItemConferenciaUI extends ItemConferencia {
  qtdConferida: number;
  conferido: boolean;
}

/**
 * Pedido / Detalhe do pedido
 * (campos opcionais pra não quebrar caso o backend não mande tudo em todos endpoints)
 */
export interface DetalhePedido {
  nunota: number;
  numNota?: number;
  nomeParc?: string;

  statusConferencia: string;

  // ✅ Se o backend devolve o conferente, estes são os nomes mais úteis:
  conferenteId?: number | null;       // codUsuario
  conferenteNome?: string | null;     // nome

  // ✅ Se em algum endpoint antigo vier assim, mantém compat:
  nomeConferente?: string | null;

  avatarUrlConferente?: string | null;

  itens: ItemConferencia[];
}

export type Pedido = DetalhePedido;

export interface ConferenciaCriada {
  nuconf: number;
  nunotaOrig: number;
}
