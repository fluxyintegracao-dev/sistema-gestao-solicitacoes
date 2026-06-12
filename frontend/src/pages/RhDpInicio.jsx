import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  canAccessRhDpEmpresas,
  canExecuteRhDpImportacoes,
  canViewRhDpApuracao,
  canViewRhDpColaboradores,
  canViewRhDpDocumentos,
  canViewRhDpObrigacoes,
  hasEnabledModule
} from '../utils/acessoProduto';

function EtapaCard({ titulo, descricao, href }) {
  return (
    <Link to={href} className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-4 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{titulo}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{descricao}</p>
    </Link>
  );
}

export default function RhDpInicio() {
  const { user } = useAuth();
  const financeiroHabilitado = hasEnabledModule(user, 'FINANCEIRO');
  const podeVerEmpresas = canAccessRhDpEmpresas(user);
  const podeVerColaboradores = canViewRhDpColaboradores(user);
  const podeVerDocumentos = canViewRhDpDocumentos(user);
  const podeExecutarImportacoes = canExecuteRhDpImportacoes(user);
  const podeVerApuracao = canViewRhDpApuracao(user);
  const podeVerFechamentos = canViewRhDpObrigacoes(user) && financeiroHabilitado;

  return (
    <div className="rhdp-page space-y-6">
      <section className="rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_top_left,_rgba(191,219,254,0.45),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(186,230,253,0.45),_transparent_24%),linear-gradient(135deg,_rgba(255,255,255,0.94),_rgba(239,246,255,0.9))] px-6 py-6 shadow-sm">
        <div className="max-w-4xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Modulo planejado</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">RH/DP</h1>
          <p className="text-sm leading-6 text-slate-600">
            A fundacao modular do RH/DP ja esta habilitada no produto. As proximas entregas vao entrar por blocos:
            base de colaboradores, documentos, importacoes, apuracao, fechamento e integracao financeira.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {podeVerEmpresas ? (
          <EtapaCard
            titulo="Empresas"
            href="/rh-dp/empresas"
            descricao="Cadastre as empresas do grupo usadas pelo RH/DP para distribuir colaboradores e competencias."
          />
        ) : null}
        {podeVerColaboradores ? (
          <EtapaCard
            titulo="Colaboradores"
            href="/rh-dp/colaboradores"
            descricao="Gerencie a base cadastral, os dados de pagamento e a importacao inicial de colaboradores."
          />
        ) : null}
        {podeVerDocumentos ? (
          <EtapaCard
            titulo="Documentos"
            href="/rh-dp/documentos"
            descricao="Busque documentos por colaborador, controle validade, confira checklist e use links assinados para acesso."
          />
        ) : null}
        {podeExecutarImportacoes ? (
          <EtapaCard
            titulo="Importacoes"
            href="/rh-dp/importacoes"
            descricao="Suba jornadas, eventos e descontos com preview persistido, erros por linha e confirmacao explicita."
          />
        ) : null}
        {podeVerApuracao ? (
          <EtapaCard
            titulo="Apuracao"
            href="/rh-dp/apuracao"
            descricao="Gere a pre-folha por competencia a partir dos lotes confirmados e aplique ajustes auditados por colaborador."
          />
        ) : null}
        {podeVerFechamentos ? (
          <EtapaCard
            titulo="Fechamentos"
            href="/rh-dp/fechamentos"
            descricao="Feche competencias conferidas e acompanhe os titulos a pagar gerados no financeiro central."
          />
        ) : financeiroHabilitado ? null : (
          <EtapaCard
            titulo="Proximos blocos"
            href="/rh-dp"
            descricao="Fechamento com geracao de titulos depende do modulo FINANCEIRO habilitado na instalacao."
          />
        )}
      </section>
    </div>
  );
}
