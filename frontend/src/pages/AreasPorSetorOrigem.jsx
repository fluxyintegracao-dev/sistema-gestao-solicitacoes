import { useEffect, useMemo, useState } from 'react';
import { getSetores } from '../services/setores';
import {
  Pagina,
  PageHeader,
  BlocoConteudo,
  Avisos,
  useAvisos
} from '../components/padrao';
import {
  getAreasPorSetorOrigem,
  salvarAreasPorSetorOrigem
} from '../services/configuracoesSistema';

export default function AreasPorSetorOrigem() {
  const [setores, setSetores] = useState([]);
  const [regras, setRegras] = useState({});
  const [origemSelecionada, setOrigemSelecionada] = useState('');
  const [salvando, setSalvando] = useState(false);
  // R3/R19: a caixa do navegador (alert) some sem rastro, ignora tema e o
  // harness nao a enxerga — o resultado do salvar vira faixa do sistema.
  const { avisos, avisar, fechar } = useAvisos();

  useEffect(() => {
    async function load() {
      const [listaSetores, cfg] = await Promise.all([
        getSetores(),
        getAreasPorSetorOrigem()
      ]);

      const setoresAtivos = Array.isArray(listaSetores)
        ? listaSetores.filter(s => s?.ativo !== false)
        : [];
      setSetores(setoresAtivos);

      const regrasCarregadas = cfg?.regras && typeof cfg.regras === 'object'
        ? cfg.regras
        : {};
      setRegras(regrasCarregadas);

      const primeiroCodigo = String(setoresAtivos?.[0]?.codigo || '').toUpperCase();
      setOrigemSelecionada(primeiroCodigo);
    }
    load();
  }, []);

  const setoresOrdenados = useMemo(() => {
    return [...setores].sort((a, b) => {
      const nomeA = String(a?.nome || '').toUpperCase();
      const nomeB = String(b?.nome || '').toUpperCase();
      return nomeA.localeCompare(nomeB);
    });
  }, [setores]);

  const destinosSelecionados = useMemo(() => {
    const lista = regras[String(origemSelecionada || '').toUpperCase()] || [];
    return new Set(lista.map(item => String(item || '').toUpperCase()));
  }, [regras, origemSelecionada]);

  function alternarDestino(codigo) {
    const origem = String(origemSelecionada || '').toUpperCase();
    if (!origem) return;
    const destino = String(codigo || '').toUpperCase();

    setRegras(prev => {
      const atuais = new Set((prev[origem] || []).map(item => String(item || '').toUpperCase()));
      if (atuais.has(destino)) {
        atuais.delete(destino);
      } else {
        atuais.add(destino);
      }
      return {
        ...prev,
        [origem]: Array.from(atuais)
      };
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      await salvarAreasPorSetorOrigem({ regras });
      avisar.sucesso('Configuracao salva com sucesso');
    } catch (error) {
      console.error(error);
      avisar.erro(error?.message || 'Erro ao salvar configuracao');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Pagina>
      {/* C1/C2/R5: titulo e apoio na faixa fixa do topo, com superficie
          propria — antes flutuavam soltos sobre o canvas.
          C5: o unico primario da tela ("Salvar") estava no rodape do bloco,
          abaixo da grade de setores; no cabecalho ele fica a um clique
          mesmo com a lista rolada. */}
      <PageHeader
        titulo="Areas por setor de origem"
        contagem={origemSelecionada ? `${destinosSelecionados.size} de ${setoresOrdenados.length} area(s) marcada(s)` : null}
        descricao="Defina quais setores cada setor pode selecionar como area responsavel na Nova Solicitacao."
        acaoPrincipal={{
          rotulo: salvando ? 'Salvando...' : 'Salvar',
          onClick: salvar,
          desabilitada: salvando
        }}
      />

      <Avisos avisos={avisos} aoFechar={fechar} />

      <BlocoConteudo titulo="Areas liberadas" variante="primario" cor="var(--c-primary)">
        <div className="space-y-4">
          {/* R12: seletor de CONTEXTO, nao filtro — ele escolhe QUAL regra
              se edita, e as marcacoes abaixo pertencem a origem escolhida. */}
          <label className="grid gap-1 text-sm md:max-w-md">
            Setor de origem
            <select
              className="input"
              value={origemSelecionada}
              onChange={e => setOrigemSelecionada(e.target.value)}
            >
              <option value="">Selecione</option>
              {setoresOrdenados.map(setor => (
                <option key={setor.id} value={String(setor.codigo || '').toUpperCase()}>
                  {setor.nome} ({String(setor.codigo || '').toUpperCase()})
                </option>
              ))}
            </select>
          </label>

          {origemSelecionada ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {setoresOrdenados.map(setor => {
                const codigo = String(setor.codigo || '').toUpperCase();
                const marcado = destinosSelecionados.has(codigo);
                return (
                  <label key={setor.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarDestino(codigo)}
                    />
                    <span>
                      {setor.nome} ({codigo})
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="app-note">Escolha o setor de origem para liberar as areas responsaveis.</p>
          )}
        </div>
      </BlocoConteudo>
    </Pagina>
  );
}
