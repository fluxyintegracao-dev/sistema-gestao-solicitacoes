import { useEffect, useMemo, useRef, useState } from 'react';
import {
  atualizarCategoriaParceiro,
  criarCategoriaParceiro,
  desativarCategoriaParceiro,
  listarCategoriasParceiro
} from '../services/parceiros';
import {
  PageHeader,
  BlocoConteudo,
  TabelaPadrao,
  FormSecao,
  CampoForm
} from '../components/padrao';
import StatusBadge from '../components/StatusBadge';

function defaultCategoriaForm() {
  return {
    id: null,
    nome: '',
    ativo: true
  };
}

function pickCategoriaFormData(categoria = {}) {
  return {
    id: categoria.id || null,
    nome: categoria.nome || '',
    ativo: categoria.ativo !== false
  };
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function ParceiroCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [categoriaForm, setCategoriaForm] = useState(defaultCategoriaForm());
  const [formAberto, setFormAberto] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const formRef = useRef(null);

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const data = await listarCategoriasParceiro({ incluir_inativos: 1 });
      setCategorias(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Erro ao carregar categorias de parceiro');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  const categoriasFiltradas = useMemo(() => {
    const search = normalizeSearchText(filtro);
    if (!search) {
      return categorias;
    }

    return categorias.filter((categoria) => {
      const nome = normalizeSearchText(categoria.nome);
      return nome.includes(search);
    });
  }, [categorias, filtro]);

  function abrirNovaCategoria() {
    setCategoriaForm(defaultCategoriaForm());
    setFormAberto(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function abrirEdicao(categoria) {
    setCategoriaForm(pickCategoriaFormData(categoria));
    setFormAberto(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function fecharForm() {
    setCategoriaForm(defaultCategoriaForm());
    setFormAberto(false);
  }

  async function handleSalvarCategoria(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError('');
      const { id, ...payload } = pickCategoriaFormData(categoriaForm);
      if (categoriaForm.id) {
        await atualizarCategoriaParceiro(categoriaForm.id, payload);
      } else {
        await criarCategoriaParceiro(payload);
      }
      setCategoriaForm(defaultCategoriaForm());
      setFormAberto(false);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao salvar categoria de parceiro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDesativar(categoria) {
    try {
      setSaving(true);
      setError('');
      await desativarCategoriaParceiro(categoria.id);
      await carregar();
    } catch (err) {
      setError(err?.message || 'Erro ao desativar categoria de parceiro');
    } finally {
      setSaving(false);
    }
  }

  const colunas = [
    {
      id: 'nome',
      titulo: 'Categoria',
      largura: 320,
      minWidth: 180,
      noCard: 'titulo',
      // O "ID {id}" saiu da vista (aparecia sob o nome); o dado continua
      // disponível no title (tooltip) da célula.
      render: (categoria) => <span title={`ID ${categoria.id}`}>{categoria.nome}</span>
    },
    {
      id: 'status',
      titulo: 'Status',
      largura: 120,
      render: (categoria) => <StatusBadge status={categoria.ativo ? 'Ativa' : 'Inativa'} />
    }
  ];

  return (
    <div className="page solicitacoes-page">
      <PageHeader
        titulo="Categorias de Parceiro"
        subtitulo="Use categorias para agrupar fornecedores e facilitar o envio de cotacoes."
        acaoPrincipal={{ rotulo: 'Nova categoria', onClick: abrirNovaCategoria }}
      />

      {error && (
        <div className="app-alert app-alert--error">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* PADRÃO DE TELA MISTA (piloto Parceiros): o form abre como painel
            ACIMA da lista e assume a barra de cor; a lista rebaixa para
            neutra enquanto o painel está ativo. */}
        {formAberto && (
          <div ref={formRef} key={categoriaForm.id || 'nova'}>
            <BlocoConteudo
              titulo={categoriaForm.id ? `Editar categoria — ${categoriaForm.nome || ''}` : 'Nova categoria'}
              variante="primario"
              cor="var(--sem-info)"
              acoes={(
                <button type="button" className="btn btn-outline btn-sm" onClick={fecharForm}>
                  Fechar
                </button>
              )}
            >
              <form className="space-y-4" onSubmit={handleSalvarCategoria}>
                <FormSecao legenda="Identificacao" colunas={2}>
                  <CampoForm label="Nome da categoria" obrigatorio>
                    <input
                      className="input w-full"
                      placeholder="Ex: Material eletrico"
                      value={categoriaForm.nome}
                      onChange={(e) => setCategoriaForm((c) => ({ ...c, nome: e.target.value }))}
                      required
                    />
                  </CampoForm>
                  <CampoForm label="Situacao">
                    <label className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={categoriaForm.ativo}
                        onChange={(e) => setCategoriaForm((c) => ({ ...c, ativo: e.target.checked }))}
                      />
                      Categoria ativa
                    </label>
                  </CampoForm>
                </FormSecao>

                <div className="app-actionbar">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : (categoriaForm.id ? 'Salvar alteracoes' : 'Criar categoria')}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={fecharForm}>
                    Cancelar
                  </button>
                </div>
              </form>
            </BlocoConteudo>
          </div>
        )}

        <BlocoConteudo
          titulo="Categorias cadastradas"
          variante={formAberto ? 'neutro' : 'primario'}
          cor="var(--c-primary)"
          acoes={(
            <input
              className="input input-sm w-[220px]"
              placeholder="Buscar categoria"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            />
          )}
        >
          <TabelaPadrao
            colunas={colunas}
            itens={categoriasFiltradas}
            carregando={loading}
            storageKey="tabela:parceiro-categorias"
            larguraAcoes={210}
            aoClicarLinha={abrirEdicao}
            vazio={{
              title: filtro ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada',
              message: filtro
                ? 'Ajuste a busca para ver outras categorias.'
                : 'Use "Nova categoria" para criar a primeira.'
            }}
            acoesLinha={(categoria) => (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => abrirEdicao(categoria)}
                >
                  Editar
                </button>
                {categoria.ativo && (
                  <span className="app-actionbar-apartada">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm btn-perigo-suave"
                      onClick={() => handleDesativar(categoria)}
                    >
                      Desativar
                    </button>
                  </span>
                )}
              </>
            )}
          />
        </BlocoConteudo>
      </div>
    </div>
  );
}
