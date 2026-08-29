import { useEffect, useId, useRef, useState } from 'react';
import { buscarParceiros } from '../../services/parceiros';

function rotuloParceiro(parceiro) {
  if (!parceiro) return '';
  return parceiro.cpf_cnpj
    ? `${parceiro.nome || 'Sem nome'} — ${parceiro.cpf_cnpj}`
    : (parceiro.nome || 'Sem nome');
}

export default function ParceiroBuscaRemota({
  label,
  selecionado,
  onSelecionar,
  obrigatorio = false,
  somenteFornecedor = false,
  placeholder = 'Digite nome ou CPF/CNPJ',
  className = ''
}) {
  const inputId = useId();
  const requisicaoRef = useRef(null);
  const [termo, setTermo] = useState('');
  const [resultados, setResultados] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (selecionado) setTermo(rotuloParceiro(selecionado));
    else if (!aberto) setTermo('');
  }, [aberto, selecionado]);

  useEffect(() => {
    if (selecionado || !aberto || !termo.trim()) {
      setResultados([]);
      setErro('');
      return undefined;
    }

    const timeout = window.setTimeout(async () => {
      requisicaoRef.current?.abort();
      const controller = new AbortController();
      requisicaoRef.current = controller;
      setCarregando(true);
      setErro('');
      try {
        const resposta = await buscarParceiros({
          q: termo.trim(),
          ativo: 1,
          limit: 12,
          ...(somenteFornecedor ? { fornecedor: 1 } : {})
        }, { signal: controller.signal });
        setResultados(Array.isArray(resposta) ? resposta : []);
      } catch (error) {
        if (error?.name !== 'AbortError') {
          setResultados([]);
          setErro(error?.message || 'Nao foi possivel buscar pessoas.');
        }
      } finally {
        if (!controller.signal.aborted) setCarregando(false);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [aberto, selecionado, somenteFornecedor, termo]);

  useEffect(() => () => requisicaoRef.current?.abort(), []);

  function selecionar(parceiro) {
    onSelecionar(parceiro);
    setTermo(rotuloParceiro(parceiro));
    setResultados([]);
    setAberto(false);
    setErro('');
  }

  return (
    <div className={`relative grid gap-1 text-sm ${className}`}>
      <label htmlFor={inputId}>{label}{obrigatorio ? ' *' : ''}</label>
      <div className="flex min-w-0 gap-2">
        <input
          id={inputId}
          className="input input-sm min-w-0 flex-1"
          value={termo}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={aberto}
          aria-autocomplete="list"
          required={obrigatorio}
          onFocus={() => setAberto(true)}
          onBlur={() => window.setTimeout(() => setAberto(false), 140)}
          onChange={(event) => {
            setTermo(event.target.value);
            setAberto(true);
            if (selecionado) onSelecionar(null);
          }}
        />
        {selecionado && (
          <button
            type="button"
            className="btn btn-outline btn-sm shrink-0"
            onClick={() => {
              onSelecionar(null);
              setTermo('');
              setAberto(true);
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {aberto && !selecionado && termo.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-surface)] p-1 shadow-lg">
          {carregando && <div className="px-3 py-2 text-xs text-[var(--c-muted)]">Buscando...</div>}
          {!carregando && erro && <div className="px-3 py-2 text-xs text-red-700">{erro}</div>}
          {!carregando && !erro && resultados.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--c-muted)]">Nenhum cadastro encontrado.</div>
          )}
          {!carregando && resultados.map((parceiro) => (
            <button
              key={parceiro.id}
              type="button"
              className="block w-full rounded px-3 py-2 text-left hover:bg-[var(--c-bg)]"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selecionar(parceiro)}
            >
              <span className="block text-sm font-medium text-[var(--c-text)]">{parceiro.nome || 'Sem nome'}</span>
              {parceiro.cpf_cnpj && <span className="block text-xs text-[var(--c-muted)]">{parceiro.cpf_cnpj}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
