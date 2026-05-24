import { useEffect, useMemo, useState } from 'react';
import { HiArrowDownTray, HiArrowUpTray, HiPaperClip, HiDocumentArrowDown } from 'react-icons/hi2';
import { useAuth } from '../contexts/AuthContext';
import { isGeoSetor } from '../utils/setor';
import { API_URL, authHeaders, fileUrl } from '../services/api';
import { getMinhasObras, getObras } from '../services/obras';
import {
  atualizarContrato,
  criarContrato,
  excluirContrato,
  getContratoAnexos,
  getContratos,
  getContratosResumo,
  importarContratosEmMassa,
  uploadContratoAnexos
} from '../services/contratos';
import { getMinhaPermissaoListarTodasSolicitacoes } from '../services/configuracoesSistema';

const LIMITE_TODOS_CONTRATOS = 'ALL';

export default function GestaoContratos() {
  const { user } = useAuth();
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [obras, setObras] = useState([]);
  const [filtros, setFiltros] = useState({
    obra_id: '',
    codigo: '',
    ref: ''
  });
  const [form, setForm] = useState({
    obra_id: '',
    codigo: '',
    ref_contrato: '',
    itens_apropriacao: '',
    descricao: '',
    valor_total: ''
  });
  const [valorDisplay, setValorDisplay] = useState('');
  const [files, setFiles] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [ajustes, setAjustes] = useState({});
  const [editandoId, setEditandoId] = useState(null);
  const [salvandoEdicaoId, setSalvandoEdicaoId] = useState(null);
  const [formEdicao, setFormEdicao] = useState({
    obra_id: '',
    codigo: '',
    ref_contrato: '',
    descricao: '',
    itens_apropriacao: '',
    valor_total: ''
  });
  const [modalAnexos, setModalAnexos] = useState(null);
  const [anexos, setAnexos] = useState([]);
  const [uploadAnexos, setUploadAnexos] = useState([]);
  const [importandoContratos, setImportandoContratos] = useState(false);
  const [selecionadosIds, setSelecionadosIds] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [limitePorPagina, setLimitePorPagina] = useState(25);
  const [podeListarTodosContratos, setPodeListarTodosContratos] = useState(false);

  const setorTokens = [
    String(user?.setor?.nome || '').toUpperCase(),
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.area || '').toUpperCase()
  ];
  const isAdminGEO =
    user?.perfil === 'ADMIN' && setorTokens.some(isGeoSetor);
  const isSetorObra = setorTokens.includes('OBRA');
  const podeAcessar =
    user?.perfil === 'SUPERADMIN' || isAdminGEO || isSetorObra;

  useEffect(() => {
    if (podeAcessar) {
      carregar();
      carregarCombos();
    } else {
      setLoading(false);
    }
  }, [podeAcessar, isSetorObra]);

  useEffect(() => {
    let ativo = true;

    async function carregarPermissaoListarTodos() {
      try {
        const data = await getMinhaPermissaoListarTodasSolicitacoes();
        if (ativo) {
          setPodeListarTodosContratos(Boolean(data?.pode_listar_todas_solicitacoes));
        }
      } catch (error) {
        console.error('Erro ao carregar permissao para listar todos os contratos', error);
        if (ativo) {
          setPodeListarTodosContratos(false);
        }
      }
    }

    carregarPermissaoListarTodos();

    return () => {
      ativo = false;
    };
  }, [user?.id]);

  useEffect(() => {
    setPaginaAtual(1);
    setSelecionadosIds([]);
  }, [filtros]);

  async function carregar(overrideFiltros) {
    try {
      setLoading(true);
      const data = await getContratosResumo(overrideFiltros ?? filtros);
      setContratos(Array.isArray(data) ? data : []);
      setSelecionadosIds([]);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar contratos');
    } finally {
      setLoading(false);
    }
  }

  async function carregarCombos() {
    try {
      const [obrasData] = await Promise.all([
        isSetorObra ? getMinhasObras() : getObras()
      ]);
      const lista = Array.isArray(obrasData) ? obrasData : [];
      const ordenadas = [...lista].sort((a, b) => {
        const codigoA = String(a?.codigo ?? '');
        const codigoB = String(b?.codigo ?? '');
        const numA = Number.parseInt(codigoA.replace(/\D/g, ''), 10);
        const numB = Number.parseInt(codigoB.replace(/\D/g, ''), 10);
        const temNumA = Number.isFinite(numA);
        const temNumB = Number.isFinite(numB);
        if (temNumA && temNumB && numA !== numB) {
          return numA - numB;
        }
        if (temNumA !== temNumB) {
          return temNumA ? -1 : 1;
        }
        const nomeA = String(a?.nome ?? '');
        const nomeB = String(b?.nome ?? '');
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      });
      setObras(ordenadas);
    } catch (error) {
      console.error(error);
    }
  }

  function onChangeForm(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function onChangeFiltro(e) {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  }

  async function aplicarFiltros(e) {
    e?.preventDefault();
    await carregar();
  }

  async function limparFiltros() {
    const limpo = { obra_id: '', codigo: '', ref: '' };
    setFiltros(limpo);
    await carregar(limpo);
  }

  function parseMoeda(valor) {
    if (!valor) return 0;
    const limpo = String(valor)
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const numero = Number(limpo);
    return Number.isNaN(numero) ? 0 : numero;
  }

  function formatMoeda(valor) {
    const numero = Number(valor || 0);
    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  const totalContratos = contratos.length;
  const listandoTodosContratos = limitePorPagina === LIMITE_TODOS_CONTRATOS;
  const limitePaginacaoNumerico = listandoTodosContratos
    ? Math.max(totalContratos, 1)
    : Number(limitePorPagina) || 25;
  const totalPaginas = listandoTodosContratos
    ? (totalContratos > 0 ? 1 : 0)
    : (totalContratos > 0 ? Math.ceil(totalContratos / limitePaginacaoNumerico) : 0);
  const paginaSegura = Math.min(Math.max(1, paginaAtual), Math.max(totalPaginas, 1));
  const indiceInicial = totalContratos === 0
    ? 0
    : listandoTodosContratos
      ? 0
      : (paginaSegura - 1) * limitePaginacaoNumerico;
  const indiceFinal = totalContratos === 0
    ? 0
    : listandoTodosContratos
      ? totalContratos
      : Math.min(totalContratos, indiceInicial + limitePaginacaoNumerico);
  const contratosPagina = useMemo(
    () => listandoTodosContratos ? contratos : contratos.slice(indiceInicial, indiceFinal),
    [contratos, indiceInicial, indiceFinal, listandoTodosContratos]
  );
  const idsPagina = useMemo(
    () => contratosPagina.map(contrato => Number(contrato.id)).filter(Boolean),
    [contratosPagina]
  );
  const selecionadosSet = useMemo(
    () => new Set(selecionadosIds.map(Number)),
    [selecionadosIds]
  );
  const todosPaginaSelecionados = idsPagina.length > 0 &&
    idsPagina.every(id => selecionadosSet.has(id));
  const algunsPaginaSelecionados = idsPagina.some(id => selecionadosSet.has(id));

  function toggleSelecionado(id) {
    const idNum = Number(id);
    if (!idNum) return;
    setSelecionadosIds(prev =>
      prev.includes(idNum)
        ? prev.filter(item => item !== idNum)
        : [...prev, idNum]
    );
  }

  function toggleSelecionarPagina() {
    if (idsPagina.length === 0) return;
    setSelecionadosIds(prev => {
      const atual = new Set(prev.map(Number));
      const deveLimpar = idsPagina.every(id => atual.has(id));
      if (deveLimpar) {
        idsPagina.forEach(id => atual.delete(id));
      } else {
        idsPagina.forEach(id => atual.add(id));
      }
      return Array.from(atual);
    });
  }

  function formatarValorExportacao(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '';
    return n.toFixed(2).replace('.', ',');
  }

  function exportarSelecionadosExcel() {
    if (selecionadosIds.length === 0) {
      alert('Selecione ao menos um contrato.');
      return;
    }

    const selecionados = contratos.filter(item => selecionadosIds.includes(Number(item.id)));
    if (selecionados.length === 0) {
      alert('Nenhum contrato selecionado para exportar.');
      return;
    }

    const linhas = [
      [
        'Contrato',
        'Obra',
        'Codigo da obra',
        'Ref. do Contrato',
        'Descricao',
        'Itens de Apropriacao',
        'Solicitado',
        'Pago',
        'A pagar',
        'Ajuste Solicitado',
        'Ajuste Pago',
        'Qtd. Solicitacoes'
      ],
      ...selecionados.map(item => [
        item.codigo || '',
        item.obra?.nome || '',
        item.obra?.codigo || '',
        item.ref_contrato || '',
        item.descricao || '',
        item.itens_apropriacao || '',
        formatarValorExportacao(item.total_solicitado),
        formatarValorExportacao(item.total_pago),
        formatarValorExportacao(item.total_a_pagar),
        formatarValorExportacao(item.ajuste_solicitado),
        formatarValorExportacao(item.ajuste_pago),
        item.total_solicitacoes || 0
      ])
    ];

    const csv = linhas
      .map(colunas => colunas
        .map(valor => `"${String(valor ?? '').replace(/"/g, '""')}"`)
        .join(';'))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataRef = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `contratos-selecionados-${dataRef}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  function renderAcoesMassa() {
    return (
      <div className="solicitacoes-toolbar sol-surface-card relative p-3 md:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          Selecionados: <strong>{selecionadosIds.length}</strong>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            className="btn btn-outline inline-flex items-center gap-2"
            onClick={exportarSelecionadosExcel}
            disabled={selecionadosIds.length === 0}
            title="Exportar selecionados para Excel (.csv)"
            aria-label="Exportar selecionados para Excel"
          >
            <HiDocumentArrowDown className="w-4 h-4" />
            <span>Exportar</span>
          </button>
        </div>
      </div>
    );
  }

  function renderPaginacao() {
    return (
      <div className="sol-surface-card mt-4 p-3 md:p-4 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-gray-600 dark:text-slate-300">
          {totalContratos > 0
            ? `Exibindo ${indiceInicial + 1}-${indiceFinal} de ${totalContratos} contratos`
            : 'Nenhum contrato encontrado'}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
            <span>Por pagina</span>
            <select
              className="input !w-auto min-w-[88px]"
              value={limitePorPagina}
              onChange={(event) => {
                const value = event.target.value;
                setLimitePorPagina(value === LIMITE_TODOS_CONTRATOS ? value : Number(value) || 25);
                setPaginaAtual(1);
              }}
            >
              {[10, 25, 50, 100].map((opcao) => (
                <option key={opcao} value={opcao}>{opcao}</option>
              ))}
              {podeListarTodosContratos && (
                <option value={LIMITE_TODOS_CONTRATOS}>Todas</option>
              )}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
              disabled={listandoTodosContratos || paginaSegura <= 1}
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700 dark:text-slate-200 min-w-[96px] text-center">
              {listandoTodosContratos
                ? 'Todas'
                : `Pagina ${paginaSegura} de ${Math.max(totalPaginas, 1)}`}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setPaginaAtual((prev) => Math.min(Math.max(totalPaginas, 1), prev + 1))}
              disabled={listandoTodosContratos || totalPaginas === 0 || paginaSegura >= totalPaginas}
            >
              Proxima
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderCheckboxCabecalho() {
    return (
      <input
        type="checkbox"
        checked={todosPaginaSelecionados}
        ref={el => {
          if (el) el.indeterminate = !todosPaginaSelecionados && algunsPaginaSelecionados;
        }}
        onChange={toggleSelecionarPagina}
        aria-label="Selecionar contratos da pagina"
      />
    );
  }

  function renderCheckboxLinha(contrato) {
    const id = Number(contrato.id);
    return (
      <input
        type="checkbox"
        checked={selecionadosSet.has(id)}
        onChange={() => toggleSelecionado(id)}
        aria-label={`Selecionar contrato ${contrato.codigo || id}`}
      />
    );
  }

  async function handleCriarContrato(e) {
    e.preventDefault();
    if (salvando) return;

    try {
      setSalvando(true);

      const payload = {
        obra_id: Number(form.obra_id),
        codigo: String(form.codigo || '').trim(),
        ref_contrato: String(form.ref_contrato || '').trim(),
        itens_apropriacao: String(form.itens_apropriacao || '').trim() || null,
        descricao: String(form.descricao || '').trim() || null,
        valor_total: valorDisplay ? parseMoeda(valorDisplay) : null,
        tipo_macro_id: null,
        tipo_sub_id: null
      };

      if (!payload.obra_id || !payload.codigo) {
        alert('Obra e codigo sao obrigatorios.');
        return;
      }

      const contrato = await criarContrato(payload);

      if (files.length > 0) {
        await uploadContratoAnexos(contrato.id, files);
      }

      setForm({
        obra_id: '',
        codigo: '',
        ref_contrato: '',
        itens_apropriacao: '',
        descricao: '',
        valor_total: ''
      });
      setValorDisplay('');
      setFiles([]);
      await carregar();
      alert('Contrato criado com sucesso.');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar contrato.');
    } finally {
      setSalvando(false);
    }
  }

  function onChangeAjuste(id, campo, valor) {
    setAjustes(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [campo]: valor
      }
    }));
  }

  function iniciarEdicao(contrato) {
    setEditandoId(contrato.id);
    setFormEdicao({
      obra_id: contrato.obra_id ? String(contrato.obra_id) : '',
      codigo: String(contrato.codigo || ''),
      ref_contrato: String(contrato.ref_contrato || ''),
      descricao: String(contrato.descricao || ''),
      itens_apropriacao: String(contrato.itens_apropriacao || ''),
      valor_total: contrato.valor_total !== null && contrato.valor_total !== undefined
        ? String(contrato.valor_total)
        : ''
    });
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setSalvandoEdicaoId(null);
    setFormEdicao({
      obra_id: '',
      codigo: '',
      ref_contrato: '',
      descricao: '',
      itens_apropriacao: '',
      valor_total: ''
    });
  }

  function onChangeEdicao(e) {
    const { name, value } = e.target;
    setFormEdicao(prev => ({ ...prev, [name]: value }));
  }

  async function salvarEdicao(contrato) {
    if (salvandoEdicaoId) return;

    const valorTotalEdicao = String(formEdicao.valor_total || '').trim();
    const valorTotalNumerico = valorTotalEdicao === ''
      ? null
      : Number(valorTotalEdicao.replace(',', '.'));

    if (valorTotalEdicao !== '' && Number.isNaN(valorTotalNumerico)) {
      alert('Valor inválido.');
      return;
    }

    const payload = {
      obra_id: formEdicao.obra_id ? Number(formEdicao.obra_id) : null,
      codigo: String(formEdicao.codigo || '').trim(),
      ref_contrato: String(formEdicao.ref_contrato || '').trim(),
      descricao: String(formEdicao.descricao || '').trim() || null,
      itens_apropriacao: String(formEdicao.itens_apropriacao || '').trim() || null,
      valor_total: valorTotalNumerico
    };

    if (!payload.obra_id || !payload.codigo || !payload.ref_contrato) {
      alert('Obra, código e Ref. do Contrato são obrigatórios.');
      return;
    }

    try {
      setSalvandoEdicaoId(contrato.id);
      await atualizarContrato(contrato.id, payload);
      await carregar();
      cancelarEdicao();
      alert('Contrato atualizado com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao atualizar contrato.');
    } finally {
      setSalvandoEdicaoId(null);
    }
  }

  async function salvarAjustes(contrato) {
    const valores = ajustes[contrato.id];
    if (!valores) return;
    try {
      await atualizarContrato(contrato.id, {
        ajuste_solicitado: Number(valores.ajuste_solicitado ?? contrato.ajuste_solicitado ?? 0),
        ajuste_pago: Number(valores.ajuste_pago ?? contrato.ajuste_pago ?? 0)
      });
      await carregar();
      alert('Ajustes salvos.');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar ajustes.');
    }
  }

  async function excluirContratoItem(contrato) {
    if (!confirm(`Excluir o contrato ${contrato.codigo}?`)) return;
    try {
      await excluirContrato(contrato.id);
      await carregar();
      alert('Contrato excluído com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao excluir contrato.');
    }
  }

  async function abrirAnexos(contrato) {
    try {
      setModalAnexos(contrato);
      const data = await getContratoAnexos(contrato.id);
      setAnexos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar anexos.');
    }
  }

  async function enviarAnexos() {
    if (!modalAnexos || uploadAnexos.length === 0) return;
    try {
      await uploadContratoAnexos(modalAnexos.id, uploadAnexos);
      const data = await getContratoAnexos(modalAnexos.id);
      setAnexos(Array.isArray(data) ? data : []);
      setUploadAnexos([]);
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar anexos.');
    }
  }

  function baixarModeloImportacaoContratos() {
    const linhas = [
      ['Contrato', 'Codigo', 'Ref. do Contrato', 'Descrição', 'Itens de Apropriação', 'Solicitado'],
      ['CT/PE001-7', '7', 'EXEMPLO REF CONTRATO', '', '', '15000,00']
    ];

    const csv = linhas
      .map(colunas => colunas.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-importacao-contratos.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function onSelecionarArquivoImportacao(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!String(file.name || '').toLowerCase().endsWith('.csv')) {
      alert('Utilize o arquivo modelo em CSV para importar os contratos.');
      return;
    }

    if (!confirm(`Importar contratos em massa usando o arquivo "${file.name}"?`)) {
      return;
    }

    try {
      setImportandoContratos(true);
      const resultado = await importarContratosEmMassa(file);
      await carregar();

      const importados = Number(resultado?.importados || 0);
      const ignorados = Number(resultado?.ignorados || 0);
      const erros = Array.isArray(resultado?.erros) ? resultado.erros : [];

      if (erros.length > 0) {
        const resumoErros = erros
          .slice(0, 5)
          .map(item => `Linha ${item.linha}: ${item.error}`)
          .join('\n');
        alert(`Importados: ${importados}. Ignorados: ${ignorados}. Erros: ${erros.length}.\n${resumoErros}${erros.length > 5 ? '\n...' : ''}`);
      } else {
        alert(`Importação concluída. Importados: ${importados}. Ignorados: ${ignorados}.`);
      }
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao importar contratos em massa.');
    } finally {
      setImportandoContratos(false);
    }
  }

  function removerArquivoNovoContrato(index) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  function removerArquivoModal(index) {
    setUploadAnexos(prev => prev.filter((_, i) => i !== index));
  }

  async function obterUrlAssinada(caminhoArquivo) {
    if (!caminhoArquivo) return null;
    if (!String(caminhoArquivo).startsWith('http')) {
      return fileUrl(caminhoArquivo);
    }

    try {
      const res = await fetch(
        `${API_URL}/anexos/presign?url=${encodeURIComponent(caminhoArquivo)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) throw new Error('Falha ao assinar URL');
      const data = await res.json();
      return data?.url || caminhoArquivo;
    } catch (error) {
      console.error(error);
      return caminhoArquivo;
    }
  }

  async function visualizarAnexoContrato(caminhoArquivo) {
    try {
      const urlArquivo = await obterUrlAssinada(caminhoArquivo);
      if (!urlArquivo) {
        alert('Arquivo inválido.');
        return;
      }
      window.open(urlArquivo, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      alert('Erro ao visualizar anexo.');
    }
  }

  async function baixarAnexoContrato(caminhoArquivo, nomeArquivo) {
    try {
      const urlArquivo = await obterUrlAssinada(caminhoArquivo);
      if (!urlArquivo) {
        alert('Arquivo inválido.');
        return;
      }

      const response = await fetch(urlArquivo);
      if (!response.ok) {
        throw new Error('Falha ao baixar arquivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo || 'anexo';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert('Erro ao baixar anexo.');
    }
  }

  function renderFiltros() {
    return (
      <form
        onSubmit={aplicarFiltros}
        className="bg-white rounded-xl shadow p-4 grid gap-3 md:grid-cols-4 items-end"
      >
        <label className="text-sm text-gray-600 grid gap-1">
          Obra
          <select
            name="obra_id"
            value={filtros.obra_id}
            onChange={onChangeFiltro}
            className="w-full border rounded p-2"
          >
            <option value="">Todas</option>
            {obras.map(obra => (
              <option key={obra.id} value={obra.id}>
                {obra.codigo} - {obra.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-gray-600 grid gap-1">
          Código do contrato
          <input
            name="codigo"
            value={filtros.codigo}
            onChange={onChangeFiltro}
            className="w-full border rounded p-2"
            placeholder="Ex: CTR-001"
          />
        </label>

        <label className="text-sm text-gray-600 grid gap-1">
          Ref. do Contrato
          <input
            name="ref"
            value={filtros.ref}
            onChange={onChangeFiltro}
            className="w-full border rounded p-2"
            placeholder="Buscar por referencia"
          />
        </label>

        <div className="flex gap-2">
          <button type="submit" className="btn btn-outline">
            Buscar
          </button>
          <button type="button" className="btn btn-outline" onClick={limparFiltros}>
            Limpar
          </button>
        </div>
      </form>
    );
  }

  if (loading) return <p>Carregando contratos...</p>;

  if (!podeAcessar) {
    return (
      <p className="text-gray-600">
        Acesso restrito. Solicite ao administrador do sistema.
      </p>
    );
  }

  if (isSetorObra) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Gestão de Contratos</h1>

        {renderFiltros()}
        {renderAcoesMassa()}

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 w-10">{renderCheckboxCabecalho()}</th>
                <th className="text-left p-3">Contrato</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-left p-3">Ref. do Contrato</th>
                <th className="text-left p-3">Descrição</th>
                <th className="text-left p-3">Itens de Apropriação</th>
                <th className="text-right p-3">Solicitado</th>
                <th className="text-right p-3">Pago</th>
                <th className="text-right p-3">A pagar</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-4 text-center text-gray-500">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              )}
              {contratosPagina.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{renderCheckboxLinha(c)}</td>
                  <td className="p-3 font-medium">{c.codigo}</td>
                  <td className="p-3">{c.obra?.nome || '-'}</td>
                  <td className="p-3">{c.ref_contrato || '-'}</td>
                  <td className="p-3">{c.descricao || '-'}</td>
                  <td className="p-3">{c.itens_apropriacao || '-'}</td>
                  <td className="p-3 text-right">
                    {Number(c.total_solicitado || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </td>
                  <td className="p-3 text-right">
                    {Number(c.total_pago || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </td>
                  <td className="p-3 text-right">
                    {Number(c.total_a_pagar || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {renderPaginacao()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gestão de Contratos</h1>

      {user?.perfil === 'SUPERADMIN' && (
        <div className="bg-white rounded-xl shadow p-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-outline px-3"
            onClick={baixarModeloImportacaoContratos}
            title="Baixar planilha modelo de importação"
            aria-label="Baixar planilha modelo de importação"
          >
            <HiArrowDownTray className="w-4 h-4" />
          </button>

          <label
            className={`btn btn-outline px-3 cursor-pointer ${importandoContratos ? 'opacity-60 pointer-events-none' : ''}`}
            title="Importar contratos em massa (.csv)"
            aria-label="Importar contratos em massa"
          >
            <HiArrowUpTray className="w-4 h-4" />
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onSelecionarArquivoImportacao}
              disabled={importandoContratos}
            />
          </label>

          <span className="text-sm text-gray-600">
            Modelo CSV (abre no Excel): Contrato, Código da obra, Ref. do Contrato, Descrição, Itens de Apropriação e Solicitado.
            Descrição e Itens de Apropriação podem ficar em branco.
          </span>
        </div>
      )}

      <form
        onSubmit={handleCriarContrato}
        className="bg-white rounded-xl shadow p-4 space-y-4"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm text-gray-600">Obra</label>
            <select
              name="obra_id"
              value={form.obra_id}
              onChange={onChangeForm}
              className="w-full border rounded p-2"
            >
              <option value="">Selecione</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>
                  {obra.codigo} - {obra.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600">Código</label>
            <input
              name="codigo"
              value={form.codigo}
              onChange={onChangeForm}
              className="w-full border rounded p-2"
              placeholder="Ex: CTR-001"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Ref. do Contrato</label>
            <input
              name="ref_contrato"
              value={form.ref_contrato}
              onChange={onChangeForm}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Valor</label>
            <input
              name="valor_total"
              value={valorDisplay}
              onChange={e => setValorDisplay(e.target.value)}
              onBlur={() => {
                const numero = parseMoeda(valorDisplay);
                setValorDisplay(numero ? formatMoeda(numero) : '');
              }}
              className="w-full border rounded p-2"
            />
          </div>

        </div>

        <div>
          <label className="text-sm text-gray-600">Descrição</label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={onChangeForm}
            className="w-full border rounded p-2"
            rows="3"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Itens de Apropriação</label>
          <textarea
            name="itens_apropriacao"
            value={form.itens_apropriacao}
            onChange={onChangeForm}
            className="w-full border rounded p-2"
            rows="3"
            placeholder="Descreva os itens de apropriação do contrato"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Anexos do contrato</label>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <label className="btn btn-outline inline-flex items-center gap-2 cursor-pointer">
              <HiPaperClip className="w-4 h-4" />
              <span>Anexar arquivos</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
            </label>
            <span className="text-xs text-[var(--c-muted)]">
              {files.length > 0
                ? `${files.length} arquivo(s) selecionado(s)`
                : 'Nenhum arquivo selecionado'}
            </span>
          </div>
          {files.length > 0 && (
            <div className="mt-2 space-y-1">
              {files.map((arquivo, index) => (
                <div
                  key={`${arquivo.name}-${index}`}
                  className="flex items-center justify-between text-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded px-2 py-1"
                >
                  <span className="truncate">{arquivo.name}</span>
                  <button
                    type="button"
                    className="text-blue-600 font-bold px-2"
                    onClick={() => removerArquivoNovoContrato(index)}
                    aria-label={`Remover ${arquivo.name}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={salvando}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {salvando ? 'Salvando...' : 'Criar contrato'}
        </button>
      </form>

      {renderFiltros()}
      {renderAcoesMassa()}

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 w-10">{renderCheckboxCabecalho()}</th>
              <th className="text-left p-3">Contrato</th>
              <th className="text-left p-3">Obra</th>
              <th className="text-left p-3">Ref. do Contrato</th>
              <th className="text-left p-3">Descrição</th>
              <th className="text-left p-3">Itens de Apropriação</th>
              <th className="text-right p-3">Solicitado</th>
              <th className="text-right p-3">Pago</th>
              <th className="text-right p-3">A pagar</th>
              <th className="text-right p-3">Ajuste Solicitado</th>
              <th className="text-right p-3">Ajuste Pago</th>
              <th className="text-right p-3">Qtd. Solicitações</th>
              <th className="text-left p-3">Anexos</th>
              <th className="text-left p-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratos.length === 0 && (
              <tr>
                <td colSpan="14" className="p-4 text-center text-gray-500">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
            {contratosPagina.map(c => (
              <tr key={c.id} className="border-t">
                <td className="p-3">{renderCheckboxLinha(c)}</td>
                <td className="p-3 font-medium">
                  {editandoId === c.id ? (
                    <input
                      name="codigo"
                      value={formEdicao.codigo}
                      onChange={onChangeEdicao}
                      className="w-40 border rounded p-1"
                    />
                  ) : (
                    c.codigo
                  )}
                </td>
                <td className="p-3">
                  {editandoId === c.id ? (
                    <select
                      name="obra_id"
                      value={formEdicao.obra_id}
                      onChange={onChangeEdicao}
                      className="w-56 border rounded p-1"
                    >
                      <option value="">Selecione</option>
                      {obras.map(obra => (
                        <option key={obra.id} value={obra.id}>
                          {obra.codigo} - {obra.nome}
                        </option>
                      ))}
                    </select>
                  ) : (
                    c.obra?.nome || '-'
                  )}
                </td>
                <td className="p-3">
                  {editandoId === c.id ? (
                    <input
                      name="ref_contrato"
                      value={formEdicao.ref_contrato}
                      onChange={onChangeEdicao}
                      className="w-56 border rounded p-1"
                    />
                  ) : (
                    c.ref_contrato || '-'
                  )}
                </td>
                <td className="p-3">
                  {editandoId === c.id ? (
                    <input
                      name="descricao"
                      value={formEdicao.descricao}
                      onChange={onChangeEdicao}
                      className="w-64 border rounded p-1"
                    />
                  ) : (
                    c.descricao || '-'
                  )}
                </td>
                <td className="p-3">
                  {editandoId === c.id ? (
                    <input
                      name="itens_apropriacao"
                      value={formEdicao.itens_apropriacao}
                      onChange={onChangeEdicao}
                      className="w-64 border rounded p-1"
                    />
                  ) : (
                    c.itens_apropriacao || '-'
                  )}
                </td>
                <td className="p-3 text-right">
                  {editandoId === c.id ? (
                    <input
                      type="number"
                      step="0.01"
                      className="w-32 border rounded p-1 text-right"
                      name="valor_total"
                      value={formEdicao.valor_total}
                      onChange={onChangeEdicao}
                    />
                  ) : (
                    Number(c.total_solicitado || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })
                  )}
                </td>
                <td className="p-3 text-right">
                  {Number(c.total_pago || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </td>
                <td className="p-3 text-right">
                  {Number(c.total_a_pagar || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </td>
                <td className="p-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    className="w-28 border rounded p-1 text-right"
                    value={ajustes[c.id]?.ajuste_solicitado ?? c.ajuste_solicitado ?? 0}
                    onChange={e => onChangeAjuste(c.id, 'ajuste_solicitado', e.target.value)}
                  />
                </td>
                <td className="p-3 text-right">
                  <input
                    type="number"
                    step="0.01"
                    className="w-28 border rounded p-1 text-right"
                    value={ajustes[c.id]?.ajuste_pago ?? c.ajuste_pago ?? 0}
                    onChange={e => onChangeAjuste(c.id, 'ajuste_pago', e.target.value)}
                  />
                </td>
                <td className="p-3 text-right">{c.total_solicitacoes || 0}</td>
                <td className="p-3">
                  <button
                    className="text-blue-600"
                    onClick={() => abrirAnexos(c)}
                  >
                    Ver anexos
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    {editandoId === c.id ? (
                      <>
                        <button
                          className="text-blue-600"
                          onClick={() => salvarEdicao(c)}
                          disabled={salvandoEdicaoId === c.id}
                        >
                          {salvandoEdicaoId === c.id ? 'Salvando...' : 'Salvar edição'}
                        </button>
                        <button
                          className="text-gray-600"
                          onClick={cancelarEdicao}
                          disabled={salvandoEdicaoId === c.id}
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-blue-600"
                          onClick={() => iniciarEdicao(c)}
                        >
                          Editar
                        </button>
                        <button
                          className="text-blue-600"
                          onClick={() => salvarAjustes(c)}
                        >
                          Salvar ajustes
                        </button>
                      </>
                    )}
                    <button
                      className="text-blue-700"
                      onClick={() => excluirContratoItem(c)}
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPaginacao()}

      {modalAnexos && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow p-6 w-full max-w-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Anexos do contrato {modalAnexos.codigo}
              </h2>
              <button onClick={() => setModalAnexos(null)}>Fechar</button>
            </div>

            <div className="space-y-2 max-h-64 overflow-auto">
              {anexos.length === 0 && (
                <p className="text-sm text-gray-500">
                  Nenhum anexo encontrado.
                </p>
              )}
              {anexos.map(anexo => (
                <div
                  key={anexo.id}
                  className="flex items-center justify-between gap-3 text-sm border rounded px-3 py-2"
                >
                  <span className="truncate flex-1" title={anexo.nome_original}>
                    {anexo.nome_original}
                  </span>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <a
                      href="#"
                      onClick={async e => {
                        e.preventDefault();
                        await visualizarAnexoContrato(anexo.caminho_arquivo);
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Visualizar
                    </a>
                    <button
                      type="button"
                      onClick={() => baixarAnexoContrato(anexo.caminho_arquivo, anexo.nome_original)}
                      className="text-blue-600 hover:underline"
                    >
                      Baixar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-sm text-gray-600">Enviar novos anexos</label>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <label className="btn btn-outline inline-flex items-center gap-2 cursor-pointer">
                  <HiPaperClip className="w-4 h-4" />
                  <span>Anexar arquivos</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => setUploadAnexos(Array.from(e.target.files || []))}
                  />
                </label>
                <span className="text-xs text-[var(--c-muted)]">
                  {uploadAnexos.length > 0
                    ? `${uploadAnexos.length} arquivo(s) selecionado(s)`
                    : 'Nenhum arquivo selecionado'}
                </span>
              </div>
              {uploadAnexos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {uploadAnexos.map((arquivo, index) => (
                    <div
                      key={`${arquivo.name}-${index}`}
                      className="flex items-center justify-between text-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded px-2 py-1"
                    >
                      <span className="truncate">{arquivo.name}</span>
                      <button
                        type="button"
                        className="text-blue-600 font-bold px-2"
                        onClick={() => removerArquivoModal(index)}
                        aria-label={`Remover ${arquivo.name}`}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={enviarAnexos}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Enviar anexos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
