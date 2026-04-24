import { corrigirTextoCorrompido } from '../../utils/texto';

export default function InfoCard({
  solicitacao,
  mostrarContratoInfo = true,
  mostrarApropriacaoInfo = true
}) {
  return (
    <div className="card space-y-2">

      <h2 className="font-semibold mb-2" style={{ color: 'var(--c-text)' }}>
        Dados da Solicitação
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">

        <div>
          <span style={{ color: 'var(--c-muted)' }}>Obra</span>
          <p style={{ color: 'var(--c-text)' }}>{solicitacao.obra?.nome}</p>
        </div>

        <div>
          <span style={{ color: 'var(--c-muted)' }}>Setor</span>
          <p style={{ color: 'var(--c-text)' }}>{solicitacao.area_responsavel}</p>
        </div>

        <div>
          <span style={{ color: 'var(--c-muted)' }}>Tipo</span>
          <p style={{ color: 'var(--c-text)' }}>{solicitacao.tipo?.nome || '-'}</p>
        </div>

        <div>
          <span style={{ color: 'var(--c-muted)' }}>Parceiro</span>
          <p style={{ color: 'var(--c-text)' }}>{solicitacao.parceiro?.nome || '-'}</p>
        </div>

        {mostrarApropriacaoInfo && (
          <div>
            <span style={{ color: 'var(--c-muted)' }}>Apropriacao</span>
            <p style={{ color: 'var(--c-text)' }}>{solicitacao.apropriacao?.codigo || solicitacao.apropriacao?.descricao || '-'}</p>
          </div>
        )}

        {mostrarContratoInfo && (
          <div>
            <span style={{ color: 'var(--c-muted)' }}>Contrato</span>
            <p style={{ color: 'var(--c-text)' }}>{solicitacao.contrato?.codigo || solicitacao.codigo_contrato || '-'}</p>
          </div>
        )}

        {mostrarContratoInfo && (
          <div>
            <span style={{ color: 'var(--c-muted)' }}>Ref. do Contrato</span>
            <p style={{ color: 'var(--c-text)' }}>{solicitacao.contrato?.ref_contrato || solicitacao.ref_contrato || '-'}</p>
          </div>
        )}

        <div>
          <span style={{ color: 'var(--c-muted)' }}>Valor</span>
          <p style={{ color: 'var(--c-text)' }}>
            {solicitacao.valor
              ? Number(solicitacao.valor).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })
              : '-'}
          </p>
        </div>

      </div>

      <div>
        <span style={{ color: 'var(--c-muted)' }}>Descrição</span>
        <p className="mt-1" style={{ color: 'var(--c-text)' }}>{corrigirTextoCorrompido(solicitacao.descricao)}</p>
      </div>

    </div>
  );
}
