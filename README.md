# DocLogic Landing — self-hosted (Docker)

## Быстрый старт
1) Скопируйте env:
```bash
cp api/.env.example api/.env
```

2) Заполните `api/.env` (минимум: SMTP_* и EMAIL_TO, чтобы получать заявки).
   Настройки письма (From/тема/шаблоны) — через переменные `LEAD_EMAIL_*` в этом же файле.

3) Настройте hosts, чтобы открывать `http://doclogic_v7:8087/`:
- **WSL/Linux:** из каталога проекта выполните (попросит пароль sudo):
  ```bash
  sudo /home/lvs/server/doclogic_v7/setup-hosts.sh
  ```
  или: `chmod +x setup-hosts.sh && ./setup-hosts.sh`
- **Windows (Chrome/Edge на Windows):** запустите **от имени администратора**:
  - `setup-hosts-windows.bat` (двойной клик → ПКМ → «Запуск от имени администратора»)
  - или `setup-hosts-windows.ps1` в PowerShell (админ)
  - или вручную: добавьте в `C:\Windows\System32\drivers\etc\hosts` строку `127.0.0.1 doclogic_v7`

4) Запуск:
```bash
docker compose up -d --build
```

Открыть сайт:
- `http://localhost:8087/` (напрямую)
- `http://doclogic_v7:8087/` (через домен, после настройки /etc/hosts)

Healthcheck: `http://localhost:8087/health` или `http://doclogic_v7:8087/health`

## Каналы уведомлений
- Email: через SMTP (обязательно заполнить SMTP_* + EMAIL_TO)
- Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
- : опционально через Twilio (TWILIO_* + WHATSAPP_TO)

## Где править тексты
`web/src/pages/index.astro`


## Страница спасибо
После успешной отправки формы пользователь перенаправляется на `/thanks/`.

## Автописьмо клиенту
Если настроен SMTP, API отправляет подтверждение на email клиента (автоответ) без упоминания демо.


## Визуал в Hero
Файл: `web/public/assets/hero-visual.svg` (можно заменить на PNG/JPG).
