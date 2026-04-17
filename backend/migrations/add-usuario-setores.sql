CREATE TABLE IF NOT EXISTS `usuario_setores` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `setor_id` INT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_setores_user_setor_unique` (`user_id`, `setor_id`),
  KEY `usuario_setores_setor_id_idx` (`setor_id`),
  CONSTRAINT `usuario_setores_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `usuario_setores_setor_id_fk`
    FOREIGN KEY (`setor_id`) REFERENCES `setores` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `usuario_setores` (`user_id`, `setor_id`, `createdAt`, `updatedAt`)
SELECT `id`, `setor_id`, NOW(), NOW()
FROM `users`
WHERE `setor_id` IS NOT NULL;
