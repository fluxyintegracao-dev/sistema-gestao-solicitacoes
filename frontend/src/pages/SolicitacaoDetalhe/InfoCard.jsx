import { BlocoConteudo, CamposComVazios } from '../../components/padrao';
import { corrigirTextoCorrompido } from '../../utils/texto';

function formatarValor(valor) {
  // Campo vazio devolve `null`, NUNCA '-' nem '—': a contagem de vazios do
  // CamposComVazios sai da própria lista, e um formatador que devolve
  // travessão faz todo campo parecer preenchido — o alternador "Ver todos
  // os campos (N vazios)" passaria a mostrar zero para sempre (B4).
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Dados da solicitação em grade.
 *
 * Migrado em 05/09: eram oito `<div>` com `style={{ color: 'var(--c-muted)' }}`
 * repetido campo a campo e um `grid-cols-2` à mão. Virou `CamposComVazios`
 * — a mesma grade, com o alternador de vazios (B4) e a contagem saindo da
 * lista, não de condições espelhadas à mão.
 *
 * `contexto: false` (e não ausência do campo) é o que tira da tela E da
 * contagem os campos que não pertencem a este registro: contrato numa
 * compra sem contrato continua invisível mesmo com o alternador ligado.
 */
export default function InfoCard({
  solicitacao,
  mostrarContratoInfo = true,
  mostrarApropriacaoInfo = true
}) {
  const descricao = corrigirTextoCorrompido(solicitacao?.descricao) || null;

  return (
    <BlocoConteudo titulo="Dados da Solicitação" variante="primario" cor="var(--sem-info)">
      <CamposComVazios
        colunas={2}
        campos={[
          { label: 'Obra', valor: solicitacao?.obra?.nome || null },
          { label: 'Setor', valor: solicitacao?.area_responsavel || null },
          { label: 'Tipo', valor: solicitacao?.tipo?.nome || null },
          { label: 'Parceiro', valor: solicitacao?.parceiro?.nome || null },
          {
            label: 'Apropriacao',
            contexto: mostrarApropriacaoInfo,
            valor: solicitacao?.apropriacao?.codigo || solicitacao?.apropriacao?.descricao || null
          },
          {
            label: 'Contrato',
            contexto: mostrarContratoInfo,
            valor: solicitacao?.contrato?.codigo || solicitacao?.codigo_contrato || null
          },
          {
            label: 'Ref. do Contrato',
            contexto: mostrarContratoInfo,
            valor: solicitacao?.contrato?.ref_contrato || solicitacao?.ref_contrato || null
          },
          { label: 'Valor', valor: formatarValor(solicitacao?.valor) },
          { label: 'Descrição', valor: descricao, span: 2 }
        ]}
      />
    </BlocoConteudo>
  );
}
