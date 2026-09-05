import { BlocoConteudo, CamposComVazios } from '../../components/padrao';
import StatusBadge from '../../components/StatusBadge';

/**
 * Faixa de situação da solicitação.
 *
 * Migrada em 05/09 para o padrão: era uma `<div>` com `padding: 16`,
 * `background: '#f5f5f5'` e `borderRadius: 6` escritos à mão no `style`
 * — três violações de uma vez (R10, medida em pixel na tela; R2/R25, cor
 * crua sem par no tema escuro; e nenhuma superfície do sistema, B1/B5).
 * O `#f5f5f5` não passava pelo piso de contraste do ThemeContext (R24) e
 * ficava branco sobre branco no tema escuro.
 *
 * Nenhum campo saiu: status e área responsável continuam os dois dados,
 * agora com o `StatusBadge` do sistema e a contagem de vazios do
 * `CamposComVazios` (B4) — formatador devolve `null` em campo vazio, e
 * não `'—'`, senão a contagem nunca acusa nada (o componente conta a
 * lista, não o texto renderizado).
 */
export default function StatusArea({ solicitacao }) {
  const status = solicitacao?.status || null;

  return (
    <BlocoConteudo variante="secundario">
      <CamposComVazios
        colunas={2}
        campos={[
          {
            label: 'Status',
            valor: status ? <StatusBadge status={status} /> : null
          },
          { label: 'Área responsável', valor: solicitacao?.area || null }
        ]}
      />
    </BlocoConteudo>
  );
}
