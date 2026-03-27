import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  baixarModeloCotacaoPublica,
  obterCotacaoPublica,
  responderCotacaoPublica,
  uploadPlanilhaCotacaoPublica
} from '../../../services/compras';

function formatarData(data) {
  if (!data) return '-';
  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return '-';
  return valor.toLocaleDateString('pt-BR');
}

export default function CotacaoFornecedorPublica() {
  const { token } = useParams();
  const [dados, setDados] = useState(null);
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoPlanilha, setEnviandoPlanilha] = useState(false);

  async function carregar() {
    try {
      setLoading(true);
      const data = await obterCotacaoPublica(token);
      setDados(data || null);
      setItens(Array.isArray(data?.itens) ? data.itens : []);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar cotacao');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [token]);

  function atualizarItem(index, campo, valor) {
    setItens((atual) =>
      atual.map((item, itemIndex) => (itemIndex === index ? { ...item, [campo]: valor } : item))
    );
  }

  async function handleSalvarOnline() {
    try {
      setSalvando(true);
      await responderCotacaoPublica(token, {
        itens: itens.map((item) => ({
          item_tipo: item.item_tipo,
          item_referencia_id: item.item_referencia_id,
          disponivel: Boolean(item.disponivel),
          preco: item.preco,
          prazo: item.prazo,
          observacao: item.observacao
        }))
      });
      await carregar();
      alert('Resposta enviada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao enviar resposta');
    } finally {
      setSalvando(false);
    }
  }

  async function handleBaixarModelo() {
    try {
      const blob = await baixarModeloCotacaoPublica(token);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotacao-${token}.csv`;
      link.click();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao baixar modelo');
    }
  }

  async function handleUploadPlanilha(file) {
    try {
      if (!file) return;
      setEnviandoPlanilha(true);
      await uploadPlanilhaCotacaoPublica(token, file);
      await carregar();
      alert('Planilha importada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao importar planilha');
    } finally {
      setEnviandoPlanilha(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card py-8 text-center text-sm text-[var(--c-muted)]">Carregando cotacao...</div>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="page">
        <div className="card py-8 text-center text-sm text-[var(--c-muted)]">Cotacao nao encontrada.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto grid max-w-6xl gap-4">
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="page-title">Resposta de Cotacao</h1>
              <p className="page-subtitle">
                Preencha os itens online ou baixe o modelo padrao em CSV para responder por planilha.
              </p>
            </div>
            <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              {dados.cotacao?.status || 'EM ABERTO'}
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="grid gap-4">
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">Dados da cotacao</h2>
              </div>
              <div className="grid gap-3 text-sm">
                <div>
                  <div className="text-[var(--c-muted)]">Fornecedor</div>
                  <div className="font-semibold">{dados.fornecedor?.nome || '-'}</div>
                </div>
                <div>
                  <div className="text-[var(--c-muted)]">Obra</div>
                  <div className="font-semibold">{dados.solicitacao?.obra?.nome || '-'}</div>
                </div>
                <div>
                  <div className="text-[var(--c-muted)]">Enviado em</div>
                  <div className="font-semibold">{formatarData(dados.cotacao?.enviado_em)}</div>
                </div>
                <div>
                  <div className="text-[var(--c-muted)]">Respondido em</div>
                  <div className="font-semibold">{formatarData(dados.cotacao?.respondido_em)}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">Planilha padrao</h2>
              </div>
              <div className="grid gap-3">
                <button type="button" className="btn btn-outline" onClick={handleBaixarModelo}>
                  Baixar modelo CSV
                </button>
                <label className={`btn btn-primary cursor-pointer justify-center ${enviandoPlanilha ? 'pointer-events-none opacity-60' : ''}`}>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={(event) => {
                      const [file] = Array.from(event.target.files || []);
                      void handleUploadPlanilha(file);
                      event.target.value = '';
                    }}
                  />
                  {enviandoPlanilha ? 'Importando...' : 'Importar planilha CSV'}
                </label>
                <p className="text-xs text-[var(--c-muted)]">
                  O arquivo deve manter as colunas: produto_id, nome, quantidade, preco, prazo, disponivel.
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Resposta online</h2>
              <span className="text-sm text-[var(--c-muted)]">{itens.length} item(ns)</span>
            </div>

            {dados.somente_leitura ? (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Esta cotacao ja foi encerrada e esta apenas para consulta.
              </div>
            ) : null}

            <div className="grid gap-4">
              {itens.map((item, index) => (
                <div key={`${item.item_tipo}-${item.item_referencia_id}`} className="rounded-xl border border-[var(--c-border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{item.nome}</div>
                      <div className="text-sm text-[var(--c-muted)]">
                        Codigo {item.produto_id} · {item.quantidade} {item.unidade}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={Boolean(item.disponivel)}
                        disabled={dados.somente_leitura}
                        onChange={(event) => atualizarItem(index, 'disponivel', event.target.checked)}
                      />
                      Disponivel
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Preco</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.preco}
                        disabled={dados.somente_leitura}
                        onChange={(event) => atualizarItem(index, 'preco', event.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Prazo</label>
                      <input
                        className="input"
                        value={item.prazo}
                        disabled={dados.somente_leitura}
                        onChange={(event) => atualizarItem(index, 'prazo', event.target.value)}
                        placeholder="Ex.: 7 dias"
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-1">
                      <label className="text-sm font-medium">Necessario para</label>
                      <input className="input" value={formatarData(item.necessario_para)} disabled />
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <label className="text-sm font-medium">Observacao</label>
                    <textarea
                      className="input min-h-[88px]"
                      value={item.observacao}
                      disabled={dados.somente_leitura}
                      onChange={(event) => atualizarItem(index, 'observacao', event.target.value)}
                      placeholder="Detalhes da proposta, marca, condicoes ou restricoes"
                    />
                  </div>
                </div>
              ))}
            </div>

            {!dados.somente_leitura && (
              <div className="mt-6 flex justify-end">
                <button type="button" className="btn btn-primary" onClick={handleSalvarOnline} disabled={salvando}>
                  {salvando ? 'Enviando resposta...' : 'Enviar resposta'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
