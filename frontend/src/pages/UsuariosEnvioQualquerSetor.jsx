import { useEffect, useMemo, useState } from 'react';
import {
  getUsuariosEnvioQualquerSetor,
  salvarUsuariosEnvioQualquerSetor
} from '../services/configuracoesSistema';
import { Pagina, PageHeader, BlocoConteudo, TabelaPadrao, CelulaDupla } from '../components/padrao';
import StatusBadge from '../components/StatusBadge';

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export default function UsuariosEnvioQualquerSetor() {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionados, setSelecionados] = useState(new Set());
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        setCarregando(true);
        const data = await getUsuariosEnvioQualquerSetor();
        const lista = Array.isArray(data?.usuarios) ? data.usuarios : [];
        setUsuarios(lista);
        setSelecionados(new Set(
          lista
            .filter(usuario => Boolean(usuario?.pode_enviar_qualquer_setor))
            .map(usuario => String(usuario.id))
        ));
      } catch (error) {
        console.error(error);
        alert('Erro ao carregar usuarios com permissao especial de envio.');
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    return [...usuarios]
      .filter(usuario => {
        if (!termo) return true;
        const setorLabel = usuario?.setor?.nome || usuario?.setor?.codigo || '';
        return [usuario?.nome, usuario?.email, usuario?.perfil, setorLabel]
          .some(campo => normalizarTexto(campo).includes(termo));
      })
      .sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt-BR'));
  }, [usuarios, busca]);

  function alternarUsuario(usuarioId) {
    const key = String(usuarioId);
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selecionarFiltrados() {
    setSelecionados(prev => {
      const next = new Set(prev);
      usuariosFiltrados.forEach(usuario => next.add(String(usuario.id)));
      return next;
    });
  }

  function limparFiltrados() {
    setSelecionados(prev => {
      const next = new Set(prev);
      usuariosFiltrados.forEach(usuario => next.delete(String(usuario.id)));
      return next;
    });
  }

  async function salvar() {
    try {
      setSalvando(true);
      const usuarioIds = Array.from(selecionados)
        .map(id => Number(id))
        .filter(id => Number.isInteger(id) && id > 0);
      await salvarUsuariosEnvioQualquerSetor({ usuario_ids: usuarioIds });
      setUsuarios(prev => prev.map(usuario => ({
        ...usuario,
        pode_enviar_qualquer_setor: selecionados.has(String(usuario.id))
      })));
      alert('Configuracao salva com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error?.message || 'Erro ao salvar permissao especial de envio.');
    } finally {
      setSalvando(false);
    }
  }

  const colunas = [
    {
      id: 'liberado',
      titulo: 'Liberado',
      tipo: 'status',
      render: (usuario) => (
        <input
          type="checkbox"
          checked={selecionados.has(String(usuario.id))}
          onChange={() => alternarUsuario(usuario.id)}
          aria-label={`Liberar envio livre para ${usuario.nome}`}
        />
      )
    },
    {
      id: 'usuario',
      titulo: 'Usuario',
      tipo: 'texto',
      noCard: 'titulo',
      render: (usuario) => <CelulaDupla principal={usuario.nome} sub={usuario.email} />
    },
    {
      id: 'perfil',
      titulo: 'Perfil',
      tipo: 'badge',
      render: (usuario) => String(usuario.perfil || '').toUpperCase() || '-'
    },
    {
      id: 'setor',
      titulo: 'Setor',
      tipo: 'badge',
      render: (usuario) => usuario?.setor?.nome || usuario?.setor?.codigo || '-'
    },
    {
      id: 'status',
      titulo: 'Status',
      tipo: 'status',
      render: (usuario) => <StatusBadge status={usuario?.ativo !== false ? 'Ativo' : 'Inativo'} />
    }
  ];

  return (
    <Pagina>
      <PageHeader
        titulo="Envio livre entre setores"
        subtitulo="Libera usuarios especificos para enviar solicitacoes a outro setor mesmo quando elas nao estao no setor atual deles. Usuarios do setor OBRA continuam fora desta regra."
        acaoPrincipal={{
          rotulo: salvando ? 'Salvando...' : 'Salvar',
          onClick: salvar,
          desabilitada: salvando || carregando
        }}
        secundarias={[
          { rotulo: 'Selecionar filtrados', onClick: selecionarFiltrados },
          { rotulo: 'Limpar filtrados', onClick: limparFiltrados }
        ]}
      />

      <BlocoConteudo
        titulo={`Usuarios (${selecionados.size} marcado(s))`}
        variante="primario"
        cor="var(--c-primary)"
        acoes={(
          <input
            className="input input-sm app-busca"
            placeholder="Nome, email, perfil ou setor"
            aria-label="Buscar usuario"
            value={busca}
            onChange={event => setBusca(event.target.value)}
          />
        )}
      >
        <TabelaPadrao
          colunas={colunas}
          itens={usuariosFiltrados}
          carregando={carregando}
          storageKey="tabela:usuarios-envio-livre"
          vazio={{ title: 'Nenhum usuario encontrado' }}
        />
      </BlocoConteudo>
    </Pagina>
  );
}
