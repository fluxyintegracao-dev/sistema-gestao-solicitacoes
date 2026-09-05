import { useEffect, useState } from 'react';
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  StatGrid,
  StatTile,
  Avisos,
  useAvisos,
  useConfirmacao
} from '../../../components/padrao';
import StatusBadge from '../../../components/StatusBadge';
import { getSstExecutivo, sincronizarNotificacoesSst } from '../services/sst';

/*
  R25 — a criticidade vinha em paleta crua (emerald/amber/sky/rose). Ela é
  uma ESCALA de intensidade, e o sistema não tem paleta de intensidade em
  token: tem cinco famílias semânticas (`--sem-*`). O mapa abaixo é
  explícito de propósito, como o FAMILIA_SITUACAO da ComercialUnidades —
  a classificação automática do StatusBadge jogaria CRITICA e ALTA na mesma
  família, e a distinção entre os quatro níveis é justamente o que o mapa
  de risco existe para mostrar.
*/
const FAMILIA_CRITICIDADE = {
  CRITICA: 'danger',
  CRITICO: 'danger',
  EMERGENCIAL: 'danger',
  ALTA: 'warning',
  ATENCAO: 'warning',
  MEDIA: 'info',
  CONTROLADO: 'info',
  BAIXA: 'success',
  EXCELENTE: 'success'
};

function familiaCriticidade(valor) {
  return FAMILIA_CRITICIDADE[String(valor || '').toUpperCase()] || 'neutral';
}

export default function SstExecutivo() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { avisos, avisar, fechar } = useAvisos();
  const { confirmar, elementoConfirmacao } = useConfirmacao();

  function load() {
    setLoading(true);
    getSstExecutivo()
      .then((payload) => setData(payload))
      .catch((err) => avisar.erro(err?.message || 'Erro ao carregar painel executivo SST'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function syncNotifications() {
    /*
      R21/R26 — a sincronização CRIA notificações para as pessoas do módulo:
      é gravação, e merece consentimento explícito. O retorno se
      DESESTRUTURA (`const { ok } =`): o hook devolve `{ ok, texto }`, e ler
      o objeto como booleano faria o "Cancelar" prosseguir. Não há alvo
      variável a fixar aqui — a ação é sobre o painel inteiro, e não sobre
      um registro que a lista pudesse trocar durante o modal.
    */
    const { ok } = await confirmar({
      titulo: 'Sincronizar notificacoes SST',
      mensagem: 'Cria as notificacoes pendentes de vencimento, bloqueio e pendencia critica para os responsaveis. Deseja continuar?',
      rotuloConfirmar: 'Sincronizar'
    });
    if (!ok) return;
    try {
      const payload = await sincronizarNotificacoesSst();
      avisar.sucesso(`${payload?.notificacoes_criadas || 0} notificacao(oes) criada(s).`);
      load();
    } catch (err) {
      avisar.erro(err?.message || 'Erro ao sincronizar notificacoes SST');
    }
  }

  const cards = data?.cards || {};
  const obras = data?.heatmap || [];

  return (
    <Pagina>
      <PageHeader
        titulo="Inteligencia operacional SST"
        contagem={loading ? 'Carregando' : `${obras.length} obra(s) critica(s)`}
        descricao="Score, pendencias, bloqueios, obras criticas e prontidao preditiva sem transmissao real ao eSocial."
        acaoPrincipal={{ rotulo: 'Heatmap', to: '/sst/relatorios/heatmap' }}
        secundarias={[{ rotulo: 'Sincronizar notificacoes', onClick: syncNotifications }]}
      />

      <Avisos avisos={avisos} aoFechar={fechar} />

      <BlocoConteudo
        titulo="Compliance e pendencias"
        variante="primario"
        cor="var(--module-sst)"
        descricao={data?.nivel ? `Nivel atual: ${data.nivel}.` : 'Recorte corporativo do modulo.'}
      >
        <StatGrid colunas={3}>
          <StatTile
            label="Compliance geral"
            valor={`${data?.compliance_geral ?? 100}%`}
            sub={data?.nivel || 'CONTROLADO'}
            tom={(data?.compliance_geral ?? 100) < 50 ? 'danger' : 'success'}
          />
          <StatTile label="Colaboradores avaliados" valor={cards.colaboradores_avaliados || 0} sub="Score SST" tom="info" />
          <StatTile label="Pendencias" valor={cards.pendencias_total || 0} sub="Abertas ou detectadas" tom={cards.pendencias_total ? 'warning' : 'success'} />
          <StatTile label="Pendencias criticas" valor={cards.pendencias_criticas || 0} sub="Exigem acao" tom={cards.pendencias_criticas ? 'danger' : 'success'} />
          <StatTile label="Bloqueios abertos" valor={cards.bloqueios_abertos || 0} sub="Motor operacional" tom={cards.bloqueios_abertos ? 'danger' : 'success'} />
        </StatGrid>
      </BlocoConteudo>

      {/*
        Isto NÃO é tabela: é o recorte de risco por obra, lido como mapa.
        Cada obra é um bloco secundário com a TARJA lateral da sua família
        (`.tarja--*`, o utilitário que o próprio catálogo declara aplicável
        a "linha, card, bloco") e a etiqueta de criticidade — cor, ícone e
        texto juntos, porque cor sozinha não comunica.
      */}
      <BlocoConteudo
        titulo="Obras criticas"
        contagem={`${obras.length} item(ns)`}
        descricao="Ordenadas pelo indice de risco calculado no backend."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {obras.map((item) => (
            <BlocoConteudo
              key={`${item.obra_id || 'sem'}-${item.obra}`}
              variante="secundario"
              className={`tarja tarja--${familiaCriticidade(item.criticidade)}`}
              titulo={item.obra}
              descricao={`Indice de risco ${item.indice_risco}`}
              acoes={<StatusBadge status={item.criticidade || 'SEM NIVEL'} kind={familiaCriticidade(item.criticidade)} />}
            >
              <StatGrid colunas={1}>
                <StatTile label="Pendencias" valor={item.pendencias ?? 0} tom={item.pendencias ? 'warning' : undefined} />
              </StatGrid>
            </BlocoConteudo>
          ))}
          {!obras.length ? <p className="text-sm text-muted">Nenhuma obra critica detectada.</p> : null}
        </div>
      </BlocoConteudo>

      <BlocoConteudo
        titulo="Prontidao preditiva e IA documental"
        descricao="Contratos futuros ja estruturados; nada e transmitido nesta fase."
      >
        <StatGrid colunas={2}>
          <StatTile
            label="Prontidao preditiva"
            valor={data?.predicao?.status || 'PREPARADO_ARQUITETURALMENTE'}
            sub="Motor preditivo preparado, sem IA ativa nesta fase."
          />
          <StatTile
            label="IA documental"
            valor={data?.ia_documental?.status || 'PIPELINE_DOCUMENTAL_PREPARADO'}
            sub="OCR e classificacao documental estruturados como contratos futuros."
          />
        </StatGrid>
      </BlocoConteudo>

      {elementoConfirmacao}
    </Pagina>
  );
}
