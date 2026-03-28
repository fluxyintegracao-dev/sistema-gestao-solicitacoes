import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  baixarPdfSolicitacaoCompra,
  criarFornecedorCompra,
  encerrarSolicitacaoCompra,
  enviarSolicitacaoCompraParaFornecedores,
  integrarSolicitacaoCompra,
  liberarSolicitacaoCompra,
  listarFornecedoresCompra,
  obterComparativoSolicitacaoCompra,
  obterSolicitacaoCompra,
  obterUrlAssinadaCompra
} from '../../../services/compras';
import { useAuth } from '../../../contexts/AuthContext';
import CompraPreviewModal from '../components/CompraPreviewModal';

function formatarData(data) {
  if (!data) {
    return '-';
  }

  const raw = String(data);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) {
    return '-';
  }

  return valor.toLocaleDateString('pt-BR');
}

function formatarStatus(status) {
  return String(status || '-').replace(/_/g, ' ').toUpperCase();
}

function classNameStatus(status) {
  const valor = String(status || '').toUpperCase();

  if (valor === 'ENCERRADO') {
    return 'bg-slate-100 text-slate-700';
  }

  if (valor === 'LIBERADO_PARA_COMPRA') {
    return 'bg-emerald-100 text-emerald-700';
  }

  if (valor === 'INTEGRADO_SIENGE') {
    return 'bg-amber-100 text-amber-700';
  }

  return 'bg-blue-100 text-blue-700';
}

function buildItemKey(item) {
  return `${String(item?.item_tipo || '').toUpperCase()}:${Number(item?.item_referencia_id || 0)}`;
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    alert('Link copiado.');
  } catch {
    alert('Nao foi possivel copiar o link automaticamente.');
  }
}

export default function SolicitacaoCompraDetalheView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [solicitacao, setSolicitacao] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [comparativo, setComparativo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [previewArquivo, setPreviewArquivo] = useState(null);
  const [salvandoIntegracao, setSalvandoIntegracao] = useState(false);
  const [salvandoLiberacao, setSalvandoLiberacao] = useState(false);
  const [enviandoFornecedores, setEnviandoFornecedores] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [numeroSienge, setNumeroSienge] = useState('');
  const [fornecedoresSelecionados, setFornecedoresSelecionados] = useState([]);
  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    contato: ''
  });
  const [vencedoresSelecionados, setVencedoresSelecionados] = useState({});

  const perfilUpper = String(user?.perfil || '').toUpperCase();
  const tokens = [
    String(user?.area || '').toUpperCase(),
    String(user?.setor?.codigo || '').toUpperCase(),
    String(user?.setor?.nome || '').toUpperCase()
  ];
  const podeIntegrar =
    perfilUpper === 'SUPERADMIN' ||
    perfilUpper === 'ADMIN' ||
    tokens.includes('GEO') ||
    tokens.includes('GERENCIA DE PROCESSOS') ||
    tokens.includes('GESTAO DE PROCESSOS') ||
    tokens.includes('GERENCIA_PROCESSOS') ||
    tokens.includes('GESTAO_PROCESSOS');
  const podeComprar =
    perfilUpper === 'SUPERADMIN' ||
    perfilUpper === 'ADMIN' ||
    tokens.includes('COMPRAS');

  async function carregarTudo() {
    try {
      setLoading(true);
      const [dataSolicitacao, dataFornecedores] = await Promise.all([
        obterSolicitacaoCompra(id),
        listarFornecedoresCompra()
      ]);

      setSolicitacao(dataSolicitacao || null);
      setNumeroSienge(dataSolicitacao?.numero_sienge || '');
      setFornecedores(Array.isArray(dataFornecedores) ? dataFornecedores : []);

      if ((dataSolicitacao?.fornecedores || []).length > 0) {
        const dataComparativo = await obterComparativoSolicitacaoCompra(id);
        setComparativo(dataComparativo || null);

        const vencedoresAtuais = {};
        (dataComparativo?.itens || []).forEach((item) => {
          const respostaVencedora = (item.respostas || []).find((resposta) => resposta.vencedor);
          if (respostaVencedora?.resposta_item_id) {
            vencedoresAtuais[buildItemKey(item)] = String(respostaVencedora.resposta_item_id);
          }
        });
        setVencedoresSelecionados(vencedoresAtuais);
      } else {
        setComparativo(null);
        setVencedoresSelecionados({});
      }
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao carregar solicitacao de compra');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTudo();
  }, [id]);

  const itensCombinados = useMemo(() => {
    const itens = (solicitacao?.itens || []).map((item) => ({
      item_tipo: 'CADASTRADO',
      nome: item.insumo?.nome || '-',
      unidade: item.unidade?.sigla || '-',
      quantidade: item.quantidade,
      especificacao: item.especificacao || '-',
      apropriacao: item.apropriacao?.codigo || '-',
      necessario_para: item.necessario_para,
      link_produto: item.link_produto || '',
      arquivo_url: item.arquivo_url || '',
      arquivo_nome_original: item.arquivo_nome_original || ''
    }));

    const manuais = (solicitacao?.itensManuais || []).map((item) => ({
      item_tipo: 'MANUAL',
      nome: item.nome_manual || '-',
      unidade: item.unidade_sigla_manual || '-',
      quantidade: item.quantidade,
      especificacao: item.especificacao || '-',
      apropriacao: item.apropriacao?.codigo || '-',
      necessario_para: item.necessario_para,
      link_produto: item.link_produto || '',
      arquivo_url: item.arquivo_url || '',
      arquivo_nome_original: item.arquivo_nome_original || ''
    }));

    return [...itens, ...manuais];
  }, [solicitacao]);

  async function handleAbrirPdf() {
    try {
      setBaixando(true);
      const blob = await baixarPdfSolicitacaoCompra(id);
      const url = window.URL.createObjectURL(blob);
      setPreviewArquivo({
        title: `PDF da solicitacao SC-${String(solicitacao?.id || id).padStart(5, '0')}`,
        name: `SC-${String(solicitacao?.id || id).padStart(5, '0')}.pdf`,
        url
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao abrir PDF');
    } finally {
      setBaixando(false);
    }
  }

  async function handleAbrirArquivo(item) {
    try {
      const url = await obterUrlAssinadaCompra(item?.arquivo_url);
      if (!url) {
        alert('Arquivo nao encontrado.');
        return;
      }

      setPreviewArquivo({
        title: 'Arquivo do item',
        name: item.arquivo_nome_original || 'Arquivo anexado',
        url
      });
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao abrir arquivo do item');
    }
  }

  async function handleIntegrar() {
    try {
      setSalvandoIntegracao(true);
      await integrarSolicitacaoCompra(id, { numero_sienge: numeroSienge });
      await carregarTudo();
      alert('Solicitacao integrada ao Sienge.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao integrar no Sienge');
    } finally {
      setSalvandoIntegracao(false);
    }
  }

  async function handleLiberar() {
    try {
      setSalvandoLiberacao(true);
      await liberarSolicitacaoCompra(id);
      await carregarTudo();
      alert('Solicitacao liberada para compra.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao liberar para compra');
    } finally {
      setSalvandoLiberacao(false);
    }
  }

  async function handleEnviarFornecedores() {
    try {
      const payload = [];

      fornecedoresSelecionados.forEach((fornecedorId) => {
        payload.push({ fornecedor_id: Number(fornecedorId) });
      });

      if (String(novoFornecedor.nome || '').trim()) {
        payload.push({
          nome: novoFornecedor.nome,
          email: novoFornecedor.email,
          whatsapp: novoFornecedor.whatsapp,
          contato: novoFornecedor.contato
        });
      }

      if (!payload.length) {
        alert('Selecione ou cadastre ao menos um fornecedor.');
        return;
      }

      setEnviandoFornecedores(true);
      await enviarSolicitacaoCompraParaFornecedores(id, { fornecedores: payload });
      setFornecedoresSelecionados([]);
      setNovoFornecedor({ nome: '', email: '', whatsapp: '', contato: '' });
      await carregarTudo();
      alert('Links de cotacao gerados com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao enviar para fornecedores');
    } finally {
      setEnviandoFornecedores(false);
    }
  }

  async function handleCriarFornecedorRapido() {
    try {
      if (!String(novoFornecedor.nome || '').trim()) {
        alert('Informe o nome do fornecedor.');
        return;
      }

      const fornecedor = await criarFornecedorCompra(novoFornecedor);
      setFornecedores((atual) => [...atual, fornecedor].sort((a, b) => String(a.nome).localeCompare(String(b.nome))));
      setFornecedoresSelecionados((atual) => [...atual, String(fornecedor.id)]);
      setNovoFornecedor({ nome: '', email: '', whatsapp: '', contato: '' });
      alert('Fornecedor criado e selecionado.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar fornecedor');
    }
  }

  async function handleEncerrar() {
    try {
      const itens = comparativo?.itens || [];
      const vencedores = itens
        .map((item) => vencedoresSelecionados[buildItemKey(item)])
        .filter(Boolean)
        .map((respostaItemId) => ({ resposta_item_id: Number(respostaItemId) }));

      if (!vencedores.length) {
        alert('Selecione ao menos um vencedor para encerrar.');
        return;
      }

      setEncerrando(true);
      await encerrarSolicitacaoCompra(id, { vencedores });
      await carregarTudo();
      alert('Cotacao encerrada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao encerrar cotacao');
    } finally {
      setEncerrando(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card py-8 text-center text-sm text-[var(--c-muted)]">Carregando...</div>
      </div>
    );
  }

  if (!solicitacao) {
    return (
      <div className="page">
        <div className="card py-8 text-center text-sm text-[var(--c-muted)]">Solicitacao de compra nao encontrada.</div>
      </div>
    );
  }

  return (
    <div className="page page-compra-nova">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Centro de Cotacao da Solicitação de Compra</h1>
          <p className="page-subtitle">
            SC-{String(solicitacao.id).padStart(5, '0')} - integracao no Sienge, envio para fornecedores e comparativo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-outline" onClick={() => navigate('/solicitacoes-compra')}>
            Voltar
          </button>
          <button type="button" className="btn btn-primary" onClick={handleAbrirPdf} disabled={baixando}>
            {baixando ? 'Abrindo PDF...' : 'Abrir PDF'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Resumo operacional</h2>
            </div>
            <div className="grid gap-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[var(--c-muted)]">Status</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classNameStatus(solicitacao.status)}`}>
                  {formatarStatus(solicitacao.status)}
                </span>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Obra</div>
                <div className="font-semibold">{solicitacao.obra?.nome || '-'}</div>
                <div className="text-[var(--c-muted)]">{solicitacao.obra?.codigo || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Solicitante</div>
                <div className="font-semibold">{solicitacao.solicitante?.nome || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Numero Sienge</div>
                <div className="font-semibold">{solicitacao.numero_sienge || '-'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Integrado no Sienge</div>
                <div className="font-semibold">{solicitacao.integrado_sienge ? 'Sim' : 'Nao'}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Necessario para</div>
                <div className="font-semibold">{formatarData(solicitacao.necessario_para)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Criada em</div>
                <div className="font-semibold">{formatarData(solicitacao.createdAt)}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Fornecedores vinculados</div>
                <div className="font-semibold">{solicitacao.fornecedores?.length || 0}</div>
              </div>
              <div>
                <div className="text-[var(--c-muted)]">Observacoes</div>
                <div className="whitespace-pre-wrap">{solicitacao.observacoes || '-'}</div>
              </div>
            </div>
          </div>

          {podeIntegrar && !solicitacao.integrado_sienge && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">Integracao Sienge</h2>
              </div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Numero Sienge</label>
                  <input
                    className="input"
                    value={numeroSienge}
                    onChange={(event) => setNumeroSienge(event.target.value)}
                    placeholder="Ex.: PC-2026-001"
                  />
                </div>
                <button type="button" className="btn btn-primary" onClick={handleIntegrar} disabled={salvandoIntegracao}>
                  {salvandoIntegracao ? 'Integrando...' : 'Marcar como integrado'}
                </button>
              </div>
            </div>
          )}

          {podeIntegrar && solicitacao.integrado_sienge && solicitacao.status !== 'LIBERADO_PARA_COMPRA' && solicitacao.status !== 'ENCERRADO' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold">Liberacao para compras</h2>
              </div>
              <div className="grid gap-3">
                <p className="text-sm text-[var(--c-muted)]">
                  A integracao ja foi registrada. Agora a solicitacao pode ser liberada para envio aos fornecedores.
                </p>
                <button type="button" className="btn btn-primary" onClick={handleLiberar} disabled={salvandoLiberacao}>
                  {salvandoLiberacao ? 'Liberando...' : 'Liberar para compra'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Fornecedores e links de cotacao</h2>
              <span className="text-sm text-[var(--c-muted)]">{solicitacao.fornecedores?.length || 0} fornecedor(es)</span>
            </div>

            {podeComprar && solicitacao.status === 'LIBERADO_PARA_COMPRA' && (
              <div className="mb-5 grid gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-surface)] p-4">
                <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="grid gap-3">
                    <div>
                      <div className="mb-2 text-sm font-medium">Selecionar fornecedores existentes</div>
                      <div className="grid max-h-[240px] gap-2 overflow-y-auto rounded-lg border border-[var(--c-border)] p-3">
                        {fornecedores.length === 0 ? (
                          <div className="text-sm text-[var(--c-muted)]">Nenhum fornecedor cadastrado.</div>
                        ) : (
                          fornecedores.map((fornecedor) => (
                            <label key={fornecedor.id} className="flex items-start gap-2 rounded-lg border border-[var(--c-border)] px-3 py-2">
                              <input
                                type="checkbox"
                                checked={fornecedoresSelecionados.includes(String(fornecedor.id))}
                                onChange={(event) => {
                                  const value = String(fornecedor.id);
                                  setFornecedoresSelecionados((atual) =>
                                    event.target.checked
                                      ? [...atual, value]
                                      : atual.filter((item) => item !== value)
                                  );
                                }}
                              />
                              <div>
                                <div className="font-medium">{fornecedor.nome}</div>
                                <div className="text-xs text-[var(--c-muted)]">
                                  {fornecedor.email || 'Sem email'} {fornecedor.whatsapp ? `· ${fornecedor.whatsapp}` : ''}
                                </div>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <div className="text-sm font-medium">Cadastro rapido</div>
                    <input
                      className="input"
                      placeholder="Nome do fornecedor"
                      value={novoFornecedor.nome}
                      onChange={(event) => setNovoFornecedor((atual) => ({ ...atual, nome: event.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Email"
                      value={novoFornecedor.email}
                      onChange={(event) => setNovoFornecedor((atual) => ({ ...atual, email: event.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="WhatsApp"
                      value={novoFornecedor.whatsapp}
                      onChange={(event) => setNovoFornecedor((atual) => ({ ...atual, whatsapp: event.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Contato"
                      value={novoFornecedor.contato}
                      onChange={(event) => setNovoFornecedor((atual) => ({ ...atual, contato: event.target.value }))}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-outline" onClick={handleCriarFornecedorRapido}>
                        Cadastrar e selecionar
                      </button>
                      <button type="button" className="btn btn-primary" onClick={handleEnviarFornecedores} disabled={enviandoFornecedores}>
                        {enviandoFornecedores ? 'Enviando...' : 'Gerar links de cotacao'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {solicitacao.fornecedores?.length ? (
              <div className="grid gap-3">
                {solicitacao.fornecedores.map((cotacaoFornecedor) => {
                  const publicUrl = `${window.location.origin}/cotacao/${cotacaoFornecedor.token}`;
                  return (
                    <div key={cotacaoFornecedor.id} className="rounded-xl border border-[var(--c-border)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <div className="font-semibold">{cotacaoFornecedor.fornecedor?.nome || '-'}</div>
                          <div className="text-sm text-[var(--c-muted)]">
                            {cotacaoFornecedor.fornecedor?.email || 'Sem email'} {cotacaoFornecedor.fornecedor?.whatsapp ? `· ${cotacaoFornecedor.fornecedor.whatsapp}` : ''}
                          </div>
                          <div className="text-xs text-[var(--c-muted)]">
                            Status: {formatarStatus(cotacaoFornecedor.status)} · Respondido em {formatarData(cotacaoFornecedor.respondido_em)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-outline" onClick={() => copiarTexto(publicUrl)}>
                            Copiar link
                          </button>
                          <button type="button" className="btn btn-outline" onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}>
                            Abrir portal
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {publicUrl}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-[var(--c-muted)]">
                Nenhum fornecedor vinculado a esta solicitacao ainda.
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Comparativo automatico</h2>
              <span className="text-sm text-[var(--c-muted)]">
                {(comparativo?.itens || []).length} item(ns)
              </span>
            </div>

            {!comparativo?.itens?.length ? (
              <div className="py-8 text-center text-sm text-[var(--c-muted)]">
                O comparativo aparece assim que os fornecedores forem vinculados e responderem a cotacao.
              </div>
            ) : (
              <div className="grid gap-4">
                {comparativo.itens.map((item) => (
                  <div key={buildItemKey(item)} className="rounded-xl border border-[var(--c-border)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{item.nome}</div>
                        <div className="text-sm text-[var(--c-muted)]">
                          {item.quantidade} {item.unidade} · {item.item_tipo === 'MANUAL' ? 'Manual' : 'Cadastrado'}
                        </div>
                        <div className="text-sm text-[var(--c-muted)]">
                          Apropriacao/escopo: {item.especificacao || '-'}
                        </div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        Melhor preco: {item.melhor_preco ? `${item.melhor_preco.fornecedor_nome} · R$ ${item.melhor_preco.preco}` : 'Sem proposta valida'}
                      </div>
                    </div>

                    <div className="mt-4 overflow-x-auto">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Fornecedor</th>
                            <th>Disponivel</th>
                            <th>Preco</th>
                            <th>Prazo</th>
                            <th>Observacao</th>
                            <th>Vencedor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.respostas.map((resposta) => (
                            <tr key={`${item.id}-${resposta.fornecedor_id}`}>
                              <td>{resposta.fornecedor_nome}</td>
                              <td>{resposta.disponivel ? 'Sim' : 'Nao'}</td>
                              <td>{resposta.preco ? `R$ ${resposta.preco}` : '-'}</td>
                              <td>{resposta.prazo || '-'}</td>
                              <td>{resposta.observacao || '-'}</td>
                              <td>
                                {resposta.resposta_item_id ? (
                                  <input
                                    type="radio"
                                    name={`vencedor-${buildItemKey(item)}`}
                                    checked={String(vencedoresSelecionados[buildItemKey(item)] || '') === String(resposta.resposta_item_id)}
                                    onChange={() =>
                                      setVencedoresSelecionados((atual) => ({
                                        ...atual,
                                        [buildItemKey(item)]: String(resposta.resposta_item_id)
                                      }))
                                    }
                                  />
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {podeComprar && solicitacao.status !== 'ENCERRADO' && (
                  <div className="flex justify-end">
                    <button type="button" className="btn btn-primary" onClick={handleEncerrar} disabled={encerrando}>
                      {encerrando ? 'Encerrando...' : 'Encerrar cotacao'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Itens da solicitacao</h2>
              <span className="text-sm text-[var(--c-muted)]">{itensCombinados.length} item(ns)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Insumo</th>
                    <th>Unidade</th>
                    <th>Quantidade</th>
                    <th>Especificacao</th>
                    <th>Apropriacao</th>
                    <th>Necessario para</th>
                    <th>Link</th>
                    <th>Arquivo</th>
                  </tr>
                </thead>
                <tbody>
                  {itensCombinados.map((item, index) => (
                    <tr key={`${item.item_tipo}-${index}`}>
                      <td>{index + 1}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.item_tipo === 'MANUAL' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                          {item.item_tipo}
                        </span>
                      </td>
                      <td className={item.item_tipo === 'MANUAL' ? 'font-semibold text-red-700' : ''}>{item.nome}</td>
                      <td>{item.unidade}</td>
                      <td>{item.quantidade}</td>
                      <td>{item.especificacao}</td>
                      <td>{item.apropriacao}</td>
                      <td>{formatarData(item.necessario_para)}</td>
                      <td className="max-w-[220px] break-all">{item.link_produto || '-'}</td>
                      <td>
                        {item.arquivo_url ? (
                          <button type="button" className="text-blue-600 hover:underline" onClick={() => handleAbrirArquivo(item)}>
                            {item.arquivo_nome_original || 'Abrir arquivo'}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <CompraPreviewModal preview={previewArquivo} onClose={() => setPreviewArquivo(null)} />
    </div>
  );
}
