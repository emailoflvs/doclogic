# ============================================================
# Email To Client Configuration
# ============================================================
# Rules for formatting autoreply emails sent to clients
# Similar structure to emailOrder.py
# ============================================================

# Subject template
# Placeholders: {name}
SUBJECT_TEMPLATE = "DocLogic: запрос получен"

# Header From format
# Placeholders: {email}
# Example: "DocLogic <notifications@doclogic.odoo.com>"
FROM_TEMPLATE = "DocLogic автоматизация <{email}>"

# Text body template (use "\n" for newlines)
# Placeholders: {name}
TEXT_TEMPLATE = """Здравствуйте, {name}!
Мы рады получить Ваш запрос ао автоматизации докумнтооборота.
Менеджер DocLogic свяжется с Вами в самое ближайшее время.
Для того, чтоб разговор сразу был более продуктивным, напишите пожалуйста о том, чем занимается Ваша компания и что именно нам нужно автоматизировать.
По возможность, приложите пожалуйста 1–3 примера накладных.

С уважением,
Компания "DocLogic\""""

# HTML body template
# Placeholders (HTML-escaped): {nameHtml}, {siteUrl}
# {siteUrl} will be replaced with actual site URL (if SITE_URL env var is set, otherwise placeholder)
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocLogic: запрос получен</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; line-height: 1.6; color: #1e293b;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <a href="{siteUrl}" style="display: inline-flex; align-items: center; text-decoration: none; color: #1e293b;">
                      <span style="display: inline-flex; height: 40px; width: 40px; align-items: center; justify-content: center; border-radius: 12px; background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 14px; margin-right: 12px;">DL</span>
                      <span style="font-weight: 600; font-size: 18px;">DocLogic</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #0f172a;">Здравствуйте, {nameHtml}!</h1>

              <p style="margin: 0 0 16px 0; color: #475569; font-size: 16px;">
                Мы рады получить Ваш запрос по автоматизации документооборота.
              </p>

              <p style="margin: 0 0 16px 0; color: #475569; font-size: 16px;">
                Менеджер DocLogic свяжется с Вами в самое ближайшее время.
              </p>

              <p style="margin: 0 0 24px 0; color: #475569; font-size: 16px;">
                Для того, чтобы разговор сразу был более продуктивным, напишите пожалуйста о том, чем занимается Ваша компания и что именно нам нужно автоматизировать.
              </p>

              <p style="margin: 0 0 32px 0; color: #475569; font-size: 16px;">
                По возможности, приложите пожалуйста 1–3 примера накладных.
              </p>

              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background-color: #0f172a; border-radius: 12px;">
                    <a href="{siteUrl}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px;">Посетить сайт DocLogic</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 16px 16px;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 14px; font-weight: 500;">С уважением,</p>
              <p style="margin: 0; color: #64748b; font-size: 14px;">Компания "DocLogic"</p>
              <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 12px;">
                <a href="{siteUrl}" style="color: #64748b; text-decoration: none;">{siteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

# Available placeholders documentation:
# TEXT template: {name}
# HTML template: {nameHtml} (already HTML-escaped), {siteUrl} (website URL from SITE_URL env var)

