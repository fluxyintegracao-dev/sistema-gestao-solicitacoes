/**
 * FiltrosTopo — barra de filtros rápidos do topo da listagem.
 *
 * Props:
 *   visao             : string
 *   onVisaoChange     : (value) => void
 *   obraSelecionada   : string
 *   setObraSelecionada: (value) => void
 *   obras             : Array<{ id, nome }> (opcional)
 */
export default function FiltrosTopo({
  visao = 'MINHA_AREA',
  onVisaoChange,
  obraSelecionada = 'TODAS',
  setObraSelecionada,
  obras = [],
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Visão */}
      <div className="grid gap-1">
        <label
          htmlFor="filtro-visao"
          className="text-xs font-medium"
          style={{ color: 'var(--c-muted)' }}
        >
          Visão
        </label>
        <select
          id="filtro-visao"
          className="input"
          style={{ minWidth: '160px' }}
          value={visao}
          onChange={(e) => onVisaoChange?.(e.target.value)}
        >
          <option value="MINHA_AREA">Minha Área</option>
          <option value="TODAS">Todas</option>
          <option value="MINHAS">Minhas Solicitações</option>
        </select>
      </div>

      {/* Obra */}
      <div className="grid gap-1">
        <label
          htmlFor="filtro-obra"
          className="text-xs font-medium"
          style={{ color: 'var(--c-muted)' }}
        >
          Obra
        </label>
        <select
          id="filtro-obra"
          className="input"
          style={{ minWidth: '180px' }}
          value={obraSelecionada}
          onChange={(e) => setObraSelecionada?.(e.target.value)}
        >
          <option value="TODAS">Todas as obras</option>
          {obras.map((obra) => (
            <option key={obra.id} value={String(obra.id)}>
              {obra.nome}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
