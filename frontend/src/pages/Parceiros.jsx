import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarParceiro,
  baixarModeloParceiros,
  buscarParceiroPorId,
  buscarParceiros,
  criarParceiro,
  exportarParceiros,
  importarParceiros,
  listarCategoriasParceiro
} from '../services/parceiros';
import { isValidCpfCnpj, maskCep, maskCpfCnpj, maskCreci, maskPhone, maskRg, onlyDigits } from '../utils/formatters';
import {
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  CelulaDupla,
  FormSecao,
  CampoForm
} from '../components/padrao';
import StatusBadge from '../components/StatusBadge';

const PIX_TIPOS_CHAVE = ['CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA'];
const PAGE_SIZE_OPTIONS = ['25', '50', '100', '200', 'all'];

function defaultParceiroForm() {
  return {
    id: null,
    cpf_cnpj: '',
    nome: '',
    telefone: '',
    email: '',
    rg: '',
    data_nascimento: '',
    nacionalidade: '',
    profissao: '',
    estado_civil: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cep: '',
    municipio: '',
    estado: '',
    conjuge_nome: '',
    regime_bens: '',
    creci: '',
    pix_chave_fixa_1_tipo: 'CPF',
    pix_chave_fixa_1: '',
    pix_chave_fixa_2_tipo: 'CNPJ',
    pix_chave_fixa_2: '',
    pix_chave_variavel_tipo: 'ALEATORIA',
    pix_chave_variavel: '',
    cliente: true,
    fornecedor: true,
    corretor: false,
    ativo: true,
    categoria_ids: []
  };
}

function normalizeDocumento(value) {
  return onlyDigits(value);
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function pickParceiroFormData(parceiro = {}) {
  return {
    id: parceiro.id || null,
    cpf_cnpj: maskCpfCnpj(parceiro.cpf_cnpj),
    nome: parceiro.nome || '',
    telefone: maskPhone(parceiro.telefone),
    email: parceiro.email || '',
    rg: parceiro.rg || '',
    data_nascimento: parceiro.data_nascimento || '',
    nacionalidade: parceiro.nacionalidade || '',
    profissao: parceiro.profissao || '',
    estado_civil: parceiro.estado_civil || '',
    endereco: parceiro.endereco || '',
    numero: parceiro.numero || '',
    complemento: parceiro.complemento || '',
    bairro: parceiro.bairro || '',
    cep: maskCep(parceiro.cep),
    municipio: parceiro.municipio || '',
    estado: parceiro.estado || '',
    conjuge_nome: parceiro.conjuge_nome || '',
    regime_bens: parceiro.regime_bens || '',
    creci: parceiro.creci || '',
    pix_chave_fixa_1_tipo: parceiro.pix_chave_fixa_1_tipo || 'CPF',
    pix_chave_fixa_1: parceiro.pix_chave_fixa_1 || '',
    pix_chave_fixa_2_tipo: parceiro.pix_chave_fixa_2_tipo || 'CNPJ',
    pix_chave_fixa_2: parceiro.pix_chave_fixa_2 || '',
    pix_chave_variavel_tipo: parceiro.pix_chave_variavel_tipo || 'ALEATORIA',
    pix_chave_variavel: parceiro.pix_chave_variavel || '',
    cliente: parceiro.cliente !== false,
    fornecedor: parceiro.fornecedor !== false,
    corretor: parceiro.corretor === true,
    ativo: parceiro.ativo !== false,
    categoria_ids: Array.isArray(parceiro.categorias)
      ? parceiro.categorias.map((categoria) => categoria.id)
      : []
  };
}

function formatPixKeys(parceiro) {
  return [
    parceiro.pix_chave_fixa_1 ? `${parceiro.pix_chave_fixa_1_tipo || 'PIX'} ${parceiro.pix_chave_fixa_1}` : '',
    parceiro.pix_chave_fixa_2 ? `${parceiro.pix_chave_fixa_2_tipo || 'PIX'} ${parceiro.pix_chave_fixa_2}` : '',
    parceiro.pix_chave_variavel ? `${parceiro.pix_chave_variavel_tipo || 'PIX'} ${parceiro.pix_chave_variavel}` : ''
  ].filter(Boolean).join(' | ');
}

export default function Parceiros() {
  const [parceiros, setParceiros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [parceiroForm, setParceiroForm] = useState(null); // null = painel fechado
  // ?q= da busca universal abre a lista já filtrada.
  const [filtro, setFiltro] = useState(() => (
    new URLSearchParams(window.location.search).get('q') || ''
  ));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState('');
  const [parceiroCarregandoId, setParceiroCarregandoId] = useState(null);
  const [pageSize, setPageSize] = useState('25');
  const [currentPage, setCurrentPage] = useState(1);
  const formRef = useRef(null);
  const inputImportacaoRef = useRef(null);

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const [parceirosData, categoriasData] = await Promise.all([
        buscarParceiros({ ativo: 0, limit: 'all', incluir_categorias: 1 }),
        listarCategoriasParceiro()
      ]);

      setParceiros(Array.isArray(parceirosData) ? parceirosData : []);
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar parceiros');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const parceirosFiltrados = useMemo(() => {
    const search = normalizeSearchText(filtro);
    const documentoSearch = normalizeDocumento(filtro);
    if (!search) {
      return parceiros;
    }

    return parceiros.filter((parceiro) => {
      const nome = normalizeSearchText(parceiro.nome);
      const documento = normalizeSearchText(parceiro.cpf_cnpj);
      const documentoSemPontuacao = normalizeDocumento(parceiro.cpf_cnpj);
      const telefone = normalizeSearchText(parceiro.telefone);
      const pix = normalizeSearchText([
        parceiro.pix_chave_fixa_1,
        parceiro.pix_chave_fixa_2,
        parceiro.pix_chave_variavel
      ].filter(Boolean).join(' '));
      const categoriasParceiro = normalizeSearchText(
        Array.isArray(parceiro.categorias)
          ? parceiro.categorias.map((categoria) => categoria.nome).join(' ')
          : ''
      );

      return (
        nome.includes(search) ||
        documento.includes(search) ||
        Boolean(documentoSearch && documentoSemPontuacao.includes(documentoSearch)) ||
        telefone.includes(search) ||
        pix.includes(search) ||
        categoriasParceiro.includes(search)
      );
    });
  }, [filtro, parceiros]);

  const totalPages = useMemo(() => {
    if (pageSize === 'all') return 1;
    return Math.max(1, Math.ceil(parceirosFiltrados.length / Number(pageSize)));
  }, [pageSize, parceirosFiltrados.length]);

  const parceirosPaginados = useMemo(() => {
    if (pageSize === 'all') return parceirosFiltrados;
    const size = Number(pageSize);
    const start = (currentPage - 1) * size;
    return parceirosFiltrados.slice(start, start + size);
  }, [currentPage, pageSize, parceirosFiltrados]);

  const paginationInfo = useMemo(() => {
    if (parceirosFiltrados.length === 0) {
      return { start: 0, end: 0 };
    }
    if (pageSize === 'all') {
      return { start: 1, end: parceirosFiltrados.length };
    }
    const size = Number(pageSize);
    const start = (currentPage - 1) * size + 1;
    const end = Math.min(start + size - 1, parceirosFiltrados.length);
    return { start, end };
  }, [currentPage, pageSize, parceirosFiltrados.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filtro, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function abrirNovaPessoa() {
    setParceiroForm(defaultParceiroForm());
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function fecharForm() {
    setParceiroForm(null);
  }

  async function handleSalvar(event) {
    event.preventDefault();
    if (!isValidCpfCnpj(parceiroForm.cpf_cnpj)) {
      setError('Informe um CPF/CNPJ valido.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        ...parceiroForm,
        cpf_cnpj: normalizeDocumento(parceiroForm.cpf_cnpj),
        telefone: onlyDigits(parceiroForm.telefone),
        cep: onlyDigits(parceiroForm.cep)
      };

      if (parceiroForm.id) {
        await atualizarParceiro(parceiroForm.id, payload);
      } else {
        await criarParceiro(payload);
      }

      setParceiroForm(null);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar parceiro');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditarParceiro(parceiro) {
    if (!parceiro?.id) return;

    try {
      setError('');
      setParceiroCarregandoId(parceiro.id);
      const parceiroCompleto = await buscarParceiroPorId(parceiro.id);
      setParceiroForm(pickParceiroFormData(parceiroCompleto));
      requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      setError(err?.message || 'Erro ao carregar os dados completos da pessoa');
    } finally {
      setParceiroCarregandoId(null);
    }
  }

  async function handleBaixarModelo() {
    try {
      setError('');
      await baixarModeloParceiros();
    } catch (err) {
      setError(err?.message || 'Erro ao baixar modelo de pessoas');
    }
  }

  async function handleExportar() {
    try {
      setError('');
      await exportarParceiros();
    } catch (err) {
      setError(err?.message || 'Erro ao exportar pessoas');
    }
  }

  async function handleImportarParceiros(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImporting(true);
      setError('');
      setImportResult(null);
      const result = await importarParceiros(file);
      setImportResult(result);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao importar pessoas');
    } finally {
      setImporting(false);
    }
  }

  function atualizarCampo(campo) {
    return (e) => {
      const valor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setParceiroForm((current) => ({ ...current, [campo]: valor }));
    };
  }

  const formAtivo = parceiroForm !== null;
  const temPix = formAtivo && Boolean(parceiroForm.pix_chave_fixa_1 || parceiroForm.pix_chave_fixa_2 || parceiroForm.pix_chave_variavel);
  const temDadosContrato = formAtivo && Boolean(
    parceiroForm.rg || parceiroForm.data_nascimento || parceiroForm.nacionalidade || parceiroForm.profissao
    || parceiroForm.estado_civil || parceiroForm.creci || parceiroForm.conjuge_nome || parceiroForm.regime_bens
  );
  const temEndereco = formAtivo && Boolean(
    parceiroForm.endereco || parceiroForm.numero || parceiroForm.complemento || parceiroForm.bairro
    || parceiroForm.cep || parceiroForm.municipio || parceiroForm.estado
  );

  const colunas = [
    {
      id: 'pessoa',
      titulo: 'Pessoa',
      largura: 240,
      minWidth: 170,
      noCard: 'titulo',
      render: (p) => <CelulaDupla principal={p.nome} sub={p.municipio || null} />
    },
    {
      id: 'documento',
      titulo: 'Documento',
      largura: 150,
      render: (p) => p.cpf_cnpj || '-'
    },
    {
      id: 'contato',
      titulo: 'Contato',
      largura: 190,
      render: (p) => <CelulaDupla principal={p.telefone || '-'} sub={p.email || 'Sem email'} />
    },
    {
      id: 'perfil',
      titulo: 'Perfil',
      largura: 180,
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.cliente && <span className="fx-badge fx-badge--info">Cliente</span>}
          {p.fornecedor && <span className="fx-badge fx-badge--neutral">Credor</span>}
          {p.corretor && <span className="fx-badge fx-badge--neutral">Corretor</span>}
        </div>
      )
    },
    {
      id: 'pix',
      titulo: 'PIX',
      largura: 190,
      render: (p) => {
        const pixKeys = formatPixKeys(p);
        return <div className="truncate" title={pixKeys || '-'}>{pixKeys || '-'}</div>;
      }
    },
    {
      id: 'categorias',
      titulo: 'Categorias',
      largura: 170,
      render: (p) => {
        const nomes = Array.isArray(p.categorias) && p.categorias.length > 0
          ? p.categorias.map((categoria) => categoria.nome).join(', ')
          : 'Sem categoria';
        return <div className="truncate" title={nomes}>{nomes}</div>;
      }
    },
    {
      id: 'status',
      titulo: 'Status',
      largura: 96,
      render: (p) => <StatusBadge status={p.ativo ? 'Ativo' : 'Inativo'} />
    }
  ];

  return (
    <div className="page solicitacoes-page">
      <PageHeader
        titulo="Cadastro de Pessoas"
        subtitulo="Cadastro mestre de clientes, credores, fornecedores e corretores usado nas solicitacoes, financeiro, comercial e cotacoes."
        acaoPrincipal={{ rotulo: 'Nova pessoa', onClick: abrirNovaPessoa }}
        mais={[
          { rotulo: 'Baixar modelo de importacao', onClick: handleBaixarModelo },
          { rotulo: 'Exportar pessoas', onClick: handleExportar },
          {
            rotulo: importing ? 'Importando…' : 'Importar pessoas (.xlsx/.csv)',
            desabilitada: importing,
            onClick: () => inputImportacaoRef.current?.click()
          }
        ]}
      />

      <input
        ref={inputImportacaoRef}
        type="file"
        className="hidden"
        accept=".xlsx,.xls,.csv"
        disabled={importing}
        onChange={handleImportarParceiros}
      />

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {importResult && (
          <BlocoConteudo
            titulo={`Resultado da importacao: ${importResult.importados || 0} novo(s), ${importResult.atualizados || 0} atualizado(s), ${importResult.ignorados || 0} ignorado(s)`}
            variante="secundario"
            acoes={(
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setImportResult(null)}>
                Fechar
              </button>
            )}
          >
            {Array.isArray(importResult.categorias_criadas) && importResult.categorias_criadas.length > 0 && (
              <p className="app-note">Categorias criadas: {importResult.categorias_criadas.join(', ')}</p>
            )}
            {Array.isArray(importResult.erros) && importResult.erros.length > 0 && (
              <div className="app-alert app-alert--error mt-2">
                <div>
                  <div className="font-semibold">Linhas com erro:</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {importResult.erros.slice(0, 8).map((erro) => (
                      <li key={`${erro.linha}-${erro.erro}`}>
                        Linha {erro.linha}: {erro.erro}
                      </li>
                    ))}
                  </ul>
                  {importResult.erros.length > 8 && (
                    <div className="mt-1">Mais {importResult.erros.length - 8} erro(s) oculto(s).</div>
                  )}
                </div>
              </div>
            )}
          </BlocoConteudo>
        )}

        {/* PADRÃO DE TELA MISTA (piloto aprovado 02/09): a lista é o bloco
            principal em largura total; o formulário abre como painel ACIMA
            dela quando acionado (Nova pessoa / Editar) e, enquanto ativo,
            assume a barra de cor — um primário por tela, a hierarquia segue
            o foco. Mesma rota, mesmos handlers, nenhum comportamento novo. */}
        {formAtivo && (
          <div ref={formRef} key={parceiroForm.id || 'novo'}>
            <BlocoConteudo
              titulo={parceiroForm.id ? `Editar pessoa — ${parceiroForm.nome || ''}` : 'Nova pessoa'}
              variante="primario"
              cor="var(--sem-info)"
              acoes={(
                <button type="button" className="btn btn-outline btn-sm" onClick={fecharForm}>
                  Fechar
                </button>
              )}
            >
              <form className="space-y-4" onSubmit={handleSalvar}>
                <FormSecao legenda="Identificacao" colunas={2}>
                  <CampoForm label="CPF/CNPJ" obrigatorio>
                    <input
                      className="input w-full"
                      value={parceiroForm.cpf_cnpj}
                      onChange={(e) => setParceiroForm((current) => ({ ...current, cpf_cnpj: maskCpfCnpj(e.target.value) }))}
                      onBlur={() => {
                        if (parceiroForm.cpf_cnpj && !isValidCpfCnpj(parceiroForm.cpf_cnpj)) setError('Informe um CPF/CNPJ valido.');
                      }}
                      required
                    />
                  </CampoForm>
                  <CampoForm label="Telefone" obrigatorio>
                    <input
                      className="input w-full"
                      value={parceiroForm.telefone}
                      onChange={(e) => setParceiroForm((current) => ({ ...current, telefone: maskPhone(e.target.value) }))}
                      required
                    />
                  </CampoForm>
                  <CampoForm label="Nome" obrigatorio span={2}>
                    <input className="input w-full" value={parceiroForm.nome} onChange={atualizarCampo('nome')} required />
                  </CampoForm>
                  <CampoForm label="E-mail" span={2}>
                    <input className="input w-full" value={parceiroForm.email} onChange={atualizarCampo('email')} />
                  </CampoForm>
                </FormSecao>

                <FormSecao legenda="Vinculos da pessoa" colunas={2}>
                  <div className="form-campo--linha flex flex-wrap gap-4 text-sm text-[var(--c-text)]">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={parceiroForm.cliente} onChange={atualizarCampo('cliente')} />
                      Cliente
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={parceiroForm.fornecedor} onChange={atualizarCampo('fornecedor')} />
                      Credor / Fornecedor
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={parceiroForm.corretor} onChange={atualizarCampo('corretor')} />
                      Corretor
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={parceiroForm.ativo} onChange={atualizarCampo('ativo')} />
                      Ativo
                    </label>
                  </div>
                  <div className="form-campo--linha">
                    <span className="form-label">Categorias</span>
                    {categorias.length === 0 ? (
                      <div className="text-sm text-[var(--c-muted)]">Nenhuma categoria de parceiro cadastrada.</div>
                    ) : (
                      <div className="app-checkbox-grid mt-1 max-h-[180px] overflow-y-auto rounded-xl border border-[var(--c-border)] p-3 md:grid-cols-3">
                        {categorias.map((categoria) => (
                          <label key={categoria.id} className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                            <input
                              type="checkbox"
                              checked={parceiroForm.categoria_ids.includes(categoria.id)}
                              onChange={(e) => {
                                setParceiroForm((current) => {
                                  const currentIds = new Set(current.categoria_ids);
                                  if (e.target.checked) {
                                    currentIds.add(categoria.id);
                                  } else {
                                    currentIds.delete(categoria.id);
                                  }
                                  return { ...current, categoria_ids: Array.from(currentIds) };
                                });
                              }}
                            />
                            <span>{categoria.nome}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </FormSecao>

                <BlocoConteudo
                  titulo="Chaves PIX (uso financeiro)"
                  variante="secundario"
                  recolhivel
                  recolhidoPadrao={!temPix}
                >
                  <p className="app-note mb-2">Ate duas chaves fixas e uma chave variavel.</p>
                  {[
                    ['pix_chave_fixa_1_tipo', 'pix_chave_fixa_1', 'Chave PIX fixa 1'],
                    ['pix_chave_fixa_2_tipo', 'pix_chave_fixa_2', 'Chave PIX fixa 2'],
                    ['pix_chave_variavel_tipo', 'pix_chave_variavel', 'Chave PIX variavel']
                  ].map(([campoTipo, campoChave, rotulo]) => (
                    <div key={campoChave} className="mb-2 grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                      <select className="input w-full" value={parceiroForm[campoTipo]} onChange={atualizarCampo(campoTipo)} aria-label={`Tipo da ${rotulo}`}>
                        {PIX_TIPOS_CHAVE.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                      </select>
                      <input className="input w-full" placeholder={rotulo} value={parceiroForm[campoChave]} onChange={atualizarCampo(campoChave)} />
                    </div>
                  ))}
                </BlocoConteudo>

                <BlocoConteudo
                  titulo="Dados para contrato"
                  variante="secundario"
                  recolhivel
                  recolhidoPadrao={!temDadosContrato}
                >
                  <div className="form-grid">
                    <CampoForm label="RG">
                      <input className="input w-full" value={parceiroForm.rg} onChange={(e) => setParceiroForm((current) => ({ ...current, rg: maskRg(e.target.value) }))} />
                    </CampoForm>
                    <CampoForm label="Nascimento">
                      <input className="input w-full" type="date" value={parceiroForm.data_nascimento} onChange={atualizarCampo('data_nascimento')} />
                    </CampoForm>
                    <CampoForm label="Nacionalidade">
                      <input className="input w-full" value={parceiroForm.nacionalidade} onChange={atualizarCampo('nacionalidade')} />
                    </CampoForm>
                    <CampoForm label="Profissao">
                      <input className="input w-full" value={parceiroForm.profissao} onChange={atualizarCampo('profissao')} />
                    </CampoForm>
                    <CampoForm label="Estado civil">
                      <input className="input w-full" value={parceiroForm.estado_civil} onChange={atualizarCampo('estado_civil')} />
                    </CampoForm>
                    <CampoForm label="CRECI">
                      <input className="input w-full" value={parceiroForm.creci} onChange={(e) => setParceiroForm((current) => ({ ...current, creci: maskCreci(e.target.value) }))} />
                    </CampoForm>
                    <CampoForm label="Conjuge">
                      <input className="input w-full" value={parceiroForm.conjuge_nome} onChange={atualizarCampo('conjuge_nome')} />
                    </CampoForm>
                    <CampoForm label="Regime de bens">
                      <input className="input w-full" value={parceiroForm.regime_bens} onChange={atualizarCampo('regime_bens')} />
                    </CampoForm>
                  </div>
                </BlocoConteudo>

                <BlocoConteudo
                  titulo="Endereco"
                  variante="secundario"
                  recolhivel
                  recolhidoPadrao={!temEndereco}
                >
                  <div className="form-grid">
                    <CampoForm label="Endereco">
                      <input className="input w-full" value={parceiroForm.endereco} onChange={atualizarCampo('endereco')} />
                    </CampoForm>
                    <CampoForm label="Numero">
                      <input className="input w-full" value={parceiroForm.numero} onChange={atualizarCampo('numero')} />
                    </CampoForm>
                    <CampoForm label="Complemento">
                      <input className="input w-full" value={parceiroForm.complemento} onChange={atualizarCampo('complemento')} />
                    </CampoForm>
                    <CampoForm label="Bairro">
                      <input className="input w-full" value={parceiroForm.bairro} onChange={atualizarCampo('bairro')} />
                    </CampoForm>
                    <CampoForm label="CEP">
                      <input className="input w-full" value={parceiroForm.cep} onChange={(e) => setParceiroForm((current) => ({ ...current, cep: maskCep(e.target.value) }))} />
                    </CampoForm>
                    <CampoForm label="Municipio">
                      <input className="input w-full" value={parceiroForm.municipio} onChange={atualizarCampo('municipio')} />
                    </CampoForm>
                    <CampoForm label="UF">
                      <input className="input w-full" maxLength={2} value={parceiroForm.estado} onChange={(e) => setParceiroForm((current) => ({ ...current, estado: e.target.value.toUpperCase() }))} />
                    </CampoForm>
                  </div>
                </BlocoConteudo>

                <div className="app-actionbar">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : parceiroForm.id ? 'Salvar alteracoes' : 'Criar pessoa'}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={fecharForm}>
                    Cancelar
                  </button>
                </div>
              </form>
            </BlocoConteudo>
          </div>
        )}

        <BlocoConteudo
          titulo="Pessoas cadastradas"
          variante={formAtivo ? 'neutro' : 'primario'}
          cor="var(--c-primary)"
          acoes={(
            <input
              className="input input-sm app-busca"
              placeholder="Buscar pessoa"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          )}
        >
          {loading ? (
            <div className="app-empty-card">Carregando parceiros...</div>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-[var(--c-muted)]">
                  Exibindo <strong className="text-[var(--c-text)]">{paginationInfo.start}</strong>-
                  <strong className="text-[var(--c-text)]">{paginationInfo.end}</strong> de{' '}
                  <strong className="text-[var(--c-text)]">{parceirosFiltrados.length}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-sm font-medium text-[var(--c-muted)]" htmlFor="pessoas-page-size">
                    Listar
                  </label>
                  <select
                    id="pessoas-page-size"
                    className="input input-sm w-28"
                    value={pageSize}
                    onChange={(event) => setPageSize(event.target.value)}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option === 'all' ? 'Todos' : option}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={pageSize === 'all' || currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-[var(--c-muted)]">
                    {pageSize === 'all' ? 'Pagina unica' : `${currentPage}/${totalPages}`}
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    disabled={pageSize === 'all' || currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Proxima
                  </button>
                </div>
              </div>

              <TabelaPadrao
                colunas={colunas}
                itens={parceirosPaginados}
                storageKey="tabela:parceiros"
                larguraAcoes={130}
                aoClicarLinha={handleEditarParceiro}
                vazio={{ title: 'Nenhuma pessoa encontrada' }}
                acoesLinha={(p) => (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleEditarParceiro(p)}
                    disabled={parceiroCarregandoId === p.id}
                  >
                    {parceiroCarregandoId === p.id ? 'Carregando...' : 'Editar'}
                  </button>
                )}
              />
            </>
          )}
        </BlocoConteudo>
      </div>
    </div>
  );
}
