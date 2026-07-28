import { textMatchesSearchTerms } from './search';

export function categoriaFinanceiraMatchesSearch(categoria, searchValue) {
  return textMatchesSearchTerms([
    categoria?.id,
    categoria?.codigo,
    categoria?.nome,
    categoria?.descricao,
    categoria?.tipo,
    categoria?.dre_grupo,
    categoria?.dre_subgrupo,
    categoria?.classificacao_gerencial
  ], searchValue);
}
