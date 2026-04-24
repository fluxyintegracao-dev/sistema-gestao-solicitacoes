const { tableExists } = require('../src/database/schemaUtils');

module.exports = {
  async up({ sequelize }) {
    if (!(await tableExists(sequelize, 'security_event_logs'))) {
      await sequelize.query(`
        CREATE TABLE security_event_logs (
          id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
          usuario_id INT NULL,
          tipo_evento VARCHAR(120) NOT NULL,
          recurso_tipo VARCHAR(120) NULL,
          recurso_id VARCHAR(120) NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'INFO',
          descricao TEXT NULL,
          ip_origem VARCHAR(80) NULL,
          user_agent VARCHAR(255) NULL,
          metadata JSON NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_security_event_logs_usuario FOREIGN KEY (usuario_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
          KEY idx_security_event_logs_usuario (usuario_id),
          KEY idx_security_event_logs_tipo (tipo_evento),
          KEY idx_security_event_logs_recurso (recurso_tipo, recurso_id)
        )
      `);
    }
  }
};
