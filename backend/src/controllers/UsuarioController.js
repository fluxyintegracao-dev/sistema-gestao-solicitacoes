const bcrypt = require('bcryptjs');
const { Op, fn, col, where } = require('sequelize');

const {
  User,
  Cargo,
  Setor,
  Obra,
  UsuarioObra,
  UsuarioSetor
} = require('../models');
const {
  normalizarIdInteiro,
  extrairSetoresUsuarioSemConsulta,
  obterIdsSetoresUsuario
} = require('../services/usuariosSetores');

function podeDefinirPerfilSuperadmin(req, perfilDestino) {
  const perfilSolicitante = String(req.user?.perfil || '').trim().toUpperCase();
  const perfilNormalizado = String(perfilDestino || '').trim().toUpperCase();
  if (perfilNormalizado !== 'SUPERADMIN') return true;
  return perfilSolicitante === 'SUPERADMIN';
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
  if (perfilNormalizado === 'SUPERADMIN' || perfilNormalizado === 'ADMIN') {
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

function coletarIdsSetoresPayload({ setor_id, setores_ids }) {
  const ids = [];

  function adicionar(valor) {
    if (Array.isArray(valor)) {
      valor.forEach(item => adicionar(item));
      return;
    }

    const id = normalizarIdInteiro(valor);
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  }

  adicionar(setor_id);
  adicionar(setores_ids);

  return ids;
}

async function resolverSetoresPayload({ setor_id, setores_ids }, setorPrincipalFallback = null) {
  const setorPrincipalId =
    normalizarIdInteiro(setor_id) ||
    normalizarIdInteiro(setorPrincipalFallback);

  if (!setorPrincipalId) {
    const error = new Error('Setor principal e obrigatorio');
    error.status = 400;
    throw error;
  }

  const setoresIds = coletarIdsSetoresPayload({
    setor_id: setorPrincipalId,
    setores_ids
  });

  if (!setoresIds.includes(setorPrincipalId)) {
    setoresIds.unshift(setorPrincipalId);
  }

  const setores = await Setor.findAll({
    where: { id: { [Op.in]: setoresIds } },
    attributes: ['id']
  });
  const encontrados = new Set(setores.map(setor => Number(setor.id)));
  const faltando = setoresIds.filter(id => !encontrados.has(Number(id)));

  if (faltando.length > 0) {
    const error = new Error(`Setor nao encontrado: ${faltando.join(', ')}`);
    error.status = 400;
    throw error;
  }

  return {
    setorPrincipalId,
    setoresIds: Array.from(new Set(setoresIds))
  };
}

async function sincronizarSetoresUsuario(userId, setoresIds) {
  const idsUnicos = Array.from(new Set(
    (Array.isArray(setoresIds) ? setoresIds : [])
      .map(normalizarIdInteiro)
      .filter(Boolean)
  ));

  await UsuarioSetor.destroy({ where: { user_id: userId } });

  if (idsUnicos.length === 0) return;

  await UsuarioSetor.bulkCreate(
    idsUnicos.map(setorId => ({
      user_id: userId,
      setor_id: setorId
    })),
    { ignoreDuplicates: true }
  );
}

function includeSetoresUsuario() {
  return {
    model: UsuarioSetor,
    as: 'setoresVinculos',
    attributes: ['id', 'user_id', 'setor_id'],
    include: [
      {
        model: Setor,
        as: 'setor',
        attributes: ['id', 'nome', 'codigo', 'ativo']
      }
    ]
  };
}

function formatarUsuarioResposta(usuario) {
  const plain = typeof usuario?.toJSON === 'function' ? usuario.toJSON() : (usuario || {});
  const setores = extrairSetoresUsuarioSemConsulta(plain);

  return {
    ...plain,
    setores,
    setores_ids: setores.map(setor => setor.id).filter(Boolean)
  };
}

module.exports = {

  // =====================================================
  // LISTAR USUÁRIOS
  // =====================================================
  async index(req, res) {
    try {

      const usuarios = await User.findAll({
        attributes: { exclude: ['senha'] }, // 🔐 nunca retornar senha
        include: [
          {
            model: Cargo,
            as: 'cargoInfo'
          },
          {
            model: Setor,
            as: 'setor'
          },
          includeSetoresUsuario(),
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

      return res.json(usuarios.map(formatarUsuarioResposta));

    } catch (error) {
      if (error?.status) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao listar usuários'
      });
    }
  },

  async opcoesAtribuicao(req, res) {
    try {
      const setoresIds = await obterIdsSetoresUsuario(req.user);

      if (setoresIds.length === 0) {
        return res.status(400).json({ error: 'Usuario sem setor vinculado' });
      }

      const vinculosSetores = await UsuarioSetor.findAll({
        where: { setor_id: { [Op.in]: setoresIds } },
        attributes: ['user_id']
      });
      const usuariosIdsVinculados = vinculosSetores
        .map(vinculo => normalizarIdInteiro(vinculo.user_id))
        .filter(Boolean);

      const usuarios = await User.findAll({
        attributes: { exclude: ['senha'] },
        where: {
          ativo: true,
          [Op.or]: [
            { setor_id: { [Op.in]: setoresIds } },
            { id: { [Op.in]: usuariosIdsVinculados.length ? usuariosIdsVinculados : [-1] } }
          ]
        },
        include: [
          {
            model: Setor,
            as: 'setor'
          },
          includeSetoresUsuario(),
          {
            model: UsuarioObra,
            as: 'vinculos',
            attributes: ['id', 'obra_id', 'user_id']
          }
        ],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios.map(formatarUsuarioResposta));
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao listar usuarios para atribuicao'
      });
    }
  },

  async listaPublica(req, res) {
    try {
      const usuarios = await User.findAll({
        where: {
          ativo: true
        },
        attributes: ['id', 'nome', 'email'],
        order: [['nome', 'ASC']]
      });

      return res.json(usuarios);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao buscar usuarios'
      });
    }
  },

  // =====================================================
  // DETALHE USUÃRIO
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
          includeSetoresUsuario(),
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
        return res.status(404).json({ error: 'UsuÃ¡rio nÃ£o encontrado' });
      }

      return res.json(formatarUsuarioResposta(usuario));
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao buscar usuÃ¡rio'
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
        setores_ids = [],
        perfil,
        obras = [],
        pode_criar_solicitacao_compra
      } = req.body;

      const emailNormalizado = normalizarEmail(email);

      if (!nome || !emailNormalizado || !senha || !perfil) {
        return res.status(400).json({
          error: 'Nome, email, senha e perfil são obrigatórios'
        });
      }

      if (!podeDefinirPerfilSuperadmin(req, perfil)) {
        return res.status(403).json({
          error: 'Apenas SUPERADMIN pode criar usuario com perfil SUPERADMIN'
        });
      }

      const { setorPrincipalId, setoresIds } = await resolverSetoresPayload({
        setor_id,
        setores_ids
      });

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
      const senhaHash = await bcrypt.hash(senha, 10);

      const usuario = await User.create({
        nome,
        email: emailNormalizado,
        senha: senhaHash,
        cargo_id,
        setor_id: setorPrincipalId,
        perfil,
        ativo: true,
        pode_criar_solicitacao_compra: definirPermissaoSolicitacaoCompra(
          perfil,
          pode_criar_solicitacao_compra,
          false
        )
      });

      await sincronizarSetoresUsuario(usuario.id, setoresIds);

      // 🔗 Vínculo obras
      for (const obra_id of obras) {
        await UsuarioObra.create({
          user_id: usuario.id,
          obra_id,
          perfil
        });
      }

      return res.status(201).json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        setor_id: usuario.setor_id,
        setores_ids: setoresIds,
        ativo: usuario.ativo,
        pode_criar_solicitacao_compra: usuario.pode_criar_solicitacao_compra
      });

    } catch (error) {
      if (error?.status) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(error);
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
        setores_ids = [],
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

      if (!podeDefinirPerfilSuperadmin(req, perfil)) {
        return res.status(403).json({
          error: 'Apenas SUPERADMIN pode definir perfil SUPERADMIN'
        });
      }

      const { setorPrincipalId, setoresIds } = await resolverSetoresPayload(
        { setor_id, setores_ids },
        usuario.setor_id
      );

      const dadosUpdate = {
        nome,
        email: emailNormalizado,
        cargo_id,
        setor_id: setorPrincipalId,
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
            error: 'Email jÃ¡ cadastrado'
          });
        }
      }

      // 🔐 Troca senha se enviada
      if (senha && senha.trim()) {
        dadosUpdate.senha = await bcrypt.hash(senha, 10);
      }

      await usuario.update(dadosUpdate);
      await sincronizarSetoresUsuario(id, setoresIds);

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

      return res.json({
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        setor_id: usuario.setor_id,
        setores_ids: setoresIds,
        ativo: usuario.ativo,
        pode_criar_solicitacao_compra: usuario.pode_criar_solicitacao_compra
      });

    } catch (error) {
      if (error?.status) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error(error);
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

      await User.update(
        { ativo: true },
        { where: { id: req.params.id } }
      );

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

      await User.update(
        { ativo: false },
        { where: { id: req.params.id } }
      );

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
      if (!headers.length) {
        return res.status(400).json({ error: 'Arquivo CSV vazio ou sem cabeçalho.' });
      }

      const headerMap = headers.map(normalizarCabecalho);
      const idxNome = headerMap.findIndex(h => h === 'nome');
      const idxEmail = headerMap.findIndex(h => h === 'email');
      const idxCargo = headerMap.findIndex(h => h === 'cargo');
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
        ['Cargo', idxCargo],
        ['Setor', idxSetor],
        ['Senha', idxSenha]
      ];
      const faltando = obrigatorios.filter(([, idx]) => idx < 0).map(([nome]) => nome);
      if (faltando.length > 0) {
        return res.status(400).json({
          error: `Cabeçalhos obrigatórios ausentes: ${faltando.join(', ')}`
        });
      }

      const [cargos, setores, obras] = await Promise.all([
        Cargo.findAll({ attributes: ['id', 'nome'] }),
        Setor.findAll({ attributes: ['id', 'nome', 'codigo'] }),
        Obra.findAll({ attributes: ['id', 'nome', 'codigo'] })
      ]);

      const cargoMap = new Map();
      cargos.forEach(c => {
        cargoMap.set(normalizarTexto(c.nome), c);
        cargoMap.set(String(c.id), c);
      });

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
        erros: []
      };

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const linha = i + 2;

        const nome = String(row[idxNome] ?? '').trim();
        const email = String(row[idxEmail] ?? '').trim().toLowerCase();
        const cargoRaw = String(row[idxCargo] ?? '').trim();
        const setorRaw = String(row[idxSetor] ?? '').trim();
        const obrasRaw = String(idxObras >= 0 ? (row[idxObras] ?? '') : '').trim();
        const senhaRaw = String(row[idxSenha] ?? '').trim();
        const perfilRaw = idxPerfil >= 0 ? String(row[idxPerfil] ?? '').trim() : '';
        const permissaoComprasRaw =
          idxPermissaoCompras >= 0 ? String(row[idxPermissaoCompras] ?? '').trim() : '';
        const perfil = (perfilRaw || 'USUARIO').toUpperCase();
        const perfisPermitidos = new Set(['USUARIO', 'ADMIN', 'SUPERADMIN']);

        if (![nome, email, cargoRaw, setorRaw, senhaRaw, obrasRaw].some(Boolean)) {
          resultado.ignorados += 1;
          continue;
        }

        if (!nome || !email || !cargoRaw || !setorRaw || !senhaRaw) {
          resultado.erros.push({
            linha,
            error: 'Campos obrigatórios inválidos (Nome, Email, Cargo, Setor, Senha).'
          });
          continue;
        }

        if (!perfisPermitidos.has(perfil)) {
          resultado.erros.push({
            linha,
            error: `Perfil inválido: ${perfil}. Use USUARIO, ADMIN ou SUPERADMIN.`
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

        const cargo = cargoMap.get(normalizarTexto(cargoRaw));
        const setoresTokens = splitObrasCell(setorRaw);
        const setoresIds = [];
        let setorInvalido = null;
        for (const token of setoresTokens) {
          const setor = setorMap.get(normalizarTexto(token));
          if (!setor) {
            setorInvalido = token;
            break;
          }
          if (!setoresIds.includes(setor.id)) {
            setoresIds.push(setor.id);
          }
        }

        if (!cargo || setorInvalido || setoresIds.length === 0) {
          resultado.erros.push({
            linha,
            error: `Cargo ou setor nao encontrado (${cargoRaw} / ${setorInvalido || setorRaw}).`
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

        const senhaHash = await bcrypt.hash(senhaRaw, 10);
        const usuario = await User.create({
          nome,
          email,
          senha: senhaHash,
          cargo_id: cargo.id,
          setor_id: setoresIds[0],
          perfil,
          ativo: true,
          pode_criar_solicitacao_compra: definirPermissaoSolicitacaoCompra(
            perfil,
            permissaoComprasRaw,
            false
          )
        });

        await sincronizarSetoresUsuario(usuario.id, setoresIds);

        for (const obra_id of obrasIds) {
          await UsuarioObra.create({
            user_id: usuario.id,
            obra_id,
            perfil
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
        return res.status(400).json({
          error: 'Senha atual incorreta'
        });
      }

      const senhaHash = await bcrypt.hash(senha_nova, 10);
      await usuario.update({ senha: senhaHash });

      return res.sendStatus(204);
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        error: 'Erro ao alterar senha'
      });
    }
  }

};
