export default function ObraSearchModal({
  aberto,
  obras,
  onClose,
  onSelect
}) {
  if (!aberto) return null;

  const totalObras = Array.isArray(obras) ? obras.length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-4 shadow-xl sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Obras encontradas</h2>
            <p className="text-xs text-[var(--c-muted)]">{totalObras} resultado(s)</p>
          </div>
          <button className="text-sm text-gray-500 transition hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="table-wrapper max-h-[55vh]">
          <table className="table min-w-[620px]">
            <thead>
              <tr>
                <th className="px-3 py-2">Codigo</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Cidade</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {(obras || []).map(o => (
                <tr key={o.id}>
                  <td className="px-3 py-2">{o.codigo || '-'}</td>
                  <td className="px-3 py-2">{o.nome}</td>
                  <td className="px-3 py-2">{o.cidade || '-'}</td>
                  <td className="px-3 py-2">
                    <button className="btn btn-outline btn-sm whitespace-nowrap" onClick={() => onSelect(o)}>
                      Selecionar
                    </button>
                  </td>
                </tr>
              ))}
              {(obras || []).length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-sm text-[var(--c-muted)]" colSpan="4">
                    Nenhuma obra encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
