import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { criarLead } from '../../../services/crm';
import { getCpfCnpjError, maskCpfCnpj, maskPhone, normalizeCurrencyTyping, onlyDigits } from '../../../utils/formatters';

const SOURCE_OPTIONS = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'SITE', label: 'Site' },
  { value: 'INDICACAO', label: 'Indicacao' },
  { value: 'META_ADS', label: 'Meta Ads' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
  { value: 'OUTRO', label: 'Outro' }
];

export default function CrmNovoLead() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    documento: '',
    cidade: '',
    estado: '',
    source_type: 'MANUAL',
    source_name: '',
    empreendimento_interesse: '',
    produto_interesse: '',
    faixa_valor: '',
    observacoes: '',
    temperatura: 'FRIO'
  });

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim()) return alert('Nome e obrigatorio');
    const documentoErro = getCpfCnpjError(form.documento);
    if (documentoErro) return alert(documentoErro);
    try {
      setSaving(true);
      const lead = await criarLead({
        ...form,
        telefone: onlyDigits(form.telefone),
        documento: onlyDigits(form.documento)
      });
      navigate(`/crm/leads/${lead.id}`);
    } catch (err) {
      if (err.status === 409) {
        if (confirm(`${err.message}\n\nDeseja abrir o lead existente?`)) {
          navigate(`/crm/leads/${err.duplicateId || ''}`);
        }
      } else {
        alert(err.message || 'Erro ao criar lead');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page solicitacoes-page">
      <div className="card sol-surface-card app-toolbar-card">
        <div className="app-page-header-row">
          <div>
            <h1 className="page-title">Novo Lead</h1>
            <p className="page-subtitle">Cadastro manual de lead para o CRM.</p>
          </div>
          <Link to="/crm/leads" className="btn btn-secondary text-sm">Cancelar</Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="card sol-surface-card p-5">
          <h2 className="font-semibold text-main mb-3">Dados do Lead</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="app-filter-field sm:col-span-2">
              <span className="app-filter-label">Nome <span className="text-red-500">*</span></span>
              <input className="input" value={form.nome} onChange={set('nome')} placeholder="Nome completo" required />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Telefone</span>
              <input className="input" value={form.telefone} onChange={(e) => setForm((current) => ({ ...current, telefone: maskPhone(e.target.value) }))} placeholder="(99) 99999-9999" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">E-mail</span>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">CPF / CNPJ</span>
              <input className="input" value={form.documento} onChange={(e) => setForm((current) => ({ ...current, documento: maskCpfCnpj(e.target.value) }))} placeholder="Documento" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Temperatura</span>
              <select className="input" value={form.temperatura} onChange={set('temperatura')}>
                <option value="FRIO">Frio</option>
                <option value="MORNO">Morno</option>
                <option value="QUENTE">Quente</option>
              </select>
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Cidade</span>
              <input className="input" value={form.cidade} onChange={set('cidade')} placeholder="Cidade" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Estado</span>
              <input className="input" maxLength={2} value={form.estado} onChange={(e) => setForm((current) => ({ ...current, estado: e.target.value.toUpperCase() }))} placeholder="ES" />
            </label>
          </div>
        </div>

        <div className="card sol-surface-card p-5">
          <h2 className="font-semibold text-main mb-3">Interesse e Origem</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="app-filter-field">
              <span className="app-filter-label">Empreendimento de interesse</span>
              <input className="input" value={form.empreendimento_interesse} onChange={set('empreendimento_interesse')} placeholder="Ex: Residencial Horizonte" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Produto de interesse</span>
              <input className="input" value={form.produto_interesse} onChange={set('produto_interesse')} placeholder="Ex: Apartamento 2 quartos" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Faixa de valor</span>
              <input className="input" inputMode="decimal" value={form.faixa_valor} onChange={(e) => setForm((current) => ({ ...current, faixa_valor: normalizeCurrencyTyping(e.target.value) }))} placeholder="Ex: R$ 300.000,00" />
            </label>

            <label className="app-filter-field">
              <span className="app-filter-label">Origem</span>
              <select className="input" value={form.source_type} onChange={set('source_type')}>
                {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>

            {['META_ADS', 'GOOGLE_ADS', 'SITE'].includes(form.source_type) && (
              <label className="app-filter-field sm:col-span-2">
                <span className="app-filter-label">Nome da campanha / fonte</span>
                <input className="input" value={form.source_name} onChange={set('source_name')} placeholder="Nome da campanha" />
              </label>
            )}
          </div>
        </div>

        <div className="card sol-surface-card p-5">
          <h2 className="font-semibold text-main mb-3">Observacoes</h2>
          <textarea
            className="input w-full"
            rows={4}
            value={form.observacoes}
            onChange={set('observacoes')}
            placeholder="Informacoes adicionais sobre o lead..."
          />
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <Link to="/crm/leads" className="btn btn-secondary">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Criar Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
