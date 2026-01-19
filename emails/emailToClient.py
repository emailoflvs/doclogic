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
# Placeholders (HTML-escaped): {nameHtml}
HTML_TEMPLATE = """<h2>Здравствуйте, {nameHtml}!</h2>
<p>Мы рады получить Ваш запрос по автоматизации документооборота.</p>
<p>Менеджер DocLogic свяжется с Вами в самое ближайшее время.</p>
<p>Для того, чтобы разговор сразу был более продуктивным, напишите пожалуйста о том, чем занимается Ваша компания и что именно нам нужно автоматизировать.</p>
<p>По возможности, приложите пожалуйста 1–3 примера накладных.</p>
<p>С уважением,<br/>Компания "DocLogic"</p>"""

# Available placeholders documentation:
# TEXT template: {name}
# HTML template: {nameHtml} (already HTML-escaped)

