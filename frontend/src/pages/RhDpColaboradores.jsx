import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { HiOutlineEye, HiOutlinePencilSquare } from 'react-icons/hi2';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import {
  criarRhColaborador,
  atualizarRhColaborador,
  getRhColaborador,
  getRhColaboradores,
  getRhDocumentoLink,
  getRhDocumentos,
  getRhDocumentoTipos,
  getRhEmpresasGrupo,
  importarRhColaboradores,
  substituirRhDocumento,
  uploadRhDocumento
} from '../services/rhDp';
import { getSetores } from '../services/setores';
import {
  canManageRhDpColaboradores,
  canManageRhDpDocumentos
} from '../utils/acessoProduto';
import { formatCurrencyInput, maskCpfCnpj, maskPhone, normalizeCurrencyTyping, onlyDigits } from '../utils/formatters';

function emptyForm() {
  return {
    id: null,
    empresa_grupo_id: '',
    obra_id: '',
    setor_id: '',
    nome: '',
    cpf: '',
    matricula: '',
    rg: '',
    telefone: '',
    email: '',
    cargo: '',
    tipo_vinculo: 'CLT',
    data_inicio: '',
    data_admissao: '',
    data_demissao: '',
    data_nascimento: '',
    status: 'ATIVO',
    salario_base: '',
    valor_contratual: '',
    observacoes: '',
    pagamento: {
      favorecido_nome: '',
      favorecido_documento: '',
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: '',
      chave_pix: '',
      chave_pix_secundaria: '',
      chave_pix_variavel: '',
      observacoes: ''
    }
  };
}

function formatCpf(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return value || '-';
}

const RH_COLABORADORES_COLUMNS = [
  { key: 'nome', width: 220, minWidth: 170 },
  { key: 'matricula', width: 130, minWidth: 110 },
  { key: 'cpf', width: 150, minWidth: 130 },
  { key: 'empresa', width: 240, minWidth: 180 },
  { key: 'obra', width: 210, minWidth: 150 },
  { key: 'vinculo', width: 140, minWidth: 110 },
  { key: 'status', width: 130, minWidth: 100 },
  { key: 'acoes', width: 92, minWidth: 76 }
];

const RH_COLABORADORES_FILTROS_INICIAIS = {
  q: '',
  empresa_grupo_id: '',
  obra_id: '',
  tipo_vinculo: '',
  status: ''
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function validadeLabel(status) {
  switch (status) {
    case 'VENCIDO':
      return 'Vencido';
    case 'A_VENCER':
      return 'A vencer';
    case 'VALIDO':
      return 'Valido';
    default:
      return 'Sem validade';
  }
}

function toFormData(data) {
  return {
    id: data?.id || null,
    empresa_grupo_id: data?.empresa_grupo_id ? String(data.empresa_grupo_id) : '',
    obra_id: data?.obra_id ? String(data.obra_id) : '',
    setor_id: data?.setor_id ? String(data.setor_id) : '',
    nome: data?.nome || '',
    cpf: maskCpfCnpj(data?.cpf),
    matricula: data?.matricula || '',
    rg: data?.rg || '',
    telefone: maskPhone(data?.telefone),
    email: data?.email || '',
    cargo: data?.cargo || '',
    tipo_vinculo: data?.tipo_vinculo || 'CLT',
    data_inicio: data?.data_inicio || data?.data_admissao || '',
    data_admissao: data?.data_admissao || data?.data_inicio || '',
    data_demissao: data?.data_demissao || '',
    data_nascimento: data?.data_nascimento || '',
    status: data?.status || 'ATIVO',
    salario_base: formatCurrencyInput(data?.salario_base),
    valor_contratual: formatCurrencyInput(data?.valor_contratual),
    observacoes: data?.observacoes || '',
    pagamento: {
      favorecido_nome: data?.pagamento?.favorecido_nome || '',
      favorecido_documento: maskCpfCnpj(data?.pagamento?.favorecido_documento),
      banco: data?.pagamento?.banco || '',
      agencia: data?.pagamento?.agencia || '',
      conta: data?.pagamento?.conta || '',
      tipo_conta: data?.pagamento?.tipo_conta || '',
      chave_pix: data?.pagamento?.chave_pix || '',
      chave_pix_secundaria: data?.pagamento?.chave_pix_secundaria || '',
      chave_pix_variavel: data?.pagamento?.chave_pix_variavel || '',
      observacoes: data?.pagamento?.observacoes || ''
    }
  };
}

function buildPayload(form) {
  return {
    empresa_grupo_id: Number(form.empresa_grupo_id),
    obra_id: form.obra_id ? Number(form.obra_id) : undefined,
    setor_id: form.setor_id ? Number(form.setor_id) : undefined,
    nome: form.nome,
    cpf: onlyDigits(form.cpf),
    matricula: form.matricula || undefined,
    rg: form.rg || undefined,
    telefone: onlyDigits(form.telefone) || undefined,
    email: form.email || undefined,
    cargo: form.cargo || undefined,
    tipo_vinculo: form.tipo_vinculo,
    data_inicio: form.data_admissao || undefined,
    data_admissao: form.data_admissao || undefined,
    data_demissao: form.data_demissao || undefined,
    data_nascimento: form.data_nascimento || undefined,
    status: form.status,
    salario_base: form.salario_base === '' ? undefined : form.salario_base,
    valor_contratual: form.valor_contratual === '' ? undefined : form.valor_contratual,
    observacoes: form.observacoes || undefined,
    pagamento: {
      favorecido_nome: form.pagamento.favorecido_nome || undefined,
      favorecido_documento: onlyDigits(form.pagamento.favorecido_documento) || undefined,
      banco: form.pagamento.banco || undefined,
      agencia: form.pagamento.agencia || undefined,
      conta: form.pagamento.conta || undefined,
      tipo_conta: form.pagamento.tipo_conta || undefined,
      chave_pix: form.pagamento.chave_pix || undefined,
      chave_pix_secundaria: form.pagamento.chave_pix_secundaria || undefined,
      chave_pix_variavel: form.pagamento.chave_pix_variavel || undefined,
      observacoes: form.pagamento.observacoes || undefined
    }
  };
}

function downloadModeloColaboradores() {
  const linhas = [
    [
      'Nome',
      'CPF',
      'Matricula',
      'Empresa_Codigo',
      'Obra_Codigo',
      'Setor_Codigo',
      'Cargo',
      'Tipo_Vinculo',
      'Data_Admissao',
      'Data_Demissao',
      'Status',
      'Salario_Base',
      'Valor_Contratual',
      'Banco',
      'Agencia',
      'Conta',
      'Tipo_Conta',
      'Favorecido_Nome',
      'Favorecido_Documento',
      'Chave_PIX',
      'Chave_PIX_Secundaria',
      'Chave_PIX_Variavel',
      'Telefone',
      'Email',
      'Observacoes'
    ],
    [
      'Colaborador Exemplo',
      '12345678909',
      'MAT-001',
      'EMP-01',
      'OBRA-01',
      'FIN',
      'Analista',
      'CLT',
      '2026-04-01',
      '',
      'ATIVO',
      '3500,00',
      '',
      'Banco Exemplo',
      '1234',
      '98765-0',
      'CORRENTE',
      'Colaborador Exemplo',
      '12345678909',
      'colaborador@pix',
      '27999999999',
      '',
      '27999999999',
      'colaborador@empresa.com',
      'Importacao inicial RH/DP'
    ]
  ];

  const csv = linhas
    .map((colunas) => colunas.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'))
    .join('\r\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'modelo-importacao-rh-colaboradores.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export default function RhDpColaboradores() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const podeEditar = canManageRhDpColaboradores(user);
  const podeGerirDocumentos = canManageRhDpDocumentos(user);
  const [colaboradores, setColaboradores] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [obras, setObras] = useState([]);
  const [setores, setSetores] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [carregandoDocumentos, setCarregandoDocumentos] = useState(false);
  const [salvandoDocumento, setSalvandoDocumento] = useState(false);
  const [substituindoDocumentoId, setSubstituindoDocumentoId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [tiposDocumento, setTiposDocumento] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [resumoDocumentos, setResumoDocumentos] = useState(null);
  const [filtros, setFiltros] = useState(RH_COLABORADORES_FILTROS_INICIAIS);
  const [filtrosDocumentos, setFiltrosDocumentos] = useState({
    q: '',
    tipo_documento_id: '',
    status: '',
    validade_status: '',
    incluir_historico: false
  });
  const [novoDocumento, setNovoDocumento] = useState({
    tipo_documento_id: '',
    validade: '',
    status: 'ENVIADO',
    observacoes: ''
  });

  function syncColaboradorNaQuery(colaboradorId) {
    const next = new URLSearchParams(searchParams);
    if (colaboradorId) {
      next.set('colaborador_id', String(colaboradorId));
    } else {
      next.delete('colaborador_id');
    }
    setSearchParams(next);
  }

  useEffect(() => {
    carregarBase();
  }, []);

  useEffect(() => {
    if (!form.id) {
      setTiposDocumento([]);
      setDocumentos([]);
      setResumoDocumentos(null);
      return;
    }

    carregarDocumentosColaborador(form.id).catch((error) => {
      console.error(error);
      alert(error?.message || 'Erro ao carregar documentos do colaborador');
    });
  }, [
    form.id,
    filtrosDocumentos.incluir_historico,
    filtrosDocumentos.q,
    filtrosDocumentos.status,
    filtrosDocumentos.tipo_documento_id,
    filtrosDocumentos.validade_status
  ]);

  async function carregarBase() {
    try {
      setCarregando(true);
      const [listaEmpresas, listaObras, listaSetores] = await Promise.all([
        getRhEmpresasGrupo({ ativo: true }),
        getObras(),
        getSetores()
      ]);

      setEmpresas(Array.isArray(listaEmpresas) ? listaEmpresas : []);
      setObras(Array.isArray(listaObras) ? listaObras : []);
      setSetores(Array.isArray(listaSetores) ? listaSetores : []);
      await carregarColaboradores();

      const colaboradorId = Number(searchParams.get('colaborador_id'));
      if (Number.isInteger(colaboradorId) && colaboradorId > 0) {
        await abrirColaborador(colaboradorId, { syncQuery: false });
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar base RH/DP');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarColaboradores() {
    const data = await getRhColaboradores({
      q: filtros.q || undefined,
      empresa_grupo_id: filtros.empresa_grupo_id || undefined,
      obra_id: filtros.obra_id || undefined,
      tipo_vinculo: filtros.tipo_vinculo || undefined,
      status: filtros.status || undefined
    });
    setColaboradores(Array.isArray(data) ? data : []);
  }

  async function aplicarFiltros() {
    try {
      setCarregando(true);
      await carregarColaboradores();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao filtrar colaboradores');
    } finally {
      setCarregando(false);
    }
  }

  async function limparFiltros() {
    try {
      setCarregando(true);
      setFiltros(RH_COLABORADORES_FILTROS_INICIAIS);
      const data = await getRhColaboradores({});
      setColaboradores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao limpar filtros de colaboradores');
    } finally {
      setCarregando(false);
    }
  }

  function limparFormulario() {
    setForm(emptyForm());
    setNovoDocumento({
      tipo_documento_id: '',
      validade: '',
      status: 'ENVIADO',
      observacoes: ''
    });
    setFiltrosDocumentos({
      q: '',
      tipo_documento_id: '',
      status: '',
      validade_status: '',
      incluir_historico: false
    });
    syncColaboradorNaQuery(null);
  }

  async function abrirColaborador(id, { syncQuery = true } = {}) {
    try {
      const data = await getRhColaborador(id);
      setForm(toFormData(data));
      if (syncQuery) {
        syncColaboradorNaQuery(id);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao carregar colaborador');
    }
  }

  async function salvar(e) {
    e.preventDefault();
    if (!podeEditar) {
      return;
    }

    try {
      setSalvando(true);
      const payload = buildPayload(form);
      let salvo;

      if (form.id) {
        salvo = await atualizarRhColaborador(form.id, payload);
      } else {
        salvo = await criarRhColaborador(payload);
      }

      setForm(toFormData(salvo));
      syncColaboradorNaQuery(salvo.id);
      await aplicarFiltros();
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar colaborador');
    } finally {
      setSalvando(false);
    }
  }

  async function onSelecionarArquivoImportacao(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!confirm(`Importar colaboradores em massa usando o arquivo "${file.name}"?`)) {
      return;
    }

    try {
      setImportando(true);
      const resultado = await importarRhColaboradores(file);
      await aplicarFiltros();

      const importados = Number(resultado?.importados || 0);
      const ignorados = Number(resultado?.ignorados || 0);
      const erros = Array.isArray(resultado?.erros) ? resultado.erros : [];
      if (erros.length > 0) {
        const resumo = erros.slice(0, 5).map((item) => `Linha ${item.linha}: ${item.error}`).join('\n');
        alert(`Importados: ${importados}. Ignorados: ${ignorados}. Erros: ${erros.length}.\n${resumo}${erros.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Importacao concluida. Importados: ${importados}. Ignorados: ${ignorados}.`);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao importar colaboradores RH/DP');
    } finally {
      setImportando(false);
    }
  }

  async function carregarDocumentosColaborador(colaboradorId) {
    try {
      setCarregandoDocumentos(true);
      const [listaTipos, respostaDocumentos] = await Promise.all([
        getRhDocumentoTipos({
          colaborador_id: colaboradorId,
          ativo: true
        }),
        getRhDocumentos({
          colaborador_id: colaboradorId,
          q: filtrosDocumentos.q || undefined,
          tipo_documento_id: filtrosDocumentos.tipo_documento_id || undefined,
          status: filtrosDocumentos.status || undefined,
          validade_status: filtrosDocumentos.validade_status || undefined,
          incluir_historico: filtrosDocumentos.incluir_historico ? true : undefined,
          limit: 50
        })
      ]);

      setTiposDocumento(Array.isArray(listaTipos) ? listaTipos : []);
      setDocumentos(Array.isArray(respostaDocumentos?.data) ? respostaDocumentos.data : []);
      setResumoDocumentos(respostaDocumentos?.meta?.resumo_colaborador || null);
    } finally {
      setCarregandoDocumentos(false);
    }
  }

  async function abrirDocumento(id) {
    try {
      const url = await getRhDocumentoLink(id);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao abrir documento RH/DP');
    }
  }

  async function onSelecionarNovoDocumento(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !form.id) {
      return;
    }

    if (!novoDocumento.tipo_documento_id) {
      alert('Selecione o tipo de documento antes de enviar o arquivo.');
      return;
    }

    try {
      setSalvandoDocumento(true);
      await uploadRhDocumento({
        colaborador_id: form.id,
        tipo_documento_id: novoDocumento.tipo_documento_id,
        validade: novoDocumento.validade || undefined,
        status: novoDocumento.status || undefined,
        observacoes: novoDocumento.observacoes || undefined,
        file
      });

      setNovoDocumento({
        tipo_documento_id: '',
        validade: '',
        status: 'ENVIADO',
        observacoes: ''
      });

      await carregarDocumentosColaborador(form.id);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao enviar documento RH/DP');
    } finally {
      setSalvandoDocumento(false);
    }
  }

  async function onSelecionarSubstituicao(documento, event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !form.id) {
      return;
    }

    if (!confirm(`Substituir o documento "${documento.nome_original}"?`)) {
      return;
    }

    try {
      setSubstituindoDocumentoId(documento.id);
      await substituirRhDocumento(documento.id, {
        tipo_documento_id: documento.documento_tipo_id,
        validade: documento.validade || undefined,
        status: documento.status === 'REJEITADO' ? 'ENVIADO' : documento.status,
        observacoes: documento.observacoes || undefined,
        file
      });
      await carregarDocumentosColaborador(form.id);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao substituir documento RH/DP');
    } finally {
      setSubstituindoDocumentoId(null);
    }
  }

  return (
    <div className="page solicitacoes-page rhdp-page rh-colaboradores-page space-y-6">
      <div className="app-page-header">
        <div className="app-page-header-row">
          <div>
            <h1 className="text-xl font-semibold md:text-2xl">RH/DP • Colaboradores</h1>
            <p className="page-subtitle">
              Base cadastral com empresa do grupo, obra, vinculo, dados pessoais e dados de pagamento.
            </p>
          </div>
          <div className="app-page-actions">
            <Link to="/rh-dp" className="btn btn-outline">
              Voltar ao RH/DP
            </Link>
            <Link to="/rh-dp/empresas" className="btn btn-outline">
              Empresas do grupo
            </Link>
          </div>
        </div>
      </div>

      <div className="sol-surface-card solicitacoes-toolbar app-toolbar-card rh-colaboradores-filter-card rounded-xl p-3 md:p-4 space-y-3">
        <div className="rh-colaboradores-filter-grid">
          <input
            className="form-control"
            placeholder="Buscar por nome, CPF ou matricula"
            value={filtros.q}
            onChange={(e) => setFiltros((prev) => ({ ...prev, q: e.target.value }))}
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
            <option value="ATIVO">Ativo</option>
            <option value="INATIVO">Inativo</option>
            <option value="AFASTADO">Afastado</option>
          </select>
        </div>

        <div className="app-page-actions rh-colaboradores-actions">
          <button type="button" className="btn btn-outline" onClick={aplicarFiltros} disabled={carregando}>
            Aplicar filtros
          </button>
          <button type="button" className="btn btn-outline" onClick={limparFiltros} disabled={carregando}>
            Limpar filtros
          </button>
          {podeEditar && (
            <>
              <button type="button" className="btn btn-outline" onClick={downloadModeloColaboradores}>
                Baixar modelo
              </button>
              <label className={`btn btn-outline cursor-pointer ${importando ? 'opacity-60 pointer-events-none' : ''}`}>
                Importar massa
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={onSelecionarArquivoImportacao}
                  disabled={importando}
                />
              </label>
              <button type="button" className="btn btn-primary" onClick={limparFormulario}>
                Novo colaborador
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card sol-surface-card app-table-shell">
          <div className="app-dense-table-wrapper rh-colaboradores-table-wrapper">
            <ResizableTable
              columns={RH_COLABORADORES_COLUMNS}
              storageKey="rh-colaboradores-table-columns"
              className="app-dense-data-table rh-colaboradores-table"
            >
              <thead>
                <tr>
                  <ResizableTh columnKey="nome">Nome</ResizableTh>
                  <ResizableTh columnKey="matricula">Matricula</ResizableTh>
                  <ResizableTh columnKey="cpf">CPF</ResizableTh>
                  <ResizableTh columnKey="empresa">Empresa</ResizableTh>
                  <ResizableTh columnKey="obra">Obra</ResizableTh>
                  <ResizableTh columnKey="vinculo">Vinculo</ResizableTh>
                  <ResizableTh columnKey="status">Status</ResizableTh>
                  <ResizableTh columnKey="acoes" className="text-center">Acoes</ResizableTh>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-medium text-slate-900">{item.nome}</div>
                      <div className="text-xs text-slate-500">{item.cargo || item.matricula || '-'}</div>
                    </td>
                    <td>{item.matricula || '-'}</td>
                    <td>{formatCpf(item.cpf)}</td>
                    <td>{item.empresaGrupo?.nome || '-'}</td>
                    <td>{item.obra?.nome || '-'}</td>
                    <td>{item.tipo_vinculo === 'NAO_CLT' ? 'Nao CLT' : item.tipo_vinculo}</td>
                    <td>{item.status}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="app-dense-icon-action"
                        onClick={() => abrirColaborador(item.id)}
                        title={podeEditar ? 'Editar colaborador' : 'Ver colaborador'}
                        aria-label={podeEditar ? `Editar colaborador ${item.nome}` : `Ver colaborador ${item.nome}`}
                      >
                        {podeEditar ? <HiOutlinePencilSquare aria-hidden="true" /> : <HiOutlineEye aria-hidden="true" />}
                      </button>
                    </td>
                  </tr>
                ))}
                {!colaboradores.length && (
                  <tr>
                    <td colSpan="8" align="center">
                      {carregando ? 'Carregando...' : 'Nenhum colaborador cadastrado'}
                    </td>
                  </tr>
                )}
              </tbody>
            </ResizableTable>
          </div>
        </div>

        <form className="sol-surface-card rh-colaborador-form-card rounded-xl p-4 space-y-4" onSubmit={salvar}>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {form.id ? 'Detalhe do colaborador' : 'Novo colaborador'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cadastro base do RH/DP com dados operacionais e forma de pagamento.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Empresa do grupo</span>
              <select
                className="form-control"
                value={form.empresa_grupo_id}
                onChange={(e) => setForm((prev) => ({ ...prev, empresa_grupo_id: e.target.value }))}
                disabled={!podeEditar}
                required
              >
                <option value="">Selecione</option>
                {empresas.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Obra principal</span>
              <select
                className="form-control"
                value={form.obra_id}
                onChange={(e) => setForm((prev) => ({ ...prev, obra_id: e.target.value }))}
                disabled={!podeEditar}
              >
                <option value="">Nao vinculada</option>
                {obras.map((item) => (
                  <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Nome</span>
              <input
                className="form-control"
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                disabled={!podeEditar}
                required
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>CPF</span>
              <input
                className="form-control"
                value={form.cpf}
                onChange={(e) => setForm((prev) => ({ ...prev, cpf: maskCpfCnpj(e.target.value) }))}
                disabled={!podeEditar}
                required
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Matricula</span>
              <input
                className="form-control"
                value={form.matricula}
                onChange={(e) => setForm((prev) => ({ ...prev, matricula: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Setor</span>
              <select
                className="form-control"
                value={form.setor_id}
                onChange={(e) => setForm((prev) => ({ ...prev, setor_id: e.target.value }))}
                disabled={!podeEditar}
              >
                <option value="">Nao vinculado</option>
                {setores.map((item) => (
                  <option key={item.id} value={item.id}>{item.codigo ? `${item.codigo} - ${item.nome}` : item.nome}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Cargo</span>
              <input
                className="form-control"
                value={form.cargo}
                onChange={(e) => setForm((prev) => ({ ...prev, cargo: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Tipo de vinculo</span>
              <select
                className="form-control"
                value={form.tipo_vinculo}
                onChange={(e) => setForm((prev) => ({ ...prev, tipo_vinculo: e.target.value }))}
                disabled={!podeEditar}
              >
                <option value="CLT">CLT</option>
                <option value="NAO_CLT">Nao CLT</option>
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Status</span>
              <select
                className="form-control"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                disabled={!podeEditar}
              >
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
                <option value="AFASTADO">Afastado</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>RG</span>
              <input
                className="form-control"
                value={form.rg}
                onChange={(e) => setForm((prev) => ({ ...prev, rg: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>Data de admissão</span>
              <input
                type="date"
                className="form-control"
                value={form.data_admissao}
                onChange={(e) => setForm((prev) => ({ ...prev, data_admissao: e.target.value, data_inicio: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Data de demissão</span>
              <input
                type="date"
                className="form-control"
                value={form.data_demissao}
                onChange={(e) => setForm((prev) => ({ ...prev, data_demissao: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Data de nascimento</span>
              <input
                type="date"
                className="form-control"
                value={form.data_nascimento}
                onChange={(e) => setForm((prev) => ({ ...prev, data_nascimento: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Telefone</span>
              <input
                className="form-control"
                value={form.telefone}
                onChange={(e) => setForm((prev) => ({ ...prev, telefone: maskPhone(e.target.value) }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Email</span>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                disabled={!podeEditar}
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Salario base</span>
              <input
                className="form-control"
                inputMode="decimal"
                value={form.salario_base}
                onChange={(e) => setForm((prev) => ({ ...prev, salario_base: normalizeCurrencyTyping(e.target.value) }))}
                onBlur={(e) => setForm((prev) => ({ ...prev, salario_base: formatCurrencyInput(e.target.value) }))}
                disabled={!podeEditar}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Valor contratual</span>
              <input
                className="form-control"
                inputMode="decimal"
                value={form.valor_contratual}
                onChange={(e) => setForm((prev) => ({ ...prev, valor_contratual: normalizeCurrencyTyping(e.target.value) }))}
                onBlur={(e) => setForm((prev) => ({ ...prev, valor_contratual: formatCurrencyInput(e.target.value) }))}
                disabled={!podeEditar}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Dados de pagamento</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Favorecido</span>
                <input
                  className="form-control"
                  value={form.pagamento.favorecido_nome}
                  onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, favorecido_nome: e.target.value } }))}
                  disabled={!podeEditar}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Documento do favorecido</span>
                <input
                  className="form-control"
                  value={form.pagamento.favorecido_documento}
                  onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, favorecido_documento: maskCpfCnpj(e.target.value) } }))}
                  disabled={!podeEditar}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Banco</span>
                <input
                  className="form-control"
                  value={form.pagamento.banco}
                  onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, banco: e.target.value } }))}
                  disabled={!podeEditar}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Agencia</span>
                <input
                  className="form-control"
                  value={form.pagamento.agencia}
                  onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, agencia: e.target.value } }))}
                  disabled={!podeEditar}
                />
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span>Conta</span>
                <input
                  className="form-control"
                  value={form.pagamento.conta}
                  onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, conta: e.target.value } }))}
                  disabled={!podeEditar}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Tipo de conta</span>
                <input
                  className="form-control"
                  value={form.pagamento.tipo_conta}
                  onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, tipo_conta: e.target.value } }))}
                  disabled={!podeEditar}
                />
              </label>
            </div>

            <div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm block">
                  <span>Chave PIX principal</span>
                  <input
                    className="form-control"
                    value={form.pagamento.chave_pix}
                    onChange={(e) => setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, chave_pix: e.target.value } }))}
                    disabled={!podeEditar}
                  />
                </label>
                <label className="space-y-1 text-sm block">
                  <span>Chave PIX fixa 2</span>
                  <input
                    className="form-control"
                    value={form.pagamento.chave_pix_secundaria}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, chave_pix_secundaria: e.target.value } }))
                    }
                    disabled={!podeEditar}
                  />
                </label>
                <label className="space-y-1 text-sm block">
                  <span>Chave PIX variavel</span>
                  <input
                    className="form-control"
                    value={form.pagamento.chave_pix_variavel}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, pagamento: { ...prev.pagamento, chave_pix_variavel: e.target.value } }))
                    }
                    disabled={!podeEditar}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                A chave principal e usada por padrao nos titulos RH/DP. Na conferencia da apuracao e possivel trocar para uma das chaves cadastradas.
              </p>
            </div>
          </div>

          <label className="space-y-1 text-sm block">
            <span>Observacoes</span>
            <textarea
              className="form-control min-h-[96px]"
              value={form.observacoes}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
              disabled={!podeEditar}
            />
          </label>

          {!form.id && podeGerirDocumentos && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Salve o colaborador primeiro para liberar o envio e a gestão dos documentos anexados.
            </div>
          )}

          {form.id && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Documentos do colaborador</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Pasta digital do colaborador com checklist por vinculo, validade e historico de substituicao.
                  </p>
                </div>
                <Link to={`/rh-dp/documentos?q=${encodeURIComponent(form.nome || '')}`} className="btn btn-outline">
                  Painel geral de documentos
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Anexados</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{resumoDocumentos?.total_documentos_anexados || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Validos</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{resumoDocumentos?.documentos_validos || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Vencidos</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{resumoDocumentos?.documentos_vencidos || 0}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Obrigatorios pendentes</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{resumoDocumentos?.obrigatorios_pendentes || 0}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <input
                  className="form-control"
                  placeholder="Buscar por arquivo ou observacao"
                  value={filtrosDocumentos.q}
                  onChange={(e) => setFiltrosDocumentos((prev) => ({ ...prev, q: e.target.value }))}
                />
                <select
                  className="form-control"
                  value={filtrosDocumentos.tipo_documento_id}
                  onChange={(e) => setFiltrosDocumentos((prev) => ({ ...prev, tipo_documento_id: e.target.value }))}
                >
                  <option value="">Todos os tipos</option>
                  {tiposDocumento.map((item) => (
                    <option key={item.id} value={item.id}>{item.nome}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={filtrosDocumentos.status}
                  onChange={(e) => setFiltrosDocumentos((prev) => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">Todos os status</option>
                  <option value="ENVIADO">Enviado</option>
                  <option value="CONFERIDO">Conferido</option>
                  <option value="REJEITADO">Rejeitado</option>
                  <option value="SUBSTITUIDO">Substituido</option>
                </select>
                <select
                  className="form-control"
                  value={filtrosDocumentos.validade_status}
                  onChange={(e) => setFiltrosDocumentos((prev) => ({ ...prev, validade_status: e.target.value }))}
                >
                  <option value="">Todas as validades</option>
                  <option value="VALIDO">Valido</option>
                  <option value="A_VENCER">A vencer</option>
                  <option value="VENCIDO">Vencido</option>
                  <option value="SEM_VALIDADE">Sem validade</option>
                </select>
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={filtrosDocumentos.incluir_historico}
                    onChange={(e) => setFiltrosDocumentos((prev) => ({ ...prev, incluir_historico: e.target.checked }))}
                  />
                  Incluir historico
                </label>
              </div>

              {podeGerirDocumentos && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Enviar novo documento</h4>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <select
                      className="form-control"
                      value={novoDocumento.tipo_documento_id}
                      onChange={(e) => setNovoDocumento((prev) => ({ ...prev, tipo_documento_id: e.target.value }))}
                    >
                      <option value="">Tipo de documento</option>
                      {tiposDocumento.map((item) => (
                        <option key={item.id} value={item.id}>{item.nome}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className="form-control"
                      value={novoDocumento.validade}
                      onChange={(e) => setNovoDocumento((prev) => ({ ...prev, validade: e.target.value }))}
                    />
                    <select
                      className="form-control"
                      value={novoDocumento.status}
                      onChange={(e) => setNovoDocumento((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="ENVIADO">Enviado</option>
                      <option value="CONFERIDO">Conferido</option>
                      <option value="REJEITADO">Rejeitado</option>
                    </select>
                    <label className={`btn btn-outline cursor-pointer ${salvandoDocumento ? 'opacity-60 pointer-events-none' : ''}`}>
                      {salvandoDocumento ? 'Enviando...' : 'Anexar arquivo'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={onSelecionarNovoDocumento}
                        disabled={salvandoDocumento}
                      />
                    </label>
                  </div>
                  <textarea
                    className="form-control min-h-[88px]"
                    placeholder="Observacoes do documento"
                    value={novoDocumento.observacoes}
                    onChange={(e) => setNovoDocumento((prev) => ({ ...prev, observacoes: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">
                    Selecione o tipo e depois clique em <strong>Anexar arquivo</strong> para enviar o documento deste colaborador.
                  </p>
                </div>
              )}

              <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Arquivos do colaborador</h4>
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Tipo</th>
                            <th>Arquivo</th>
                            <th>Status</th>
                            <th>Validade</th>
                            <th>Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {documentos.map((item) => (
                            <tr key={item.id}>
                              <td>{item.tipoDocumento?.nome || '-'}</td>
                              <td>
                                <div className="font-medium text-slate-900">{item.nome_original}</div>
                                <div className="text-xs text-slate-500">{item.observacoes || '-'}</div>
                              </td>
                              <td>
                                <div>{item.status}</div>
                                <div className="text-xs text-slate-500">{item.ativo ? 'Atual' : 'Historico'}</div>
                              </td>
                              <td>
                                <div>{formatDate(item.validade)}</div>
                                <div className="text-xs text-slate-500">{validadeLabel(item.validade_status)}</div>
                              </td>
                              <td>
                                <div className="flex flex-wrap gap-2">
                                  <button type="button" className="btn btn-outline" onClick={() => abrirDocumento(item.id)}>
                                    Abrir
                                  </button>
                                  {podeGerirDocumentos && item.ativo && (
                                    <label className={`btn btn-outline cursor-pointer ${substituindoDocumentoId === item.id ? 'opacity-60 pointer-events-none' : ''}`}>
                                      Substituir
                                      <input
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => onSelecionarSubstituicao(item, e)}
                                        disabled={substituindoDocumentoId === item.id}
                                      />
                                    </label>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!documentos.length && (
                            <tr>
                              <td colSpan="5" align="center">
                                {carregandoDocumentos ? 'Carregando documentos...' : 'Nenhum documento localizado para este colaborador'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Checklist documental</h4>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    {(resumoDocumentos?.checklist || []).map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div>
                          <div className="font-medium text-slate-900">{item.nome}</div>
                          <div className="text-xs text-slate-500">
                            {item.obrigatorio ? 'Obrigatorio' : 'Opcional'} · {item.exige_validade ? 'Com validade' : 'Sem validade obrigatoria'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">{item.situacao}</div>
                          <div className="text-xs text-slate-500">{item.documento?.nome_original || '-'}</div>
                        </div>
                      </div>
                    ))}
                    {!resumoDocumentos?.checklist?.length && (
                      <div className="text-sm text-slate-500">
                        Nenhum checklist aplicavel carregado para este colaborador.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {podeEditar && (
            <div className="app-page-actions">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                {form.id ? 'Salvar alteracoes' : 'Criar colaborador'}
              </button>
              <button type="button" className="btn btn-outline" onClick={limparFormulario} disabled={salvando}>
                {form.id ? 'Cancelar edicao' : 'Limpar'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
