const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = 'segredo_super_secreto';

module.exports = async (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token nao informado' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const usuario = await User.findByPk(decoded.id, {
      attributes: ['id', 'ativo']
    });

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ error: 'Usuario desativado' });
    }

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Token invalido' });
  }
};
