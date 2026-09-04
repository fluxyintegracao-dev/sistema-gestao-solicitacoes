import { useCallback, useMemo, useRef, useState } from 'react';
import Alert from '../ui/Alert';

/**
 * AVISO DO SISTEMA (item **R3** da DoD, 02/09) — substitui a caixa
 * `window.alert` do navegador.
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
 * ## O que NÃO passa por aqui — a fronteira (02/09)
 *
 * `useAvisos` é para EVENTO: algo aconteceu agora (salvou, falhou, importou).
 * Aviso empilhável, fechável, que some.
 *
 * CONDIÇÃO DERIVADA DO CONTEÚDO não é evento e NÃO usa este componente:
 * "esta obra já tem jornada informada em 09/2026", "dias mais faltas passam
 * de 30 em Fulano". Elas descrevem o estado do que está na tela; viradas em
 * aviso dispensável, sumiriam com um clique e voltariam a cada recarga — e
 * o usuário poderia enviar o formulário com a faixa fechada, sem ver a
 * condição que a impedia. Essas continuam como faixa fixa no fluxo, ao lado
 * do que elas descrevem.
 *
 * A pergunta que separa: **fecha e o problema continua?** Se sim, é
 * condição, não aviso.
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

  /*
    CONFIRMACAO DE GRAVACAO PODE PEDIR PARA FICAR (04/09).

    Só `success` tem timer; erro, alerta e informacao ja ficam na tela. O
    problema aparece na confirmacao de que gravou: some em 6s, e quem
    desviou o olhar nao sabe se salvou. Fica pior do que fixa.

    Usar `informacao` para ganhar persistencia seria trocar o SIGNIFICADO
    pelo efeito colateral — a faixa sairia azul para dizer que deu certo, e
    este projeto ja registrou o defeito inverso (erro pintado de sucesso no
    upload de comprovantes). Tom semantico nao se negocia por comportamento.

    Entao a persistencia virou OPCAO, e nao um tipo novo. Mudanca aditiva de
    proposito: quem ja chama `avisar.sucesso(msg)` continua com os 6s, byte
    a byte. A R21 registra por que isso importa — mudar o contrato de um
    componente padrao no meio de uma leva nao e mudanca compativel; ACRESCENTAR
    parametro opcional e.
  */
  const empilhar = useCallback((tipo, mensagem, titulo, opcoes) => {
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
    if (tipo === 'success' && !opcoes?.persistente) {
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
    // `opcoes.persistente` desliga o sumico automatico dos 6s — para a
    // confirmacao de gravacao que precisa esperar a pessoa voltar o olhar.
    sucesso: (mensagem, titulo, opcoes) => empilhar('success', mensagem, titulo, opcoes),
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
