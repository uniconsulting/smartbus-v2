# Стартовые данные для VPS

Для первой установки понадобится OpenSSL 3 и файл `smartbus-private-key.pem` из закрытого комплекта. Передайте ключ администратору VPS по защищённому каналу и сохраните на сервере в `/root/smartbus-handoff/` с правами `0600`. Каталогу нужны права `0700`.

Выполните из корня клонированного репозитория под root:

```sh
(
  set -eu
  umask 077
  out=/root/smartbus-handoff
  tmp=$(mktemp "$out/.smartbus-initial.XXXXXXXX")
  trap 'rm -f "$tmp"' EXIT
  openssl cms -decrypt -binary -inform DER \
    -in deploy/smartbus-initial-data.tar.gz.cms \
    -inkey "$out/smartbus-private-key.pem" \
    -out "$tmp"
  tar -tzf "$tmp" >/dev/null
  mv "$tmp" "$out/smartbus-initial-data.tar.gz"
)
```

Готовый файл `/root/smartbus-handoff/smartbus-initial-data.tar.gz` используется на шаге «Первая установка». [Развёртывание на VPS](../docs/vps-handoff.md#первая-установка)
