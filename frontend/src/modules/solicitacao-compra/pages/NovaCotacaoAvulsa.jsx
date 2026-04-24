import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { criarCotacaoAvulsa } from '../../../services/compras';
import { listarApropriacoes } from '../../../services/apropriacoes';
import { getObras } from '../../../services/obras';

let itemIdCounter = 0;

function novoItem() {
  itemIdCounter += 1;
  return { _id: itemIdCounter, nome: '', quantidade: '', unidade: '', especificacao: '', apropriacao_id: '' };
}

export default function NovaCotacaoAvulsa() {
  const navigate = useNavigate();

  const [titulo, setTitulo] = useState('');
  const [obraId, setObraId] = useState('');
  const [necessarioPara, setNecessarioPara] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState([novoItem()]);
  const [obras, setObras] = useState([]);
  const [apropriacoes, setApropriacoes] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    getObras({ ativo: 1 }).then((data) => {
      setObras(Array.isArray(data) ? data : []);
    }).catch(() => {});

    listarApropriacoes().then((data) => {
      setApropriacoes(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  function updateItem(id, field, value) {
    setItens((prev) => prev.map((item) => item._id === id ? { ...item, [field]: value } : item));
  }

  function adicionarItem() {
    setItens((prev) => [...prev, novoItem()]);
  }

  function removerItem(id) {
    setItens((prev) => prev.filter((item) => item._id !== id || prev.length === 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!titulo.trim()) {
      setErro('Informe um titulo para a cotacao.');
      return;
    }

    const itensValidos = itens.filter((item) => item.nome.trim() && Number(item.quantidade) > 0);
    if (itensValidos.length === 0) {
      setErro('Adicione ao menos um item com nome e quantidade.');
      return;
    }

    try {
      setSalvando(true);
      const payload = {
        titulo: titulo.trim(),
        obra_id: obraId ? Number(obraId) : null,
        necessario_para: necessarioPara || null,
        observacoes: observacoes.trim() || null,
        itens: itensValidos.map((item) => ({
          nome: item.nome.trim(),
          quantidade: Number(item.quantidade),
          unidade: item.unidade.trim() || null,
          especificacao: item.especificacao.trim() || null,
          apropriacao_id: item.apropriacao_id ? Number(item.apropriacao_id) : null
        }))
      };

      const criada = await criarCotacaoAvulsa(payload);
      navigate(`/solicitacoes-compra/${criada.id}`);
    } catch (error) {
      setErro(error.message || 'Erro ao criar cotacao.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Nova Cotacao Avulsa</h1>
            <p className="page-subtitle">
              Crie uma cotacao diretamente, sem abrir uma solicitacao de compra. Ideal para compras urgentes ou consultas rapidas de preco.
            </p>
          </div>
          <div className="app-page-actions">
            <button type="button" className="btn btn-outline" onClick={() => navigate('/solicitacoes-compra')}>
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Dados gerais */}
        <div className="grid gap-4 xl:col-span-1">
          <div className="card sol-surface-card">
            <div className="card-header">
              <h2 className="font-semibold">Dados da Cotacao</h2>
            </div>
            <div className="grid gap-4">
              <div>
                <label className="app-filter-label">Titulo da cotacao *</label>
                <input
                  className="input"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex.: Materiais eletricos - Bloco A"
                />
              </div>

              <div>
                <label className="app-filter-label">Obra (opcional)</label>
                <select className="input" value={obraId} onChange={(e) => setObraId(e.target.value)}>
                  <option value="">Selecionar obra...</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>{o.nome} {o.codigo ? `(${o.codigo})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="app-filter-label">Necessario para</label>
                <input
                  className="input"
                  type="date"
                  value={necessarioPara}
                  onChange={(e) => setNecessarioPara(e.target.value)}
                />
              </div>

              <div>
                <label className="app-filter-label">Observacoes</label>
                <textarea
                  className="input"
                  rows={4}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Condicoes especiais, prazo de entrega exigido, etc."
                />
              </div>
            </div>
          </div>

          <div className="card sol-surface-card border border-amber-200 bg-amber-50">
            <div className="card-header">
              <h2 className="font-semibold text-amber-800">Apropriacoes — uso interno</h2>
            </div>
            <p className="text-sm text-amber-700">
              A apropriacao e visivel apenas para a equipe interna e nao e enviada ao fornecedor no link de cotacao.
            </p>
          </div>

          <div className="card sol-surface-card bg-blue-50 border border-blue-200">
            <div className="card-header">
              <h2 className="font-semibold text-blue-800">Como funciona</h2>
            </div>
            <ol className="grid gap-2 text-sm text-blue-700">
              <li className="flex gap-2"><span className="font-semibold shrink-0">1.</span> Preencha o titulo e adicione os itens que deseja cotar</li>
              <li className="flex gap-2"><span className="font-semibold shrink-0">2.</span> Ao salvar, a cotacao e criada ja pronta para enviar aos fornecedores</li>
              <li className="flex gap-2"><span className="font-semibold shrink-0">3.</span> Selecione os fornecedores por categoria de insumo e envie os links via WhatsApp</li>
              <li className="flex gap-2"><span className="font-semibold shrink-0">4.</span> Compare as respostas e gere o pedido para o(s) fornecedor(es) escolhido(s)</li>
            </ol>
          </div>
        </div>

        {/* Itens */}
        <div className="card sol-surface-card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold">Itens da Cotacao</h2>
            <button type="button" className="btn btn-outline" onClick={adicionarItem}>
              + Adicionar Item
            </button>
          </div>

          <div className="grid gap-3">
            {itens.map((item, index) => (
              <div key={item._id} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4 grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--c-muted)]">Item {index + 1}</span>
                  {itens.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={() => removerItem(item._id)}
                    >
                      Remover
                    </button>
                  )}
                </div>

                {/* Linha principal: descrição, qtd, unidade */}
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_120px_120px]">
                  <div>
                    <label className="app-filter-label">Descricao / Insumo *</label>
                    <input
                      className="input"
                      value={item.nome}
                      onChange={(e) => updateItem(item._id, 'nome', e.target.value)}
                      placeholder="Nome do material ou servico"
                    />
                  </div>
                  <div>
                    <label className="app-filter-label">Quantidade *</label>
                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantidade}
                      onChange={(e) => updateItem(item._id, 'quantidade', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="app-filter-label">Unidade</label>
                    <input
                      className="input"
                      value={item.unidade}
                      onChange={(e) => updateItem(item._id, 'unidade', e.target.value)}
                      placeholder="un, kg, m²..."
                    />
                  </div>
                </div>

                {/* Linha secundária: especificação e apropriação */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="app-filter-label">Especificacao / Marca de referencia</label>
                    <input
                      className="input"
                      value={item.especificacao}
                      onChange={(e) => updateItem(item._id, 'especificacao', e.target.value)}
                      placeholder="Opcional: especificacoes tecnicas..."
                    />
                  </div>
                  <div>
                    <label className="app-filter-label">
                      Apropriacao
                      <span className="ml-1 text-[10px] font-normal rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">
                        interno
                      </span>
                    </label>
                    <select
                      className="input"
                      value={item.apropriacao_id}
                      onChange={(e) => updateItem(item._id, 'apropriacao_id', e.target.value)}
                    >
                      <option value="">Sem apropriacao</option>
                      {apropriacoes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.codigo ? `${a.codigo} — ` : ''}{a.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {erro && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button type="button" className="btn btn-outline" onClick={adicionarItem}>
              + Adicionar Item
            </button>
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              {salvando ? 'Criando cotacao...' : 'Criar Cotacao e Selecionar Fornecedores'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
