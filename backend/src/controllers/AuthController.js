const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op, fn, col, where } = require('sequelize');
const { User, Setor, UsuarioSetor } = require('../models');
const { extrairSetoresUsuarioSemConsulta } = require('../services/usuariosSetores');

const JWT_SECRET = 'segredo_super_secreto';

module.exports = {

  async login(req, res) {
    try {

      const emailNormalizado = String(req.body?.email || '').trim().toLowerCase();
      const senha = req.body?.senha;

      if (!emailNormalizado || !senha) {
        return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
      }

      const user = await User.findOne({
        where: {
          [Op.or]: [
            { email: emailNormalizado },
            where(fn('LOWER', fn('TRIM', col('email'))), emailNormalizado)
          ]
        },
        include: [
          {
            model: Setor,
            as: 'setor',
            attributes: ['id', 'nome', 'codigo']
          },
          {
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
          }
        ]
      });

      if (!user)
        return res.status(401).json({ error: 'Usuário não encontrado' });

      if (!user.ativo)
        return res.status(403).json({ error: 'Usuario desativado' });

      if (!user.senha)
        return res.status(401).json({ error: 'Usuário sem senha cadastrada' });

      const ok = await bcrypt.compare(
        String(senha),
        String(user.senha)
      );

      if (!ok)
        return res.status(401).json({ error: 'Senha inválida' });

      const setores = extrairSetoresUsuarioSemConsulta(user);
      const setoresIds = setores.map(setor => setor.id).filter(Boolean);

      const token = jwt.sign(
        {
          id: user.id,
          perfil: user.perfil,
          area: user.setor?.codigo || null,
          setor_id: user.setor_id,
          setores_ids: setoresIds,
          setores
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          perfil: user.perfil,
          setor_id: user.setor_id,
          setor: user.setor,
          setores_ids: setoresIds,
          setores,
          pode_criar_solicitacao_compra: Boolean(user.pode_criar_solicitacao_compra),
          pode_enviar_qualquer_setor: Boolean(user.pode_enviar_qualquer_setor)
        }
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro no login' });
    }
  }

};
