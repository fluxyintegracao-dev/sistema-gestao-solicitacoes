export type ModulosHabilitados = Record<string, boolean>;

export interface SetorResumo {
  id?: number | string;
  nome?: string;
  codigo?: string;
}

export interface UsuarioPublicoOption {
  id: number;
  nome: string;
  email?: string | null;
}

export interface NotificacaoMetadata {
  comentario?: string | null;
  mencionado_por?: number | null;
}

export interface NotificacaoItem {
  destinatario_id: number;
  lida_em?: string | null;
  createdAt?: string | null;
  tipo?: string | null;
  mensagem?: string | null;
  solicitacao_id?: number | null;
  metadata?: NotificacaoMetadata | null;
}

export interface NotificacoesResponse {
  total_nao_lidas: number;
  itens: NotificacaoItem[];
}

export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  area?: string | null;
  setor_id?: number | string | null;
  setor?: SetorResumo | null;
  pode_criar_solicitacao_compra?: boolean;
  modulos_habilitados?: ModulosHabilitados;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiPaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface ObraOption {
  id: number;
  nome: string;
  codigo?: string;
}

export interface TipoSolicitacaoOption {
  id: number;
  nome: string;
  ativo?: boolean;
}

export interface SetorOption {
  id?: number | string;
  nome: string;
  codigo?: string;
  ativo?: boolean;
}

export interface TipoSubContratoOption {
  id: number;
  nome: string;
}

export interface ContratoOption {
  id: number;
  codigo?: string | null;
  ref_contrato?: string | null;
}

export interface ApropriacaoOption {
  id: number;
  codigo?: string | null;
  descricao?: string | null;
}

export interface AreasObraConfig {
  areas?: string[];
}

export interface AreasPorSetorOrigemConfig {
  regras?: Record<string, string[]>;
}

export interface TiposSolicitacaoPorSetorRegra {
  tipos?: number[];
  modos?: Record<string, string>;
}

export interface TiposSolicitacaoPorSetorConfig {
  regras?: Record<string, TiposSolicitacaoPorSetorRegra>;
}

export interface SolicitacaoListItem {
  id: number;
  codigo: string;
  descricao?: string | null;
  status_global?: string | null;
  area_responsavel?: string | null;
  setor_status_atual?: string | null;
  responsavel?: string | null;
  valor?: number | string | null;
  data_vencimento?: string | null;
  createdAt?: string | null;
  obra_id?: number | null;
  obra?: ObraOption | null;
  tipo?: TipoSolicitacaoOption | null;
  parceiro?: ParceiroResumo | null;
}

export interface HistoricoUsuario {
  id: number;
  nome: string;
}

export interface HistoricoItem {
  id: number;
  acao?: string | null;
  descricao?: string | null;
  observacao?: string | null;
  metadata?: string | null;
  setor?: string | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  createdAt?: string | null;
  usuario?: HistoricoUsuario | null;
}

export interface ParceiroResumo {
  id?: number;
  nome?: string | null;
  cpf_cnpj?: string | null;
  telefone?: string | null;
  email?: string | null;
}

export interface ParceiroCategoriaOption {
  id: number;
  nome: string;
}

export interface ContratoResumo {
  id?: number;
  codigo?: string | null;
  ref_contrato?: string | null;
}

export interface ApropriacaoResumo {
  id?: number;
  codigo?: string | null;
  descricao?: string | null;
}

export interface SolicitacaoDetalhe extends SolicitacaoListItem {
  parceiro?: ParceiroResumo | null;
  contrato?: ContratoResumo | null;
  apropriacao?: ApropriacaoResumo | null;
  tipoSubSolicitacao?: TipoSolicitacaoOption | null;
  historicos?: HistoricoItem[];
  codigo_contrato?: string | null;
}

export interface CreateSolicitacaoPayload {
  obra_id: number;
  tipo_solicitacao_id: number;
  area_responsavel: string;
  descricao: string;
  data_vencimento: string;
  valor?: number;
  tipo_sub_id?: number;
  contrato_id?: number;
  codigo_contrato?: string;
  apropriacao_id?: number;
  parceiro_id?: number;
  ref_contrato_abertura?: string;
  itens_apropriacao?: string;
  data_inicio_medicao?: string;
  data_fim_medicao?: string;
}

export interface AddComentarioPayload {
  descricao: string;
  mencoes?: number[];
}

export interface MobileUploadAsset {
  uri: string;
  name: string;
  type: string;
}

export type ResumoSolicitacoes = Record<string, Record<string, number>>;

export interface ProvisionamentoPermissoes {
  superadmin: boolean;
  pode_acessar: boolean;
  pode_criar: boolean;
  pode_aprovar: boolean;
  pode_dashboard_global: boolean;
  obras_acesso: number[] | null;
  obras_criacao: number[] | null;
  obras_aprovacao: number[] | null;
}

export interface ProvisionamentoContexto {
  modulo: string;
  permissoes: ProvisionamentoPermissoes;
  status_disponiveis: string[];
  prioridades_disponiveis: string[];
  obras_acesso: ObraOption[];
  obras_criacao: ObraOption[];
  criadores_filtro: UsuarioPublicoOption[];
}

export interface ProvisionamentoCategoriaOption {
  id: number;
  nome: string;
  ativo?: boolean;
}

export interface ProvisionamentoUsuarioResumo {
  id: number;
  nome: string;
  email?: string | null;
  perfil?: string | null;
}

export interface ProvisionamentoHistoricoItem {
  id: number;
  acao?: string | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  descricao?: string | null;
  comentario?: string | null;
  createdAt?: string | null;
  usuario?: ProvisionamentoUsuarioResumo | null;
}

export interface ProvisionamentoAnexoItem {
  id: number;
  nome_original?: string | null;
  caminho_arquivo?: string | null;
  tipo?: string | null;
  createdAt?: string | null;
  uploadUser?: ProvisionamentoUsuarioResumo | null;
}

export interface ProvisionamentoListItem {
  id: number;
  codigo: string;
  obra_id: number;
  categoria_macro_id: number;
  descricao?: string | null;
  fornecedor_texto?: string | null;
  data_prevista_desembolso?: string | null;
  valor_previsto?: number | string | null;
  comentario?: string | null;
  status?: string | null;
  prioridade?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  obra?: ObraOption | null;
  categoriaMacro?: ProvisionamentoCategoriaOption | null;
  usuarioCriacao?: ProvisionamentoUsuarioResumo | null;
}

export interface ProvisionamentoDetalhe extends ProvisionamentoListItem {
  usuarioAtualizacao?: ProvisionamentoUsuarioResumo | null;
  aprovadoPor?: ProvisionamentoUsuarioResumo | null;
  canceladoPor?: ProvisionamentoUsuarioResumo | null;
  aprovado_em?: string | null;
  cancelado_em?: string | null;
  realizado_em?: string | null;
  historicos?: ProvisionamentoHistoricoItem[];
  anexos?: ProvisionamentoAnexoItem[];
}

export interface ProvisionamentoResumoListagem {
  total_registros_filtrados: number;
  valor_total_filtrado: number;
}

export interface ProvisionamentoPaginatedResponse {
  items: ProvisionamentoListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  resumo: ProvisionamentoResumoListagem;
}

export interface DashboardProvisionamentoResumo {
  escopo: {
    global: boolean;
    obras_restritas: number | null;
  };
  periodo: {
    data_inicial?: string | null;
    data_final?: string | null;
  };
  cards: {
    total_periodo: number;
    total_proximos_7_dias: number;
    total_proximos_30_dias: number;
    quantidade_abertas: number;
  };
  graficos: {
    por_mes: Array<{ mes: string; total_valor: number; quantidade: number }>;
    por_obra: Array<{ obra_id: number; total_valor: number; quantidade: number; obra?: ObraOption | null }>;
    por_categoria: Array<{ categoria_macro_id: number; total_valor: number; quantidade: number; categoria?: ProvisionamentoCategoriaOption | null }>;
    curva_semanal: Array<{ semana_inicio: string; semana_label: string; total_valor: number; quantidade: number }>;
    pipeline_status: Array<{ status: string; total_valor: number; quantidade: number }>;
  };
  alertas: {
    vencidas_nao_tratadas: {
      quantidade: number;
      itens: ProvisionamentoListItem[];
    };
    itens_criticos_proximos: {
      quantidade: number;
      itens: ProvisionamentoListItem[];
    };
    obras_concentracao_alta: Array<{
      obra_id: number;
      total_valor: number;
      percentual: number;
      quantidade: number;
      obra?: ObraOption | null;
    }>;
  };
}
