// src/screens/DetalhePedidoScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  FlatList,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/RootNavigator";
import { DetalhePedido } from "../api/types/conferencia";
import { 
  iniciarConferencia, 
  buscarConferentes, 
  definirConferente  // ← ADICIONE ESTA IMPORT
} from "../api/conferencia";
import Navbar from "../components/Navbar";
import { Ionicons } from "@expo/vector-icons";

type Props = NativeStackScreenProps<RootStackParamList, "DetalhePedido">;

// Mapa de código → descrição legível
const statusMap: Record<string, string> = {
  A: "Em andamento",
  AC: "Aguardando conferência",
  AL: "Aguardando liberação p/ conferência",
  C: "Aguardando liberação de corte",
  D: "Finalizada divergente",
  F: "Finalizada OK",
  R: "Aguardando recontagem",
  RA: "Recontagem em andamento",
  RD: "Recontagem finalizada divergente",
  RF: "Recontagem finalizada OK",
  Z: "Aguardando finalização",
};

type Conferente = {
  codUsuario: number;
  nome: string;
};

export default function DetalhePedidoScreen({ route, navigation }: Props) {
  const { detalhePedido } = route.params;

  const [detalhe] = useState<DetalhePedido>(detalhePedido);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Estados para o modal de conferente
  const [modalConferenteVisivel, setModalConferenteVisivel] = useState(false);
  const [conferentes, setConferentes] = useState<Conferente[]>([]);
  const [conferenteSelecionado, setConferenteSelecionado] = useState<Conferente | null>(null);
  const [buscaConferente, setBuscaConferente] = useState("");
  const [carregandoConferentes, setCarregandoConferentes] = useState(false);

  const [modalEmAndamentoVisivel, setModalEmAndamentoVisivel] = useState(false);

  // Carregar conferentes quando o modal abrir
  useEffect(() => {
    if (modalConferenteVisivel) {
      carregarConferentes();
    }
  }, [modalConferenteVisivel]);

  const carregarConferentes = async () => {
    try {
      setCarregandoConferentes(true);
      const listaConferentes = await buscarConferentes();
      setConferentes(listaConferentes);
    } catch (error) {
      console.error("Erro ao carregar conferentes:", error);
      setErro("Não foi possível carregar a lista de conferentes");
    } finally {
      setCarregandoConferentes(false);
    }
  };

  const executarInicioConferencia = async (codUsuario?: number, nome?: string) => {
    try {
      setLoading(true);
      setErro(null);

      const usuarioFinal = codUsuario || 42; // Fallback se não selecionar
      const nomeFinal = nome || "Conferente não identificado";

      // 1. Iniciar conferência
      const resp = await iniciarConferencia(detalhe.nunota, usuarioFinal);
      
      console.log("✅ Conferência iniciada com sucesso:", resp);

      // 2. Se temos um conferente selecionado, registrar também
      if (codUsuario && nome) {
        try {
          console.log("📝 Definindo conferente...", { nunota: detalhe.nunota, codUsuario, nome });
          await definirConferente(detalhe.nunota, codUsuario, nome);
          console.log("✅ Conferente definido com sucesso");
        } catch (erroConferente) {
          console.warn("⚠️  Não foi possível registrar o conferente, mas a conferência foi iniciada:", erroConferente);
          // Não bloqueia o fluxo se falhar em registrar o conferente
        }
      }

      // 3. Navegar para tela de conferência
      navigation.navigate("Conferencia", {
        detalhePedido: detalhe,
        nuconf: resp.nuconf,
      });
    } catch (e: any) {
      console.error("❌ Erro ao iniciar conferência:", e);
      
      // Mensagem de erro mais específica
      if (e.message?.includes("Network request failed")) {
        setErro("Erro de conexão. Verifique sua internet e tente novamente.");
      } else if (e.response?.status === 500) {
        setErro("Erro no servidor. Tente novamente mais tarde.");
      } else {
        setErro("Erro ao iniciar conferência: " + (e.message || "Erro desconhecido"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleIrParaConferencia = () => {
    // Se já está em andamento, mostra modal elegante
    if (detalhe.statusConferencia === "A") {
      setModalEmAndamentoVisivel(true);
    } else {
      // Mostra modal para selecionar conferente
      setModalConferenteVisivel(true);
    }
  };

  // Função para filtrar conferentes pela busca
  const conferentesFiltrados = conferentes.filter(conf =>
    conf.nome.toLowerCase().includes(buscaConferente.toLowerCase()) ||
    conf.codUsuario.toString().includes(buscaConferente)
  );

  // Função para selecionar conferente e iniciar conferência
  const selecionarEIniciar = () => {
    if (!conferenteSelecionado) {
      setErro("Por favor, selecione um conferente");
      return;
    }

    setModalConferenteVisivel(false);
    executarInicioConferencia(
      conferenteSelecionado.codUsuario,
      conferenteSelecionado.nome
    );
  };

  // Função para continuar sem selecionar (caso queira manter o fallback)
  const continuarSemSelecionar = () => {
    setModalConferenteVisivel(false);
    executarInicioConferencia();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#66CC66" />
        <Text style={{ marginTop: 10 }}>Iniciando conferência...</Text>
      </View>
    );
  }

  if (erro) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', textAlign: 'center' }}>{erro}</Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 20 }]}
          onPress={() => setErro(null)}
        >
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!detalhe) {
    return (
      <View style={styles.center}>
        <Text>Nenhum detalhe encontrado.</Text>
      </View>
    );
  }

  const totalItens = detalhe.itens.length;
  const totalQuantidade = detalhe.itens.reduce(
    (acc, item) => acc + (item.qtdNeg ?? 0),
    0
  );

  const itensResumo = detalhe.itens.slice(0, 10);
  const itensRestantes = totalItens - itensResumo.length;

  const statusDescricao =
    statusMap[detalhe.statusConferencia] ||
    detalhe.statusConferencia ||
    "-";

  // 🔒 Regras de bloqueio do botão
  const isFinalizadaOk = detalhe.statusConferencia === "F";
  const isAguardandoCorte = detalhe.statusConferencia === "C";
  const isAguardandoConferencia = detalhe.statusConferencia === "AC";
  const isEmAndamento = detalhe.statusConferencia === "A";
  const isAguardandoLiberacao = detalhe.statusConferencia === "AL";
  
  const botaoDesabilitado = 
    isFinalizadaOk || 
    isAguardandoCorte || 
    isAguardandoLiberacao;

  // Texto do botão baseado no status
  const getButtonText = () => {
    switch (detalhe.statusConferencia) {
      case "F":
        return "Conferência finalizada";
      case "C":
        return "Aguardando liberação de corte";
      case "AC":
        return "Iniciar Conferência";
      case "A":
        return "Continuar Conferência";
      case "AL":
        return "Aguardando liberação p/ conferência";
      default:
        return "Conferência não disponível";
    }
  };

  const nomeParc = (detalhe as any).nomeParc;

  return (
    <View style={styles.container}>
      {/* 🔥 Navbar no topo */}
      <Navbar title={`Pedido #${detalhe.nunota}`} showBack />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Status: {statusDescricao}</Text>
          <Text style={styles.label}>Total de itens: {totalItens}</Text>
          <Text style={styles.label}>
            Total de quantidade: {totalQuantidade}
          </Text>

          {/* RESUMO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resumo dos produtos</Text>

            {itensResumo.map((item) => (
              <View
                key={`${item.sequencia}-${item.codProd}`}
                style={styles.prodRow}
              >
                <Text style={styles.prodMain}>
                  {item.codProd} · {item.descricao}
                </Text>
              </View>
            ))}

            {itensRestantes > 0 && (
              <Text style={styles.moreText}>+ {itensRestantes} itens...</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* BOTÃO FIXO */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.button,
            botaoDesabilitado && styles.buttonDisabled,
          ]}
          onPress={!botaoDesabilitado ? handleIrParaConferencia : undefined}
          disabled={botaoDesabilitado}
        >
          <Text style={styles.buttonText}>
            {getButtonText()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ Modal para seleção de conferente */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConferenteVisivel}
        onRequestClose={() => setModalConferenteVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecione o Conferente</Text>
            <Text style={styles.modalSubtitle}>
              Pedido #{detalhe.nunota}
            </Text>

            {/* Campo de busca */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar conferente por nome ou código..."
                value={buscaConferente}
                onChangeText={setBuscaConferente}
                autoCapitalize="words"
              />
            </View>

            {/* Lista de conferentes */}
            {carregandoConferentes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#66CC66" />
                <Text style={styles.loadingText}>Carregando conferentes...</Text>
              </View>
            ) : (
              <FlatList
                data={conferentesFiltrados}
                keyExtractor={(item) => item.codUsuario.toString()}
                style={styles.listaConferentes}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.conferenteItem,
                      conferenteSelecionado?.codUsuario === item.codUsuario && 
                      styles.conferenteItemSelecionado,
                    ]}
                    onPress={() => setConferenteSelecionado(item)}
                  >
                    <View style={styles.conferenteInfo}>
                      <Text style={styles.conferenteNome}>{item.nome}</Text>
                      <Text style={styles.conferenteCod}>Código: {item.codUsuario}</Text>
                    </View>
                    {conferenteSelecionado?.codUsuario === item.codUsuario && (
                      <Ionicons name="checkmark-circle" size={24} color="#66CC66" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.listaVazia}>
                    <Ionicons name="people-outline" size={48} color="#999" />
                    <Text style={styles.listaVaziaText}>
                      {buscaConferente 
                        ? "Nenhum conferente encontrado"
                        : "Nenhum conferente disponível"
                      }
                    </Text>
                  </View>
                }
              />
            )}

            {/* Botões do modal */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setModalConferenteVisivel(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  !conferenteSelecionado && styles.modalButtonDisabled
                ]}
                onPress={selecionarEIniciar}
                disabled={!conferenteSelecionado}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  Confirmar e Iniciar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ Modal branco para "Conferência em andamento" */}
      {modalEmAndamentoVisivel && (
        <View style={styles.fullscreenOverlay}>
          <View style={styles.overlayBox}>
            <Ionicons
              name="time-outline"
              size={40}
              color="#F59E0B"
            />
            <Text style={styles.overlayText}>Conferência em andamento</Text>
            <Text style={styles.overlaySubText}>
              Pedido #{detalhe.nunota}
              {nomeParc ? ` · ${nomeParc}` : ""}
            </Text>
            <Text style={styles.overlaySubText}>
              Já existe uma conferência em andamento para este pedido.{"\n"}
              Você deseja continuar mesmo assim?
            </Text>

            <View style={styles.overlayActionsRow}>
              <TouchableOpacity
                style={styles.overlayButtonSecondary}
                activeOpacity={0.85}
                onPress={() => setModalEmAndamentoVisivel(false)}
              >
                <Text style={styles.overlayButtonTextSecondary}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.overlayButton}
                activeOpacity={0.85}
                onPress={() => {
                  setModalEmAndamentoVisivel(false);
                  setModalConferenteVisivel(true);
                }}
              >
                <Text style={styles.overlayButtonText}>
                  Continuar assim mesmo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// REMOVA A FUNÇÃO LOCAL definirConferente QUE ESTÁ AQUI NO FINAL DO ARQUIVO
// ELA ESTÁ SENDO SUBSTITUÍDA PELA FUNÇÃO IMPORTADA DA API

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },

  scroll: { flex: 1 },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },

  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    padding: 20 
  },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    elevation: 2,
  },
  label: { fontSize: 14, marginBottom: 4 },

  section: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 12,
  },
  sectionTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 8,
  },

  prodRow: {
    marginBottom: 6,
  },
  prodMain: {
    fontSize: 14,
    fontWeight: "500",
  },
  prodQty: {
    fontSize: 12,
    color: "#555",
  },
  moreText: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
  },

  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 20,
  },
  button: {
    backgroundColor: "#66CC66",
    padding: 16,
    borderRadius: 999,
    alignItems: "center",
    elevation: 3,
    bottom: 60,
  },
  buttonDisabled: {
    backgroundColor: "#CBD5E1",
    elevation: 0,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  // Modal de seleção de conferente
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
  listaConferentes: {
    maxHeight: 300,
    marginBottom: 20,
  },
  conferenteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  conferenteItemSelecionado: {
    backgroundColor: '#f0f9f0',
    borderRadius: 8,
  },
  conferenteInfo: {
    flex: 1,
  },
  conferenteNome: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  conferenteCod: {
    fontSize: 14,
    color: '#666',
  },
  listaVazia: {
    padding: 40,
    alignItems: 'center',
  },
  listaVaziaText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#66CC66',
  },
  modalButtonSecondary: {
    backgroundColor: '#E5E7EB',
  },
  modalButtonTertiary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#66CC66',
  },
  modalButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextTertiary: {
    color: '#66CC66',
    fontSize: 16,
    fontWeight: '600',
  },

  // 🔄 modal branco padrão
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
    backgroundColor: "transparent",
  },
  overlayBox: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    width: "78%",
    elevation: 4,
  },
  overlayText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  overlaySubText: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    color: "#555",
  },
  overlayActionsRow: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
  },
  overlayButton: {
    flex: 1,
    backgroundColor: "#66CC66",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    marginLeft: 6,
  },
  overlayButtonSecondary: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    marginRight: 6,
  },
  overlayButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
  overlayButtonTextSecondary: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 13,
    textAlign: "center",
  },
});