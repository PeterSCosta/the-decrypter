#!/bin/sh
# Ativa HTTP Basic Auth se BASIC_AUTH_USER e BASIC_AUTH_PASSWORD estiverem
# definidos. Roda antes do nginx subir (padrão /docker-entrypoint.d da imagem).
set -e

AUTH_CONF=/etc/nginx/auth.conf

if [ -n "$BASIC_AUTH_USER" ] && [ -n "$BASIC_AUTH_PASSWORD" ]; then
  htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD" >/dev/null 2>&1
  printf 'auth_basic "The Decrypter";\nauth_basic_user_file /etc/nginx/.htpasswd;\n' >"$AUTH_CONF"
  echo "[entrypoint] Basic Auth ATIVADO (usuario: $BASIC_AUTH_USER)."
else
  printf 'auth_basic off;\n' >"$AUTH_CONF"
  echo "[entrypoint] Sem senha. Defina BASIC_AUTH_USER e BASIC_AUTH_PASSWORD para ativar."
fi
