import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HiOutlineArrowLeft,
  HiOutlineBanknotes,
  HiOutlineCheckCircle,
  HiOutlineClipboardDocumentCheck,
  HiOutlinePencilSquare,
  HiOutlineScale
} from 'react-icons/hi2';
import { obterPlanejamentoCompetencia } from '../services/custosRecebiveis';
import CrComparativoView from './CrComparativoView';
import CrRealizadoView from './CrRealizadoView';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
});

function monthLabel(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return value || '-';
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function groupRows(rows = [], macros = []) {
  const macroByCode = new Map(macros.map((item) => [String(item.codigo), item]));
  const groups = new Map();
  rows.forEach((row) => {
    const code = String(row.etapa_macro_codigo || 'SEM_MACRO');
    const macro = macroByCode.get(code);
    if (!groups.has(code)) {
      groups.set(code, {
        codigo: code,
        descricao: macro?.descricao || (code === 'SEM_MACRO' ? 'Sem etapa macro' : code),
        ordem: Number(macro?.ordem || 999999),
        rows: []
      });
    }
    groups.get(code).rows.push(row);
  });
  return [...groups.values()].sort((left, right) => (
    left.ordem - right.ordem || left.codigo.localeCompare(right.codigo, 'pt-BR')
  ));
}

function EmptyDetail({ children }) {
  return <div className="cr-empty-state cr-month-read-empty">{children}</div>;
}

function CostDetail({ data }) {
  const groups = groupRows(data.custos, data.macros);
  if (!groups.length) return <EmptyDetail>Nenhum custo planejado foi registrado neste mês.</EmptyDetail>;
  return (
    <div className="cr-month-read-groups">
      {groups.map((group) => {
        const total = group.rows.reduce((sum, row) => sum + Number(row.valor_previsto || 0), 0);
        return (
          <section className="cr-month-read-group" key={group.codigo}>
            <header><strong>{group.codigo} · {group.descricao}</strong><span>{currency.format(total)}</span></header>
            <div className="cr-table-shell">
              <table>
                <thead><tr><th>Descrição do serviço</th><th>Unid.</th><th className="text-right">Quantidade</th><th className="text-right">Valor unitário</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.id || row.chave_local}>
                      <td><strong>{row.descricao}</strong></td>
                      <td>{row.unidade || '-'}</td>
                      <td className="text-right">{decimal.format(Number(row.quantidade || 0))}</td>
                      <td className="text-right">{currency.format(Number(row.custo_unitario || 0))}</td>
                      <td className="text-right"><strong>{currency.format(Number(row.valor_previsto || 0))}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MeasurementDetail({ data, approved = false }) {
  const rows = approved ? data.medicoes : data.recebiveis;
  const groups = groupRows(rows, data.macros);
  if (!groups.length) {
    return (
      <EmptyDetail>
        {approved
          ? 'A medição aprovada ainda não foi registrada para este mês.'
          : 'Nenhuma medição prevista foi registrada neste mês.'}
      </EmptyDetail>
    );
  }
  return (
    <div className="cr-month-read-groups">
      {groups.map((group) => {
        const total = group.rows.reduce((sum, row) => (
          sum + Number(approved ? row.valor_medido : row.valor_previsto || 0)
        ), 0);
        return (
          <section className="cr-month-read-group" key={group.codigo}>
            <header><strong>{group.codigo} · {group.descricao}</strong><span>{currency.format(total)}</span></header>
            <div className="cr-table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Etapa / serviço</th>
                    <th>Unid.</th>
                    <th className="text-right">Qtd. orçada</th>
                    <th className="text-right">Qtd. aprovada anteriormente</th>
                    <th className="text-right">{approved ? 'Qtd. aprovada' : 'Qtd. prevista'}</th>
                    <th className="text-right">{approved ? 'Valor aprovado' : 'Valor previsto'}</th>
                    <th className="text-right">Saldo a medir</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, index) => {
                    const budgeted = Number(row.quantidade_base ?? row.item?.quantidade_orcada ?? 0);
                    const previousApproved = Number(row.item?.quantidade_aprovada_anterior || 0);
                    const current = Number(approved ? row.quantidade_medida : row.quantidade_prevista || 0);
                    return (
                      <tr key={`${group.codigo}-${row.plano_item_id || row.previsao_custo_id || index}`}>
                        <td><strong>{row.descricao}</strong></td>
                        <td>{row.unidade || '-'}</td>
                        <td className="text-right">{decimal.format(budgeted)}</td>
                        <td className="text-right">{decimal.format(previousApproved)}</td>
                        <td className="text-right">{decimal.format(current)}</td>
                        <td className="text-right"><strong>{currency.format(Number(approved ? row.valor_medido : row.valor_previsto || 0))}</strong></td>
                        <td className="text-right">{decimal.format(Math.max(0, budgeted - previousApproved - current))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PrivateReceiptsDetail({ data }) {
  const rows = Array.isArray(data.recebiveis) ? data.recebiveis : [];
  if (!rows.length) return <EmptyDetail>Nenhum recebível financeiro vence neste período.</EmptyDetail>;
  return (
    <div className="cr-table-shell">
      <table>
        <thead><tr><th>Origem contratual</th><th>Vencimento</th><th>Status</th><th className="text-right">Valor previsto</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key || row.id}>
              <td><strong>{row.descricao || row.origem || '-'}</strong></td>
              <td>{row.data_prevista ? new Date(`${String(row.data_prevista).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR') : '-'}</td>
              <td>{String(row.status_financeiro || 'PREVISTO').replaceAll('_', ' ')}</td>
              <td className="text-right"><strong>{currency.format(Number(row.valor_previsto || 0))}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CrMonthlyDetailView({
  obra,
  competencia,
  permissions,
  initialSection = '',
  onClose,
  onEditPlanning,
  onOpenApproved
}) {
  const isPublic = String(obra?.classificacao || '').toUpperCase() === 'PUBLICA';
  const defaultSection = initialSection || (isPublic ? 'forecast' : 'costs');
  const [section, setSection] = useState(defaultSection);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sections = useMemo(() => [
    ...(isPublic ? [{ id: 'forecast', label: 'Medição prevista', icon: HiOutlineClipboardDocumentCheck }] : []),
    { id: 'costs', label: 'Custos planejados', icon: HiOutlinePencilSquare },
    ...(isPublic && permissions.measurementView
      ? [{ id: 'approved-read', label: 'Medição aprovada', icon: HiOutlineCheckCircle }]
      : []),
    ...(!isPublic ? [{ id: 'receipts', label: 'Recebíveis do período', icon: HiOutlineBanknotes }] : []),
    ...(permissions.realizedView ? [{ id: 'realized', label: 'Custos realizados', icon: HiOutlineBanknotes }] : []),
    ...(isPublic && permissions.comparativeView ? [{ id: 'comparison', label: 'Comparativo', icon: HiOutlineScale }] : [])
  ], [isPublic, permissions.comparativeView, permissions.measurementView, permissions.realizedView]);

  useEffect(() => {
    const requestedSection = initialSection || (isPublic ? 'forecast' : 'costs');
    setSection(sections.some((item) => item.id === requestedSection)
      ? requestedSection
      : sections[0]?.id || 'costs');
  }, [initialSection, isPublic, sections]);

  const load = useCallback(async () => {
    if (!obra?.id || !competencia) return;
    try {
      setLoading(true);
      setError('');
      setData(await obterPlanejamentoCompetencia(obra.id, competencia));
    } catch (requestError) {
      setData(null);
      setError(requestError.message || 'Não foi possível carregar o detalhe do mês.');
    } finally {
      setLoading(false);
    }
  }, [competencia, obra?.id]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="cr-month-detail-surface" aria-label={`Detalhes de ${monthLabel(competencia)}`}>
      <header className="cr-month-detail-surface__header">
        <div>
          <span>{obra.codigo || obra.id} · {obra.nome}</span>
          <h2>Detalhes do mês · {monthLabel(competencia)}</h2>
        </div>
        <div className="cr-month-detail-surface__actions">
          {permissions.costs || permissions.receipts ? (
            <button
              type="button"
              className="cr-icon-button"
              onClick={onEditPlanning}
              aria-label="Editar planejamento"
              title="Editar planejamento"
            >
              <HiOutlinePencilSquare aria-hidden="true" />
            </button>
          ) : null}
          {isPublic && permissions.measurementView ? (
            <button
              type="button"
              className="cr-icon-button"
              onClick={onOpenApproved}
              aria-label={permissions.measurement ? 'Registrar aprovação' : 'Ver aprovação'}
              title={permissions.measurement ? 'Registrar aprovação' : 'Ver aprovação'}
            >
              <HiOutlineCheckCircle aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            className="cr-icon-button"
            onClick={onClose}
            aria-label="Voltar aos meses"
            title="Voltar aos meses"
          >
            <HiOutlineArrowLeft aria-hidden="true" />
          </button>
        </div>
      </header>

      <nav className="cr-month-detail-tabs" aria-label="Informações do mês">
        {sections.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={section === id ? 'is-active' : ''} onClick={() => setSection(id)}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </nav>

      {loading && !data ? <div className="cr-empty-state">Carregando detalhes do mês...</div> : null}
      {error ? (
        <div className="cr-feedback" data-tone="error">
          <span>{error}</span>
          <button type="button" className="btn btn-outline" onClick={load}>Tentar novamente</button>
        </div>
      ) : null}
      {data && section === 'forecast' ? <MeasurementDetail data={data} /> : null}
      {data && section === 'costs' ? <CostDetail data={data} /> : null}
      {data && section === 'approved-read' ? <MeasurementDetail data={data} approved /> : null}
      {data && section === 'receipts' ? <PrivateReceiptsDetail data={data} /> : null}
      {section === 'realized' ? (
        <CrRealizadoView
          obra={obra}
          competencia={competencia}
          permissions={{
            update: permissions.realizedUpdate,
            reconcile: permissions.realizedReconcile
          }}
        />
      ) : null}
      {section === 'comparison' ? <CrComparativoView obra={obra} competencia={competencia} /> : null}
    </section>
  );
}
