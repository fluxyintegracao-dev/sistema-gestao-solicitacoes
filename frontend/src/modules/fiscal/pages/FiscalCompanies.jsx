import { useEffect, useState } from 'react';
import {
  createFiscalCertificate,
  createFiscalCompany,
  getFiscalCertificates,
  getFiscalCompanies,
  updateFiscalCompany,
  validateFiscalCertificate
} from '../services/fiscalApi';

const EMPTY_FORM = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  uf: 'ES',
  inscricao_estadual: '',
  ambiente_sefaz: 'homologacao',
  ativo: true,
  modulo_fiscal_habilitado: false,
  observacoes: ''
};

const EMPTY_CERTIFICATE_FORM = {
  fiscal_company_id: '',
  certificate_alias: '',
  storage_type: 'local_secure_path',
  certificate_path: '',
  certificate_s3_key: '',
  password: '',
  valid_from: '',
  valid_until: '',
  serial_number: '',
  issuer: '',
  subject: '',
  is_active: true
};

function StatusPill({ active, children }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {children}
    </span>
  );
}

function formatDateOnly(value) {
  if (!value) return 'nao informada';
  const datePart = String(value).slice(0, 10);
  const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return 'nao informada';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export default function FiscalCompanies() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [certificates, setCertificates] = useState([]);
  const [certificateForm, setCertificateForm] = useState(EMPTY_CERTIFICATE_FORM);
  const [savingCertificate, setSavingCertificate] = useState(false);
  const [validatingCertificateId, setValidatingCertificateId] = useState(null);
  const [certificateValidation, setCertificateValidation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companiesResult, certificatesResult] = await Promise.all([
        getFiscalCompanies(),
        getFiscalCertificates()
      ]);
      setCompanies(companiesResult?.data || []);
      setCertificates(certificatesResult?.data || []);
    } catch (err) {
      setError(err.message || 'Erro ao buscar empresas fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCertificateField = (field, value) => {
    setCertificateForm((current) => ({ ...current, [field]: value }));
  };

  const editCompany = (company) => {
    setEditingId(company.id);
    setForm({
      razao_social: company.razao_social || '',
      nome_fantasia: company.nome_fantasia || '',
      cnpj: company.cnpj || '',
      uf: company.uf || 'ES',
      inscricao_estadual: company.inscricao_estadual || '',
      ambiente_sefaz: company.ambiente_sefaz || 'homologacao',
      ativo: Boolean(company.ativo),
      modulo_fiscal_habilitado: Boolean(company.modulo_fiscal_habilitado),
      observacoes: company.observacoes || ''
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (editingId) {
        await updateFiscalCompany(editingId, form);
        setMessage('Empresa fiscal atualizada.');
      } else {
        await createFiscalCompany(form);
        setMessage('Empresa fiscal cadastrada.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar empresa fiscal');
    } finally {
      setSaving(false);
    }
  };

  const submitCertificate = async (event) => {
    event.preventDefault();
    setSavingCertificate(true);
    setError('');
    setMessage('');
    try {
      await createFiscalCertificate(certificateForm);
      setMessage('Certificado fiscal cadastrado sem expor segredo no frontend.');
      setCertificateForm(EMPTY_CERTIFICATE_FORM);
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar certificado fiscal');
    } finally {
      setSavingCertificate(false);
    }
  };

  const validateCertificate = async (certificate) => {
    setValidatingCertificateId(certificate.id);
    setCertificateValidation(null);
    setError('');
    setMessage('');
    try {
      const result = await validateFiscalCertificate(certificate.id);
      const hasError = (result?.checks || []).some((check) => check.status === 'ERROR');
      setCertificateValidation({
        certificateId: certificate.id,
        alias: certificate.certificate_alias,
        checks: result?.checks || []
      });
      setMessage(hasError ? 'Validacao concluida com pendencias. Revise os checks.' : 'Certificado validado administrativamente.');
      await load();
    } catch (err) {
      setError(err.message || 'Erro ao validar certificado fiscal');
    } finally {
      setValidatingCertificateId(null);
    }
  };

  return (
    <div className="fiscal-page space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fiscal</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">Empresas fiscais</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Cadastro inicial dos CNPJs que serao monitorados pelo modulo fiscal.</p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-4">
        <label className="md:col-span-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Razao social</span>
          <input className="input mt-1" value={form.razao_social} onChange={(e) => updateField('razao_social', e.target.value)} required />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">CNPJ</span>
          <input className="input mt-1" value={form.cnpj} onChange={(e) => updateField('cnpj', e.target.value)} required />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">UF</span>
          <input className="input mt-1 uppercase" value={form.uf} onChange={(e) => updateField('uf', e.target.value.toUpperCase())} maxLength={2} required />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Nome fantasia</span>
          <input className="input mt-1" value={form.nome_fantasia} onChange={(e) => updateField('nome_fantasia', e.target.value)} />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Inscricao estadual</span>
          <input className="input mt-1" value={form.inscricao_estadual} onChange={(e) => updateField('inscricao_estadual', e.target.value)} />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Ambiente SEFAZ</span>
          <select className="input mt-1" value={form.ambiente_sefaz} onChange={(e) => updateField('ambiente_sefaz', e.target.value)}>
            <option value="homologacao">Homologacao</option>
            <option value="producao">Producao</option>
          </select>
        </label>
        <div className="flex items-center gap-4 pt-6">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.ativo} onChange={(e) => updateField('ativo', e.target.checked)} />
            Ativa
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={form.modulo_fiscal_habilitado} onChange={(e) => updateField('modulo_fiscal_habilitado', e.target.checked)} />
            Monitorar
          </label>
        </div>
        <label className="md:col-span-4">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Observacoes</span>
          <textarea className="input mt-1 min-h-[80px]" value={form.observacoes} onChange={(e) => updateField('observacoes', e.target.value)} />
        </label>
        <div className="flex gap-2 md:col-span-4">
          <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Cadastrar'}</button>
          {editingId ? <button className="btn-secondary" type="button" onClick={resetForm}>Cancelar edicao</button> : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">CNPJ</th>
              <th className="px-4 py-3">UF</th>
              <th className="px-4 py-3">Ambiente</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Fiscal</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Carregando empresas...</td></tr>
            ) : companies.length ? companies.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{company.razao_social}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.cnpj}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.uf}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.ambiente_sefaz}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <StatusPill active={company.ativo}>{company.ativo ? 'Ativa' : 'Inativa'}</StatusPill>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                  <StatusPill active={company.modulo_fiscal_habilitado}>
                    {company.modulo_fiscal_habilitado ? 'Monitorando' : 'Desligado'}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-right"><button className="btn-secondary" type="button" onClick={() => editCompany(company)}>Editar</button></td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={7}>Nenhuma empresa fiscal cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <section id="certificados" className="grid gap-5 scroll-mt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={submitCertificate} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Certificado A1</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cadastro seguro de metadados. O arquivo e a senha nao sao exibidos depois de salvar.
            </p>
          </div>
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Empresa fiscal</span>
            <select className="input mt-1" value={certificateForm.fiscal_company_id} onChange={(e) => updateCertificateField('fiscal_company_id', e.target.value)} required>
              <option value="">Selecione</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.razao_social} - {company.cnpj}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Alias</span>
            <input className="input mt-1" value={certificateForm.certificate_alias} onChange={(e) => updateCertificateField('certificate_alias', e.target.value)} required />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Armazenamento</span>
            <select className="input mt-1" value={certificateForm.storage_type} onChange={(e) => updateCertificateField('storage_type', e.target.value)}>
              <option value="local_secure_path">Caminho local seguro</option>
              <option value="s3_private">S3 privado</option>
              <option value="secrets_manager">Secrets Manager futuro</option>
            </select>
          </label>
          {certificateForm.storage_type === 'local_secure_path' ? (
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Caminho local na EC2</span>
              <input className="input mt-1" placeholder="/opt/fluxy/certs/fiscal/certificado.pfx" value={certificateForm.certificate_path} onChange={(e) => updateCertificateField('certificate_path', e.target.value)} required />
            </label>
          ) : null}
          {certificateForm.storage_type === 's3_private' ? (
            <label className="md:col-span-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Chave S3 privada</span>
              <input className="input mt-1" value={certificateForm.certificate_s3_key} onChange={(e) => updateCertificateField('certificate_s3_key', e.target.value)} required />
            </label>
          ) : null}
          <label>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Senha A1</span>
            <input className="input mt-1" type="password" value={certificateForm.password} onChange={(e) => updateCertificateField('password', e.target.value)} />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Valido ate</span>
            <input className="input mt-1" type="date" value={certificateForm.valid_until} onChange={(e) => updateCertificateField('valid_until', e.target.value)} />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Valido desde</span>
            <input className="input mt-1" type="date" value={certificateForm.valid_from} onChange={(e) => updateCertificateField('valid_from', e.target.value)} />
          </label>
          <label>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Numero de serie</span>
            <input className="input mt-1" value={certificateForm.serial_number} onChange={(e) => updateCertificateField('serial_number', e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Emissor</span>
            <input className="input mt-1" value={certificateForm.issuer} onChange={(e) => updateCertificateField('issuer', e.target.value)} />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Titular</span>
            <input className="input mt-1" value={certificateForm.subject} onChange={(e) => updateCertificateField('subject', e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={certificateForm.is_active} onChange={(e) => updateCertificateField('is_active', e.target.checked)} />
            Definir como ativo
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={savingCertificate}>{savingCertificate ? 'Salvando...' : 'Cadastrar certificado'}</button>
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 p-5 dark:border-slate-800">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Certificados cadastrados</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Segredos criptografados nao retornam pela API.</p>
          </div>
          {certificateValidation ? (
            <div className="border-b border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
              <p className="text-sm font-semibold text-slate-950 dark:text-white">
                Validacao: {certificateValidation.alias}
              </p>
              <div className="mt-3 space-y-2">
                {certificateValidation.checks.map((check) => (
                  <div key={check.name} className="rounded-lg border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-900 dark:text-white">{check.name}</span>
                      <StatusPill active={check.status === 'OK'}>{check.status}</StatusPill>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{check.message}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {certificates.length ? certificates.map((certificate) => (
              <div key={certificate.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-950 dark:text-white">{certificate.certificate_alias}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{certificate.company?.razao_social || 'Empresa nao vinculada'}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{certificate.storage_type} - {certificate.validation_status || 'pending'}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${certificate.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {certificate.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    Validade: {formatDateOnly(certificate.valid_until)}
                  </span>
                  <button className="btn-secondary" type="button" onClick={() => validateCertificate(certificate)} disabled={validatingCertificateId === certificate.id}>
                    {validatingCertificateId === certificate.id ? 'Validando...' : 'Validar'}
                  </button>
                </div>
              </div>
            )) : (
              <div className="p-5 text-sm text-slate-500">Nenhum certificado cadastrado.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
