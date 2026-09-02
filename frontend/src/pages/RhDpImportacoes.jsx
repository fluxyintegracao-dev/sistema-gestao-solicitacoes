import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineEye } from 'react-icons/hi2';
import { CelulaDupla, TabelaPadrao } from '../components/padrao';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import {
  confirmarRhImportacao,
  criarPreviewRhImportacao,
  getRhEmpresasGrupo,
  getRhImportacao,
  getRhImportacoes
} from '../services/rhDp';
import { canExecuteRhDpImportacoes } from '../utils/acessoProduto';

const TIPOS_IMPORTACAO = [
  { value: 'JORNADA', label: 'Jornada' },
  { value: 'EVENTO_VARIAVEL', label: 'Evento variavel' },
  { value: 'DESCONTO', label: 'Desconto' }
];

const IMPORTACAO_PAYLOAD_COLUMNS = {
  JORNADA: [
    { key: 'dias_trabalhados', label: 'Dias trabalhados' },
    { key: 'faltas', label: 'Faltas' },
    { key: 'horas_extras', label: 'Horas extras' },
    { key: 'adicionais', label: 'Adicionais' },
    { key: 'descontos_informados', label: 'Descontos' },
    { key: 'valor_informado', label: 'Valor informado' },
    { key: 'observacoes', label: 'Observacoes' }
  ],
  EVENTO_VARIAVEL: [
    { key: 'codigo_evento', label: 'Codigo' },
    { key: 'descricao_evento', label: 'Descricao' },
    { key: 'natureza', label: 'Natureza' },
    { key: 'valor', label: 'Valor' },
    { key: 'referencia', label: 'Referencia' },
    { key: 'observacoes', label: 'Observacoes' }
  ],
  DESCONTO: [
    { key: 'codigo_evento', label: 'Codigo' },
    { key: 'descricao_evento', label: 'Descricao' },
    { key: 'valor', label: 'Valor' },
    { key: 'referencia', label: 'Referencia' },
    { key: 'observacoes', label: 'Observacoes' }
  ]
};

// R17 — as colunas do PREVIEW mudam com o tipo do arquivo importado
// (jornada, evento variavel, desconto). O papel de cada uma é derivado do
// nome do campo, aqui no ponto de uso, para que nenhuma coluna gerada chegue
// à tabela sem `tipo` (a medida e o alinhamento saem dele).
const REGRAS_TIPO_PAYLOAD = [
  [/(observ|descricao|referencia)/i, 'texto'],
  [/natureza/i, 'badge'],
  [/^codigo/i, 'codigo'],
  [/(valor|adicionais|descontos)/i, 'valor'],
  [/(dias|faltas|horas|quantidade)/i, 'numero']
];

function tipoDaColunaPayload(chave) {
  const regra = REGRAS_TIPO_PAYLOAD.find(([padrao]) => padrao.test(chave));
  return regra ? regra[1] : 'texto';
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function formatPayloadValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return value.toLocaleString('pt-BR');
  return String(value);
}

function firstFilled(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== '') || '-';
}

function getLinhaColaboradorCodigo(linha) {
  const payload = linha?.payload_json || {};

  return firstFilled(
    linha?.matricula_ref,
    linha?.codigo_ref,
    payload.matricula,
    payload.Matricula,
    payload.codigo_colaborador,
    payload.Codigo_Colaborador,
    payload.codigo,
    payload.Codigo,
    linha?.colaborador?.matricula,
    linha?.colaborador?.codigo,
    linha?.cpf_ref,
    payload.cpf,
    payload.CPF
  );
}

function getLinhaColaboradorNome(linha) {
  const payload = linha?.payload_json || {};

  return firstFilled(
    linha?.colaborador?.nome,
    linha?.nome_ref,
    payload.nome_colaborador,
    payload.Nome_Colaborador,
    payload.nome,
    payload.Nome
  );
}

function buildTemplateRows(tipo) {
  if (tipo === 'JORNADA') {
    return [
      ['Matricula', 'CPF', 'Dias_Trabalhados', 'Faltas', 'Horas_Extras', 'Adicionais', 'Descontos_Informados', 'Valor_Informado', 'Observacoes'],
      ['MAT-001', '12345678909', '22', '0', '8', '250,00', '0,00', '', 'Competencia regular']
    ];
  }

  if (tipo === 'EVENTO_VARIAVEL') {
    return [
      ['Matricula', 'CPF', 'Codigo_Evento', 'Descricao_Evento', 'Natureza', 'Valor', 'Referencia', 'Observacoes'],
      ['MAT-001', '12345678909', 'HE50', 'Hora extra 50%', 'CREDITO', '480,00', 'Abril/2026', 'Lote complementar']
    ];
  }

  return [
    ['Matricula', 'CPF', 'Codigo_Evento', 'Descricao_Evento', 'Valor', 'Referencia', 'Observacoes'],
    ['MAT-001', '12345678909', 'DESC-ADIANT', 'Desconto de adiantamento', '300,00', 'Abril/2026', 'Importado pela contabilidade']
  ];
}

function downloadTemplate(tipo) {
  const rows = buildTemplateRows(tipo);
  const csv = rows
    .map((cols) => cols.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modelo-rh-importacao-${tipo.toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export default function RhDpImportacoes() {
  const { user } = useAuth();
  const podeEditar = canExecuteRhDpImportacoes(user);
  const [carregandoBase, setCarregandoBase] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [gerandoPreview, setGerandoPreview] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [importacoes, setImportacoes] = useState([]);
  const [detalhe, setDetalhe] = useState(null);

  // Colunas do preview vindas do arquivo: id/titulo do catalogo, papel
  // derivado do nome do campo (ver REGRAS_TIPO_PAYLOAD).
  const colunasPayload = useMemo(
    () => (IMPORTACAO_PAYLOAD_COLUMNS[detalhe?.tipo] || []).map((column) => ({
      id: column.key,
      titulo: column.label,
      tipo: tipoDaColunaPayload(column.key),
      render: (linha) => formatPayloadValue(linha.payload_json?.[column.key])
    })),
    [detalhe]
  );
  const [filtros, setFiltros] = useState({
    tipo: '',
    competencia: '',
    empresa_grupo_id: '',
    obra_id: '',
    tipo_vinculo: '',
    status: ''
  });
  const [form, setForm] = useState({
    tipo: 'JORNADA',
    competencia: '',
    obra_id: '',
    tipo_vinculo: '',
    observacoes: ''
  });

  useEffect(() => {
    carregarBase();
  }, []);

  async function carregarBase() {
    try {
      setCarregandoBase(true);
      const [listaEmpresas, listaObras] = await Promise.all([
        getRhEmpresasGrupo({ ativo: true }),
        getObras()
      ]);

      setEmpresas(Array.isArray(listaEmpresas) ? listaEmpresas : []);
      setObras(Array.isArray(listaObras) ? listaObras : []);
      await carregarImportacoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar base de importacoes RH/DP');
    } finally {
      setCarregandoBase(false);
    }
  }

  async function carregarImportacoes() {
    try {
      setCarregandoLista(true);
      const data = await getRhImportacoes({
        tipo: filtros.tipo || undefined,
        competencia: filtros.competencia || undefined,
        empresa_grupo_id: filtros.empresa_grupo_id || undefined,
        obra_id: filtros.obra_id || undefined,
        tipo_vinculo: filtros.tipo_vinculo || undefined,
        status: filtros.status || undefined
      });

      setImportacoes(Array.isArray(data) ? data : []);
    } finally {
      setCarregandoLista(false);
    }
  }

  async function selecionarImportacao(id) {
    try {
      const data = await getRhImportacao(id);
      setDetalhe(data);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar detalhe da importacao RH/DP');
    }
  }

  async function aplicarFiltros() {
    try {
      await carregarImportacoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao filtrar importacoes RH/DP');
    }
  }

  async function onSelecionarArquivo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;
    if (!form.competencia || !form.tipo || !form.obra_id) {
      alert('Preencha tipo, competencia e obra antes de subir a planilha.');
      return;
    }

    try {
      setGerandoPreview(true);
      const data = await criarPreviewRhImportacao({
        tipo: form.tipo,
        competencia: form.competencia,
        obra_id: form.obra_id,
        tipo_vinculo: form.tipo_vinculo || undefined,
        observacoes: form.observacoes || undefined,
        file
      });

      await carregarImportacoes();
      setDetalhe(data);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao gerar preview da importacao RH/DP');
    } finally {
      setGerandoPreview(false);
    }
  }

  async function confirmarImportacao() {
    if (!detalhe?.id || detalhe?.status !== 'PREVIEW') {
      return;
    }

    if (!window.confirm('Confirmar esta importacao e congelar as linhas validas para os proximos blocos do RH/DP?')) {
      return;
    }

    try {
      setConfirmando(true);
      const atualizado = await confirmarRhImportacao(detalhe.id);
      setDetalhe(atualizado);
      await carregarImportacoes();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao confirmar importacao RH/DP');
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="page solicitacoes-page rhdp-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP - Importacoes</h1>
            <p className="page-subtitle">
              Upload de jornadas, eventos variaveis e descontos com preview persistido, validacao por linha e confirmacao explicita.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">
              Voltar ao RH/DP
            </Link>
            <Link to="/rh-dp/colaboradores" className="btn btn-outline">
              Colaboradores
            </Link>
          </div>
        </div>
      </div>

      <div className="sol-surface-card rounded-xl p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select
            className="form-control"
            value={form.tipo}
            onChange={(e) => setForm((prev) => ({ ...prev, tipo: e.target.value }))}
            disabled={!podeEditar}
          >
            {TIPOS_IMPORTACAO.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            type="month"
            className="form-control"
            value={form.competencia}
            onChange={(e) => setForm((prev) => ({ ...prev, competencia: e.target.value }))}
            disabled={!podeEditar}
          />
          <select
            className="form-control"
            value={form.obra_id}
            onChange={(e) => setForm((prev) => ({ ...prev, obra_id: e.target.value }))}
            disabled={!podeEditar}
            required
          >
            <option value="">Selecione a obra obrigatoria</option>
            {obras.map((item) => (
              <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={form.tipo_vinculo}
            onChange={(e) => setForm((prev) => ({ ...prev, tipo_vinculo: e.target.value }))}
            disabled={!podeEditar}
          >
            <option value="">Todos os vinculos</option>
            <option value="CLT">CLT</option>
            <option value="NAO_CLT">Nao CLT</option>
          </select>
          <textarea
            className="form-control min-h-[84px]"
            placeholder="Observacoes do lote"
            value={form.observacoes}
            onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
            disabled={!podeEditar}
          />
        </div>

        <div className="app-page-actions">
          {TIPOS_IMPORTACAO.map((item) => (
            <button key={item.value} type="button" className="btn btn-outline" onClick={() => downloadTemplate(item.value)}>
              Modelo {item.label}
            </button>
          ))}
          {podeEditar && (
            <label className={`btn btn-primary cursor-pointer ${gerandoPreview ? 'opacity-60 pointer-events-none' : ''}`}>
              {gerandoPreview ? 'Gerando preview...' : 'Selecionar planilha'}
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={onSelecionarArquivo}
                disabled={gerandoPreview}
              />
            </label>
          )}
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rounded-xl p-3 md:p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <select
            className="form-control"
            value={filtros.tipo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipo: e.target.value }))}
          >
            <option value="">Todos os tipos</option>
            {TIPOS_IMPORTACAO.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input
            type="month"
            className="form-control"
            value={filtros.competencia}
            onChange={(e) => setFiltros((prev) => ({ ...prev, competencia: e.target.value }))}
          />
          <select
            className="form-control"
            value={filtros.empresa_grupo_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, empresa_grupo_id: e.target.value }))}
          >
            <option value="">Todas as empresas</option>
            {empresas.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={filtros.obra_id}
            onChange={(e) => setFiltros((prev) => ({ ...prev, obra_id: e.target.value }))}
          >
            <option value="">Todas as obras</option>
            {obras.map((item) => (
              <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
            ))}
          </select>
          <select
            className="form-control"
            value={filtros.tipo_vinculo}
            onChange={(e) => setFiltros((prev) => ({ ...prev, tipo_vinculo: e.target.value }))}
          >
            <option value="">Todos os vinculos</option>
            <option value="CLT">CLT</option>
            <option value="NAO_CLT">Nao CLT</option>
          </select>
          <select
            className="form-control"
            value={filtros.status}
            onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Todos os status</option>
            <option value="PREVIEW">Preview</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div className="app-page-actions">
          <button type="button" className="btn btn-outline" onClick={aplicarFiltros} disabled={carregandoLista}>
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="rhdp-importacoes-workspace">
        <div className="card sol-surface-card rhdp-importacoes-list-card">
          <TabelaPadrao
            colunas={[
              {
                id: 'lote',
                titulo: 'Lote',
                // R17: o lote é nomeado pelo arquivo enviado (o numero sozinho
                // nao diz a quem procura o envio que deu errado).
                tipo: 'identidade',
                noCard: 'titulo',
                render: (item) => (
                  <CelulaDupla
                    principal={`#${item.id} · ${item.tipo}`}
                    sub={item.nome_arquivo || '-'}
                  />
                )
              },
              {
                id: 'competencia',
                titulo: 'Competencia',
                tipo: 'codigo',
                ordenavel: true,
                valorOrdenacao: (item) => String(item.competencia || ''),
                render: (item) => item.competencia
              },
              {
                id: 'obra',
                titulo: 'Obra',
                tipo: 'texto',
                render: (item) => (item.obra?.codigo
                  ? `${item.obra.codigo} - ${item.obra.nome}`
                  : item.obra?.nome || '-')
              },
              {
                id: 'status',
                titulo: 'Status',
                tipo: 'status',
                render: (item) => item.status
              },
              {
                id: 'resultado',
                titulo: 'Resultado',
                tipo: 'texto',
                render: (item) => `${item.total_validas || 0} valida(s) · ${item.total_erros || 0} erro(s)`
              }
            ]}
            itens={importacoes}
            storageKey="tabela:rh-dp-importacoes:lotes"
            rotuloRolagem="Lotes de importacao RH/DP"
            carregando={carregandoBase || carregandoLista}
            vazio="Nenhuma importacao RH/DP localizada"
            linhaSelecionada={(item) => Number(detalhe?.id) === Number(item.id)}
            urgencia={(item) => (Number(item.total_erros || 0) > 0 ? 'danger' : null)}
            acoesLinha={(item) => (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => selecionarImportacao(item.id)}
                title="Ver preview"
                aria-label={`Ver preview da importacao ${item.id}`}
              >
                <HiOutlineEye aria-hidden="true" />
              </button>
            )}
            larguraAcoes={120}
          />
        </div>

        <div className="sol-surface-card rounded-xl p-4 space-y-4 rhdp-importacoes-detail-card">
          {!detalhe ? (
            <div className="text-sm text-slate-500">
              Selecione uma importacao para ver o preview persistido, os erros de linha e a confirmacao.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Importacao #{detalhe.id} - {detalhe.tipo}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Competencia {detalhe.competencia} · {detalhe.obra?.codigo ? `${detalhe.obra.codigo} - ${detalhe.obra.nome}` : detalhe.obra?.nome || 'obra nao informada'} · {detalhe.status}
                  </p>
                </div>
                <div className="app-page-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setDetalhe(null)}>
                    Voltar para lista
                  </button>
                  {podeEditar && detalhe.status === 'PREVIEW' && (
                    <button type="button" className="btn btn-primary" onClick={confirmarImportacao} disabled={confirmando}>
                      {confirmando ? 'Confirmando...' : 'Confirmar importacao'}
                    </button>
                  )}
                </div>
              </div>

              <div className="rhdp-importacao-summary-grid">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Linhas</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{detalhe.total_linhas || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Validas</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{detalhe.total_validas || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Erros</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{detalhe.total_erros || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Criado em</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(detalhe.createdAt)}</div>
                </div>
              </div>

              {detalhe.observacoes && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  {detalhe.observacoes}
                </div>
              )}

              <TabelaPadrao
                colunas={[
                  {
                    id: 'numero_linha',
                    titulo: 'Linha',
                    tipo: 'codigo',
                    render: (linha) => linha.numero_linha
                  },
                  {
                    id: 'codigo_ref',
                    titulo: 'Codigo/matricula',
                    tipo: 'codigo',
                    render: (linha) => getLinhaColaboradorCodigo(linha)
                  },
                  {
                    id: 'colaborador',
                    titulo: 'Colaborador',
                    // R17: a linha do preview é de um COLABORADOR nomeado.
                    tipo: 'identidade',
                    noCard: 'titulo',
                    render: (linha) => getLinhaColaboradorNome(linha)
                  },
                  {
                    id: 'status',
                    titulo: 'Status',
                    tipo: 'status',
                    render: (linha) => linha.status
                  },
                  // Colunas VINDAS DO ARQUIVO importado: o papel de cada uma é
                  // derivado aqui, no ponto de uso, para que nenhuma coluna
                  // chegue à tabela sem `tipo`.
                  ...colunasPayload,
                  {
                    id: 'erro',
                    titulo: 'Erro',
                    tipo: 'texto',
                    render: (linha) => (linha.erro_mensagem
                      ? <span className="text-rose-700">{`Linha ${linha.numero_linha}: ${linha.erro_mensagem}`}</span>
                      : '-')
                  }
                ]}
                itens={detalhe.linhas || []}
                storageKey="tabela:rh-dp-importacoes:preview"
                rotuloRolagem="Linhas do preview da importacao"
                vazio="Sem linhas registradas"
                urgencia={(linha) => (linha.erro_mensagem ? 'danger' : null)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
