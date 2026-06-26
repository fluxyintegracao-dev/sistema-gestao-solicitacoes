export type ModulosHabilitados = Record<string, boolean>;

export interface SetorResumo {
  id?: number | string;
  nome?: string;
  codigo?: string;
  eh_setor_obra?: boolean;
  eh_setor_financeiro?: boolean;
  eh_setor_compras?: boolean;
  eh_setor_geo?: boolean;
  eh_setor_administrativo?: boolean;
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
  mfa_totp_enabled?: boolean;
  mfa_required_by_policy?: boolean;
  mfa_setup_pending?: boolean;
}

export interface AuthSession {
  token: string;
  session_expires_at?: number | null;
  user: AuthUser;
}

export interface AuthMfaChallenge {
  mfa_required: true;
  challenge_token: string;
  user: AuthUser;
}

export type AuthLoginResponse = AuthSession | AuthMfaChallenge;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  pages?: number;
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
  codigo_interno?: string | null;
  comportamento?: Record<string, boolean> | string | null;
  ativo?: boolean;
}

export interface SetorOption {
  id?: number | string;
  nome: string;
  codigo?: string;
  ativo?: boolean;
  eh_setor_obra?: boolean;
  eh_setor_financeiro?: boolean;
  eh_setor_compras?: boolean;
  eh_setor_geo?: boolean;
  eh_setor_administrativo?: boolean;
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
  superadmin?: boolean;
  pode_acessar?: boolean;
  pode_criar?: boolean;
  pode_aprovar?: boolean;
  pode_dashboard_global?: boolean;
}

export interface ProvisionamentoCategoriaOption {
  id: number;
  nome: string;
}

export interface ProvisionamentoContexto {
  permissoes?: ProvisionamentoPermissoes;
  obras_criacao?: ObraOption[];
  obras_acesso?: ObraOption[];
  criadores_filtro?: UsuarioPublicoOption[];
  status_disponiveis?: string[];
  prioridades_disponiveis?: string[];
}

export interface ProvisionamentoUsuarioResumo {
  id?: number;
  nome?: string | null;
  email?: string | null;
}

export interface ProvisionamentoAnexoItem {
  id: number;
  nome_original?: string | null;
  caminho_arquivo?: string | null;
  createdAt?: string | null;
}

export interface ProvisionamentoHistoricoItem {
  id: number;
  acao?: string | null;
  descricao?: string | null;
  comentario?: string | null;
  status_anterior?: string | null;
  status_novo?: string | null;
  createdAt?: string | null;
  usuario?: ProvisionamentoUsuarioResumo | null;
}

export interface ProvisionamentoListItem {
  id: number;
  codigo?: string | null;
  descricao?: string | null;
  status?: string | null;
  prioridade?: string | null;
  valor_previsto?: number | string | null;
  data_prevista_desembolso?: string | null;
  fornecedor_texto?: string | null;
  comentario?: string | null;
  createdAt?: string | null;
  categoriaMacro?: ProvisionamentoCategoriaOption | null;
  obra?: ObraOption | null;
  usuarioCriacao?: ProvisionamentoUsuarioResumo | null;
  usuarioAtualizacao?: ProvisionamentoUsuarioResumo | null;
  aprovadoPor?: ProvisionamentoUsuarioResumo | null;
  canceladoPor?: ProvisionamentoUsuarioResumo | null;
}

export interface ProvisionamentoDetalhe extends ProvisionamentoListItem {
  aprovado_em?: string | null;
  cancelado_em?: string | null;
  realizado_em?: string | null;
  historicos?: ProvisionamentoHistoricoItem[];
  anexos?: ProvisionamentoAnexoItem[];
}

export interface ProvisionamentoPaginatedResponse extends ApiPaginatedResponse<ProvisionamentoListItem> {
  resumo?: {
    valor_total_filtrado?: number | string | null;
    total_registros_filtrados?: number | string | null;
  };
}

export interface DashboardProvisionamentoResumo {
  cards: {
    total_periodo: number | string;
    total_proximos_7_dias: number | string;
    total_proximos_30_dias: number | string;
    quantidade_abertas: number | string;
  };
  graficos: {
    pipeline_status: Array<{
      status: string;
      quantidade: number | string;
      total_valor: number | string;
    }>;
    por_obra: Array<{
      obra_id: number | string;
      quantidade: number | string;
      total_valor: number | string;
      obra?: ObraOption | null;
    }>;
    por_categoria: Array<{
      categoria_macro_id: number | string;
      quantidade: number | string;
      total_valor: number | string;
      categoria?: ProvisionamentoCategoriaOption | null;
    }>;
  };
  alertas: {
    vencidas_nao_tratadas: {
      quantidade: number | string;
    };
    itens_criticos_proximos: {
      quantidade: number | string;
    };
    obras_concentracao_alta: Array<{
      obra_id: number | string;
      percentual: number | string;
      total_valor: number | string;
      obra?: ObraOption | null;
    }>;
  };
}
