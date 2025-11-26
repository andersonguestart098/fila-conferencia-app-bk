// src/api/types/conferencia.ts

export interface ItemConferencia {
  sequencia: number;
  codProd: number;
  descricao: string;
  unidade: string;
  qtdNeg: number;
  vlrUnit: number;
  vlrTot: number;
}

/**
 * Versão usada na tela de conferência:
 * - adiciona a quantidade conferida pelo usuário
 * - flag se o item foi conferido
 */
export interface ItemConferenciaUI extends ItemConferencia {
  qtdConferida: number;
  conferido: boolean;
}

export interface DetalhePedido {
  nunota: number;                 // NUNOTA (chave interna)
  numNota?: number;               // NUMNOTA (nº da NF, ex: 463)
  nomeParc?: string;              // Nome do cliente/parceiro
  statusConferencia: string;
  nomeConferente?: string | null;
  avatarUrlConferente?: string | null;
  itens: ItemConferencia[];
}

// se você quiser ainda ter um tipo "Pedido" pra lista,
// pode simplesmente reusar:
export type Pedido = DetalhePedido;

// resposta do /conferencia/iniciar
export interface ConferenciaCriada {
  nuconf: number;
  nunotaOrig: number;
}
