const db = require('../../models');
const gerarCodigo = require('./gerarCodigo');

module.exports = async function criarSolicitacao({
  obra_id,
  tipo_solicitacao_id,
  descricao,
  valor,
  usuario
}) {
  // 1. Verificar vÃ­nculo usuÃ¡rio-obra
  const vinculo = await db.UsuarioObra.findOne({
    where: {
      user_id: usuario.id,
      obra_id
    }
  });

  if (!vinculo && usuario.perfil !== 'ADMIN' && usuario.perfil !== 'ADMINISTRADOR') {
    throw new Error('UsuÃ¡rio nÃ£o possui vÃ­nculo com esta obra');
  }

  // 2. Gerar cÃ³digo
  const codigo = await gerarCodigo();

  // 3. Criar solicitaÃ§Ã£o
  const solicitacao = await db.Solicitacao.create({
    codigo,
    obra_id,
    tipo_solicitacao_id,
    descricao,
    valor,
    status_global: 'Criada',
    area_responsavel: 'GEO',
    criado_por: usuario.id
  });

  // 4. Criar StatusArea inicial (GEO)
  await db.StatusArea.create({
    solicitacao_id: solicitacao.id,
    setor: 'GEO',
    status: 'Pendente de anÃ¡lise'
  });

  // 5. Criar histÃ³rico
  await db.Historico.create({
    solicitacao_id: solicitacao.id,
    usuario_responsavel_id: usuario_responsavel_id,
    setor: usuario.perfil,
    acao: 'SolicitaÃ§Ã£o criada',
    status_novo: 'Criada'
  });

  return solicitacao;
};

