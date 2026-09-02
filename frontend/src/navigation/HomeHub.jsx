import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { getVisibleModules, resolveLabel } from './navigationConfig';
import { getPendenciasUsuario } from '../services/pendencias';
import { getDetalheLayouts } from '../services/detalheLayout';
import { getListaPreferencias, salvarListaPreferencias } from '../services/listasPreferencias';
import { blocosPermitidos, resolverLayoutHome, rotuloBlocoHome } from './blocosHome';
import { COMPONENTE_BLOCO_EXTRA } from './BlocosHomeExtras';
import { useFecharAoSair } from '../hooks/useFecharAoSair';
import NavCard from './NavCard';
import SeusAtalhos from './SeusAtalhos';
import { vencimentoHumano } from '../utils/formatarTexto';
import {
  HiOutlineExclamationTriangle,
  HiOutlineClock,
  HiOutlineInboxStack,
  HiOutlineBolt
} from 'react-icons/hi2';

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return null;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TONE_ICON = {
  danger: HiOutlineExclamationTriangle,
  warning: HiOutlineClock
};

// NÍVEL 1 — Hub Principal em BLOCOS personalizáveis com o MESMO motor
// do detalhe da solicitação (utils/layoutBlocos.js): admin define o
// padrão por setor (tela='home'), o usuário arrasta/oculta por cima,
// tudo salvo no banco. Ocultou = some POR COMPLETO; volta só pelo
// "Adicionar bloco" do modo Personalizar. Os blocos opcionais carregam
// dados sob demanda (BlocosHomeExtras) — desligado não consulta nada.
export default function HomeHub() {
  const { user } = useContext(AuthContext);
  const [pendencias, setPendencias] = useState([]);
  const [paraResolver, setParaResolver] = useState([]);
  const [resumoObras, setResumoObras] = useState([]);
  // Camadas do layout (usuário → setor → padrão) + modo personalização.
  const [layoutSetor, setLayoutSetor] = useState(null);
  const [prefsLayoutUsuario, setPrefsLayoutUsuario] = useState(null);
  const [personalizando, setPersonalizando] = useState(false);
  const [adicionarBlocoAberto, setAdicionarBlocoAberto] = useState(false);
  const [adicionarModuloAberto, setAdicionarModuloAberto] = useState(false);
  const [toast, setToast] = useState('');
  const dragBlocoRef = useRef(null);
  const dragModuloRef = useRef(null);
  const toastTimerRef = useRef(null);
  // Painéis suspensos fecham ao clicar fora e com Esc — mesmo hook do
  // menu "Colunas" do ListaAvancada (useFecharAoSair).
  const adicionarBlocoRef = useRef(null);
  const adicionarModuloRef = useRef(null);
  const [isMobileHome, setIsMobileHome] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  ));

  useFecharAoSair(adicionarBlocoRef, adicionarBlocoAberto, () => setAdicionarBlocoAberto(false));
  useFecharAoSair(adicionarModuloRef, adicionarModuloAberto, () => setAdicionarModuloAberto(false));

  const modules = useMemo(() => getVisibleModules(user), [user]);
  const catalogoPermitido = useMemo(() => blocosPermitidos(user), [user]);
  const idsPermitidos = useMemo(
    () => new Set(catalogoPermitido.map((bloco) => bloco.id)),
    [catalogoPermitido]
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const listener = (event) => setIsMobileHome(event.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    let ativo = true;
    getPendenciasUsuario()
      .then((data) => {
        if (!ativo) return;
        setPendencias(Array.isArray(data?.itens) ? data.itens : []);
        setParaResolver(Array.isArray(data?.para_resolver) ? data.para_resolver : []);
        setResumoObras(Array.isArray(data?.resumo_obras) ? data.resumo_obras : []);
      })
      .catch(() => {
        // pendências são um extra do hub: falha não bloqueia a navegação
        if (ativo) setPendencias([]);
      });
    return () => {
      ativo = false;
    };
  }, [user?.id]);

  // Camadas do layout: padrão do setor (admin) + arranjo do usuário.
  const setorUsuario = user?.setor?.codigo || user?.area || '';
  useEffect(() => {
    let ativo = true;
    if (setorUsuario) {
      getDetalheLayouts(String(setorUsuario).toUpperCase(), 'home')
        .then((linhas) => {
          if (ativo) setLayoutSetor(linhas[0]?.config || null);
        })
        .catch(() => {});
    }
    getListaPreferencias('home')
      .then((prefs) => {
        const temAlgo = prefs && (
          Array.isArray(prefs.ordem) || Array.isArray(prefs.removidos)
          || Array.isArray(prefs.adicionados) || prefs.larguras || prefs.modulos
        );
        if (ativo && temAlgo) setPrefsLayoutUsuario(prefs);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [setorUsuario]);

  const {
    ordem: ordemBlocos,
    ocultos: blocosOcultos,
    larguras: largurasBlocos,
    adicionados: blocosAdicionados
  } = resolverLayoutHome({ configSetor: layoutSetor, prefsUsuario: prefsLayoutUsuario });

  // ----- Personalização dos MÓDULOS (cards dentro do bloco Módulos) ---
  const modulosPrefs = prefsLayoutUsuario?.modulos || {};
  const modulosRemovidos = useMemo(() => new Set(
    (Array.isArray(modulosPrefs.removidos) ? modulosPrefs.removidos : [])
  ), [modulosPrefs.removidos]);
  const modulosOrdenados = useMemo(() => {
    const ordemSalva = Array.isArray(modulosPrefs.ordem) ? modulosPrefs.ordem : [];
    const porId = new Map(modules.map((mod) => [mod.id, mod]));
    const primeiro = ordemSalva.map((id) => porId.get(id)).filter(Boolean);
    const listados = new Set(ordemSalva);
    return [...primeiro, ...modules.filter((mod) => !listados.has(mod.id))];
  }, [modules, modulosPrefs.ordem]);
  const modulosVisiveis = modulosOrdenados.filter((mod) => !modulosRemovidos.has(mod.id));
  const modulosOcultaveis = modulosOrdenados.filter((mod) => modulosRemovidos.has(mod.id));

  const temCamadaUsuario = (novo) => Boolean(
    novo && (
      novo.ordem?.length || novo.removidos?.length || novo.adicionados?.length
      || Object.keys(novo.larguras || {}).length
      || novo.modulos?.ordem?.length || novo.modulos?.removidos?.length
      || novo.modulos?.aviso_ctrlk_visto
    )
  );
  const persistirLayoutUsuario = (novo) => {
    setPrefsLayoutUsuario(temCamadaUsuario(novo) ? novo : null);
    salvarListaPreferencias('home', novo || {}).catch(() => {});
  };
  // Sempre grava a camada completa — mudar uma coisa não perde as outras.
  const camadaAtual = () => ({
    ordem: prefsLayoutUsuario?.ordem?.length ? ordemBlocos : [],
    removidos: Array.from(blocosOcultos).filter((id) => !blocosAdicionados.has(id)),
    adicionados: Array.from(blocosAdicionados),
    larguras: { ...(prefsLayoutUsuario?.larguras || {}) },
    modulos: {
      ordem: Array.isArray(modulosPrefs.ordem) ? modulosPrefs.ordem : [],
      removidos: Array.from(modulosRemovidos),
      aviso_ctrlk_visto: Boolean(modulosPrefs.aviso_ctrlk_visto)
    }
  });
  const moverBloco = (origemId, alvoId) => {
    if (!origemId || !alvoId || origemId === alvoId) return;
    const ordem = ordemBlocos.slice();
    const de = ordem.indexOf(origemId);
    const para = ordem.indexOf(alvoId);
    if (de < 0 || para < 0) return;
    ordem.splice(para, 0, ordem.splice(de, 1)[0]);
    persistirLayoutUsuario({ ...camadaAtual(), ordem });
  };
  const removerBloco = (blocoId) => {
    const camada = camadaAtual();
    const removidos = new Set(camada.removidos);
    removidos.add(blocoId);
    const adicionados = camada.adicionados.filter((id) => id !== blocoId);
    persistirLayoutUsuario({ ...camada, removidos: Array.from(removidos), adicionados });
  };
  const readicionarBloco = (blocoId) => {
    const camada = camadaAtual();
    const removidos = camada.removidos.filter((id) => id !== blocoId);
    const adicionados = new Set(camada.adicionados);
    adicionados.add(blocoId);
    persistirLayoutUsuario({ ...camada, removidos, adicionados: Array.from(adicionados) });
  };
  const definirLarguraBloco = (blocoId, largura) => {
    const camada = camadaAtual();
    const larguras = { ...camada.larguras };
    larguras[blocoId] = largura === 'normal' ? 'normal' : 'total';
    persistirLayoutUsuario({ ...camada, larguras });
  };
  const restaurarPadraoSetor = () => {
    persistirLayoutUsuario(null);
  };

  // ----- mutações dos módulos ----------------------------------------
  const mostrarToast = (mensagem) => {
    setToast(mensagem);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 6000);
  };
  const ocultarModulo = (moduloId) => {
    const camada = camadaAtual();
    const removidos = new Set(camada.modulos.removidos);
    removidos.add(moduloId);
    const jaAvisado = camada.modulos.aviso_ctrlk_visto;
    persistirLayoutUsuario({
      ...camada,
      modulos: { ...camada.modulos, removidos: Array.from(removidos), aviso_ctrlk_visto: true }
    });
    // Uma única vez: quem oculta um módulo não perdeu o caminho até ele.
    if (!jaAvisado) {
      mostrarToast('Módulo oculto da Home. Ele continua acessível pela busca (Ctrl+K) e pelos atalhos.');
    }
  };
  const readicionarModulo = (moduloId) => {
    const camada = camadaAtual();
    persistirLayoutUsuario({
      ...camada,
      modulos: {
        ...camada.modulos,
        removidos: camada.modulos.removidos.filter((id) => id !== moduloId)
      }
    });
  };
  const moverModulo = (origemId, alvoId) => {
    if (!origemId || !alvoId || origemId === alvoId) return;
    const ordem = modulosOrdenados.map((mod) => mod.id);
    const de = ordem.indexOf(origemId);
    const para = ordem.indexOf(alvoId);
    if (de < 0 || para < 0) return;
    ordem.splice(para, 0, ordem.splice(de, 1)[0]);
    const camada = camadaAtual();
    persistirLayoutUsuario({ ...camada, modulos: { ...camada.modulos, ordem } });
  };

  // Contador dos cards de módulo: soma por módulo; VERMELHO quando o
  // módulo tem algum item 'danger' (atrasado/aguardando aprovação),
  // âmbar (atenção) nos demais.
  const contadoresModulo = useMemo(() => {
    const mapa = {};
    for (const item of pendencias) {
      if (!item?.modulo || !Number(item?.quantidade)) continue;
      const atual = mapa[item.modulo] || { total: 0, tom: 'warning' };
      atual.total += Number(item.quantidade);
      if (item.tom === 'danger') atual.tom = 'danger';
      mapa[item.modulo] = atual;
    }
    return mapa;
  }, [pendencias]);

  const itensVisiveis = pendencias.filter((item) => Number(item?.quantidade) > 0);
  const papel = String(user?.setor?.nome || user?.area || user?.perfil || '').trim();

  // ----- Conteúdo de cada bloco (null = bloco sem nada a mostrar) -----
  const conteudoBlocos = {
    pendencias: itensVisiveis.length > 0 ? (
      <section className="hub-pendencias" aria-label="Suas pendências">
        <h2 className="hub-pendencias-title">
          <HiOutlineInboxStack aria-hidden="true" />
          Suas pendências
        </h2>
        <ul className="hub-pendencias-list hub-pendencias-list--cartoes">
          {itensVisiveis.map((item) => {
            const Icone = TONE_ICON[item.tom] || HiOutlineClock;
            return (
              <li key={item.chave}>
                <Link
                  to={item.link || '/'}
                  className={`hub-pendencia-cartao ${item.tom === 'danger' ? 'hub-pendencia-cartao--danger' : ''}`}
                  aria-label={`${item.quantidade} ${item.rotulo}`}
                >
                  <span className="hub-pendencia-cartao-numero">{item.quantidade}</span>
                  <span className="hub-pendencia-cartao-rotulo">
                    <Icone aria-hidden="true" />
                    {item.rotulo}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    ) : null,

    // O trabalho em si, não só o número: os itens mais urgentes que o
    // usuário pode resolver, das MESMAS consultas das pendências.
    // Vazio = a seção não existe (sem estado decorativo).
    resolver: paraResolver.length > 0 ? (
      <section className="hub-resolver" aria-label="Para resolver agora">
        <h2 className="hub-pendencias-title">
          <HiOutlineBolt aria-hidden="true" />
          Para resolver agora
        </h2>
        <ul className="hub-resolver-lista">
          {paraResolver.map((item) => (
            <li key={`${item.tipo}-${item.id}`}>
              <Link
                to={item.link}
                className={`hub-resolver-item hub-resolver-item--${item.tom === 'danger' ? 'danger' : 'warning'}`}
              >
                <span className="hub-resolver-id">
                  <strong>{item.codigo}</strong>
                  {item.contexto && <span className="hub-resolver-contexto">{item.contexto}</span>}
                </span>
                <span className="hub-resolver-oque">
                  {item.o_que_e}
                  {item.descricao ? ` — ${item.descricao}` : ''}
                </span>
                <span className="hub-resolver-fim">
                  {formatarMoeda(item.valor) && (
                    <span className="hub-resolver-valor">{formatarMoeda(item.valor)}</span>
                  )}
                  {item.data_vencimento && (
                    <span className={`hub-resolver-prazo ${item.tom === 'danger' ? 'hub-resolver-prazo--danger' : ''}`}>
                      {vencimentoHumano(item.data_vencimento)}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null,

    atalhos: <SeusAtalhos />,

    // Cards de módulo personalizáveis: reordenar arrastando e ocultar
    // um a um no modo Personalizar; catálogo próprio "Adicionar módulo"
    // traz de volta. Permissão continua mandando (getVisibleModules).
    modulos: (
      <nav aria-label="Módulos do sistema">
        {personalizando && (
          <div className="hub-modulos-toolbar">
            <span className="text-sm text-[var(--c-muted)]">
              Arraste os cards para reordenar; "×" oculta um módulo.
            </span>
            <div className="sol-detail-adicionar-wrap" ref={adicionarModuloRef}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAdicionarModuloAberto((aberto) => !aberto)}
                aria-expanded={adicionarModuloAberto}
                disabled={modulosOcultaveis.length === 0}
              >
                Adicionar módulo{modulosOcultaveis.length > 0 ? ` (${modulosOcultaveis.length})` : ''}
              </button>
              {adicionarModuloAberto && modulosOcultaveis.length > 0 && (
                <div className="sol-detail-adicionar-pop" role="menu" aria-label="Módulos ocultos">
                  {modulosOcultaveis.map((mod) => (
                    <button
                      key={mod.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        readicionarModulo(mod.id);
                        setAdicionarModuloAberto(false);
                      }}
                    >
                      {resolveLabel(mod, user)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <ul className="hub-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {modulosVisiveis.map((mod) => {
            const unicoFilho = mod.children.length === 1 ? mod.children[0] : null;
            const destino = unicoFilho ? unicoFilho.to : `/hub/${mod.id}`;
            const contador = contadoresModulo[mod.id];
            return (
              <li
                key={mod.id}
                className={personalizando ? 'hub-modulo-card-editavel' : undefined}
                draggable={personalizando && !isMobileHome}
                onDragStart={() => { dragModuloRef.current = mod.id; }}
                onDragOver={(event) => { if (personalizando) event.preventDefault(); }}
                onDrop={(event) => {
                  if (!personalizando) return;
                  event.stopPropagation();
                  moverModulo(dragModuloRef.current, mod.id);
                  dragModuloRef.current = null;
                }}
              >
                {personalizando && (
                  <button
                    type="button"
                    className="hub-modulo-remover"
                    onClick={() => ocultarModulo(mod.id)}
                    title={`Ocultar ${resolveLabel(mod, user)} da Home`}
                    aria-label={`Ocultar ${resolveLabel(mod, user)} da Home`}
                  >
                    ×
                  </button>
                )}
                <NavCard
                  to={destino}
                  icon={mod.icon}
                  label={resolveLabel(mod, user)}
                  desc={mod.desc}
                  accentVar={`--module-${mod.id}`}
                  count={contador?.total || 0}
                  countTone={contador?.tom || 'warning'}
                />
              </li>
            );
          })}
        </ul>
      </nav>
    ),

    // Contexto gerencial opcional (telas largas, permissão financeira):
    // as obras com maior saldo a pagar no mês. Não é dashboard.
    obras_resumo: resumoObras.length > 0 ? (
      <section className="hub-obras-resumo" aria-label="Maiores saldos a pagar no mês por obra">
        <h2 className="hub-pendencias-title">A pagar no mês, por obra</h2>
        <ul className="hub-obras-resumo-lista">
          {resumoObras.map((linha) => (
            <li key={linha.obra_id}>
              <Link to={linha.link} className="hub-obras-resumo-item">
                <span className="hub-obras-resumo-nome">{linha.obra}</span>
                <span className="hub-obras-resumo-total">{formatarMoeda(linha.total)}</span>
                <span className="hub-obras-resumo-qtd">{linha.quantidade} título(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null
  };

  // Blocos opcionais: componente com fetch próprio, montado SÓ quando o
  // bloco está visível — desligado não consulta nada.
  // DEGRADAÇÃO (onda 2 do porte): o endpoint /home/blocos/:bloco ainda não
  // existe neste backend (pacote B6 da proposta). Enquanto isso os blocos
  // opcionais ficam fora do catálogo — religar trocando a constante.
  const BLOCOS_EXTRAS_DISPONIVEIS = false;
  for (const [blocoId, Componente] of Object.entries(COMPONENTE_BLOCO_EXTRA)) {
    if (!BLOCOS_EXTRAS_DISPONIVEIS) break;
    if (!idsPermitidos.has(blocoId)) continue;
    if (!blocosOcultos.has(blocoId)) {
      conteudoBlocos[blocoId] = <Componente />;
    } else {
      // marcador para o catálogo saber que o bloco existe (sem fetch)
      conteudoBlocos[blocoId] = conteudoBlocos[blocoId] || 'disponivel';
    }
  }

  const blocosVisiveis = ordemBlocos
    .filter((blocoId) => idsPermitidos.has(blocoId) && !blocosOcultos.has(blocoId))
    .map((blocoId) => ({ id: blocoId, conteudo: conteudoBlocos[blocoId] }))
    .filter((bloco) => bloco.conteudo && bloco.conteudo !== 'disponivel');

  // Catálogo do "Adicionar bloco": só o que a permissão permite e está
  // oculto agora (padrão-desligados incluídos).
  const blocosDisponiveisParaAdicionar = ordemBlocos
    .filter((blocoId) => idsPermitidos.has(blocoId) && blocosOcultos.has(blocoId))
    .map((blocoId) => ({ id: blocoId, conteudo: conteudoBlocos[blocoId] }))
    .filter((bloco) => bloco.conteudo);

  // Segmentos para a grade: largura 'normal' flui em 2 colunas; 'total'
  // quebra a linha e ocupa tudo.
  const segmentosBlocos = (() => {
    const segmentos = [];
    let corrente = null;
    for (const bloco of blocosVisiveis) {
      if (largurasBlocos[bloco.id] === 'normal') {
        if (!corrente) {
          corrente = { tipo: 'colunas', blocos: [] };
          segmentos.push(corrente);
        }
        corrente.blocos.push(bloco);
      } else {
        segmentos.push({ tipo: 'total', blocos: [bloco] });
        corrente = null;
      }
    }
    return segmentos;
  })();

  const renderizarBloco = (bloco) => (
    <div
      key={bloco.id}
      className="hub-bloco"
      draggable={personalizando && !isMobileHome}
      onDragStart={() => { dragBlocoRef.current = bloco.id; }}
      onDragOver={(event) => { if (personalizando) event.preventDefault(); }}
      onDrop={() => {
        if (!personalizando) return;
        moverBloco(dragBlocoRef.current, bloco.id);
        dragBlocoRef.current = null;
      }}
    >
      {personalizando && (
        <div className="sol-detail-bloco-toolbar">
          <span className="sol-detail-bloco-arrastar" aria-hidden="true">⋮⋮</span>
          <span className="sol-detail-bloco-nome">{rotuloBlocoHome(bloco.id)}</span>
          {!isMobileHome && (
            <label className="sol-detail-bloco-largura">
              <select
                value={largurasBlocos[bloco.id] === 'normal' ? 'normal' : 'total'}
                onChange={(event) => definirLarguraBloco(bloco.id, event.target.value)}
                aria-label={`Largura do bloco ${rotuloBlocoHome(bloco.id)}`}
              >
                <option value="normal">Normal</option>
                <option value="total">Largura total</option>
              </select>
            </label>
          )}
          <button
            type="button"
            className="sol-detail-bloco-remover"
            onClick={() => removerBloco(bloco.id)}
            title={`Remover ${rotuloBlocoHome(bloco.id)} da sua Home`}
            aria-label={`Remover ${rotuloBlocoHome(bloco.id)} da sua Home`}
          >
            ×
          </button>
        </div>
      )}
      {bloco.conteudo}
    </div>
  );

  return (
    <div className="hub-page">
      {/* Cabeçalho enxuto: quem é o usuário + entrada discreta da
          personalização (mesmo padrão do detalhe da solicitação). */}
      <header className="hub-header">
        <div className="hub-header-texto">
          <h1 className="hub-title">{user?.nome ? user.nome : 'Início'}</h1>
          {papel && <p className="hub-subtitle hub-subtitle--papel">{papel}</p>}
        </div>
        {!isMobileHome && (
          <div className="hub-header-acoes">
            <button
              type="button"
              className={`btn btn-outline btn-sm ${personalizando ? 'sol-detail-personalizando' : ''}`}
              onClick={() => {
                setPersonalizando((atual) => !atual);
                setAdicionarBlocoAberto(false);
                setAdicionarModuloAberto(false);
              }}
              aria-pressed={personalizando}
            >
              {personalizando ? 'Concluir personalização' : 'Personalizar'}
            </button>
          </div>
        )}
      </header>

      {personalizando && (
        <div className="sol-detail-blocos-toolbar hub-personalizar-toolbar">
          <div className="sol-detail-adicionar-wrap" ref={adicionarBlocoRef}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setAdicionarBlocoAberto((aberto) => !aberto)}
              aria-expanded={adicionarBlocoAberto}
              disabled={blocosDisponiveisParaAdicionar.length === 0}
            >
              Adicionar bloco{blocosDisponiveisParaAdicionar.length > 0 ? ` (${blocosDisponiveisParaAdicionar.length})` : ''}
            </button>
            {adicionarBlocoAberto && blocosDisponiveisParaAdicionar.length > 0 && (
              <div className="sol-detail-adicionar-pop hub-adicionar-pop" role="menu" aria-label="Blocos disponíveis">
                {['Home', 'Trabalho', 'Financeiro', 'Obras e Compras', 'Institucional'].map((grupo) => {
                  const doGrupo = blocosDisponiveisParaAdicionar.filter((bloco) => (
                    (catalogoPermitido.find((meta) => meta.id === bloco.id)?.grupo || 'Home') === grupo
                  ));
                  if (doGrupo.length === 0) return null;
                  return (
                    <div key={grupo} className="hub-adicionar-grupo">
                      <span className="hub-adicionar-grupo-titulo">{grupo}</span>
                      {doGrupo.map((bloco) => (
                        <button
                          key={bloco.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            readicionarBloco(bloco.id);
                            setAdicionarBlocoAberto(false);
                          }}
                        >
                          {rotuloBlocoHome(bloco.id)}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={restaurarPadraoSetor}>
            Restaurar padrão
          </button>
          <span className="text-sm text-[var(--c-muted)]">
            Arraste para reordenar; largura e "×" em cada bloco. Salvo automaticamente.
            No celular valem a ordem e os blocos mantidos — largura é só do desktop.
          </span>
        </div>
      )}

      {modules.length === 0 && (
        <section className="hub-pendencias" role="status" aria-label="Nenhum módulo disponível">
          <h2 className="hub-pendencias-title">Nenhum módulo disponível para o seu acesso</h2>
          <p className="hub-subtitle" style={{ margin: 0 }}>
            Seu usuário ainda não tem permissão em nenhum módulo do sistema. Fale com o
            administrador para liberar os acessos do seu setor. Enquanto isso, você pode
            revisar seus dados em <Link to="/perfil">Meu Perfil</Link> ou sair e entrar com
            outro usuário.
          </p>
        </section>
      )}

      {segmentosBlocos.map((segmento, indice) => (
        segmento.tipo === 'colunas' ? (
          <div key={`seg-${indice}`} className="hub-blocos-colunas">
            {segmento.blocos.map(renderizarBloco)}
          </div>
        ) : (
          segmento.blocos.map(renderizarBloco)
        )
      ))}

      {toast && (
        <div className="hub-toast" role="status">
          {toast}
          <button type="button" onClick={() => setToast('')} aria-label="Fechar aviso">×</button>
        </div>
      )}
    </div>
  );
}
