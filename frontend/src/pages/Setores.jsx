import { useEffect, useRef, useState } from 'react';
import {
  getSetores,
  criarSetor,
  atualizarSetor,
  ativarSetor,
  desativarSetor
} from '../services/setores';
import {
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  FormSecao,
  CampoForm
} from '../components/padrao';
import StatusBadge from '../components/StatusBadge';

const CAPABILITY_FIELDS = [
  { key: 'eh_setor_obra', label: 'Setor de obra' },
  { key: 'eh_setor_financeiro', label: 'Setor financeiro' },
  { key: 'eh_setor_compras', label: 'Setor de compras' },
  { key: 'eh_setor_geo', label: 'Setor GEO / processos' },
  { key: 'eh_setor_administrativo', label: 'Setor administrativo' }
];

function emptyCapabilities() {
  return CAPABILITY_FIELDS.reduce((acc, item) => {
    acc[item.key] = false;
    return acc;
  }, {});
}

function formatarCapacidades(setor) {
  return CAPABILITY_FIELDS
    .filter(item => Boolean(setor?.[item.key]))
    .map(item => item.label);
}

export default function Setores() {
  const [setores, setSetores] = useState([]);
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [capabilities, setCapabilities] = useState(emptyCapabilities);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editCapabilities, setEditCapabilities] = useState(emptyCapabilities);
  const [saving, setSaving] = useState(false);
  const [formAberto, setFormAberto] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    carregarSetores();
  }, []);

  async function carregarSetores() {
    try {
      setLoading(true);
      const data = await getSetores();
      setSetores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar setores', error);
    } finally {
      setLoading(false);
    }
  }

  function abrirNovoSetor() {
    setFormAberto(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    await criarSetor({
      nome,
      codigo,
      ...capabilities
    });

    setNome('');
    setCodigo('');
    setCapabilities(emptyCapabilities());
    setFormAberto(false);
    carregarSetores();
  }

  function iniciarEdicao(item) {
    setEditId(item.id);
    setEditNome(item.nome);
    setEditCodigo(item.codigo);
    setEditCapabilities(CAPABILITY_FIELDS.reduce((acc, field) => {
      acc[field.key] = Boolean(item?.[field.key]);
      return acc;
    }, {}));
  }

  function cancelarEdicao() {
    setEditId(null);
    setEditNome('');
    setEditCodigo('');
    setEditCapabilities(emptyCapabilities());
  }

  async function salvarEdicao(id) {
    try {
      setSaving(true);
      await atualizarSetor(id, {
        nome: editNome,
        codigo: editCodigo,
        ...editCapabilities
      });
      cancelarEdicao();
      carregarSetores();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar edicao');
    } finally {
      setSaving(false);
    }
  }

  const colunas = [
    {
      id: 'nome',
      titulo: 'Nome',
      largura: 220,
      minWidth: 150,
      noCard: 'titulo',
      render: (s) => (
        editId === s.id ? (
          <input
            className="input input-sm w-full"
            value={editNome}
            onChange={e => setEditNome(e.target.value)}
            aria-label="Nome do setor"
          />
        ) : (
          s.nome
        )
      )
    },
    {
      id: 'codigo',
      titulo: 'Codigo',
      largura: 130,
      render: (s) => (
        editId === s.id ? (
          <input
            className="input input-sm w-full"
            value={editCodigo}
            onChange={e => setEditCodigo(e.target.value.toUpperCase())}
            aria-label="Codigo do setor"
          />
        ) : (
          s.codigo
        )
      )
    },
    {
      id: 'capacidades',
      titulo: 'Capacidades',
      largura: 320,
      render: (s) => (
        editId === s.id ? (
          <div className="grid gap-1 md:grid-cols-2">
            {CAPABILITY_FIELDS.map(field => (
              <label key={field.key} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(editCapabilities[field.key])}
                  onChange={e => setEditCapabilities(prev => ({ ...prev, [field.key]: e.target.checked }))}
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {formatarCapacidades(s).length > 0 ? formatarCapacidades(s).map(label => (
              <span key={label} className="fx-badge fx-badge--neutral">
                {label}
              </span>
            )) : <span className="text-xs text-[var(--c-muted)]">Nenhuma</span>}
          </div>
        )
      )
    },
    {
      id: 'status',
      titulo: 'Status',
      largura: 110,
      render: (s) => <StatusBadge status={s.ativo ? 'Ativo' : 'Inativo'} />
    }
  ];

  return (
    <div className="page solicitacoes-page">
      <PageHeader
        titulo="Setores"
        subtitulo={loading
          ? 'Cadastro e manutencao de setores.'
          : `${setores.length} setor(es) · cadastro e manutencao.`}
        acaoPrincipal={{ rotulo: 'Novo setor', onClick: abrirNovoSetor }}
      />

      <div className="space-y-3">
        {/* PADRÃO DE TELA MISTA (piloto Parceiros): o form de criação abre
            como painel ACIMA da lista e assume a barra de cor; a lista
            rebaixa para neutra enquanto o painel está ativo. */}
        {formAberto && (
          <div ref={formRef}>
            <BlocoConteudo
              titulo="Novo setor"
              variante="primario"
              cor="var(--sem-info)"
              acoes={(
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setFormAberto(false)}>
                  Fechar
                </button>
              )}
            >
              <form className="space-y-4" onSubmit={handleSubmit}>
                <FormSecao legenda="Identificacao" colunas={2}>
                  <CampoForm label="Nome do setor" obrigatorio>
                    <input
                      className="input w-full"
                      placeholder="Ex: Geoprocessamento"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      required
                    />
                  </CampoForm>
                  <CampoForm label="Codigo" obrigatorio>
                    <input
                      className="input w-full"
                      placeholder="Ex: GEO"
                      value={codigo}
                      onChange={e => setCodigo(e.target.value.toUpperCase())}
                      required
                    />
                  </CampoForm>
                  <div className="form-campo--linha">
                    <span className="form-label">Capacidades do setor</span>
                    <div className="mt-1 grid gap-2 md:grid-cols-3">
                      {CAPABILITY_FIELDS.map(field => (
                        <label key={field.key} className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(capabilities[field.key])}
                            onChange={e => setCapabilities(prev => ({ ...prev, [field.key]: e.target.checked }))}
                          />
                          <span>{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </FormSecao>

                <div className="app-actionbar">
                  <button type="submit" className="btn btn-primary">
                    Adicionar setor
                  </button>
                  <button type="button" className="btn btn-outline" onClick={() => setFormAberto(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </BlocoConteudo>
          </div>
        )}

        <BlocoConteudo
          titulo="Setores cadastrados"
          variante={formAberto ? 'neutro' : 'primario'}
          cor="var(--c-primary)"
        >
          <TabelaPadrao
            colunas={colunas}
            itens={setores}
            carregando={loading}
            storageKey="tabela:setores"
            larguraAcoes={230}
            aoClicarLinha={(s) => {
              // Clique na linha abre a edição inline; com uma edição ativa
              // o clique não faz nada (evita perder o que foi digitado).
              if (editId === null) iniciarEdicao(s);
            }}
            vazio={{
              title: 'Nenhum setor cadastrado',
              message: 'Use "Novo setor" para criar o primeiro registro.'
            }}
            acoesLinha={(s) => (
              editId === s.id ? (
                <>
                  <button className="btn btn-primary btn-sm" onClick={() => salvarEdicao(s.id)} disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={cancelarEdicao} disabled={saving}>
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => iniciarEdicao(s)}>
                    Editar
                  </button>
                  {s.ativo ? (
                    <button className="btn btn-outline btn-sm btn-perigo-suave" onClick={async () => { await desativarSetor(s.id); carregarSetores(); }}>
                      Desativar
                    </button>
                  ) : (
                    <button className="btn btn-outline btn-sm" onClick={async () => { await ativarSetor(s.id); carregarSetores(); }}>
                      Ativar
                    </button>
                  )}
                </>
              )
            )}
          />
        </BlocoConteudo>
      </div>
    </div>
  );
}
