# DocLogic Landing — self-hosted (Docker)

## Быстрый старт
1) Скопируйте env:
```bash
cp api/.env.example api/.env
```

2) Заполните `api/.env` (минимум: SMTP_* и EMAIL_TO, чтобы получать заявки).
   Настройки письма (From/тема/шаблоны) — через переменные `LEAD_EMAIL_*` в этом же файле.

3) Настройте /etc/hosts (для доступа по домену doclogic_gpt5):
```bash
sudo ./setup-hosts.sh
```

4) Запуск:
```bash
docker compose up -d --build
```

Открыть сайт:
- `http://localhost:8085/` (напрямую)
- `http://doclogic_gpt5:8085/` (через домен, после настройки /etc/hosts)

Healthcheck: `http://localhost:8085/health` или `http://doclogic_gpt5:8085/health`

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
