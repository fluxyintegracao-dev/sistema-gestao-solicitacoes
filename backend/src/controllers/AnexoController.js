const {
  Anexo,
  Solicitacao,
  Historico,
  User
} = require('../models');
const { criarNotificacao } = require('../services/notificacoes');
const { uploadToS3, getPresignedUrl } = require('../services/s3');
const {
  assertRegisteredFileAccess,
  canAccessSolicitacaoFile,
  getRegisteredFilePath,
  resolveRegisteredFileResource
} = require('../services/fileAccessService');
const { normalizeOriginalName } = require('../utils/fileName');
const {
  canDeleteSolicitacaoAnexo
} = require('../services/authorizationService');
const { registrarEventoSeguranca } = require('../services/securityLogService');
const { publishSolicitacaoRealtimeEvent } = require('../services/solicitacaoRealtimeService');

function parseHistoricoMetadata(metadata) {
  if (!metadata) return {};
  if (typeof metadata === 'object') return metadata;

  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

async function obterCaminhoArquivoHistorico(historico) {
  const metadata = parseHistoricoMetadata(historico?.metadata);
  const caminhoDireto = (
    metadata?.caminho ||
    metadata?.caminho_arquivo ||
    metadata?.arquivo_url ||
    metadata?.url ||
    metadata?.file_url ||
    metadata?.download_url ||
    metadata?.comprovante_pdf_url
  );

  if (caminhoDireto) {
    return caminhoDireto;
  }

  if (!metadata?.anexo_id) {
    return null;
  }

  const anexo = await Anexo.findByPk(metadata.anexo_id, {
    attributes: ['id', 'caminho_arquivo']
  });

  return anexo?.caminho_arquivo || null;
}

async function validarAcessoSolicitacao(req, solicitacao) {
  if (!solicitacao) {
    return {
      permitido: false,
      status: 404,
      error: 'Solicitação não encontrada'
    };
  }

  const acesso = await canAccessSolicitacaoFile(req, solicitacao.id);
  if (!acesso.allowed) {
    return {
      permitido: false,
      status: acesso.status || 403,
      error: acesso.error || 'Voce nao tem permissao para acessar anexos desta solicitacao.'
    };
  }

  return {
    permitido: true
  };
}

class AnexoController {

  async upload(req, res) {
    try {

      const { solicitacao_id, tipo } = req.body;
      const usuario = await User.findByPk(req.user.id);

      if (!solicitacao_id) {
        return res.status(400).json({ error: 'solicitacao_id é obrigatório' });
      }

      if (!tipo) {
        return res.status(400).json({ error: 'tipo é obrigatório' });
      }

      const tiposPermitidos = [
        'ANEXO',
        'SOLICITACAO',
        'CONTRATO',
        'COMPROVANTE'
      ];

      const tipoNormalizado = String(tipo).toUpperCase();

      if (!tiposPermitidos.includes(tipoNormalizado)) {
        return res.status(400).json({ error: 'tipo inválido' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const solicitacao = await Solicitacao.findByPk(solicitacao_id, {
        attributes: ['id', 'codigo', 'obra_id']
      });
      const acessoSolicitacao = await validarAcessoSolicitacao(req, solicitacao);

      if (!acessoSolicitacao.permitido) {
        return res.status(acessoSolicitacao.status).json({ error: acessoSolicitacao.error });
      }

      if (!solicitacao) {
        return res.status(404).json({ error: 'Solicitação não encontrada' });
      }

      const codigo = solicitacao.codigo;

      const registros = [];

      for (const file of req.files) {
        const nomeOriginal = normalizeOriginalName(file.originalname);
        const url = await uploadToS3(
          file,
          `anexos/${codigo}/${tipoNormalizado.toLowerCase()}`
        );

        const anexo = await Anexo.create({
          solicitacao_id,
          tipo: tipoNormalizado,
          nome_original: nomeOriginal,
          caminho_arquivo: url,
          uploaded_by: usuario.id,
          area_origem: usuario.setor_id
        });

        registros.push(anexo);

        // ??? HIST??RICO COM METADATA
        await Historico.create({
          solicitacao_id,
          usuario_responsavel_id: usuario.id,
          setor: usuario.setor_id,
          acao: 'ANEXO_ADICIONADO',
          descricao: nomeOriginal,
          metadata: JSON.stringify({
            anexo_id: anexo.id,
            caminho: url
          })
        });
      }


      await criarNotificacao({
        solicitacao_id,
        tipo: 'ANEXO_ADICIONADO',
        mensagem: `${usuario?.nome || 'Usuario'} anexou ${registros.length} arquivo(s) na solicitacao ${codigo}`,
        created_by: usuario.id,
        metadata: { total: registros.length }
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'ATTACHMENT_ADDED',
        solicitacao,
        actor: {
          id: usuario.id,
          nome: usuario?.nome || req.user?.nome || null
        },
        metadata: {
          total_arquivos: registros.length
        }
      });

      return res.status(201).json(registros);

    } catch (error) {
      console.error('Erro upload anexo:', error);
      return res.status(500).json({ error: 'Erro ao salvar anexos' });
    }
  }

  async listarPorSolicitacao(req, res) {
    try {

      const { id } = req.params;
      const { tipo } = req.query;

      const solicitacao = await Solicitacao.findByPk(id, {
        attributes: ['id', 'obra_id']
      });
      const acessoSolicitacao = await validarAcessoSolicitacao(req, solicitacao);

      if (!acessoSolicitacao.permitido) {
        return res.status(acessoSolicitacao.status).json({ error: acessoSolicitacao.error });
      }

      const where = { solicitacao_id: id, deleted_at: null };

      if (tipo) where.tipo = tipo;

      const anexos = await Anexo.findAll({
        where,
        order: [['createdAt', 'DESC']]
      });

      return res.json(anexos);

    } catch (error) {
      console.error('Erro listar anexos:', error);
      return res.status(500).json({ error: 'Erro ao listar anexos' });
    }
  }

  async presign(req, res) {
    try {
      const { url, key, historico_id: historicoId } = req.query;
      const alvo = url || key;

      if (!alvo && !historicoId) {
        return res.status(400).json({ error: 'url obrigatoria' });
      }

      if (historicoId) {
        const historico = await Historico.findByPk(historicoId, {
          attributes: ['id', 'solicitacao_id', 'acao', 'metadata']
        });

        if (!historico) {
          return res.status(404).json({ error: 'Historico nao encontrado' });
        }

        const acessoHistorico = await canAccessSolicitacaoFile(req, historico.solicitacao_id);
        if (!acessoHistorico.allowed) {
          return res.status(acessoHistorico.status || 403).json({
            error: acessoHistorico.error || 'Acesso negado ao arquivo do historico'
          });
        }

        const caminhoHistorico = await obterCaminhoArquivoHistorico(historico);
        if (!caminhoHistorico) {
          return res.status(404).json({ error: 'Arquivo do historico nao encontrado' });
        }

        const signedUrl = await getPresignedUrl(caminhoHistorico);
        return res.json({ url: signedUrl });
      }

      const arquivoRegistrado = await resolveRegisteredFileResource(alvo);
      if (!arquivoRegistrado) {
        await registrarEventoSeguranca({
          req,
          usuarioId: req.user?.id || null,
          tipoEvento: 'FILE_ACCESS_DENIED',
          recursoTipo: 'FILE',
          recursoId: String(alvo).slice(0, 120),
          status: 'DENIED',
          descricao: 'Tentativa de assinar arquivo nao registrado'
        });
        return res.status(404).json({ error: 'Arquivo nao encontrado' });
      }

      const acesso = await assertRegisteredFileAccess(req, arquivoRegistrado);
      if (!acesso.allowed) {
        return res.status(acesso.status || 403).json({ error: acesso.error || 'Acesso negado ao arquivo' });
      }

      const caminhoRegistrado = getRegisteredFilePath(arquivoRegistrado) || alvo;
      const signedUrl = await getPresignedUrl(caminhoRegistrado);
      return res.json({ url: signedUrl });
    } catch (error) {
      console.error('Erro ao gerar URL assinada:', error);
      return res.status(500).json({ error: 'Erro ao gerar URL assinada' });
    }
  }

  async remover(req, res) {
    try {
      const { historicoId } = req.params;
      const usuario = await User.findByPk(req.user.id);

      if (!(await canDeleteSolicitacaoAnexo(req.user))) {
        return res.status(403).json({ error: 'Usuario sem permissao para remover anexo.' });
      }

      const historico = await Historico.findByPk(historicoId);
      if (!historico) {
        return res.status(404).json({ error: 'Historico nao encontrado.' });
      }

      const solicitacao = await Solicitacao.findByPk(historico.solicitacao_id, {
        attributes: ['id', 'obra_id']
      });
      const acessoSolicitacao = await validarAcessoSolicitacao(req, solicitacao);

      if (!acessoSolicitacao.permitido) {
        return res.status(acessoSolicitacao.status).json({ error: acessoSolicitacao.error });
      }

      if (historico.acao !== 'ANEXO_ADICIONADO') {
        return res.status(400).json({ error: 'Somente anexos do historico podem ser removidos.' });
      }

      let metadata = {};
      try {
        metadata = historico.metadata ? JSON.parse(historico.metadata) : {};
      } catch {
        metadata = {};
      }

      const anexoId = metadata?.anexo_id;
      const caminho = metadata?.caminho;

      let anexo = null;
      if (anexoId) {
        anexo = await Anexo.findByPk(anexoId);
      }

      if (!anexo && caminho) {
        anexo = await Anexo.findOne({
          where: {
            solicitacao_id: historico.solicitacao_id,
            caminho_arquivo: caminho
          }
        });
      }

      if (anexo) {
        await anexo.update({ deleted_at: new Date() });
      }

      await Historico.create({
        solicitacao_id: historico.solicitacao_id,
        usuario_responsavel_id: usuario.id,
        setor: usuario.setor_id,
        acao: 'ANEXO_REMOVIDO',
        descricao: anexo?.nome_original || historico.descricao || 'Anexo removido',
        metadata: JSON.stringify({ anexo_id: anexo?.id || anexoId || null, caminho: caminho || null })
      });

      await publishSolicitacaoRealtimeEvent({
        action: 'ATTACHMENT_REMOVED',
        solicitacaoId: historico.solicitacao_id,
        actor: {
          id: usuario.id,
          nome: usuario?.nome || req.user?.nome || null
        },
        metadata: {
          anexo_id: anexoId || null,
          caminho: caminho || null
        }
      });

      return res.json({ ok: true });
    } catch (error) {
      console.error('Erro remover anexo:', error);
      return res.status(500).json({ error: 'Erro ao remover anexo.' });
    }
  }

}

module.exports = new AnexoController();
