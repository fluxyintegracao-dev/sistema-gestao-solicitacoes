import { useEffect, useMemo, useRef, useState } from 'react';
import { API_URL, authHeaders } from '../../services/api';
import { HiPaperClip } from 'react-icons/hi2';
import PendingAttachmentsList from '../../components/attachments/PendingAttachmentsList';
import {
  UPLOAD_MAX_FILE_SIZE_MB_PADRAO,
  concatenarAnexosPendentes,
  extrairFilesAnexosPendentes,
  montarMensagemArquivosAcimaDoLimite
} from '../../utils/pendingAttachments';

/**
 * Comentar e anexar viram UM ato so (item 19, 23/08).
 *
 * Eram dois cards separados — "Novo comentario" e "Anexar arquivos" — e, na pratica, quem comenta
 * costuma estar anexando o documento de que fala. Agora o seletor de arquivos, a lista de pendentes
 * e o envio moram aqui dentro, com UM botao. O card tambem subiu para junto do Historico: era do
 * outro lado da tela do lugar onde o resultado dele aparece.
 *
 * Tres decisoes que o botao carrega:
 *
 * 1. UM DOS DOIS BASTA. So texto, so arquivos, ou os dois. Anexar sem comentar ja era possivel, e
 *    tirar isso quebraria quem so quer juntar uma nota fiscal;
 * 2. O COMENTARIO VAI PRIMEIRO. Se o upload falhar, o comentario ja esta gravado e a pessoa
 *    reanexa; na ordem inversa, um comentario que falhasse deixaria arquivos orfaos sem contexto;
 * 3. NAO SE INVENTA VINCULO entre o comentario e o anexo. Os dois vao para a mesma solicitacao,
 *    como ja iam. Amarrar o arquivo AQUELE comentario exigiria `anexos.historico_id` — mudanca de
 *    esquema que ninguem pediu. A medicao tem esse vinculo (`medicao_id`) porque LA foi pedido.
 */
export default function Comentarios({ solicitacaoId, onSucesso, podeInteragir = true, motivoBloqueio = '' }) {
  const [texto, setTexto] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState([]);
  const [mostrarLista, setMostrarLista] = useState(false);
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!podeInteragir) return undefined;
    let ativo = true;

    async function carregarUsuarios() {
      try {
        const res = await fetch(`${API_URL}/usuarios-lista`, {
          headers: authHeaders()
        });

        if (!res.ok) {
          return;
        }

        const data = await res.json();
        if (ativo) {
          setUsuarios(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error(error);
      }
    }

    carregarUsuarios();
    return () => {
      ativo = false;
    };
  }, [podeInteragir]);

  const usuariosDisponiveis = useMemo(() => {
    const termo = String(buscaUsuario || '').trim().toLowerCase();
    return usuarios.filter(usuario => {
      if (usuariosSelecionados.some(item => item.id === usuario.id)) {
        return false;
      }

      if (!termo) return true;

      const nome = String(usuario.nome || '').toLowerCase();
      const email = String(usuario.email || '').toLowerCase();
      return nome.includes(termo) || email.includes(termo);
    });
  }, [buscaUsuario, usuarios, usuariosSelecionados]);

  function adicionarMencao(usuario) {
    if (usuariosSelecionados.some(item => item.id === usuario.id)) {
      return;
    }

    setUsuariosSelecionados(prev => [...prev, usuario]);
    setBuscaUsuario('');
  }

  function removerMencao(usuarioId) {
    setUsuariosSelecionados(prev => prev.filter(usuario => usuario.id !== usuarioId));
  }

  function adicionarArquivos(files) {
    const { arquivos: proximoEstado, rejeitados } = concatenarAnexosPendentes(arquivos, files, {
      maxFileSizeMb: UPLOAD_MAX_FILE_SIZE_MB_PADRAO
    });
    setArquivos(proximoEstado);
    if (rejeitados.length > 0) {
      alert(montarMensagemArquivosAcimaDoLimite(rejeitados, UPLOAD_MAX_FILE_SIZE_MB_PADRAO));
    }
  }

  function removerArquivo(index) {
    setArquivos(prev => prev.filter((_, i) => i !== index));
  }

  async function enviarComentario() {
    const res = await fetch(`${API_URL}/solicitacoes/${solicitacaoId}/comentarios`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        descricao: texto,
        mencoes: usuariosSelecionados.map(usuario => usuario.id)
      })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Erro ao enviar comentario');
    }
  }

  async function enviarArquivos() {
    const formData = new FormData();
    formData.append('solicitacao_id', solicitacaoId);
    formData.append('tipo', 'ANEXO');
    extrairFilesAnexosPendentes(arquivos).forEach(file => {
      formData.append('files', file);
    });

    const res = await fetch(`${API_URL}/anexos/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || 'Erro no upload');
    }
  }

  async function enviar() {
    if (!podeInteragir) return;
    const temTexto = Boolean(texto.trim());
    const temArquivo = arquivos.length > 0;
    if (!temTexto && !temArquivo) return;

    try {
      setLoading(true);

      // O comentario primeiro: se o upload falhar, ele ja esta gravado e a pessoa so reanexa.
      if (temTexto) await enviarComentario();
      if (temArquivo) await enviarArquivos();

      setTexto('');
      setArquivos([]);
      if (inputRef.current) inputRef.current.value = '';
      setUsuariosSelecionados([]);
      setBuscaUsuario('');
      setMostrarLista(false);
      onSucesso?.();
      alert(temTexto && temArquivo
        ? 'Comentario e arquivos enviados com sucesso.'
        : temTexto
          ? 'Comentario enviado com sucesso.'
          : 'Arquivos enviados com sucesso.');
    } catch (error) {
      alert(error?.message || 'Erro ao enviar comentario');
    } finally {
      setLoading(false);
    }
  }

  if (!podeInteragir) {
    return (
      <div className="sol-detail-card" data-testid="comentarios-somente-leitura">
        <h2 className="sol-detail-card-title">Comentarios e arquivos</h2>
        <p className="text-sm leading-6 text-[var(--c-muted)]">
          {motivoBloqueio || 'As interacoes ficam disponiveis quando a solicitacao estiver no seu setor.'}
        </p>
      </div>
    );
  }

  return (
    <div className="sol-detail-card" data-testid="card-comentario">
      <h2 className="sol-detail-card-title">Novo comentario</h2>

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        rows={6}
        className="input w-full mb-2 sol-detail-comment-textarea"
        placeholder={'Escreva um comentario...\nUse Enter para quebrar linha e organizar o texto.'}
      />
      <p className="app-note mb-3">
        Enter cria uma nova linha. O historico vai manter a formatacao digitada.
      </p>

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setMostrarLista(prev => !prev)}
          className="btn btn-secondary text-sm"
        >
          + Mencionar usuario
        </button>

        {mostrarLista && (
          <div className="mt-2 border rounded p-3 bg-white dark:bg-gray-900">
            <input
              type="text"
              value={buscaUsuario}
              onChange={e => setBuscaUsuario(e.target.value)}
              className="input w-full mb-2"
              placeholder="Buscar usuario por nome ou email"
            />

            <div className="max-h-48 overflow-y-auto space-y-1">
              {usuariosDisponiveis.length === 0 && (
                <p className="text-sm text-[var(--c-muted)] px-2 py-2">
                  Nenhum usuario disponivel.
                </p>
              )}

              {usuariosDisponiveis.map(usuario => (
                <button
                  key={usuario.id}
                  type="button"
                  onClick={() => adicionarMencao(usuario)}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-sm"
                >
                  <div className="font-medium">{usuario.nome}</div>
                  <div className="text-xs text-[var(--c-muted)]">{usuario.email}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {usuariosSelecionados.length > 0 && (
        <div className="mb-3 p-3 rounded bg-blue-50 dark:bg-blue-950/30">
          <p className="text-sm font-semibold mb-2">Mencionados</p>
          <div className="flex flex-wrap gap-2">
            {usuariosSelecionados.map(usuario => (
              <span
                key={usuario.id}
                className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 px-3 py-1 rounded-full text-sm"
              >
                {usuario.nome}
                <button
                  type="button"
                  onClick={() => removerMencao(usuario.id)}
                  className="text-red-600 hover:text-red-800 font-bold"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Os anexos, que eram um card proprio, agora fazem parte do mesmo ato. */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <label className={`btn btn-outline inline-flex items-center gap-2 cursor-pointer ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          <HiPaperClip className="w-4 h-4" />
          <span>Anexar arquivos</span>
          <input
            type="file"
            multiple
            ref={inputRef}
            className="hidden"
            data-testid="comentario-anexos"
            disabled={loading}
            onChange={e => {
              adicionarArquivos(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
        <span className="text-xs text-[var(--c-muted)]">
          {arquivos.length > 0
            ? `${arquivos.length} arquivo(s) selecionado(s)`
            : 'Nenhum arquivo selecionado'}
        </span>
      </div>

      <PendingAttachmentsList
        items={arquivos}
        onRemove={(index) => removerArquivo(index)}
        className="space-y-1 mb-3"
        itemClassName="flex items-center justify-between gap-3 text-sm bg-[var(--c-surface)] border border-[var(--c-border)] rounded px-2 py-1"
        removeButtonClassName="text-blue-600 font-semibold px-2"
      />

      <div className="flex justify-end">
        <button
          disabled={loading || (!texto.trim() && arquivos.length === 0)}
          onClick={enviar}
          className="btn btn-primary disabled:opacity-50"
          data-testid="enviar-comentario"
          type="button"
        >
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}
