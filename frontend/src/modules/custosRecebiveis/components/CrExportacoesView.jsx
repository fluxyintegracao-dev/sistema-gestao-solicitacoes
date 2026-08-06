import { useState } from 'react';
import {
  HiOutlineArrowDownTray,
  HiOutlineDocumentChartBar
} from 'react-icons/hi2';
import { baixarExportacaoCustosRecebiveis } from '../services/custosRecebiveis';

const REPORTS = [
  {
    id: 'medicao-recebiveis',
    label: 'Medição e recebíveis',
    description: 'Previsões privadas ou medição prevista e consolidada de obras públicas.'
  },
  {
    id: 'custos-previstos',
    label: 'Custos planejados',
    description: 'Planejamento detalhado por item micro e etapa macro.'
  },
  {
    id: 'comparativo',
    label: 'Comparativo',
    description: 'Previsto, realizado, desvio, execução e estado por item.'
  },
  {
    id: 'custo-realizado',
    label: 'Custo realizado',
    description: 'Cadeia solicitação, pedido, título e baixa com reconciliação.'
  },
  {
    id: 'solicitacoes-titulos',
    label: 'Solicitações e títulos',
    description: 'Títulos a pagar do período e sua solicitação de origem.'
  },
  {
    id: 'resumo-executivo',
    label: 'Resumo executivo',
    description: 'Totais previstos, realizados, desvios e valores não mapeados.'
  }
];

export default function CrExportacoesView({ obra, competencia }) {
  const [report, setReport] = useState(REPORTS[0].id);
  const [format, setFormat] = useState('xlsx');
  const [scope, setScope] = useState(obra?.id ? 'obra' : 'todas');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleExport(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      await baixarExportacaoCustosRecebiveis({
        tipo: report,
        competencia,
        obraId: scope === 'obra' ? obra?.id : null,
        formato: format
      });
    } catch (requestError) {
      setError(requestError.message || 'Erro ao gerar exportação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="cr-section">
      <header className="cr-section-header">
        <span>Saída operacional</span>
        <h2>Central de exportações</h2>
        <p>
          Os arquivos usam a mesma competência e o mesmo escopo de obras permitido ao usuário.
          Exportar nunca amplia a visibilidade.
        </p>
      </header>

      {error ? <div className="cr-feedback" data-tone="error">{error}</div> : null}

      <form className="cr-export-toolbar" onSubmit={handleExport}>
        <label className="cr-field">
          <span>Relatório</span>
          <select value={report} onChange={(event) => setReport(event.target.value)}>
            {REPORTS.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="cr-field">
          <span>Formato</span>
          <select value={format} onChange={(event) => setFormat(event.target.value)}>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </select>
        </label>
        <label className="cr-field">
          <span>Escopo do arquivo</span>
          <select value={scope} onChange={(event) => setScope(event.target.value)}>
            <option value="todas">Todas as obras permitidas</option>
            {obra?.id ? <option value="obra">Somente {obra.nome}</option> : null}
          </select>
        </label>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          <HiOutlineArrowDownTray className="h-4 w-4" />
          {loading ? 'Gerando...' : 'Baixar arquivo'}
        </button>
      </form>

      <div className="cr-report-list">
        {REPORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={report === item.id ? 'is-active' : ''}
            onClick={() => setReport(item.id)}
          >
            <HiOutlineDocumentChartBar className="h-5 w-5" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
