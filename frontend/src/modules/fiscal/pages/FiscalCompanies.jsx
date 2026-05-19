import { useEffect, useState } from 'react';
import { createFiscalCompany, getFiscalCompanies, updateFiscalCompany } from '../services/fiscalApi';

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

export default function FiscalCompanies() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getFiscalCompanies();
      setCompanies(result?.data || []);
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

  return (
    <div className="space-y-6">
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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={6}>Carregando empresas...</td></tr>
            ) : companies.length ? companies.map((company) => (
              <tr key={company.id}>
                <td className="px-4 py-3 font-medium text-slate-950 dark:text-white">{company.razao_social}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.cnpj}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.uf}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.ambiente_sefaz}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.ativo ? 'Ativa' : 'Inativa'}</td>
                <td className="px-4 py-3 text-right"><button className="btn-secondary" type="button" onClick={() => editCompany(company)}>Editar</button></td>
              </tr>
            )) : (
              <tr><td className="px-4 py-5 text-slate-500" colSpan={6}>Nenhuma empresa fiscal cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
