# Modulo RH/DP

## Papel

RH/DP e dono do cadastro funcional de colaboradores, documentos, vinculos, competencias, importacoes, apuracoes e fechamentos. Financeiro continua dono das obrigacoes monetarias e SST continua dono dos registros de saude e seguranca.

## Regras

- colaborador deve estar vinculado a empresa e possuir identificadores consistentes;
- lotacao em obra e periodo de vigencia precisam ser rastreaveis;
- documentos privados exigem permissao e URL assinada;
- importacoes registram arquivo, linha, resultado e erro;
- apuracao por competencia possui estados de rascunho, conferencia e fechamento;
- sabados, domingos e feriados usam calendario e local de trabalho documentados;
- fechamento bloqueia edicao direta; correcao cria revisao ou reabertura auditada;
- geracao financeira usa referencia unica por colaborador, competencia e verba;
- desligamento nao apaga historico nem documentos obrigatorios.
- usuario operacional do setor OBRA acessa somente a porta `Pessoal` do modulo;
- para usuario de OBRA, listas, detalhes, solicitacoes e jornada ficam limitados as obras vinculadas em `usuarios_obras`, inclusive quando a API e chamada diretamente;
- o cadastro geral de colaboradores, documentos, importacoes, fechamentos e relatorios permanece restrito ao RH/DP e aos administradores autorizados.

## Integracoes

Empresas e Obras fornecem lotacao. Financeiro recebe obrigacoes homologadas. SST recebe colaborador, funcao e ambiente de trabalho, mas administra riscos, exames, EPI e acidentes em seu proprio dominio.

## Seguranca

Dados pessoais, documentos e remuneracao exigem menor privilegio. Exportacoes precisam respeitar escopo e ser auditadas. Logs nao devem expor conteudo sensivel.

## Mudanca segura

Testar cadastro, vinculos temporais, documentos, importacao, apuracao, fechamento, reabertura, geracao financeira, SST e relatorios.
