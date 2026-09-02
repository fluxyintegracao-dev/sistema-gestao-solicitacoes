import { useCallback, useMemo, useRef, useState } from 'react';
import Alert from '../ui/Alert';

/**
 * AVISO DO SISTEMA (item **R3** da DoD, 02/09) — substitui `window.alert()`.
 *
 * Motivo (decisão do cliente, 02/09): a caixa cinza do navegador não é do
 * sistema. Ela ignora tema, tipografia, tokens e o idioma visual inteiro;
 * bloqueia a página; não pode ser lida pelo harness; e some sem deixar
 * rastro. O RH/DP tinha 51 chamadas dessas — o sistema inteiro, 857.
 *
 * A faixa fica DENTRO da página, no topo do conteúdo, com o tom semântico
 * do sistema. `erro` e `alerta` esperam ser fechados; `sucesso` some
 * sozinho depois de 6s, porque confirmação de coisa que deu certo não
 * merece um clique a mais.
 *
 * Uso:
 *   const { avisos, avisar, fechar } = useAvisos();
 *   ...
 *   catch (e) { avisar.erro(e?.message || 'Erro ao salvar'); }
 *   ...
 *   <Avisos avisos={avisos} aoFechar={fechar} />
 */
const TEMPO_SUCESSO = 6000;

export function useAvisos() {
  const [avisos, setAvisos] = useState([]);
  const sequencia = useRef(0);
  const timers = useRef(new Map());

  const fechar = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id));
  }, []);

  const empilhar = useCallback((tipo, mensagem, titulo) => {
    const texto = String(mensagem ?? '').trim();
    if (!texto) return null;
    sequencia.current += 1;
    const id = sequencia.current;
    // Mensagem repetida não empilha: dois cliques no mesmo botão com erro
    // viravam duas faixas idênticas.
    setAvisos((atuais) => {
      const iguais = atuais.some((aviso) => aviso.tipo === tipo && aviso.mensagem === texto);
      return iguais ? atuais : [...atuais, { id, tipo, mensagem: texto, titulo }];
    });
    if (tipo === 'success') {
      timers.current.set(id, setTimeout(() => fechar(id), TEMPO_SUCESSO));
    }
    return id;
  }, [fechar]);

  const limpar = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setAvisos([]);
  }, []);

  const avisar = useMemo(() => ({
    erro: (mensagem, titulo) => empilhar('error', mensagem, titulo),
    sucesso: (mensagem, titulo) => empilhar('success', mensagem, titulo),
    alerta: (mensagem, titulo) => empilhar('warning', mensagem, titulo),
    informacao: (mensagem, titulo) => empilhar('info', mensagem, titulo)
  }), [empilhar]);

  return { avisos, avisar, fechar, limpar };
}

export default function Avisos({ avisos = [], aoFechar }) {
  if (!avisos.length) return null;
  return (
    <div className="app-avisos" role="status" aria-live="polite">
      {avisos.map((aviso) => (
        <Alert
          key={aviso.id}
          type={aviso.tipo}
          title={aviso.titulo}
          message={aviso.mensagem}
          onClose={aoFechar ? () => aoFechar(aviso.id) : undefined}
        />
      ))}
    </div>
  );
}
