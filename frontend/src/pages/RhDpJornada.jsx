import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ResizableTable, ResizableTh } from '../components/ResizableTable';
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

// Ver o comentario em RhDpPessoal.jsx: sem `columns` + `columnKey`, as colunas colapsam.
const COLUNAS_JORNADA = [
  { key: 'colaborador', width: 230, minWidth: 170 },
  { key: 'vinculo', width: 100, minWidth: 85 },
  { key: 'salario', width: 130, minWidth: 110 },
  { key: 'dias', width: 100, minWidth: 90 },
  { key: 'faltas', width: 100, minWidth: 90 },
  { key: 'horas', width: 120, minWidth: 100 },
  { key: 'acrescimos', width: 130, minWidth: 110 },
  { key: 'descontos', width: 130, minWidth: 110 },
  { key: 'observacao', width: 220, minWidth: 160 }
];

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
 * Serve de PAGINA e de ABA.
 *
 * `comoAba` tira o cabecalho e o container de pagina — dentro de Pessoal, quem manda no titulo e no
 * espacamento e a pagina anfitria.
 *
 * Um parametro, e nao dois componentes: carregar, validar e enviar a jornada e a mesma logica nos
 * dois usos, e duplicar isso seria criar duas versoes da mesma validacao para divergirem depois.
 */
export default function RhDpJornada({ comoAba = false }) {
  const { user } = useAuth();

  const [obras, setObras] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [obra, setObra] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [competencia, setCompetencia] = useState(COMPETENCIA_ATUAL);
  const [diasBase, setDiasBase] = useState(30);

  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const podeEnviar = hasAnyExplicitPermissao(user, ['rh_dp.solicitacoes.abrir']);

  useEffect(() => {
    (async () => {
      try {
        const listaObras = await getObras();
        setObras(Array.isArray(listaObras) ? listaObras : []);
      } catch (error) {
        setErro(error.message || 'Nao foi possivel carregar as obras.');
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
  }, []);

  const carregar = useCallback(async () => {
    if (!obra || !competencia) {
      setErro('Escolha a obra e a competencia.');
      return;
    }
    setCarregando(true);
    setErro('');
    setAviso('');
    try {
      const lista = await colaboradoresParaJornadaRh({ obra_id: obra, competencia });
      setLinhas((Array.isArray(lista) ? lista : []).map(linhaVazia));
      const ativos = (Array.isArray(lista) ? lista : []).filter((c) => !c.ainda_nao_comecou);
      const futuros = (Array.isArray(lista) ? lista : []).filter((c) => c.ainda_nao_comecou);

      if (!ativos.length && futuros.length) {
        // A resposta "nenhum colaborador" e tecnicamente certa e pratica errada: quem acabou de
        // lotar alguem nesta obra conclui que a lotacao nao funcionou.
        setAviso(
          `Ninguem trabalhou nesta obra em ${competencia}, mas `
          + `${futuros.length} colaborador(es) comecam depois — eles aparecem abaixo, sem campos.`
        );
      } else if (!ativos.length) {
        setAviso('Nenhum colaborador esteve nesta obra nesta competencia.');
      }
    } catch (error) {
      setErro(error.message || 'Nao foi possivel montar a lista.');
      setLinhas([]);
    } finally {
      setCarregando(false);
    }
  }, [obra, competencia]);

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

  const jaInformados = useMemo(() => linhas.filter((l) => l.jaInformado).length, [linhas]);

  const comProblema = useMemo(() => linhas.filter((linha) => {
    const dias = Number(linha.dias_trabalhados || 0);
    const faltas = Number(linha.faltas || 0);
    return linha.dias_trabalhados !== '' && dias + faltas > Number(diasBase);
  }), [linhas, diasBase]);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    setAviso('');

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
      setErro('Informe a jornada de ao menos um colaborador.');
      return;
    }

    if (comProblema.length) {
      setErro(
        `Dias trabalhados mais faltas passam de ${diasBase} em: `
        + `${comProblema.map((l) => l.nome).join(', ')}.`
      );
      return;
    }

    if (jaInformados) {
      // eslint-disable-next-line no-alert
      const seguir = window.confirm(
        `Ja existe jornada informada nesta obra e competencia.\n\n`
        + 'O envio novo SUBSTITUI o anterior — ele nao soma. O envio anterior fica guardado como '
        + 'historico.\n\nEnviar mesmo assim?'
      );
      if (!seguir) return;
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
      setAviso(
        `Jornada de ${preenchidas.length} colaborador(es) registrada. `
        + 'O Departamento Pessoal pode gerar a apuracao desta competencia.'
      );
      await carregar();
    } catch (error) {
      setErro(error.message || 'Nao foi possivel registrar a jornada.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={comoAba ? 'space-y-4' : 'page solicitacoes-page rhdp-page space-y-6'}>
      {comoAba ? null : (
        <div className="app-page-header">
          <div className="app-page-header-row">
            <div>
              <h1 className="text-xl font-semibold md:text-2xl">RH/DP • Jornada</h1>
              <p className="page-subtitle">
                A obra informa dias trabalhados, faltas, horas extras, acrescimos e descontos. O
                sistema calcula o pagamento.
              </p>
            </div>
            <div className="app-page-actions">
              <Link to="/rh-dp/pessoal" className="btn btn-outline">Pessoal</Link>
              <Link to="/rh-dp/importacoes" className="btn btn-outline">Enviar por planilha</Link>
            </div>
          </div>
        </div>
      )}

      {erro ? <div className="alert alert-danger">{erro}</div> : null}
      {aviso ? <div className="alert alert-success">{aviso}</div> : null}

      <div className="sol-surface-card app-toolbar-card rounded-xl p-3 md:p-4 space-y-3">
        <div className="rh-colaboradores-filter-grid">
          <select className="form-control" value={obra} onChange={(e) => setObra(e.target.value)}>
            <option value="">Obra</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          <input
            className="form-control"
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
          />
          {empresas.length ? (
            <select className="form-control" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
              <option value="">Empresa do grupo (opcional)</option>
              {empresas.map((e2) => <option key={e2.id} value={e2.id}>{e2.nome}</option>)}
            </select>
          ) : null}
          <input
            className="form-control"
            type="number"
            min="1"
            max="31"
            value={diasBase}
            onChange={(e) => setDiasBase(e.target.value)}
            title="Dias base do mes"
          />
        </div>
        <div className="app-page-actions">
          <button type="button" className="btn btn-outline" onClick={carregar} disabled={carregando}>
            {carregando ? 'Carregando...' : 'Montar lista'}
          </button>
          {linhas.length ? (
            <button type="button" className="btn btn-outline" onClick={preencherMesCheio}>
              Preencher mes cheio
            </button>
          ) : null}
        </div>
      </div>

      {jaInformados ? (
        <div className="alert alert-warning">
          Esta obra ja tem jornada informada em {competencia} ({jaInformados} colaborador(es)).
          Um envio novo <strong>substitui</strong> o anterior — ele nao soma.
        </div>
      ) : null}

      {linhas.length ? (
        <form onSubmit={enviar} className="space-y-4 rh-form-com-tabela">
          <div className="card sol-surface-card app-table-shell">
            <div className="app-dense-table-wrapper">
              <ResizableTable
                columns={COLUNAS_JORNADA}
                storageKey="rh-jornada-colunas"
                className="app-dense-data-table"
              >
                <thead>
                  <tr>
                    <ResizableTh columnKey="colaborador">Colaborador</ResizableTh>
                    <ResizableTh columnKey="vinculo">Vinculo</ResizableTh>
                    <ResizableTh columnKey="salario">Salario</ResizableTh>
                    <ResizableTh columnKey="dias">Dias</ResizableTh>
                    <ResizableTh columnKey="faltas">Faltas</ResizableTh>
                    <ResizableTh columnKey="horas">Horas extras</ResizableTh>
                    <ResizableTh columnKey="acrescimos">Acrescimos</ResizableTh>
                    <ResizableTh columnKey="descontos">Descontos</ResizableTh>
                    <ResizableTh columnKey="observacao">Observacao</ResizableTh>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha, indice) => {
                    const estoura = Number(linha.dias_trabalhados || 0) + Number(linha.faltas || 0) > Number(diasBase);
                    return (
                      <tr
                        key={linha.colaborador_id}
                        className={[
                          estoura ? 'rh-jornada-linha--erro' : '',
                          linha.aindaNaoComecou ? 'rh-jornada-linha--futura' : ''
                        ].filter(Boolean).join(' ') || undefined}
                      >
                        <td>
                          <div className="font-medium">{linha.nome}</div>
                          {linha.aindaNaoComecou ? (
                            <div className="text-xs rh-jornada-futura-nota">
                              comeca nesta obra em {new Date(`${linha.comecaEm}T00:00:00`).toLocaleDateString('pt-BR')}
                            </div>
                          ) : linha.jaInformado ? (
                            <div className="text-xs opacity-70">ja informado nesta competencia</div>
                          ) : null}
                        </td>
                        <td>{linha.tipo_vinculo}</td>
                        <td className="tabular-nums">
                          {linha.salario_base ? formatCurrencyInput(String(linha.salario_base)) : '—'}
                        </td>
                        <td>
                          {linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                            <input className="form-control rh-jornada-numero" type="number" min="0" max={diasBase}
                              value={linha.dias_trabalhados}
                              onChange={(e) => alterar(indice, 'dias_trabalhados', e.target.value)} />
                          )}
                        </td>
                        <td>
                          {linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                            <input className="form-control rh-jornada-numero" type="number" min="0" max={diasBase}
                              value={linha.faltas}
                              onChange={(e) => alterar(indice, 'faltas', e.target.value)} />
                          )}
                        </td>
                        <td>
                          {linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                            <input className="form-control rh-jornada-numero" type="number" min="0" step="0.5"
                              value={linha.horas_extras}
                              onChange={(e) => alterar(indice, 'horas_extras', e.target.value)} />
                          )}
                        </td>
                        <td>
                          {linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                            <input className="form-control rh-jornada-numero" value={linha.adicionais}
                              onChange={(e) => alterar(indice, 'adicionais', formatCurrencyInput(e.target.value))} />
                          )}
                        </td>
                        <td>
                          {linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                            <input className="form-control rh-jornada-numero" value={linha.descontos}
                              onChange={(e) => alterar(indice, 'descontos', formatCurrencyInput(e.target.value))} />
                          )}
                        </td>
                        <td>
                          {linha.aindaNaoComecou ? <span className="opacity-50">—</span> : (
                            <input className="form-control" value={linha.observacoes}
                              onChange={(e) => alterar(indice, 'observacoes', e.target.value)} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </ResizableTable>
            </div>
          </div>

          {comProblema.length ? (
            <div className="alert alert-danger">
              Dias mais faltas passam de {diasBase} em: {comProblema.map((l) => l.nome).join(', ')}.
            </div>
          ) : null}

          <div className="app-page-actions">
            {podeEnviar ? (
              <button type="submit" className="btn btn-primary" disabled={salvando || comProblema.length > 0}>
                {salvando ? 'Enviando...' : 'Enviar jornada'}
              </button>
            ) : (
              <p className="opacity-70">Voce nao tem permissao para enviar jornada.</p>
            )}
          </div>
        </form>
      ) : null}

      <p className="page-subtitle">
        Os eventos recorrentes — vale alimentacao, desconto de adiantamento, pensao — sao aplicados
        sozinhos quando o Departamento Pessoal gerar a apuracao. Nao precisam ser digitados aqui.
      </p>
    </div>
  );
}
