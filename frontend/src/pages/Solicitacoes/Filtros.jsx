import { useEffect, useRef, useState } from 'react';
import { HiAdjustmentsHorizontal, HiChevronDown, HiChevronUp, HiEye, HiEyeSlash } from 'react-icons/hi2';

const FILTROS_DISPONIVEIS = [
  { id: 'numero_sienge', label: 'Número SIENGE' },
  { id: 'obra_ids', label: 'Obra' },
  { id: 'area', label: 'Setor' },
  { id: 'tipo_solicitacao_id', label: 'Tipo de solicitação' },
  { id: 'status', label: 'Status' },
  { id: 'valor_min', label: 'Valor mínimo' },
  { id: 'valor_max', label: 'Valor máximo' },
  { id: 'data_registro', label: 'Data de registro' },
  { id: 'data_vencimento', label: 'Data de vencimento' },
  { id: 'responsavel', label: 'Responsável' }
];

export default function Filtros({
  filtros,
  setFiltros,
  obrasOptions = [],
  responsaveisOptions = [],
  setores = [],
  tiposSolicitacao = [],
  statusOptions = [],
  mostrarFiltroResponsavel = false,
  mostrarSomaValor = false,
  somaValorFiltrado = 0
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [obraDropdownOpen, setObraDropdownOpen] = useState(false);
  const obraDropdownRef = useRef(null);
  const [tipoDropdownOpen, setTipoDropdownOpen] = useState(false);
  const tipoDropdownRef = useRef(null);
  const [seletorFiltrosOpen, setSeletorFiltrosOpen] = useState(false);
  const seletorFiltrosRef = useRef(null);
  
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(() => {
    try {
      const salvo = localStorage.getItem('solicitacoes:filtros-visiveis');
      if (salvo) {
        return JSON.parse(salvo);
      }
    } catch (error) {
      console.error('Erro ao carregar filtros visíveis', error);
    }
    return FILTROS_DISPONIVEIS.map(f => f.id);
  });

  useEffect(() => {
    try {
      localStorage.setItem('solicitacoes:filtros-visiveis', JSON.stringify(filtrosVisiveis));
    } catch (error) {
      console.error('Erro ao salvar filtros visíveis', error);
    }
  }, [filtrosVisiveis]);

  useEffect(() => {
    function onResize() {
      const isMobile = window.innerWidth < 768;
      setIsMobileViewport(isMobile);
      if (!isMobile) setMobileOpen(false);
    }

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    function onClickOutside(event) {
      if (tipoDropdownOpen && !tipoDropdownRef.current?.contains(event.target)) {
        setTipoDropdownOpen(false);
      }
      if (obraDropdownOpen && !obraDropdownRef.current?.contains(event.target)) {
        setObraDropdownOpen(false);
      }
      if (seletorFiltrosOpen && !seletorFiltrosRef.current?.contains(event.target)) {
        setSeletorFiltrosOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [tipoDropdownOpen, obraDropdownOpen, seletorFiltrosOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function limparFiltros() {
    setFiltros({
      numero_solicitacao: '',
      obra_ids: '',
      area: '',
      tipo_solicitacao_id: '',
      status: '',
      valor_min: '',
      valor_max: '',
      data_registro: '',
      data_vencimento: '',
      responsavel: ''
    });
    setObraDropdownOpen(false);
    setTipoDropdownOpen(false);
  }

  function alternarFiltroVisivel(filtroId) {
    setFiltrosVisiveis(prev => {
      if (prev.includes(filtroId)) {
        return prev.filter(id => id !== filtroId);
      } else {
        return [...prev, filtroId];
      }
    });
  }

  // Dados de obras
  const obraSelecionadosIds = String(filtros.obra_ids || '')
    .split(',')
    .map(v => String(v).trim())
    .filter(Boolean);

  const obraSelecionadosSet = new Set(obraSelecionadosIds);
  const obraSelecionadosNomes = obrasOptions
    .filter(obra => obraSelecionadosSet.has(String(obra.value)))
    .map(obra => obra.label);
  const resumoObrasSelecionadas = (() => {
    if (obraSelecionadosNomes.length === 0) return 'Todas as obras';
    if (obraSelecionadosNomes.length <= 2) return obraSelecionadosNomes.join(', ');
    return `${obraSelecionadosNomes.slice(0, 2).join(', ')} +${obraSelecionadosNomes.length - 2}`;
  })();

  function atualizarObrasSelecionadas(ids) {
    setFiltros(prev => ({
      ...prev,
      obra_ids: ids.join(',')
    }));
  }

  function alternarObra(obraId) {
    const id = String(obraId);
    const atuais = [...obraSelecionadosIds];
    const existe = atuais.includes(id);
    const proximos = existe
      ? atuais.filter(item => item !== id)
      : [...atuais, id];
    atualizarObrasSelecionadas(proximos);
  }

  function selecionarTodasObras() {
    const ids = obrasOptions.map(obra => String(obra.value));
    atualizarObrasSelecionadas(ids);
  }

  function limparObras() {
    atualizarObrasSelecionadas([]);
  }

  // Dados de tipos
  const tipoSelecionadosIds = String(filtros.tipo_solicitacao_id || '')
    .split(',')
    .map(v => String(v).trim())
    .filter(Boolean);

  const tipoSelecionadosSet = new Set(tipoSelecionadosIds);
  const tipoSelecionadosNomes = tiposSolicitacao
    .filter(tipo => tipoSelecionadosSet.has(String(tipo.id)))
    .map(tipo => tipo.nome);
  const resumoTiposSelecionados = (() => {
    if (tipoSelecionadosNomes.length === 0) return 'Todos os tipos';
    if (tipoSelecionadosNomes.length <= 2) return tipoSelecionadosNomes.join(', ');
    return `${tipoSelecionadosNomes.slice(0, 2).join(', ')} +${tipoSelecionadosNomes.length - 2}`;
  })();

  function atualizarTiposSelecionados(ids) {
    setFiltros(prev => ({
      ...prev,
      tipo_solicitacao_id: ids.join(',')
    }));
  }

  function alternarTipo(tipoId) {
    const id = String(tipoId);
    const atuais = [...tipoSelecionadosIds];
    const existe = atuais.includes(id);
    const proximos = existe
      ? atuais.filter(item => item !== id)
      : [...atuais, id];
    atualizarTiposSelecionados(proximos);
  }

  function selecionarTodosTipos() {
    const ids = tiposSolicitacao.map(tipo => String(tipo.id));
    atualizarTiposSelecionados(ids);
  }

  function limparTipos() {
    atualizarTiposSelecionados([]);
  }

  const quantidadeFiltrosAtivos = [
    filtros.numero_solicitacao,
    filtros.obra_ids,
    filtros.area,
    filtros.tipo_solicitacao_id,
    filtros.status,
    filtros.valor_min,
    filtros.valor_max,
    filtros.data_registro,
    filtros.data_vencimento,
    mostrarFiltroResponsavel ? filtros.responsavel : ''
  ].filter(v => String(v || '').trim() !== '').length;

  function isFiltroVisivel(filtroId) {
    return filtrosVisiveis.includes(filtroId);
  }

  return (
    <div className="solicitacoes-filtros sol-surface-card p-3 sm:p-4 rounded-xl mb-4 md:mb-6">
      <div className="md:hidden mb-3">
        <button
          type="button"
          onClick={() => setMobileOpen(prev => !prev)}
          className="w-full min-h-[44px] inline-flex items-center justify-between gap-2 rounded-xl border border-gray-200 dark:border-slate-700 px-3 py-2 bg-white dark:bg-slate-800 text-sm font-medium"
          aria-expanded={mobileOpen}
          aria-controls="painel-filtros-solicitacoes"
        >
          <span className="inline-flex items-center gap-2">
            <HiAdjustmentsHorizontal className="w-4 h-4" />
            Filtros
            {quantidadeFiltrosAtivos > 0 && (
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                {quantidadeFiltrosAtivos}
              </span>
            )}
          </span>
          {mobileOpen ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
        </button>
      </div>

      <div
        id="painel-filtros-solicitacoes"
        className={`${isMobileViewport && !mobileOpen ? 'hidden' : 'block'}`}
      >
        <div className="sol-filtros-head">
          <div>
            <p className="sol-filtros-title">Filtros</p>
            <p className="sol-filtros-subtitle">Refine por obra, setor, tipo, status, valor e datas.</p>
          </div>
          <div className="sol-filtros-meta">
            {quantidadeFiltrosAtivos > 0 && (
              <span className="sol-filtros-badge">{quantidadeFiltrosAtivos} ativo(s)</span>
            )}
            {mostrarSomaValor && (
              <div className="sol-filtros-soma">
                <span className="sol-filtros-soma-label">Soma filtrada</span>
                <strong className="sol-filtros-soma-value">
                  {Number(somaValorFiltrado || 0).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </strong>
              </div>
            )}
          </div>
        </div>

        <div className="sol-filtros-grid">
          {isFiltroVisivel('numero_sienge') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Número SIENGE</label>
              <input
                name="numero_solicitacao"
                placeholder="Ex: 12345"
                className="input"
                value={filtros.numero_solicitacao || ''}
                onChange={handleChange}
                type="text"
              />
            </div>
          )}

          {isFiltroVisivel('obra_ids') && (
            <div className="sol-filter-field sol-filter-field-multi" ref={obraDropdownRef}>
              <div className="sol-filter-label-row">
                <label className="sol-filter-label">Obra</label>
                {obraSelecionadosIds.length > 0 && (
                  <button
                    type="button"
                    className="sol-filter-link-btn"
                    onClick={limparObras}
                  >
                    Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                className={`sol-filter-multi-trigger ${obraDropdownOpen ? 'open' : ''}`}
                onClick={() => setObraDropdownOpen(prev => !prev)}
                aria-expanded={obraDropdownOpen}
                aria-label="Selecionar obras"
              >
                <span className="truncate">{resumoObrasSelecionadas}</span>
                {obraDropdownOpen ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
              </button>

              {obraDropdownOpen && (
                <div className="sol-filter-multi-popover">
                  <div className="sol-filter-multi-actions">
                    <button type="button" className="sol-filter-link-btn" onClick={selecionarTodasObras}>
                      Selecionar todas
                    </button>
                    <button type="button" className="sol-filter-link-btn" onClick={limparObras}>
                      Limpar
                    </button>
                  </div>

                  <div className="sol-filter-multi-list">
                    {obrasOptions.map(obra => {
                      const id = String(obra.value);
                      const checked = obraSelecionadosSet.has(id);
                      return (
                        <label key={obra.value} className="sol-filter-multi-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => alternarObra(id)}
                          />
                          <span>{obra.label}</span>
                        </label>
                      );
                    })}
                    {obrasOptions.length === 0 && (
                      <p className="sol-filter-multi-empty">Nenhuma obra disponivel.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isFiltroVisivel('area') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Setor</label>
              <select
                name="area"
                className="input"
                value={filtros.area || ''}
                onChange={handleChange}
              >
                <option value="">Todos os setores</option>
                {setores.map(s => (
                  <option key={s.id || s.codigo || s.nome} value={s.codigo || s.nome}>
                    {s.nome || s.codigo}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isFiltroVisivel('tipo_solicitacao_id') && (
            <div className="sol-filter-field sol-filter-field-multi" ref={tipoDropdownRef}>
              <div className="sol-filter-label-row">
                <label className="sol-filter-label">Tipo de solicitacao</label>
                {tipoSelecionadosIds.length > 0 && (
                  <button
                    type="button"
                    className="sol-filter-link-btn"
                    onClick={limparTipos}
                  >
                    Limpar
                  </button>
                )}
              </div>
              <button
                type="button"
                className={`sol-filter-multi-trigger ${tipoDropdownOpen ? 'open' : ''}`}
                onClick={() => setTipoDropdownOpen(prev => !prev)}
                aria-expanded={tipoDropdownOpen}
                aria-label="Selecionar tipos de solicitacao"
              >
                <span className="truncate">{resumoTiposSelecionados}</span>
                {tipoDropdownOpen ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
              </button>

              {tipoDropdownOpen && (
                <div className="sol-filter-multi-popover">
                  <div className="sol-filter-multi-actions">
                    <button type="button" className="sol-filter-link-btn" onClick={selecionarTodosTipos}>
                      Selecionar todos
                    </button>
                    <button type="button" className="sol-filter-link-btn" onClick={limparTipos}>
                      Limpar
                    </button>
                  </div>

                  <div className="sol-filter-multi-list">
                    {tiposSolicitacao.map(tipo => {
                      const id = String(tipo.id);
                      const checked = tipoSelecionadosSet.has(id);
                      return (
                        <label key={tipo.id} className="sol-filter-multi-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => alternarTipo(id)}
                          />
                          <span>{tipo.nome}</span>
                        </label>
                      );
                    })}
                    {tiposSolicitacao.length === 0 && (
                      <p className="sol-filter-multi-empty">Nenhum tipo cadastrado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {isFiltroVisivel('status') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Status</label>
              <select
                name="status"
                onChange={handleChange}
                className="input"
                value={filtros.status || ''}
              >
                <option value="">Todos os status</option>
                {statusOptions.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isFiltroVisivel('valor_min') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Valor minimo</label>
              <input
                name="valor_min"
                placeholder="Ex: 1000"
                className="input"
                value={filtros.valor_min || ''}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
              />
            </div>
          )}

          {isFiltroVisivel('valor_max') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Valor maximo</label>
              <input
                name="valor_max"
                placeholder="Ex: 50000"
                className="input"
                value={filtros.valor_max || ''}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
              />
            </div>
          )}

          {isFiltroVisivel('data_registro') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Data de registro</label>
              <input
                name="data_registro"
                className="input"
                value={filtros.data_registro || ''}
                onChange={handleChange}
                type="date"
              />
            </div>
          )}

          {isFiltroVisivel('data_vencimento') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Data de vencimento</label>
              <input
                name="data_vencimento"
                className="input"
                value={filtros.data_vencimento || ''}
                onChange={handleChange}
                type="date"
              />
            </div>
          )}

          {mostrarFiltroResponsavel && isFiltroVisivel('responsavel') && (
            <div className="sol-filter-field">
              <label className="sol-filter-label">Responsavel</label>
              <select
                name="responsavel"
                className="input"
                value={filtros.responsavel || ''}
                onChange={handleChange}
              >
                <option value="">Todos os responsaveis</option>
                {responsaveisOptions.map(responsavel => (
                  <option key={responsavel.value} value={responsavel.value}>
                    {responsavel.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="sol-filtros-actions">
          <button className="btn btn-outline" type="button" onClick={limparFiltros}>
            Limpar filtros
          </button>
          <div className="relative" ref={seletorFiltrosRef}>
            <button
              className="btn btn-outline inline-flex items-center gap-2"
              type="button"
              onClick={() => setSeletorFiltrosOpen(prev => !prev)}
              title="Selecionar quais filtros exibir"
            >
              {seletorFiltrosOpen ? <HiEyeSlash className="w-4 h-4" /> : <HiEye className="w-4 h-4" />}
              <span className="font-medium">Filtros visíveis</span>
            </button>
            {seletorFiltrosOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-xl z-50 min-w-[280px]">
                <div className="p-4 max-h-[350px] overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-200 mb-3 uppercase tracking-wide">Selecione os filtros</p>
                  {FILTROS_DISPONIVEIS.map(filtro => {
                    const isVisible = filtrosVisiveis.includes(filtro.id);
                    const isResponsavel = filtro.id === 'responsavel';
                    const shouldDisable = isResponsavel && !mostrarFiltroResponsavel;
                    
                    return (
                      <label
                        key={filtro.id}
                        className={`flex items-center gap-3 p-2.5 rounded-md cursor-pointer transition-colors ${
                          shouldDisable 
                            ? 'opacity-50 cursor-not-allowed' 
                            : 'hover:bg-gray-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => !shouldDisable && alternarFiltroVisivel(filtro.id)}
                          disabled={shouldDisable}
                          className="w-4 h-4 rounded border-gray-300 dark:border-slate-500 text-blue-600 dark:text-blue-500 cursor-pointer focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-slate-100 font-medium">{filtro.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="md:hidden sticky bottom-0 mt-3 -mx-3 px-3 py-2 bg-white/95 dark:bg-slate-900/95 border-t border-gray-200 dark:border-slate-700 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <button
            className="btn btn-primary w-full"
            type="button"
            onClick={() => setMobileOpen(false)}
          >
            Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}
