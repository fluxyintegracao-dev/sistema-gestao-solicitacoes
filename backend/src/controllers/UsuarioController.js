const bcrypt = require('bcryptjs');
const { Op, fn, col, where } = require('sequelize');

const {
  User,
  Cargo,
  Setor,
  Obra,
  UsuarioObra
} = require('../models');
const { env } = require('../config/env');
const { registrarEventoSeguranca } = require('../services/securityLogService');
const { assertStrongPassword } = require('../services/passwordPolicyService');
const {
  createUserPasswordPayload,
  sendPasswordResetEmail
} = require('../services/passwordResetService');

function podeDefinirPerfilSuperadmin(req, perfilDestino) {
  const perfilSolicitante = String(req.user?.perfil || '').trim().toUpperCase();
  const perfilNormalizado = String(perfilDestino || '').trim().toUpperCase();
  if (perfilNormalizado !== 'SUPERADMIN') return true;
  return perfilSolicitante === 'SUPERADMIN';
}

function isPerfilSuperadmin(valor) {
  return String(valor || '').trim().toUpperCase() === 'SUPERADMIN';
}

function podeGerenciarUsuarioAlvo(req, usuario) {
  if (!usuario) return false;
  const perfilSolicitante = String(req.user?.perfil || '').trim().toUpperCase();
  if (perfilSolicitante === 'SUPERADMIN') return true;
  return !isPerfilSuperadmin(usuario.perfil);
}

function normalizarTexto(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizarCabecalho(valor) {
  return normalizarTexto(valor)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizarEmail(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase();
}

function parseBoolean(valor) {
  if (typeof valor === 'boolean') {
    return valor;
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase();
    if (normalizado === 'true') return true;
    if (normalizado === 'false') return false;
    if (normalizado === '1') return true;
    if (normalizado === '0') return false;
    if (normalizado === 'sim') return true;
    if (normalizado === 'nao') return false;
    if (normalizado === 'não') return false;
  }

  if (typeof valor === 'number') {
    if (valor === 1) return true;
    if (valor === 0) return false;
  }

  return null;
}

function definirPermissaoSolicitacaoCompra(perfil, valorInformado, fallback = false) {
  const perfilNormalizado = String(perfil || '').trim().toUpperCase();
  if (perfilNormalizado === 'SUPERADMIN' || perfilNormalizado === 'ADMIN' || perfilNormalizado === 'ADMINISTRADOR') {
    return true;
  }

  const parseado = parseBoolean(valorInformado);
  if (parseado === null) {
    return Boolean(fallback);
  }

  return parseado;
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsv(content) {
  const texto = String(content || '').replace(/^\uFEFF/, '');
  const linhas = texto
    .split(/\r?\n/)
    .map(l => l.replace(/\r$/, ''))
    .filter(l => l.trim() !== '');

  if (linhas.length < 2) return { headers: [], rows: [] };

  const first = linhas[0];
  const semicolonCount = (first.match(/;/g) || []).length;
  const commaCount = (first.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const headers = parseCsvLine(first, delimiter).map(h => h.trim());
  const rows = linhas.slice(1).map(line => parseCsvLine(line, delimiter));
  return { headers, rows };
}

function splitObrasCell(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return [];
  return texto
    .split(/[|,;]/)
    .map(v => String(v || '').trim())
    .filter(Boolean);
}

module.exports = {

  // =====================================================
  // LISTAR USUÁRIOS
  // =====================================================
  async index(req, res) {
    try {
      const whereUsuarios = {};
      if (!isPerfilSuperadmin(req.user?.perfil)) {
        whereUsuarios.perfil = {
          [Op.ne]: 'SUPERADMIN'
        };
      }

      const usuarios = await User.findAll({
        where: whereUsuarios,
        attributes: { exclude: ['senha'] }, // nunca retornar senha
        include: [
          {
            model: Cargo,
            as: 'cargoInfo'
          },
          {
            model: Setor,
            as: 'setor'
          },
          {
            model: UsuarioObra,
            as: 'vinculos',
            include: [
              {
                model: Obra,
                as: 'obra'
              }
            ]
          }
        ],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios);

    } catch (error) {
      console.error(error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Erro ao criar usuario',
          code: error.code,
          details: error.details
        });
      }
      return res.status(500).json({
        error: 'Erro ao listar usuários'
      });
    }
  },

  async opcoesAtribuicao(req, res) {
    try {
      const setorId = req.user?.setor_id;

      if (!setorId) {
        return res.status(400).json({ error: 'Usuario sem setor vinculado' });
      }

      const usuarios = await User.findAll({
        attributes: { exclude: ['senha'] },
        where: {
          setor_id: setorId,
          ativo: true,
          perfil: {
            [Op.ne]: 'SUPERADMIN'
          }
        },
        include: [
          {
            model: UsuarioObra,
            as: 'vinculos',
            attributes: ['id', 'obra_id', 'user_id']
          }
        ],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios);
    } catch (error) {
      console.error(error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Erro ao criar usuario',
          code: error.code,
          details: error.details
        });
      }
      return res.status(500).json({
        error: 'Erro ao listar usuarios para atribuicao'
      });
    }
  },

  async listaPublica(req, res) {
    try {
      const usuarios = await User.findAll({
        where: {
          ativo: true,
          perfil: {
            [Op.ne]: 'SUPERADMIN'
          }
        },
        attributes: ['id', 'nome', 'email'],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios);
    } catch (error) {
      console.error(error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Erro ao alterar senha',
          code: error.code,
          details: error.details
        });
      }
      return res.status(500).json({
        error: 'Erro ao buscar usuários'
      });
    }
  },

  // =====================================================
  // DETALHE USUÁRIO
  // =====================================================
  async show(req, res) {
    try {
      const { id } = req.params;

      const usuario = await User.findByPk(id, {
        attributes: { exclude: ['senha'] },
        include: [
          {
            model: Cargo,
            as: 'cargoInfo'
          },
          {
            model: Setor,
            as: 'setor'
          },
          {
            model: UsuarioObra,
            as: 'vinculos',
            include: [
              {
                model: Obra,
                as: 'obra'
              }
            ]
          }
        ]
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      if (!podeGerenciarUsuarioAlvo(req, usuario)) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      return res.json(usuario);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao buscar usuário'
      });
    }
  },

  // =====================================================
  // CRIAR USUÁRIO
  // =====================================================
  async create(req, res) {
    try {

      const {
        nome,
        email,
        senha,
        cargo_id,
        setor_id,
        perfil,
        obras = [],
        pode_criar_solicitacao_compra,
        enviar_convite = true
      } = req.body;

      const emailNormalizado = normalizarEmail(email);

      if (!nome || !emailNormalizado || !perfil) {
        return res.status(400).json({
          error: 'Nome, email, senha e perfil são obrigatórios'
        });
      }

      if (!podeDefinirPerfilSuperadmin(req, perfil)) {
        return res.status(403).json({
          error: 'Apenas SUPERADMIN pode criar usuário com perfil SUPERADMIN'
        });
      }
      // Verifica email duplicado
      const existe = await User.findOne({
        where: {
          [Op.or]: [
            { email: emailNormalizado },
            where(fn('LOWER', fn('TRIM', col('email'))), emailNormalizado)
          ]
        }
      });

      if (existe) {
        return res.status(400).json({
          error: 'Email já cadastrado'
        });
      }

      // 🔐 Criptografa senha
      const deveEnviarConvite = !senha || enviar_convite !== false;
      const passwordPayload = await createUserPasswordPayload({
        senha,
        forceInvite: deveEnviarConvite
      });

      const usuario = await User.create({
        nome,
        email: emailNormalizado,
        senha: passwordPayload.senhaHash,
        cargo_id,
        setor_id,
        perfil,
        ativo: true,
        force_password_reset: passwordPayload.forcePasswordReset,
        password_changed_at: passwordPayload.passwordChangedAt,
        pode_criar_solicitacao_compra: definirPermissaoSolicitacaoCompra(
          perfil,
          pode_criar_solicitacao_compra,
          false
        )
      });

      // 🔗 Vínculo obras
      for (const obra_id of obras) {
        await UsuarioObra.create({
          user_id: usuario.id,
          obra_id,
          perfil
        });
      }

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'USER_CREATED',
        recursoTipo: 'USER',
        recursoId: usuario.id,
        status: 'SUCCESS',
        descricao: 'Usuário criado',
        metadata: {
          perfil,
          setor_id,
          obras
        }
      });

      let conviteEnviado = false;
      let conviteErro = null;
      if (deveEnviarConvite) {
        try {
          await sendPasswordResetEmail(usuario, { req, isInvite: true });
          conviteEnviado = true;
        } catch (emailError) {
          console.error(emailError);
          conviteErro = emailError.message || 'Erro ao enviar convite.';
        }
      }

      return res.status(201).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        force_password_reset: usuario.force_password_reset,
        pode_criar_solicitacao_compra: usuario.pode_criar_solicitacao_compra,
        convite_enviado: conviteEnviado,
        convite_erro: conviteErro
      });

    } catch (error) {
      console.error(error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Erro ao criar usuario',
          code: error.code,
          details: error.details
        });
      }
      return res.status(500).json({
        error: 'Erro ao criar usuário'
      });
    }
  },

  // =====================================================
  // ATUALIZAR USUÁRIO
  // =====================================================
  async update(req, res) {
    try {

      const { id } = req.params;

      const {
        nome,
        email,
        senha,
        cargo_id,
        setor_id,
        perfil,
        obras = [],
        ativo,
        pode_criar_solicitacao_compra
      } = req.body;

      const emailNormalizado = normalizarEmail(email);

      const usuario = await User.findByPk(id);

      if (!usuario) {
        return res.status(404).json({
          error: 'Usuário não encontrado'
        });
      }

      if (!podeGerenciarUsuarioAlvo(req, usuario)) {
        return res.status(404).json({
          error: 'Usuário não encontrado'
        });
      }

      if (!podeDefinirPerfilSuperadmin(req, perfil)) {
        return res.status(403).json({
          error: 'Apenas SUPERADMIN pode definir perfil SUPERADMIN'
        });
      }

      const dadosUpdate = {
        nome,
        email: emailNormalizado,
        cargo_id,
        setor_id,
        perfil,
        ativo,
        pode_criar_solicitacao_compra: definirPermissaoSolicitacaoCompra(
          perfil,
          pode_criar_solicitacao_compra,
          usuario.pode_criar_solicitacao_compra
        )
      };

      if (emailNormalizado) {
        const existeOutro = await User.findOne({
          where: {
            id: { [Op.ne]: id },
            [Op.or]: [
              { email: emailNormalizado },
              where(fn('LOWER', fn('TRIM', col('email'))), emailNormalizado)
            ]
          }
        });

        if (existeOutro) {
          return res.status(400).json({
            error: 'Email já cadastrado'
          });
        }
      }

      // 🔐 Troca senha se enviada
      if (senha && senha.trim()) {
        assertStrongPassword(senha);
        dadosUpdate.senha = await bcrypt.hash(senha, 10);
        dadosUpdate.force_password_reset = false;
        dadosUpdate.password_reset_token_hash = null;
        dadosUpdate.password_reset_expires_at = null;
        dadosUpdate.password_changed_at = new Date();
      }

      await usuario.update(dadosUpdate);

      // 🔁 Atualizar obras
      await UsuarioObra.destroy({
        where: { user_id: id }
      });

      for (const obra_id of obras) {
        await UsuarioObra.create({
          user_id: id,
          obra_id,
          perfil
        });
      }

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'USER_UPDATED',
        recursoTipo: 'USER',
        recursoId: usuario.id,
        status: 'SUCCESS',
        descricao: 'Usuario atualizado',
        metadata: {
          perfil,
          setor_id,
          ativo,
          obras
        }
      });

      return res.json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        ativo: usuario.ativo,
        pode_criar_solicitacao_compra: usuario.pode_criar_solicitacao_compra
      });

    } catch (error) {
      console.error(error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Erro ao atualizar usuario',
          code: error.code,
          details: error.details
        });
      }
      return res.status(500).json({
        error: 'Erro ao atualizar usuário'
      });
    }
  },

  // =====================================================
  // ATIVAR USUÁRIO
  // =====================================================
  async ativar(req, res) {
    try {
      const usuario = await User.findByPk(req.params.id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      if (!podeGerenciarUsuarioAlvo(req, usuario)) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      await usuario.update({ ativo: true });

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'USER_ACTIVATED',
        recursoTipo: 'USER',
        recursoId: usuario.id,
        status: 'SUCCESS',
        descricao: 'Usuario ativado'
      });

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao ativar usuário'
      });
    }
  },

  // =====================================================
  // DESATIVAR USUÁRIO
  // =====================================================
  async desativar(req, res) {
    try {
      const usuario = await User.findByPk(req.params.id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      if (!podeGerenciarUsuarioAlvo(req, usuario)) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      await usuario.update({ ativo: false });

      await registrarEventoSeguranca({
        req,
        usuarioId: req.user?.id || null,
        tipoEvento: 'USER_DEACTIVATED',
        recursoTipo: 'USER',
        recursoId: usuario.id,
        status: 'SUCCESS',
        descricao: 'Usuario desativado'
      });

      return res.sendStatus(204);

    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao desativar usuário'
      });
    }
  },

  async importarMassa(req, res) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Envie um arquivo CSV no campo "file".' });
      }

      const nomeArquivo = String(file.originalname || '').toLowerCase();
      if (!nomeArquivo.endsWith('.csv')) {
        return res.status(400).json({ error: 'Formato inválido. Utilize a planilha modelo em CSV.' });
      }

      const { headers, rows } = parseCsv(file.buffer.toString('utf8'));
      if (rows.length > env.csvImportMaxRows) {
        return res.status(400).json({
          error: `O arquivo excede o limite de ${env.csvImportMaxRows} linhas para importacao.`
        });
      }
      if (!headers.length) {
        return res.status(400).json({ error: 'Arquivo CSV vazio ou sem cabeçalho.' });
      }

      const headerMap = headers.map(normalizarCabecalho);
      const idxNome = headerMap.findIndex(h => h === 'nome');
      const idxEmail = headerMap.findIndex(h => h === 'email');
      const idxSetor = headerMap.findIndex(h => h === 'setor');
      const idxObras = headerMap.findIndex(h => h === 'obras');
      const idxSenha = headerMap.findIndex(h => h === 'senha');
      const idxPerfil = headerMap.findIndex(h => h === 'perfil');
      const idxPermissaoCompras = headerMap.findIndex(
        h => h === 'pode_criar_solicitacao_compra' || h === 'permite_solicitacao_compra'
      );

      const obrigatorios = [
        ['Nome', idxNome],
        ['Email', idxEmail],
        ['Setor', idxSetor]
      ];
      const faltando = obrigatorios.filter(([, idx]) => idx < 0).map(([nome]) => nome);
      if (faltando.length > 0) {
        return res.status(400).json({
          error: `Cabeçalhos obrigatórios ausentes: ${faltando.join(', ')}`
        });
      }

      const [setores, obras] = await Promise.all([
        Setor.findAll({ attributes: ['id', 'nome', 'codigo'] }),
        Obra.findAll({ attributes: ['id', 'nome', 'codigo'] })
      ]);

      const setorMap = new Map();
      setores.forEach(s => {
        setorMap.set(normalizarTexto(s.nome), s);
        setorMap.set(normalizarTexto(s.codigo), s);
        setorMap.set(String(s.id), s);
      });

      const obraMap = new Map();
      obras.forEach(o => {
        obraMap.set(normalizarTexto(o.codigo), o);
        obraMap.set(normalizarTexto(o.nome), o);
        obraMap.set(String(o.id), o);
        if (o.codigo && o.nome) {
          obraMap.set(normalizarTexto(`${o.codigo} - ${o.nome}`), o);
        }
      });

      const resultado = {
        total_linhas: rows.length,
        importados: 0,
        ignorados: 0,
        convites_enviados: 0,
        convites_erros: [],
        erros: []
      };

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const linha = i + 2;

        const nome = String(row[idxNome] ?? '').trim();
        const email = String(row[idxEmail] ?? '').trim().toLowerCase();
        const setorRaw = String(row[idxSetor] ?? '').trim();
        const obrasRaw = String(idxObras >= 0 ? (row[idxObras] ?? '') : '').trim();
        const senhaRaw = String(idxSenha >= 0 ? (row[idxSenha] ?? '') : '').trim();
        const perfilRaw = idxPerfil >= 0 ? String(row[idxPerfil] ?? '').trim() : '';
        const permissaoComprasRaw =
          idxPermissaoCompras >= 0 ? String(row[idxPermissaoCompras] ?? '').trim() : '';
        const perfil = (perfilRaw || 'USUARIO').toUpperCase();
        const perfisPermitidos = new Set(['USUARIO', 'ESTAGIARIO', 'ADMIN', 'ADMINISTRADOR', 'SUPERADMIN']);

        if (![nome, email, setorRaw, senhaRaw, obrasRaw].some(Boolean)) {
          resultado.ignorados += 1;
          continue;
        }

        if (!nome || !email || !setorRaw) {
          resultado.erros.push({
            linha,
            error: 'Campos obrigatorios invalidos (Nome, Email, Setor).'
          });
          continue;
          resultado.erros.push({
            linha,
            error: 'Campos obrigatórios inválidos (Nome, Email, Cargo, Setor, Senha).'
          });
          continue;
        }

        if (!perfisPermitidos.has(perfil)) {
          resultado.erros.push({
            linha,
            error: `Perfil inválido: ${perfil}. Use USUARIO, ESTAGIARIO, ADMIN, ADMINISTRADOR ou SUPERADMIN.`
          });
          continue;
        }

        if (!podeDefinirPerfilSuperadmin(req, perfil)) {
          resultado.erros.push({
            linha,
            error: 'Apenas SUPERADMIN pode importar usuário com perfil SUPERADMIN.'
          });
          continue;
        }

        const setor = setorMap.get(normalizarTexto(setorRaw));
        if (!setor) {
          resultado.erros.push({
            linha,
            error: `Setor nao encontrado (${setorRaw}).`
          });
          continue;
          resultado.erros.push({
            linha,
            error: `Cargo ou setor não encontrado (${cargoRaw} / ${setorRaw}).`
          });
          continue;
        }

        const emailExistente = await User.findOne({ where: { email } });
        if (emailExistente) {
          resultado.erros.push({
            linha,
            error: `Email já cadastrado: ${email}`
          });
          continue;
        }

        const obrasTokens = splitObrasCell(obrasRaw);
        const obrasIds = [];
        let obraInvalida = null;
        for (const token of obrasTokens) {
          const obra = obraMap.get(normalizarTexto(token));
          if (!obra) {
            obraInvalida = token;
            break;
          }
          if (!obrasIds.includes(obra.id)) {
            obrasIds.push(obra.id);
          }
        }
        if (obraInvalida) {
          resultado.erros.push({
            linha,
            error: `Obra não encontrada: ${obraInvalida}`
          });
          continue;
        }

        let passwordPayload;
        try {
          passwordPayload = await createUserPasswordPayload({
            senha: senhaRaw,
            forceInvite: true
          });
        } catch (error) {
          resultado.erros.push({
            linha,
            error: error.message || 'Senha invalida.'
          });
          continue;
        }

        const usuario = await User.create({
          nome,
          email,
          senha: passwordPayload.senhaHash,
          cargo_id: null,
          setor_id: setor.id,
          perfil,
          ativo: true,
          force_password_reset: passwordPayload.forcePasswordReset,
          password_changed_at: passwordPayload.passwordChangedAt,
          pode_criar_solicitacao_compra: definirPermissaoSolicitacaoCompra(
            perfil,
            permissaoComprasRaw,
            false
          )
        });

        for (const obra_id of obrasIds) {
          await UsuarioObra.create({
            user_id: usuario.id,
            obra_id,
            perfil
          });
        }

        try {
          await sendPasswordResetEmail(usuario, { req, isInvite: true });
          resultado.convites_enviados += 1;
        } catch (emailError) {
          console.error(emailError);
          resultado.convites_erros.push({
            linha,
            id: usuario.id,
            email: usuario.email,
            error: emailError.message || 'Erro ao enviar convite.'
          });
        }

        resultado.importados += 1;
      }

      return res.json(resultado);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao importar usuários em massa' });
    }
  },

  // =====================================================
  // ALTERAR SENHA DO USUARIO LOGADO
  // =====================================================
  async alterarSenha(req, res) {
    try {
      const usuarioId = req.user.id;
      const { senha_atual, senha_nova } = req.body;

      if (!senha_atual || !senha_nova) {
        return res.status(400).json({
          error: 'Senha atual e nova senha sao obrigatorias'
        });
      }

      const usuario = await User.findByPk(usuarioId);

      if (!usuario) {
        return res.status(404).json({
          error: 'Usuario nao encontrado'
        });
      }

      const ok = await bcrypt.compare(
        String(senha_atual),
        String(usuario.senha)
      );

      if (!ok) {
        await registrarEventoSeguranca({
          req,
          usuarioId,
          tipoEvento: 'PASSWORD_CHANGE_FAILURE',
          recursoTipo: 'USER',
          recursoId: usuarioId,
          status: 'DENIED',
          descricao: 'Tentativa de troca de senha com senha atual invalida'
        });
        return res.status(400).json({
          error: 'Senha atual incorreta'
        });
      }

      assertStrongPassword(senha_nova);

      const senhaHash = await bcrypt.hash(senha_nova, 10);
      await usuario.update({
        senha: senhaHash,
        force_password_reset: false,
        password_reset_token_hash: null,
        password_reset_expires_at: null,
        password_changed_at: new Date()
      });

      await registrarEventoSeguranca({
        req,
        usuarioId,
        tipoEvento: 'PASSWORD_CHANGED',
        recursoTipo: 'USER',
        recursoId: usuarioId,
        status: 'SUCCESS',
        descricao: 'Senha alterada com sucesso'
      });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: error.message || 'Erro ao alterar senha',
          code: error.code,
          details: error.details
        });
      }
      return res.status(500).json({
        error: 'Erro ao alterar senha'
      });
    }
  },

  async enviarConvite(req, res) {
    try {
      const usuario = await User.findByPk(req.params.id);
      if (!usuario || !podeGerenciarUsuarioAlvo(req, usuario)) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }

      if (usuario.ativo === false) {
        return res.status(400).json({ error: 'Usuario inativo nao pode receber link de senha.' });
      }

      const result = await sendPasswordResetEmail(usuario, { req, isInvite: true });
      return res.json({
        ok: true,
        ...result,
        message: 'Link enviado para o email do usuario.'
      });
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao enviar link de senha'
      });
    }
  },

  async forcarResetSenhas(req, res) {
    try {
      if (String(req.user?.perfil || '').trim().toUpperCase() !== 'SUPERADMIN') {
        return res.status(403).json({ error: 'Apenas SUPERADMIN pode forcar redefinicao em massa.' });
      }

      const usuarios = await User.findAll({
        where: { ativo: true },
        order: [['nome', 'ASC']]
      });
      const resultado = {
        total: usuarios.length,
        enviados: 0,
        erros: []
      };

      for (const usuario of usuarios) {
        try {
          await sendPasswordResetEmail(usuario, { req, isInvite: false });
          resultado.enviados += 1;
        } catch (emailError) {
          console.error(emailError);
          resultado.erros.push({
            id: usuario.id,
            email: usuario.email,
            error: emailError.message || 'Erro ao enviar email.'
          });
        }
      }

      return res.json({ ok: true, ...resultado });
    } catch (error) {
      console.error(error);
      return res.status(error.statusCode || 500).json({
        error: error.message || 'Erro ao forcar redefinicao de senhas'
      });
    }
  }

};
