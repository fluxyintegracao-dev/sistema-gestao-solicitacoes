import { useEffect, useMemo, useState } from 'react';
import {
  ativarPaginaArquivoModelo,
  criarPaginaArquivoModelo,
  desativarPaginaArquivoModelo,
  getAdminsArquivosModelos,
  getContextoArquivosModelos,
  salvarUploadersArquivosModelos
} from '../services/arquivosModelos';

function mapById(lista) {
  return Object.fromEntries((lista || []).map(item => [Number(item.id), item]));
}

export default function ArquivosModelosConfig() {
  const [contexto, setContexto] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [novoNomePagina, setNovoNomePagina] = useState('');
  const [uploadersByPagina, setUploadersByPagina] = useState({});
  const [salvando, setSalvando] = useState(false);

  const adminsById = useMemo(() => mapById(admins), [admins]);

  async function carregar() {
    const [ctx, listaAdmins] = await Promise.all([
      getContextoArquivosModelos(),
      getAdminsArquivosModelos()
    ]);
    setContexto(ctx);
    setAdmins(Array.isArray(listaAdmins) ? listaAdmins : []);
    setUploadersByPagina(ctx?.uploadersByPagina || {});
  }

  useEffect(() => {
    carregar().catch(error => {
      console.error(error);
      alert('Erro ao carregar configuracao de arquivos modelos');
    });
  }, []);

  async function criarPagina() {
    try {
      if (!novoNomePagina.trim()) return;
      await criarPaginaArquivoModelo(novoNomePagina.trim());
      setNovoNomePagina('');
      await carregar();
      alert('Pagina criada com sucesso.');
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao criar pagina');
    }
  }

  async function togglePagina(pagina) {
    try {
      if (pagina.ativo) {
        await desativarPaginaArquivoModelo(pagina.codigo);
      } else {
        await ativarPaginaArquivoModelo(pagina.codigo);
      }
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao alterar status da pagina');
    }
  }

  function toggleAdminPagina(paginaCodigo, userId) {
    setUploadersByPagina(prev => {
      const atual = Array.isArray(prev?.[paginaCodigo]) ? prev[paginaCodigo] : [];
      const existe = atual.includes(userId);
      const proximo = existe ? atual.filter(id => id !== userId) : [...atual, userId];
      return { ...prev, [paginaCodigo]: proximo };
    });
  }

  async function salvarUploaders() {
    try {
      setSalvando(true);
      await salvarUploadersArquivosModelos(uploadersByPagina);
      alert('Permissoes de upload salvas com sucesso.');
      await carregar();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Erro ao salvar permissoes');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Configuração de Arquivos Modelos</h1>
        <p className="page-subtitle">
          Crie páginas, ative/desative e defina quais usuários ADMIN podem fazer upload em cada página.
        </p>
      </div>

      <div className="card">
        <h2 className="font-semibold mb-2">Criar nova página</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className="input max-w-md"
            placeholder="Nome da nova página"
            value={novoNomePagina}
            onChange={e => setNovoNomePagina(e.target.value)}
          />
          <button type="button" className="btn btn-primary" onClick={criarPagina}>
            Criar
          </button>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Páginas e permissões de upload</h2>
          <button type="button" className="btn btn-primary" onClick={salvarUploaders} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar permissões'}
          </button>
        </div>

        {(contexto?.paginas || []).map(pagina => {
          const ids = Array.isArray(uploadersByPagina?.[pagina.codigo]) ? uploadersByPagina[pagina.codigo] : [];
          return (
            <div key={pagina.codigo} className="rounded-xl border border-gray-200 p-3 bg-white">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold">{pagina.nome}</p>
                  <p className="text-xs text-gray-500">Código: {pagina.codigo}</p>
                </div>
                <button type="button" className="btn btn-outline" onClick={() => togglePagina(pagina)}>
                  {pagina.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>

              <div className="mt-3">
                <p className="text-sm font-medium mb-2">Admins com upload permitido</p>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {admins.map(admin => {
                    const checked = ids.includes(Number(admin.id));
                    return (
                      <label key={admin.id} className="flex items-start gap-2 text-sm border rounded-lg p-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAdminPagina(pagina.codigo, Number(admin.id))}
                        />
                        <span>
                          <strong>{admin.nome}</strong><br />
                          <span className="text-xs text-gray-500">
                            {admin.email} · {admin.perfil} · {adminsById[Number(admin.id)]?.setor?.nome || '-'}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
