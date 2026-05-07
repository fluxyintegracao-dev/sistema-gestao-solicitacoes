import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  criarProvisaoFinanceira,
  getProvisionamentoFinanceiroContexto,
  listarCategoriasMacroProvisionamento,
  uploadAnexosProvisaoFinanceira
} from '../../../services/provisoesFinanceiras';
import {
  formatarMoedaBRL,
  normalizarEntradaMoeda
} from '../utils/moeda';
import PendingAttachmentsList from '../../../components/attachments/PendingAttachmentsList';
import {
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite
} from '../../../utils/pendingAttachments';

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
  const [arquivosPendentes, setArquivosPendentes] = useState([]);
  const [form, setForm] = useState({
    obra_id: '',
    data_prevista_desembolso: '',
    item_macro: '',
    descricao: '',
    valor_previsto: '',
    fornecedor_texto: '',
    prioridade: ''
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
        alert(error?.message || 'Erro ao carregar formulario de provisao.');
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

  function adicionarArquivos(files) {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivosPendentes, files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivosPendentes(proximoEstado);
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }

  function removerArquivoPendente(index) {
    setArquivosPendentes((atual) => atual.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

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

      if (arquivosPendentes.length) {
        try {
          await uploadAnexosProvisaoFinanceira(provisao.id, extrairFilesAnexosPendentes(arquivosPendentes));
        } catch (uploadError) {
          console.error(uploadError);
          alert(uploadError?.message || 'A provisao foi criada, mas houve erro ao enviar os anexos.');
        }
      }

      navigate(`/provisoes-financeiras/${provisao.id}`);
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao criar provisao.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page"><p>Carregando formulario...</p></div>;
  }

  return (
    <div className="page space-y-6">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="page-title">Nova Provisao</h1>
        <p className="page-subtitle">Registre uma previsao gerencial de desembolso com os dados essenciais do compromisso.</p>
      </div>

      <form className="card mx-auto w-full max-w-5xl space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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

          <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-2">
            Prioridade
            <select className="input" value={form.prioridade} onChange={(event) => atualizarCampo('prioridade', event.target.value)}>
              <option value="">Nao definida</option>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Critica</option>
            </select>
          </label>

          <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-3">
            Item macro *
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

          <label className="grid gap-1 text-sm md:col-span-2 xl:col-span-3">
            Credor
            <input className="input" value={form.fornecedor_texto} onChange={(event) => atualizarCampo('fornecedor_texto', event.target.value)} placeholder="Opcional" />
          </label>

          <label className="grid gap-1 text-sm xl:col-span-2">
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

          <label className="grid gap-1 text-sm xl:col-span-4">
            Descricao *
            <textarea className="input min-h-[110px]" value={form.descricao} onChange={(event) => atualizarCampo('descricao', event.target.value)} placeholder="Descreva o desembolso previsto com contexto suficiente para a equipe entender a provisao." />
          </label>
        </div>

        <div className="grid gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Anexos da provisao</h2>
              <p className="text-xs text-[var(--c-muted)]">Voce pode anexar documentos ja na criacao. Eles serao enviados logo apos o registro ser salvo.</p>
              <p className="text-xs text-[var(--c-muted)]">Limite atual: ate {UPLOAD_MAX_FILE_SIZE_MB_PADRAO} MB por arquivo.</p>
            </div>
            <label className={`btn btn-outline cursor-pointer ${saving ? 'pointer-events-none opacity-60' : ''}`}>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(event) => {
                  adicionarArquivos(event.target.files);
                  event.target.value = '';
                }}
              />
              Adicionar arquivos
            </label>
          </div>

          {arquivosPendentes.length > 0 ? (
            <PendingAttachmentsList
              items={arquivosPendentes}
              onRemove={(index) => removerArquivoPendente(index)}
              className="grid gap-2"
              itemClassName="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--c-border)] bg-white px-3 py-2 text-sm"
              removeButtonClassName="btn btn-outline"
            />
          ) : (
            <div className="text-sm text-[var(--c-muted)]">Nenhum arquivo selecionado.</div>
          )}
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
