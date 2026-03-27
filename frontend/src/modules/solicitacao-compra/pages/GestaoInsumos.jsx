import { useEffect, useMemo, useState } from 'react';
import {
  atualizarInsumo,
  criarInsumo,
  deletarInsumo,
  importarInsumosEmMassa,
  listarCategorias,
  listarInsumos,
  listarUnidades
} from '../../../services/compras';

const initialForm = {
  nome: '',
  codigo: '',
  descricao: '',
  unidade_id: '',
  unidade_manual: '',
  categoria_id: ''
};

export default function GestaoInsumos() {
  const [insumos, setInsumos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [modalImportacaoAberto, setModalImportacaoAberto] = useState(false);
  const [importacaoTexto, setImportacaoTexto] = useState('');
  const [importacaoUnidadeId, setImportacaoUnidadeId] = useState('');
  const [importacaoCategoriaId, setImportacaoCategoriaId] = useState('');
  const [importandoEmMassa, setImportandoEmMassa] = useState(false);
  const [resultadoImportacao, setResultadoImportacao] = useState(null);

  async function carregarContexto() {
    try {
      const [listaInsumos, listaUnidades, listaCategorias] = await Promise.all([
        listarInsumos(categoriaFiltro ? { categoria_id: categoriaFiltro } : {}),
        listarUnidades(),
        listarCategorias()
      ]);

      setInsumos(Array.isArray(listaInsumos) ? listaInsumos : []);
      setUnidades(Array.isArray(listaUnidades) ? listaUnidades : []);
      setCategorias(Array.isArray(listaCategorias) ? listaCategorias : []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar cadastros de insumos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    carregarContexto();
  }, [categoriaFiltro]);

  const insumosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return insumos;

    return insumos.filter((item) =>
      [item.nome, item.codigo, item.descricao, item.categoria?.nome, item.unidade?.sigla]
        .some((valor) => String(valor || '').toLowerCase().includes(termo))
    );
  }, [busca, insumos]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(initialForm);
    setModalAberto(true);
  }

  function abrirEdicao(item) {
    setEditandoId(item.id);
    setForm({
      nome: item.nome || '',
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      unidade_id: item.unidade_id ? String(item.unidade_id) : '',
      unidade_manual: item.unidade_manual || '',
      categoria_id: item.categoria_id ? String(item.categoria_id) : ''
    });
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditandoId(null);
    setForm(initialForm);
  }

  async function handleSalvar(event) {
    event.preventDefault();

    if (!form.nome.trim()) {
      alert('Informe o nome.');
      return;
    }

    if (!form.unidade_id && !form.unidade_manual.trim()) {
      alert('Selecione uma unidade ou informe uma unidade manual.');
      return;
    }

    const payload = {
      nome: form.nome,
      codigo: form.codigo || null,
      descricao: form.descricao || null,
      unidade_id: form.unidade_id ? Number(form.unidade_id) : null,
      unidade_manual: form.unidade_manual || null,
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null
    };

    try {
      setSalvando(true);
      if (editandoId) {
        await atualizarInsumo(editandoId, payload);
      } else {
        await criarInsumo(payload);
      }
      fecharModal();
      setLoading(true);
      await carregarContexto();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar insumo');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id) {
    if (!window.confirm('Deseja excluir este insumo?')) {
      return;
    }

    try {
      await deletarInsumo(id);
      setLoading(true);
      await carregarContexto();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao excluir insumo');
    }
  }

  function abrirModalImportacao() {
    setImportacaoTexto('');
    setImportacaoUnidadeId('');
    setImportacaoCategoriaId('');
    setResultadoImportacao(null);
    setModalImportacaoAberto(true);
  }

  function fecharModalImportacao() {
    setModalImportacaoAberto(false);
    setImportacaoTexto('');
    setImportacaoUnidadeId('');
    setImportacaoCategoriaId('');
    setResultadoImportacao(null);
  }

  async function handleImportarEmMassa(event) {
    event.preventDefault();

    const linhas = importacaoTexto
      .split('\n')
      .map(linha => linha.trim())
      .filter(linha => linha.length > 0);

    if (linhas.length === 0) {
      alert('Cole pelo menos um insumo.');
      return;
    }

    try {
      setImportandoEmMassa(true);
      const resultado = await importarInsumosEmMassa({
        insumos: linhas,
        unidade_id: importacaoUnidadeId ? Number(importacaoUnidadeId) : null,
        categoria_id: importacaoCategoriaId ? Number(importacaoCategoriaId) : null
      });

      setResultadoImportacao(resultado);
      
      if (resultado.sucesso > 0) {
        setLoading(true);
        await carregarContexto();
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao importar insumos em massa');
    } finally {
      setImportandoEmMassa(false);
    }
  }

  return (
    <div className="page">
      <div>
        <h1 className="page-title">Gestao de Insumos</h1>
        <p className="page-subtitle">Cadastro de insumos vinculados a unidades e categorias do modulo compras.</p>
      </div>

      <div className="card">
        <div className="grid gap-3 md:grid-cols-[1fr_240px_auto_auto]">
          <input
            className="input"
            placeholder="Buscar por nome, codigo, descricao ou categoria"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          <select
            className="input"
            value={categoriaFiltro}
            onChange={(event) => setCategoriaFiltro(event.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((item) => (
              <option key={item.id} value={item.id}>{item.nome}</option>
            ))}
          </select>
          <button type="button" className="btn btn-outline" onClick={abrirModalImportacao}>
            Importar em massa
          </button>
          <button type="button" className="btn btn-primary" onClick={abrirNovo}>
            Novo insumo
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">Insumos cadastrados</h2>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Codigo</th>
                <th>Unidade</th>
                <th>Categoria</th>
                <th>Descricao</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {insumosFiltrados.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.codigo || '-'}</td>
                  <td>
                    {item.unidade_manual ? (
                      <span className="text-red-600 dark:text-red-400 font-semibold">{item.unidade_manual}</span>
                    ) : (
                      item.unidade?.sigla || item.unidade?.nome || '-'
                    )}
                  </td>
                  <td>{item.categoria?.nome || '-'}</td>
                  <td>{item.descricao || '-'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-outline" onClick={() => abrirEdicao(item)}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => handleExcluir(item.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {insumosFiltrados.length === 0 && (
                <tr>
                  <td colSpan="6" align="center">Nenhum insumo cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-2xl">
            <div className="card-header">
              <h2 className="font-semibold">{editandoId ? 'Editar insumo' : 'Novo insumo'}</h2>
            </div>
            <form onSubmit={handleSalvar} className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  Nome
                  <input
                    className="input"
                    value={form.nome}
                    onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Codigo
                  <input
                    className="input"
                    value={form.codigo}
                    onChange={(event) => setForm((atual) => ({ ...atual, codigo: event.target.value }))}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Unidade
                  <select
                    className="input"
                    value={form.unidade_id}
                    onChange={(event) => setForm((atual) => ({ ...atual, unidade_id: event.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {unidades.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sigla} - {item.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Categoria
                  <select
                    className="input"
                    value={form.categoria_id}
                    onChange={(event) => setForm((atual) => ({ ...atual, categoria_id: event.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {categorias.map((item) => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-1 text-sm">
                Descricao
                <textarea
                  className="input min-h-[110px]"
                  value={form.descricao}
                  onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))}
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-outline" onClick={fecharModal} disabled={salvando}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalImportacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-2xl">
            <div className="card-header">
              <h2 className="font-semibold">Importar insumos em massa</h2>
            </div>

            {resultadoImportacao ? (
              <div className="grid gap-4">
                <div className={`p-4 rounded-lg ${resultadoImportacao.sucesso > 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                  <p className={`font-semibold ${resultadoImportacao.sucesso > 0 ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                    {resultadoImportacao.sucesso} de {resultadoImportacao.total} insumos importados com sucesso
                  </p>
                </div>

                {resultadoImportacao.erros && resultadoImportacao.erros.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <p className="font-semibold text-yellow-900 dark:text-yellow-200 mb-2">Erros encontrados:</p>
                    <ul className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                      {resultadoImportacao.erros.map((erro, idx) => (
                        <li key={idx}>• {erro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={fecharModalImportacao}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleImportarEmMassa} className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Unidade (opcional)</span>
                    <span className="text-xs text-[var(--c-muted)] mb-1">Selecione uma unidade pré-cadastrada ou deixe em branco</span>
                    <select
                      className="input"
                      value={importacaoUnidadeId}
                      onChange={(event) => setImportacaoUnidadeId(event.target.value)}
                    >
                      <option value="">Nenhuma (entrada manual)</option>
                      {unidades.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sigla} - {item.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">Categoria (opcional)</span>
                    <span className="text-xs text-[var(--c-muted)] mb-1">Todos os insumos receberão esta categoria</span>
                    <select
                      className="input"
                      value={importacaoCategoriaId}
                      onChange={(event) => setImportacaoCategoriaId(event.target.value)}
                    >
                      <option value="">Nenhuma</option>
                      {categorias.map((item) => (
                        <option key={item.id} value={item.id}>{item.nome}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Insumos (um por linha)</span>
                    <span className="text-xs text-[var(--c-muted)]">
                      {importacaoTexto.split('\n').filter(l => l.trim()).length} insumo(s)
                    </span>
                  </div>
                  <textarea
                    className="input min-h-[200px] font-mono text-sm"
                    placeholder="Parafuso M8&#10;Prego 2.5&#10;Cimento Portland&#10;Areia média&#10;Brita 1"
                    value={importacaoTexto}
                    onChange={(event) => setImportacaoTexto(event.target.value)}
                    required
                  />
                </label>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-900 dark:text-blue-200">
                  <p className="font-semibold mb-2">Como funciona:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Unidade selecionada:</strong> Todos os insumos usarão esta unidade</li>
                    <li><strong>Unidade manual:</strong> Deixe em branco e adicione a unidade manualmente depois (aparecerá em vermelho no PDF)</li>
                    <li>Cole um nome de insumo por linha</li>
                    <li>Linhas vazias serão ignoradas</li>
                    <li>Insumos duplicados não serão criados</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={fecharModalImportacao}
                    disabled={importandoEmMassa}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={importandoEmMassa}
                  >
                    {importandoEmMassa ? 'Importando...' : 'Importar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
