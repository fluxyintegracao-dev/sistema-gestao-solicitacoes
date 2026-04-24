import { useNavigate } from 'react-router-dom';
import StatusBadge from '../StatusBadge';

export default function SolicitacaoCard({ solicitacao }) {
  const navigate = useNavigate();

  const codigo = solicitacao.codigo || `#${solicitacao.id}`;
  const obra = solicitacao.obra?.nome || '-';
  const descricao = solicitacao.descricao || '';
  const area = solicitacao.area_responsavel || '-';
  const responsavel = solicitacao.responsavel_atual || 'Não atribuído';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/solicitacoes/${solicitacao.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/solicitacoes/${solicitacao.id}`);
      }}
      className="card cursor-pointer transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-primary)]"
    >
      {/* Topo */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-bold" style={{ color: 'var(--c-text)' }}>
          {codigo}
        </span>
        <StatusBadge status={solicitacao.status_global} />
      </div>

      {/* Obra */}
      <p className="mt-2 text-xs" style={{ color: 'var(--c-muted)' }}>
        Obra: <span className="font-medium" style={{ color: 'var(--c-text)' }}>{obra}</span>
      </p>

      {/* Descrição */}
      {descricao && (
        <p
          className="mt-2 line-clamp-2 text-sm"
          style={{ color: 'var(--c-text)' }}
        >
          {descricao}
        </p>
      )}

      {/* Rodapé */}
      <div
        className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"
        style={{ borderColor: 'var(--ui-border)', color: 'var(--c-muted)' }}
      >
        <span>
          Área:{' '}
          <span className="font-medium" style={{ color: 'var(--c-text)' }}>
            {area}
          </span>
        </span>
        <span>
          Resp.:{' '}
          <span className="font-medium" style={{ color: 'var(--c-text)' }}>
            {responsavel}
          </span>
        </span>
      </div>
    </div>
  );
}
