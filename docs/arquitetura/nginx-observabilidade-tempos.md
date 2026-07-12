# Tempos de resposta no Nginx

## Objetivo

Registrar separadamente o tempo total da requisicao no Nginx e o tempo gasto pelo backend Node.js. Isso permite distinguir lentidao de rede/proxy de lentidao no upstream sem alterar o comportamento das APIs.

## Configuracao

Crie `/etc/nginx/conf.d/fluxy_timing_log.conf` na EC2. O arquivo e carregado dentro do bloco `http` pelo Nginx padrao:

```nginx
log_format fluxy_timing '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" '
                        'rt=$request_time '
                        'uct=$upstream_connect_time '
                        'uht=$upstream_header_time '
                        'urt=$upstream_response_time';
```

No `server` ativo de `api.jrfluxy.com.br`, configure um arquivo dedicado de acesso:

```nginx
access_log /var/log/nginx/fluxy-api-access.log fluxy_timing;
```

Antes de ativar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Para acompanhar apenas requisicoes da listagem de solicitacoes:

```bash
sudo tail -f /var/log/nginx/fluxy-api-access.log | grep '/api/solicitacoes'
```

## Leitura

- `rt`: tempo total percebido pelo Nginx, em segundos.
- `uct`: tempo para conectar ao Node.js.
- `uht`: tempo ate o backend enviar os headers.
- `urt`: tempo total da resposta do backend.

Se `rt` e `urt` estiverem proximos, o tempo foi consumido principalmente no backend. Se `rt` estiver muito acima de `urt`, o custo esta no proxy, envio ao cliente ou rede. Valores `-` em campos `upstream_*` sao normais para respostas servidas diretamente pelo Nginx.

Essa instrumentacao apenas acrescenta logs. Ela nao muda timeout, cache, limite de resposta nem cancela requisicoes.
