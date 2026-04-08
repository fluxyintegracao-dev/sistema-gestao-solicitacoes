import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  criarProvisaoFinanceira,
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento
} from '../../../services/provisoesFinanceiras';
import {
  formatarMoedaBRL,
  normalizarEntradaMoeda
} from '../utils/moeda';

function formatarObra(obra) {
  if (!obra) return '-';
  return `${obra.codigo ? `${obra.codigo} - ` : ''}${obra.nome}`;
}

export default function NovaProvisaoFinanceira() {
  const navigate = useNavigate();
  const [contexto, setContexto] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [valorPrevistoTexto, setValorPrevistoTexto] = useState('');
  const [form, setForm] = useState({
    obra_id: '',
    data_prevista_desembolso: '',
    item_macro: '',
    descricao: '',
    valor_previsto: '',
    fornecedor_texto: '',
    prioridade: '',
    status: 'previsto'
  });

  useEffect(() => {
    async function carregar() {
      try {
        setLoading(true);
        const [contextoData, categoriasData] = await Promise.all([
          getProvisionamentoFinanceiroContexto(),
          listarCategoriasMacroProvisionamento()
        ]);
        setContexto(contextoData);
        setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
      } catch (error) {
        console.error(error);
        alert(error?.message || 'Erro ao carregar formulario de provisionamento financeiro.');
      } finally {
        setLoading(false);
      }
    }

    carregar();
  }, []);

  const obrasCriacao = useMemo(() => (
    Array.isArray(contexto?.obras_criacao) ? contexto.obras_criacao : []
  ), [contexto]);

  function atualizarCampo(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarValorPrevisto(raw) {
    const { textoFormatado, valorNumerico } = normalizarEntradaMoeda(raw);
    setValorPrevistoTexto(textoFormatado);
    setForm((atual) => ({
      ...atual,
      valor_previsto: valorNumerico
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.obra_id || !form.data_prevista_desembolso || !form.item_macro.trim() || !form.descricao.trim() || !form.valor_previsto) {
      alert('Preencha obra, data prevista, item macro, descricao e valor previsto.');
      return;
    }

    try {
      setSaving(true);
      const provisao = await criarProvisaoFinanceira({
        ...form,
        obra_id: Number(form.obra_id)
      });
      navigate(`/provisoes-financeiras/${provisao.id}`);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar provisao financeira.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page"><p>Carregando formulario...</p></div>;
  }

  return (
    <div className="page space-y-6">
      <div>
        <h1 className="page-title">Nova Provisao Financeira</h1>
        <p className="page-subtitle">Registre uma previsao gerencial de desembolso para acompanhamento futuro.</p>
      </div>

      <form className="card space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 text-sm">
            Obra *
            <select className="input" value={form.obra_id} onChange={(event) => atualizarCampo('obra_id', event.target.value)}>
              <option value="">Selecione...</option>
              {obrasCriacao.map((obra) => (
                <option key={obra.id} value={obra.id}>{formatarObra(obra)}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Data prevista de desembolso *
            <input type="date" className="input" value={form.data_prevista_desembolso} onChange={(event) => atualizarCampo('data_prevista_desembolso', event.target.value)} />
          </label>

          <label className="grid gap-1 text-sm">
            Item Macro *
            <input
              type="text"
              className="input"
              list="provisao-item-macro-opcoes"
              value={form.item_macro}
              onChange={(event) => atualizarCampo('item_macro', event.target.value)}
              placeholder="Ex.: concretagem, locacao, estrutura metalica"
            />
            <datalist id="provisao-item-macro-opcoes">
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.nome} />
              ))}
            </datalist>
          </label>

          <label className="grid gap-1 text-sm xl:col-span-2">
            Descricao *
            <textarea className="input min-h-[120px]" value={form.descricao} onChange={(event) => atualizarCampo('descricao', event.target.value)} placeholder="Ex.: concretagem de laje, compra de insumos, locacao de equipamento" />
          </label>

          <label className="grid gap-1 text-sm">
            Valor previsto *
            <input
              type="text"
              inputMode="numeric"
              className="input"
              value={valorPrevistoTexto}
              onChange={(event) => atualizarValorPrevisto(event.target.value)}
              placeholder={formatarMoedaBRL(0)}
            />
          </label>

          <label className="grid gap-1 text-sm">
            Fornecedor (texto)
            <input className="input" value={form.fornecedor_texto} onChange={(event) => atualizarCampo('fornecedor_texto', event.target.value)} placeholder="Opcional" />
          </label>

          <label className="grid gap-1 text-sm">
            Prioridade
            <select className="input" value={form.prioridade} onChange={(event) => atualizarCampo('prioridade', event.target.value)}>
              <option value="">Nao definida</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm">
            Status inicial
            <select className="input" value={form.status} onChange={(event) => atualizarCampo('status', event.target.value)}>
              <option value="previsto">Previsto</option>
              <option value="em_analise">Em analise</option>
            </select>
          </label>

        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Nesta etapa do modulo, os anexos sao adicionados apos a criacao do registro, na tela de detalhe.
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/provisoes-financeiras')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar provisao'}
          </button>
        </div>
      </form>
    </div>
  );
}
