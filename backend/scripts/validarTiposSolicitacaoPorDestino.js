const assert = require('assert');
const fs = require('fs');
const path = require('path');

function ler(...partes) {
  return fs.readFileSync(path.join(__dirname, '..', ...partes), 'utf8');
}

const migration = ler('migrations', '202609070051_tipos_solicitacao_por_destino.js');
const disponibilidade = ler('src', 'services', 'tipoSolicitacaoDisponibilidadeService.js');
const destinoInicial = ler('src', 'services', 'novaSolicitacaoDestinoService.js');
const solicitacoes = ler('src', 'controllers', 'SolicitacaoController.js');
const compras = ler('src', 'controllers', 'SolicitacaoCompraController.js');
const contratos = ler('src', 'services', 'contratoFluxoNovoService.js');
const novaSolicitacao = fs.readFileSync(
  path.join(__dirname, '..', '..', 'frontend', 'src', 'pages', 'NovaSolicitacao.jsx'),
  'utf8'
);

assert(
  !/\b(?:bulkInsert|bulkUpdate|INSERT\s+INTO|UPDATE\s+tipo_solicitacao)\b/i.test(migration),
  'A migration deve ser exclusivamente estrutural.'
);
assert(migration.includes("addColumn('tipo_solicitacao', 'disponivel_para_obras'"));
assert(migration.includes("createTable('centro_custo_tipos_solicitacao'"));
assert(disponibilidade.includes('isObraCentroCusto(destino.tipo_centro_custo)'));
assert(disponibilidade.includes('CentroCustoTipoSolicitacao.findOne'));
assert(destinoInicial.includes("findSetorByCapability('eh_setor_geo'"));
assert(solicitacoes.includes('resolverDestinoInicialNovaSolicitacao()'));
assert(solicitacoes.includes('assertTipoDisponivelNoDestino(obraSelecionada, tipoSelecionado)'));
assert(contratos.includes('resolverDestinoInicialNovaSolicitacao()'));
assert(contratos.includes('assertTipoDisponivelNoDestino(obraSelecionada, tipoMacro)'));
assert(compras.includes('assertTipoDisponivelNoDestino(obra, tipoSolicitacao, { transaction })'));
assert(!novaSolicitacao.includes('name="area_responsavel"'), 'A tela nao deve permitir escolher o setor inicial.');
assert(novaSolicitacao.includes('getTiposSolicitacaoDisponiveis(form.obra_id)'));
assert(novaSolicitacao.includes('area_responsavel: undefined'));

console.log('Catalogo de tipos por Obra/Centro de Custo validado com sucesso.');
