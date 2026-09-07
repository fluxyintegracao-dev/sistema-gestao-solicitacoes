import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Avisos,
  BarraFiltros,
  BlocoConteudo,
  CelulaDupla,
  TabelaPadrao,
  alternarValorFiltro,
  useAvisos,
  useConfirmacao,
  useFiltrosVisiveis
} from '../components/padrao';
import { useAuth } from '../contexts/AuthContext';
import { getObras } from '../services/obras';
import {
  colaboradoresParaJornadaRh,
  getRhEmpresasGrupo,
  registrarJornadaRh
} from '../services/rhDp';
import { hasAnyExplicitPermissao } from '../utils/acessoProduto';
import { formatCurrencyInput, normalizeCurrencyTyping } from '../utils/formatters';

/**
 * JORNADA PELO FORMULARIO (Fase 4 do modulo DP, 26/08).
 *
 * Pedido do cliente: "um formulario onde a obra vai ter listados todos os colaboradores e podera
 * informar a jornada trabalhada, acrescimos e descontos, e o sistema faz os calculos".
 *
 * A LISTA VEM DO VINCULO, nao de `rh_colaboradores.obra_id`. Quem foi transferido depois continua
 * aparecendo na folha do mes em que ainda estava na obra — que e justamente o mes que se esta
 * pagando. E a primeira tela em que o historico de lotacao da Fase 1 paga o proprio custo.
 *
 * REENVIAR SUBSTITUI, nao soma. A obra preenche, ve um dia de falta errado e preenche de novo; se os
 * dois envios valessem, a apuracao somaria os dois e o colaborador apareceria com 60 dias num mes de
 * 30. O aviso disso esta na tela, e nao so no servico — quem preenche precisa saber antes.
 */

const COMPETENCIA_ATUAL = new Date().toISOString().slice(0, 7);
/* O 30 estava só no `useState`; virou nome para o painel de filtros poder
   distinguir "a pessoa escolheu 30" de "o sistema propôs 30" — sem isso o
   campo contaria como preenchido sempre e nunca sairia da faixa. */
const DIAS_BASE_PADRAO = 30;
const SEM_FILTRO = { obra: new Set(), empresa: new Set() };

/** Dimensao de valor UNICO: o `ativos` guarda um conjunto, o servico recebe um id. */
function primeiroValor(conjunto) {
  return Array.from(conjunto || [])[0] || '';
}

function linhaVazia(colaborador) {
  const ja = colaborador.jornada_informada || {};
  return {
    colaborador_id: colaborador.colaborador_id,
    nome: colaborador.nome,
    tipo_vinculo: colaborador.tipo_vinculo,
    salario_base: colaborador.salario_base,
    jaInformado: Boolean(colaborador.jornada_informada),
    aindaNaoComecou: Boolean(colaborador.ainda_nao_comecou),
    comecaEm: colaborador.comeca_em || null,
    dias_trabalhados: ja.dias_trabalhados ?? '',
    faltas: ja.faltas ?? '',
    horas_extras: ja.horas_extras ?? '',
    adicionais: ja.adicionais ? formatCurrencyInput(String(ja.adicionais)) : '',
    descontos: ja.descontos_informados ? formatCurrencyInput(String(ja.descontos_informados)) : '',
    observacoes: ja.observacoes || ''
  };
}

/**
 * SEMPRE ABA, nunca pagina (decisao do cliente D1, 02/09).
 *
 * `/rh-dp/jornada` virou redirecionamento para `/rh-dp/pessoal?aba=jornada`: a obra informa a
 * jornada e o DP apura — e o MESMO trabalho em sequencia, e trocar de pagina no meio era o que
 * fazia perder o fio. Com isso a antiga prop `comoAba` deixou de ter dois valores possiveis e
 * saiu, junto com o cabecalho proprio que ela escondia.
 *
 * Quem e dono do titulo e da faixa fixa aqui e o RhDpPessoal — este arquivo NAO monta `Pagina`
 * nem `PageHeader`. Duas faixas fixas empilhadas e exatamente o defeito que a R16 evita; excecao
 * declarada ao cabecalho padrao, valida para os componentes que so existem como aba.
 */
/*
  QUAIS FILTROS APARECEM (N53) — a declaração desta tela para o painel
  único de `PainelFiltrosVisiveis`, no molde do painel "Colunas" da
  TabelaPadrao.

  NENHUM `padrao: false`: todos os filtros continuam VISÍVEIS na primeira
  abertura. Só três telas têm conjunto inicial reduzido, e é o que o
  cliente aprovou nelas — aqui o seletor apenas passa a EXISTIR, para quem
  quiser mexer. Esconder por padrão mudaria o que a pessoa vê sem ela ter
  pedido.
*/
const FILTROS_DA_TELA = [
  { id: 'competencia', rotulo: 'Competência' },
  { id: 'diasBase', rotulo: 'Dias base do mês' },
  { id: 'obra', rotulo: 'Obra' },
  { id: 'empresa', rotulo: 'Empresa do grupo' }
];

export default function RhDpJornada() {
  const { user } = useAuth();
  const { avisos, avisar, fechar, limpar } = useAvisos();
  const { confirmar, elementoConfirmacao } = useConfirmacao();

  const [obras, setObras] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  // R12: obra e empresa sao recortes ENUMERAVEIS — marcacao com etiqueta
  // removivel, e nao lista suspensa. Ambas com `unico`, porque o servico
  // recebe UM id por recorte (marcar dois mandaria nenhum).
  const [ativos, setAtivos] = useState(SEM_FILTRO);
  /*
    N53 — filtro com VALOR é filtro VISÍVEL. Um recorte pode chegar pela URL
    ou do estado da tela e cair sobre um filtro escondido; o painel REVELA em
    vez de apagar, porque o recorte foi o usuário que montou.
  */
  /*
    ESTAS DUAS DECLARACOES MORAM AQUI, E NAO 25 LINHAS ABAIXO (06/09).

    Elas estavam DEPOIS do `useMemo` de `filtrosPreenchidos`, cujo array de
    dependencias le as duas. Array de dependencia e ARGUMENTO: o JavaScript
    o avalia ANTES de chamar o `useMemo`. Ler um `const` antes da declaracao
    e zona morta temporal, e o erro real era

        ReferenceError: Cannot access 'competencia' before initialization

    disparado na PRIMEIRA linha do corpo do render — antes de qualquer
    efeito, antes de qualquer requisicao. A tela nunca chegava a pedir dado
    nenhum, e por isso NENHUM estado de base fazia ela abrir.

    Veio do commit 8052bf2, que aplicou este mesmo bloco em 49 arquivos. So
    este ficou na ordem errada. Nem `vite build` nem o portao pegavam:
    ordem de declaracao e sintaxe valida, e o defeito so existe em execucao.
    Quem tranca isso agora e `scripts/provas/ordemDeDeclaracao.mjs`.
  */
  const [competencia, setCompetencia] = useState(COMPETENCIA_ATUAL);
  const [diasBase, setDiasBase] = useState(DIAS_BASE_PADRAO);

  const filtrosPreenchidos = useMemo(
    () => FILTROS_DA_TELA.filter((filtro) => {
      /* Competência e dias base NASCEM com o valor que o sistema propõe
         (mês corrente, 30 dias). O padrão não conta como preenchido: se
         contasse, ele revelaria de volta, a cada abertura, exatamente o
         campo que a pessoa tirou da faixa. */
      if (filtro.id === 'competencia') return String(competencia ?? '') !== COMPETENCIA_ATUAL;
      if (filtro.id === 'diasBase') return String(diasBase ?? '') !== String(DIAS_BASE_PADRAO);
      return (ativos[filtro.id]?.size || 0) > 0;
    }).map((filtro) => filtro.id),
    [competencia, diasBase, ativos]
  );
  /*
    A escolha mora na MESMA chave de lista que esta tela já usa na
    TabelaPadrao: é a mesma lista respondendo a duas perguntas (quais
    colunas, quais filtros), e o `PreferenciasContext` separa as duas pelo
    TIPO. Sem `legado`: esta faixa nunca gravou a escolha em lugar nenhum,
    então não há chave antiga de onde migrar.
  */
  const visibilidadeFiltros = useFiltrosVisiveis('tabela:rh-dp-jornada:colaboradores', FILTROS_DA_TELA, {
    preenchidos: filtrosPreenchidos,
    /*
      Contrato 1 do painel: esconder LIMPA o valor. Filtro fora da faixa que
      continuasse recortando a lista seria critério invisível — a pessoa lê a
      contagem e conclui que é o conjunto inteiro.
    */
    aoEsconder: (id) => {
      /* Competência e dias base voltam ao PADRÃO, não a vazio: a lista é
         montada a partir dos dois, e um campo escondido em branco deixaria
         a tela sem conseguir montar nada. Vazio aqui é o valor do sistema. */
      if (id === 'competencia') { setCompetencia(COMPETENCIA_ATUAL); return; }
      if (id === 'diasBase') { setDiasBase(DIAS_BASE_PADRAO); return; }
      setAtivos((atuais) => ({ ...atuais, [id]: new Set() }));
    }
  });

  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const obra = useMemo(() => primeiroValor(ativos.obra), [ativos]);
  const empresa = useMemo(() => primeiroValor(ativos.empresa), [ativos]);

  const podeEnviar = hasAnyExplicitPermissao(user, ['rh_dp.solicitacoes.abrir']);

  useEffect(() => {
    (async () => {
      try {
        const listaObras = await getObras();
        setObras(Array.isArray(listaObras) ? listaObras : []);
      } catch (error) {
        avisar.erro(error.message || 'Não foi possível carregar as obras.');
      }

      /**
       * A empresa do grupo e OPCIONAL nesta tela, e nem todo usuario pode le-la.
       *
       * Buscar junto das obras fazia a falta de `rh_dp.empresas.gerenciar` virar faixa vermelha no
       * topo, dando a impressao de que a pagina falhou — quando so um campo opcional nao carregou.
       * Encontrado abrindo a tela no navegador; nenhuma suite pegaria, porque suite nao tem 403 de
       * permissao no meio do caminho.
       */
      try {
        const listaEmpresas = await getRhEmpresasGrupo();
        setEmpresas(Array.isArray(listaEmpresas) ? listaEmpresas : []);
      } catch (error) {
        setEmpresas([]);
      }
    })();
  }, [avisar]);

  const carregar = useCallback(async () => {
    if (!obra || !competencia) {
      avisar.erro('Escolha a obra e a competência.');
      return;
    }
    setCarregando(true);
    limpar();
    try {
      const lista = await colaboradoresParaJornadaRh({ obra_id: obra, competencia });
      setLinhas((Array.isArray(lista) ? lista : []).map(linhaVazia));
      const comecaram = (Array.isArray(lista) ? lista : []).filter((c) => !c.ainda_nao_comecou);
      const futuros = (Array.isArray(lista) ? lista : []).filter((c) => c.ainda_nao_comecou);

      if (!comecaram.length && futuros.length) {
        // A resposta "nenhum colaborador" e tecnicamente certa e pratica errada: quem acabou de
        // lotar alguem nesta obra conclui que a lotacao nao funcionou.
        avisar.alerta(
          `Ninguem trabalhou nesta obra em ${competencia}, mas `
          + `${futuros.length} colaborador(es) comecam depois — eles aparecem abaixo, sem campos.`
        );
      } else if (!comecaram.length) {
        avisar.alerta('Nenhum colaborador esteve nesta obra nesta competência.');
      }
    } catch (error) {
      avisar.erro(error.message || 'Não foi possível montar a lista.');
      setLinhas([]);
    } finally {
      setCarregando(false);
    }
  }, [obra, competencia, avisar, limpar]);

  function alterar(indice, campo, valor) {
    setLinhas((atuais) => atuais.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)));
  }

  /** Preenche o mês cheio de uma vez — o caso comum é quase todo mundo ter trabalhado tudo. */
  function preencherMesCheio() {
    setLinhas((atuais) => atuais.map((linha) => (linha.aindaNaoComecou ? linha : {
      ...linha,
      dias_trabalhados: linha.dias_trabalhados === '' ? String(diasBase) : linha.dias_trabalhados,
      faltas: linha.faltas === '' ? '0' : linha.faltas
    })));
  }

  // `alterar` age por POSICAO na lista; a tabela precisa do indice junto do
  // registro para os controles inline continuarem escrevendo na linha certa.
  const linhasTabela = useMemo(
    () => linhas.map((linha, indice) => ({ ...linha, __indice: indice })),
    [linhas]
  );

  const jaInformados = useMemo(() => linhas.filter((l) => l.jaInformado).length, [linhas]);

  const comProblema = useMemo(() => linhas.filter((linha) => {
    const dias = Number(linha.dias_trabalhados || 0);
    const faltas = Number(linha.faltas || 0);
    return linha.dias_trabalhados !== '' && dias + faltas > Number(diasBase);
  }), [linhas, diasBase]);

  const dimensoesFiltro = useMemo(() => {
    const dimensoes = [{
      id: 'obra',
      rotulo: 'Obra',
      unico: true,
      opcoes: obras.map((o) => ({ valor: o.id, rotulo: o.nome }))
    }];
    // A empresa do grupo so aparece para quem consegue le-la — sem permissao
    // a lista vem vazia e o recorte nao existe (era um select opcional).
    if (empresas.length) {
      dimensoes.push({
        id: 'empresa',
        rotulo: 'Empresa do grupo',
        unico: true,
        opcoes: empresas.map((e) => ({ valor: e.id, rotulo: e.nome }))
      });
    }
    return dimensoes;
  }, [obras, empresas]);

  async function enviar(evento) {
    evento.preventDefault();
    limpar();

    /**
     * Quem ainda nao comecou NAO vai no envio.
     *
     * `registrarJornada` recusa quem nao esteve na obra na competencia. Eles aparecem na lista para
     * a pessoa VER que a lotacao existe — nao para lancar jornada de um mes em que o colaborador
     * nem tinha sido admitido.
     */
    const preenchidas = linhas
      .filter((l) => !l.aindaNaoComecou)
      .filter((l) => l.dias_trabalhados !== '' || l.faltas !== '');
    if (!preenchidas.length) {
      avisar.erro('Informe a jornada de ao menos um colaborador.');
      return;
    }

    if (comProblema.length) {
      avisar.erro(
        `Dias trabalhados mais faltas passam de ${diasBase} em: `
        + `${comProblema.map((l) => l.nome).join(', ')}.`
      );
      return;
    }

    if (jaInformados) {
      const { ok } = await confirmar({
        titulo: 'Substituir a jornada já informada',
        mensagem: `Ja existe jornada informada nesta obra em ${competencia}. O envio novo `
          + 'SUBSTITUI o anterior — ele nao soma. O envio anterior fica guardado como historico. '
          + 'Enviar mesmo assim?',
        rotuloConfirmar: 'Substituir e enviar'
      });
      if (!ok) return;
    }

    setSalvando(true);
    try {
      await registrarJornadaRh({
        competencia,
        obra_id: Number(obra),
        empresa_grupo_id: empresa ? Number(empresa) : undefined,
        dias_base: Number(diasBase),
        linhas: preenchidas.map((l) => ({
          colaborador_id: l.colaborador_id,
          dias_trabalhados: Number(l.dias_trabalhados || 0),
          faltas: Number(l.faltas || 0),
          horas_extras: Number(l.horas_extras || 0),
          adicionais: normalizeCurrencyTyping(l.adicionais) || 0,
          descontos: normalizeCurrencyTyping(l.descontos) || 0,
          observacoes: l.observacoes || undefined
        }))
      });
      /**
       * A confirmacao vem DEPOIS de remontar a lista, e nao antes.
       *
       * Defeito real do fluxo antigo: `setAviso(sucesso)` era seguido de `carregar()`, que comeca
       * limpando `erro`/`aviso` — a faixa verde do envio bem-sucedido era apagada no mesmo tique,
       * antes de qualquer pintura. Quem enviava a jornada nao via confirmacao nenhuma. Trocar a
       * ordem mantem o mesmo texto e o faz aparecer.
       */
      await carregar();
      avisar.sucesso(
        `Jornada de ${preenchidas.length} colaborador(es) registrada. `
        + 'O Departamento Pessoal pode gerar a apuração desta competência.'
      );
    } catch (error) {
      avisar.erro(error.message || 'Não foi possível registrar a jornada.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="app-pagina">
      <Avisos avisos={avisos} aoFechar={fechar} />

      {/*
        B2 — um primário por tela, e a hierarquia SEGUE O FOCO (mesmo padrão
        do piloto aprovado em Parceiros). Enquanto a lista não foi montada, o
        trabalho é escolher obra e competência: o recorte é o bloco primário.
        Montada a lista, o primário passa para ela (abaixo) e este volta a
        secundário. Antes o recorte nunca era primário, e a aba abria sem
        bloco primário nenhum — o revisor pegou isso justamente porque as
        variantes passaram a ser medidas.
      */}
      <BlocoConteudo
        titulo="Jornada da obra"
        descricao="A obra informa dias trabalhados, faltas, horas extras, acréscimos e descontos. O sistema calcula o pagamento."
        variante={linhas.length ? undefined : 'primario'}
        cor={linhas.length ? undefined : 'var(--c-primary)'}
      >
        {/* R12/R16: o cartao de filtros com grade de select saiu inteiro.
            Competencia e dias base sao CONTINUOS e vao em `campos`; obra e
            empresa sao enumeraveis e vao em `filtros`, com marcacao unica e
            etiqueta removivel. */}
        <BarraFiltros
          campos={[
            {
              id: 'competencia',
              rotulo: 'Competência',
              tipo: 'month',
              valor: competencia,
              aoMudar: setCompetencia
            },
            {
              id: 'diasBase',
              rotulo: 'Dias base do mês',
              tipo: 'number',
              valor: diasBase,
              aoMudar: setDiasBase,
              min: 1,
              max: 31
            }
          ].filter((campo) => visibilidadeFiltros.ehVisivel(campo.id))}
          filtros={dimensoesFiltro.filter((dim) => visibilidadeFiltros.ehVisivel(dim.id))}
          ativos={ativos}
          aoAlternar={(dimensao, valor, opcoes) => setAtivos(
            (atuais) => alternarValorFiltro(atuais, dimensao, valor, opcoes)
          )}
          aoLimpar={() => setAtivos(SEM_FILTRO)}
          visibilidade={visibilidadeFiltros}
        />

        <div className="space-y-3">
          <div className="app-actionbar">
            <button type="button" className="btn btn-outline" onClick={carregar} disabled={carregando}>
              {carregando ? 'Carregando...' : 'Montar lista'}
            </button>
            {linhas.length ? (
              <button type="button" className="btn btn-outline" onClick={preencherMesCheio}>
                Preencher mês cheio
              </button>
            ) : null}
          </div>

          {/* Estava solto no rodape da tela como `page-subtitle`, que o
              validador reprova (R5). E informacao util e continua visivel,
              agora ancorada ao bloco a que pertence e com token de cor. */}
          {/* EXCEÇÃO DECLARADA à truncagem de 05/09 (`--integral`): é
              instrução, e a oração que importa ("Não precisam ser digitados
              aqui") é a última — truncar em uma linha inverteria o sentido do
              aviso. Fica em várias linhas, com a medida de leitura de 78ch. */}
          <p className="app-bloco-lead app-bloco-lead--integral">
            Os eventos recorrentes — vale alimentação, desconto de adiantamento, pensão — são
            aplicados sozinhos quando o Departamento Pessoal gerar a apuração. Não precisam ser
            digitados aqui.
          </p>
        </div>
      </BlocoConteudo>

      {jaInformados ? (
        <div className="alert alert-warning">
          Esta obra ja tem jornada informada em {competencia} ({jaInformados} colaborador(es)).
          Um envio novo <strong>substitui</strong> o anterior — ele nao soma.
        </div>
      ) : null}

      {linhas.length ? (
        <form onSubmit={enviar} className="rh-form-com-tabela space-y-4">
          <BlocoConteudo
            titulo="Lançamento por colaborador"
            variante="primario"
            cor="var(--c-primary)"
            contagem={`${linhas.length} colaborador(es)`}
          >
            <TabelaPadrao
              /*
                GRADE DE LANÇAMENTO, NÃO LISTA DE CONSULTA (05/09).
                A maioria das colunas aqui é campo de digitação, não dado a ler.
                Oferecer "escolher colunas" numa grade assim dá ao usuário como
                esconder o campo que ele precisa preencher — e ele não descobre por
                que o lançamento parou de funcionar. A capacidade sai DAQUI, não do
                sistema: nas 246 tabelas de consulta ela continua.
              */
              colunasConfiguraveis={false}
              colunas={[
                {
                  id: 'colaborador',
                  titulo: 'Colaborador',
                  // R17: a linha da jornada é de um COLABORADOR nomeado.
                  tipo: 'identidade',
                  noCard: 'titulo',
                  render: (linha) => (
                    <CelulaDupla
                      principal={linha.nome}
                      sub={linha.aindaNaoComecou
                        ? `comeca nesta obra em ${new Date(`${linha.comecaEm}T00:00:00`).toLocaleDateString('pt-BR')}`
                        : (linha.jaInformado ? 'ja informado nesta competencia' : '')}
                    />
                  )
                },
                {
                  id: 'vinculo',
                  titulo: 'Vínculo',
                  tipo: 'badge',
                  render: (linha) => linha.tipo_vinculo
                },
                {
                  id: 'salario',
                  titulo: 'Salário',
                  tipo: 'valor',
                  render: (linha) => (linha.salario_base ? formatCurrencyInput(String(linha.salario_base)) : '—')
                },
                {
                  id: 'dias',
                  titulo: 'Dias',
                  tipo: 'numero',
                  // Edicao inline: o controle mora no render da coluna.
                  render: (linha) => (linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                    <input
                      className="form-control rh-jornada-numero"
                      type="number"
                      min="0"
                      max={diasBase}
                      aria-label={`Dias trabalhados de ${linha.nome}`}
                      value={linha.dias_trabalhados}
                      onChange={(e) => alterar(linha.__indice, 'dias_trabalhados', e.target.value)}
                    />
                  ))
                },
                {
                  id: 'faltas',
                  titulo: 'Faltas',
                  tipo: 'numero',
                  render: (linha) => (linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                    <input
                      className="form-control rh-jornada-numero"
                      type="number"
                      min="0"
                      max={diasBase}
                      aria-label={`Faltas de ${linha.nome}`}
                      value={linha.faltas}
                      onChange={(e) => alterar(linha.__indice, 'faltas', e.target.value)}
                    />
                  ))
                },
                {
                  id: 'horas',
                  titulo: 'Horas extras',
                  tipo: 'numero',
                  render: (linha) => (linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                    <input
                      className="form-control rh-jornada-numero"
                      type="number"
                      min="0"
                      step="0.5"
                      aria-label={`Horas extras de ${linha.nome}`}
                      value={linha.horas_extras}
                      onChange={(e) => alterar(linha.__indice, 'horas_extras', e.target.value)}
                    />
                  ))
                },
                {
                  id: 'acrescimos',
                  titulo: 'Acréscimos',
                  tipo: 'valor',
                  render: (linha) => (linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                    <input
                      className="form-control rh-jornada-numero"
                      aria-label={`Acréscimos de ${linha.nome}`}
                      value={linha.adicionais}
                      onChange={(e) => alterar(linha.__indice, 'adicionais', formatCurrencyInput(e.target.value))}
                    />
                  ))
                },
                {
                  id: 'descontos',
                  titulo: 'Descontos',
                  tipo: 'valor',
                  render: (linha) => (linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                    <input
                      className="form-control rh-jornada-numero"
                      aria-label={`Descontos de ${linha.nome}`}
                      value={linha.descontos}
                      onChange={(e) => alterar(linha.__indice, 'descontos', formatCurrencyInput(e.target.value))}
                    />
                  ))
                },
                {
                  id: 'observacao',
                  titulo: 'Observação',
                  tipo: 'texto',
                  render: (linha) => (linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                    <input
                      className="form-control"
                      aria-label={`Observação de ${linha.nome}`}
                      value={linha.observacoes}
                      onChange={(e) => alterar(linha.__indice, 'observacoes', e.target.value)}
                    />
                  ))
                }
              ]}
              itens={linhasTabela}
              getId={(linha) => linha.colaborador_id}
              storageKey="tabela:rh-dp-jornada:colaboradores"
              rotuloRolagem="Jornada por colaborador"
              // A tarja substitui as classes de linha do markup antigo: dias +
              // faltas acima da base é erro; quem ainda nao comecou é aviso.
              urgencia={(linha) => {
                if (Number(linha.dias_trabalhados || 0) + Number(linha.faltas || 0) > Number(diasBase)) return 'danger';
                return linha.aindaNaoComecou ? 'warning' : null;
              }}
              vazio="Nenhum colaborador nesta obra e competência."
            />
          </BlocoConteudo>

          {comProblema.length ? (
            <div className="app-alert app-alert--error">
              Dias mais faltas passam de {diasBase} em: {comProblema.map((l) => l.nome).join(', ')}.
            </div>
          ) : null}

          <div className="app-actionbar">
            {podeEnviar ? (
              <button type="submit" className="btn btn-primary" disabled={salvando || comProblema.length > 0}>
                {salvando ? 'Enviando...' : 'Enviar jornada'}
              </button>
            ) : (
              <p className="app-bloco-lead" title="Você não tem permissão para enviar jornada.">Você não tem permissão para enviar jornada.</p>
            )}
          </div>
        </form>
      ) : null}

      {elementoConfirmacao}
    </div>
  );
}
