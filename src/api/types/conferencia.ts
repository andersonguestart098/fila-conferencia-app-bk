// src/api/types/conferencia.ts

export interface ItemConferencia {
    sequencia: number;
    codProd: number;
    qtdNeg: number;
    vlrUnit: number;
    vlrTot: number;
  }
  
  export interface DetalhePedido {
    nunota: number;
    statusConferencia: string;
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
  