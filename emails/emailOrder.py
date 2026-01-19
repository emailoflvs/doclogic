# ============================================================
# Email Order Configuration
# ============================================================
# Rules for formatting order/lead notification emails
# Originally from .env (lines 39-59)
# ============================================================

# Mode for "From" header:
# - client: try to set header From to client's email (may be rewritten by some SMTP providers)
# - system: always use system email in From (more deliverable), client email is still in Reply-To
FROM_MODE = "client"

# Header From format (only used when FROM_MODE=client)
# Placeholders: {name}, {company}, {email}
# Example: "Ivan Ivanov (ACME Corp)" <ivan@acme.com>
FROM_TEMPLATE = "{name} ({company}) <{email}>"

# Subject template
# Placeholders: {name}, {company}
SUBJECT_TEMPLATE = "DocLogic: новый запрос от {name} {company}"

# Text body template (use "\n" for newlines)
# Placeholders: {name}, {company}, {emailOrDash}, {phoneOrDash}, {messageOrDash}, {createdAt}, {ipOrDash}
TEXT_TEMPLATE = """Новый запрос DocLogic

Имя: {name}
Компания: {company}
Email: {emailOrDash}
Телефон: {phoneOrDash}

Комментарий:
{messageOrDash}

Дата: {createdAt}
IP: {ipOrDash}"""

# HTML body template
# Placeholders (HTML-escaped): {nameHtml}, {companyHtml}, {emailHtml}, {phoneHtml},
# {messageHtml}, {createdAtHtml}, {ipHtml}, {siteUrl}
# {siteUrl} will be replaced with actual site URL (if SITE_URL env var is set,
# otherwise placeholder)
# Simple, clean design without tables - optimized for reply and mobile devices
HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DocLogic: новый запрос</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5; color: #333333; font-size: 14px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <!-- Header with Logo -->
    <div style="padding: 16px 0; border-bottom: 1px solid #e0e0e0; margin-bottom: 20px;">
      <a href="{siteUrl}" style="text-decoration: none; color: #333333; display: inline-flex; align-items: center;">
        <span style="display: inline-block; width: 32px; height: 32px; background-color: #000000; color: #ffffff; text-align: center; line-height: 32px; font-weight: bold; font-size: 14px; margin-right: 8px;">DL</span>
        <span style="font-weight: 600; font-size: 16px;">DocLogic</span>
      </a>
    </div>

    <!-- Title -->
    <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #333333;">Новый запрос DocLogic</h2>

    <!-- Request Details -->
    <div style="margin-bottom: 16px;">
      <div style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="display: inline-block; width: 90px; color: #666666;">Имя:</span>
        <span style="color: #333333;">{nameHtml}</span>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="display: inline-block; width: 90px; color: #666666;">Компания:</span>
        <span style="color: #333333;">{companyHtml}</span>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="display: inline-block; width: 90px; color: #666666;">Email:</span>
        <a href="mailto:{emailHtml}" style="color: #0066cc; text-decoration: none;">{emailHtml}</a>
      </div>
      <div style="padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="display: inline-block; width: 90px; color: #666666;">Телефон:</span>
        <a href="tel:{phoneHtml}" style="color: #0066cc; text-decoration: none;">{phoneHtml}</a>
      </div>
    </div>

    <!-- Comment -->
    <div style="margin-top: 16px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #666666; font-weight: 500;">Комментарий:</p>
      <p style="margin: 0; font-size: 14px; color: #333333; line-height: 1.5; white-space: pre-wrap;">{messageHtml}</p>
    </div>

    <!-- Footer with site link -->
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0;">
      <p style="margin: 0; font-size: 12px; color: #999999;">
        <a href="{siteUrl}" style="color: #0066cc; text-decoration: none;">{siteUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>"""

# Available placeholders documentation:
# TEXT template: {name}, {company}, {email}, {phone}, {message}, {createdAt}, {ip}
#                 {emailOrDash}, {phoneOrDash}, {messageOrDash}, {ipOrDash}
# HTML template: {nameHtml}, {companyHtml}, {emailHtml}, {phoneHtml},
#                {messageHtml}, {createdAtHtml}, {ipHtml} (already HTML-escaped),
#                {siteUrl} (website URL from SITE_URL env var)
