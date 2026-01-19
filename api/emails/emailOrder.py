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
# Placeholders (HTML-escaped): {nameHtml}, {companyHtml}, {emailHtml}, {phoneHtml}, {messageHtml}, {createdAtHtml}, {ipHtml}
HTML_TEMPLATE = """<h3>Новый запрос DocLogic</h3>
<ul>
  <li><b>Имя:</b> {nameHtml}</li>
  <li><b>Компания:</b> {companyHtml}</li>
  <li><b>Email:</b> {emailHtml}</li>
  <li><b>Телефон:</b> {phoneHtml}</li>
</ul>
<p><b>Комментарий:</b><br/>{messageHtml}</p>
<p style="color:#64748b;font-size:12px;">IP: {ipHtml} • {createdAtHtml}</p>"""

# Available placeholders documentation:
# TEXT template: {name}, {company}, {email}, {phone}, {message}, {createdAt}, {ip}
#                 {emailOrDash}, {phoneOrDash}, {messageOrDash}, {ipOrDash}
# HTML template: {nameHtml}, {companyHtml}, {emailHtml}, {phoneHtml},
#                {messageHtml}, {createdAtHtml}, {ipHtml} (already HTML-escaped)




