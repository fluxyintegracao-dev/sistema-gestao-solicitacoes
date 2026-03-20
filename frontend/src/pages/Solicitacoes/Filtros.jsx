import { useEffect, useRef, useState } from 'react';
import { HiAdjustmentsHorizontal, HiChevronDown, HiChevronUp } from 'react-icons/hi2';

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
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);

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
      if (statusDropdownOpen && !statusDropdownRef.current?.contains(event.target)) {
        setStatusDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [tipoDropdownOpen, obraDropdownOpen, statusDropdownOpen]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function limparFiltros() {
    setFiltros({
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
    setStatusDropdownOpen(false);
  }

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

  const statusSelecionadosIds = String(filtros.status || '')
    .split(',')
    .map(v => String(v).trim())
    .filter(Boolean);

  const statusSelecionadosSet = new Set(statusSelecionadosIds);
  const statusSelecionadosNomes = statusOptions
    .filter(status => statusSelecionadosSet.has(String(status.value)))
    .map(status => status.label);
  const resumoStatusSelecionados = (() => {
    if (statusSelecionadosNomes.length === 0) return 'Todos os status';
    if (statusSelecionadosNomes.length <= 2) return statusSelecionadosNomes.join(', ');
    return `${statusSelecionadosNomes.slice(0, 2).join(', ')} +${statusSelecionadosNomes.length - 2}`;
  })();

  function atualizarStatusSelecionados(ids) {
    setFiltros(prev => ({
      ...prev,
      status: ids.join(',')
    }));
  }

  function alternarStatus(statusId) {
    const id = String(statusId);
    const atuais = [...statusSelecionadosIds];
    const existe = atuais.includes(id);
    const proximos = existe
      ? atuais.filter(item => item !== id)
      : [...atuais, id];
    atualizarStatusSelecionados(proximos);
  }

  function selecionarTodosStatus() {
    const ids = statusOptions.map(status => String(status.value));
    atualizarStatusSelecionados(ids);
  }

  function limparStatus() {
    atualizarStatusSelecionados([]);
  }

  const quantidadeFiltrosAtivos = [
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

          <div className="sol-filter-field sol-filter-field-multi" ref={statusDropdownRef}>
            <div className="sol-filter-label-row">
              <label className="sol-filter-label">Status</label>
              {statusSelecionadosIds.length > 0 && (
                <button
                  type="button"
                  className="sol-filter-link-btn"
                  onClick={limparStatus}
                >
                  Limpar
                </button>
              )}
            </div>
            <button
              type="button"
              className={`sol-filter-multi-trigger ${statusDropdownOpen ? 'open' : ''}`}
              onClick={() => setStatusDropdownOpen(prev => !prev)}
              aria-expanded={statusDropdownOpen}
              aria-label="Selecionar status"
            >
              <span className="truncate">{resumoStatusSelecionados}</span>
              {statusDropdownOpen ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
            </button>

            {statusDropdownOpen && (
              <div className="sol-filter-multi-popover">
                <div className="sol-filter-multi-actions">
                  <button type="button" className="sol-filter-link-btn" onClick={selecionarTodosStatus}>
                    Selecionar todos
                  </button>
                  <button type="button" className="sol-filter-link-btn" onClick={limparStatus}>
                    Limpar
                  </button>
                </div>

                <div className="sol-filter-multi-list">
                  {statusOptions.map(item => {
                    const id = String(item.value);
                    const checked = statusSelecionadosSet.has(id);
                    return (
                      <label key={item.value} className="sol-filter-multi-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => alternarStatus(id)}
                        />
                        <span>{item.label}</span>
                      </label>
                    );
                  })}
                  {statusOptions.length === 0 && (
                    <p className="sol-filter-multi-empty">Nenhum status cadastrado.</p>
                  )}
                </div>
              </div>
            )}
          </div>

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

          {mostrarFiltroResponsavel && (
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
