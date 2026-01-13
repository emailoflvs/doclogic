import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Multipart (file uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 5, fileSize: 10 * 1024 * 1024 }, // up to 10MB each
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Trust only 1 hop (nginx) to avoid permissive trust proxy
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

app.get("/health", (req, res) => res.json({ ok: true }));

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function envOr(name, fallback) {
  const v = process.env[name];
  return v == null || String(v).trim() === "" ? fallback : String(v);
}

function decodeTemplate(s) {
  // Allow using "\n" in .env to represent newlines
  return String(s).replaceAll("\\n", "\n");
}

function renderTemplate(template, vars) {
  const t = decodeTemplate(template);
  return t.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeArray(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).map((x) => x.trim()).filter(Boolean);
  return [String(v).trim()].filter(Boolean);
}

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

async function sendEmail({ subject, text, html, attachments, replyTo, lead }) {
  const transporter = buildTransporter();
  if (!transporter) return { skipped: true, reason: "SMTP_HOST not set" };

  try {
    const to = required("EMAIL_TO");
    const systemFrom = envOr("EMAIL_FROM", process.env.SMTP_USER || "no-reply@doclogic");

    const fromMode = envOr("LEAD_EMAIL_FROM_MODE", "client").toLowerCase(); // client | system
    const fromTemplate = envOr("LEAD_EMAIL_FROM_TEMPLATE", "{name} ({company}) <{email}>");

    const safeLead = lead || {};
    const clientEmail = (safeLead.email || "").trim();
    const clientName = (safeLead.name || "").trim();
    const clientCompany = (safeLead.company || "").trim();
    const clientNameCompany = `${clientName} ${clientCompany}`.trim();

    // Render template with actual values
    let fromRendered = renderTemplate(fromTemplate, {
      name: clientName,
      company: clientCompany,
      email: clientEmail,
    }).trim();

    // Clean up empty parentheses and extra spaces
    fromRendered = fromRendered
      .replace(/\s*\(\s*\)\s*/g, " ")  // Remove empty parentheses
      .replace(/\s+/g, " ")             // Collapse multiple spaces
      .trim();

    // Header From
    let from;
    let replyToFormatted;

    if (fromMode === "client" && clientEmail) {
      // Extract name part (before <email>) for proper formatting
      if (fromRendered.includes("<") && fromRendered.includes(">")) {
        const emailMatch = fromRendered.match(/<([^>]+)>/);
        const emailInTemplate = emailMatch ? emailMatch[1] : clientEmail;
        const namePart = fromRendered.replace(/<[^>]+>/, "").trim();

        // Use object format for better nodemailer compatibility
        if (namePart && namePart !== emailInTemplate) {
          from = { name: namePart, address: clientEmail };
        } else {
          from = clientEmail;
        }
      } else {
        // Template doesn't have email format, use as name
        from = { name: fromRendered || clientName, address: clientEmail };
      }

      // Reply-To uses the same template as From (LEAD_EMAIL_FROM_TEMPLATE)
      // Use the same format as From to ensure consistency
      if (fromRendered.includes("<") && fromRendered.includes(">")) {
        const namePart = fromRendered.replace(/<[^>]+>/, "").trim();
        // Use object format to match From exactly
        replyToFormatted = namePart ? { name: namePart, address: clientEmail } : clientEmail;
      } else {
        replyToFormatted = { name: fromRendered || clientName, address: clientEmail };
      }
    } else {
      from = clientNameCompany ? `${clientNameCompany} <${systemFrom}>` : systemFrom;
      replyToFormatted = clientEmail ? (clientNameCompany ? `${clientNameCompany} <${clientEmail}>` : clientEmail) : undefined;
    }

    const mailOptions = {
      from,
      to,
      subject,
      text,
      html,
      attachments: attachments || undefined,
      // Use the same template format for Reply-To as From
      replyTo: replyTo || (clientEmail ? replyToFormatted : undefined),
      // When From is client email, set envelope-from to client email for Return-Path
      ...(fromMode === "client" && clientEmail ? { envelope: { from: clientEmail, to } } : {}),
    };

    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (e) {
    // Re-throw to be caught by caller for logging
    throw e;
  }
}

async function sendEmailToLead({ toEmail, subject, text, html }) {
  const transporter = buildTransporter();
  if (!transporter) return { skipped: true, reason: "SMTP_HOST not set" };

  try {
    const from = process.env.AUTOREPLY_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@doclogic";
    await transporter.sendMail({ from, to: toEmail, subject, text, html });
    return { ok: true };
  } catch (e) {
    // Re-throw to be caught by caller for logging
    throw e;
  }
}

async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { skipped: true, reason: "Telegram env not set" };

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
  });
  if (!resp.ok) throw new Error(`Telegram error: ${await resp.text()}`);
  return { ok: true };
}

async function sendWhatsApp(message) {
  // Optional: Twilio WhatsApp
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_WHATSAPP; // "whatsapp:+..."
  const to = process.env.WHATSAPP_TO; // "whatsapp:+..."
  if (!sid || !token || !from || !to) return { skipped: true, reason: "Twilio env not set" };

  const twilioModule = await import("twilio");
  const client = twilioModule.default(sid, token);
  await client.messages.create({ from, to, body: message });
  return { ok: true };
}

app.post("/api/lead", upload.array("samples", 5), async (req, res) => {
  try {
    const body = req.body || {};

    // Honeypot
    const website = String(body.website || "").trim();
    if (website) return res.status(200).json({ ok: true });

    const name = String(body.name || "").trim();
    const company = String(body.company || "").trim();
    const email = String(body.email || "").trim();
    const phone = String(body.phone || "").trim();
    const message = String(body.message || "").trim();
    const docTypes = normalizeArray(body.doc_types);

    if (!name) return res.status(400).send("Missing name");
    if (!email && !phone) return res.status(400).send("Missing contact (email or phone)");

    const createdAt = new Date().toISOString();

    const lead = { name, company, email, phone, message, docTypes, createdAt, ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress };

    const attachments = Array.isArray(req.files)
      ? req.files.map((f) => ({ filename: f.originalname, content: f.buffer, contentType: f.mimetype }))
      : [];

    const subjectTemplate = envOr("LEAD_EMAIL_SUBJECT_TEMPLATE", "DocLogic: новый запрос от {name} {company}");
    const subject = renderTemplate(subjectTemplate, { name: lead.name, company: lead.company }).trim();

    const textTemplate = envOr(
      "LEAD_EMAIL_TEXT_TEMPLATE",
      [
        "Новый запрос DocLogic",
        "",
        "Имя: {name}",
        "Компания: {company}",
        "Email: {emailOrDash}",
        "Телефон: {phoneOrDash}",
        "",
        "Комментарий:",
        "{messageOrDash}",
        "",
        "Дата: {createdAt}",
        "IP: {ipOrDash}",
      ].join("\n")
    );

    const htmlTemplate = envOr(
      "LEAD_EMAIL_HTML_TEMPLATE",
      [
        "<h2>Новый запрос DocLogic</h2>",
        "<ul>",
        "  <li><b>Имя:</b> {nameHtml}</li>",
        "  <li><b>Компания:</b> {companyHtml}</li>",
        "  <li><b>Email:</b> {emailHtml}</li>",
        "  <li><b>Телефон:</b> {phoneHtml}</li>",
        "</ul>",
        "<p><b>Комментарий:</b><br/>{messageHtml}</p>",
        "<p style=\"color:#64748b;font-size:12px;\">IP: {ipHtml} • {createdAtHtml}</p>",
      ].join("\n")
    );

    const varsText = {
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      message: lead.message,
      createdAt: lead.createdAt,
      ip: lead.ip,
      emailOrDash: lead.email || "-",
      phoneOrDash: lead.phone || "-",
      messageOrDash: lead.message || "-",
      ipOrDash: lead.ip || "-",
    };

    const varsHtml = {
      nameHtml: escapeHtml(lead.name),
      companyHtml: escapeHtml(lead.company || "-"),
      emailHtml: escapeHtml(lead.email || "-"),
      phoneHtml: escapeHtml(lead.phone || "-"),
      messageHtml: escapeHtml(lead.message || "-").replace(/\n/g, "<br/>"),
      createdAtHtml: escapeHtml(lead.createdAt),
      ipHtml: escapeHtml(String(lead.ip || "-")),
    };

    const text = renderTemplate(textTemplate, varsText);
    const html = renderTemplate(htmlTemplate, varsHtml);

    const tg =
`🆕 DocLogic — новый запрос
Имя: ${lead.name}
Компания: ${lead.company}
Email: ${lead.email || "-"}
Телефон: ${lead.phone || "-"}
Комментарий: ${lead.message || "-"}`;

    const results = {};

    // Send email
    try {
      results.email = await sendEmail({
        subject,
        text,
        html,
        attachments,
        lead
        // replyTo is automatically set from LEAD_EMAIL_FROM_TEMPLATE in sendEmail function
      });
      if (results.email.ok) {
        console.log(`[EMAIL] ✅ Отправлено на ${process.env.EMAIL_TO}`);
      } else {
        console.log(`[EMAIL] ⚠️ Пропущено: ${results.email.reason || "unknown"}`);
      }
    } catch (e) {
      results.email = { error: String(e) };
      console.error(`[EMAIL] ❌ Ошибка:`, e);
    }

    // Send Telegram
    try {
      results.telegram = await sendTelegram(tg);
      if (results.telegram.ok) {
        console.log(`[TELEGRAM] ✅ Отправлено в чат ${process.env.TELEGRAM_CHAT_ID}`);
      } else {
        console.log(`[TELEGRAM] ⚠️ Пропущено: ${results.telegram.reason || "unknown"}`);
      }
    } catch (e) {
      results.telegram = { error: String(e) };
      console.error(`[TELEGRAM] ❌ Ошибка:`, e);
    }

    // Send WhatsApp (optional) - DISABLED
    // try {
    //   results.whatsapp = await sendWhatsApp(tg);
    //   if (results.whatsapp.ok) {
    //     console.log(`[WHATSAPP] ✅ Отправлено`);
    //   } else {
    //     console.log(`[WHATSAPP] ⚠️ Пропущено: ${results.whatsapp.reason || "unknown"}`);
    //   }
    // } catch (e) {
    //   results.whatsapp = { error: String(e) };
    //   console.error(`[WHATSAPP] ❌ Ошибка:`, e);
    // }
    results.whatsapp = { skipped: true, reason: "WhatsApp disabled" };

    // Autoreply only if email provided
    if (lead.email) {
      try {
        const subj = "DocLogic: запрос получен";
        const t =
`Здравствуйте, ${lead.name}!

Мы получили ваш запрос по DocLogic.
Дальше мы уточним, какие поля и в каком формате вам нужны на выходе (CRM/1C/Excel/учёт), и предложим вариант подключения.

Если удобно — ответьте на это письмо и приложите 1–3 примера накладных.

— DocLogic`;
        const h = `
          <p>Здравствуйте, <b>${escapeHtml(lead.name)}</b>!</p>
          <p>Мы получили ваш запрос по DocLogic.</p>
          <p>Дальше мы уточним, <b>какие поля и в каком формате</b> вам нужны на выходе (CRM/1C/Excel/учёт), и предложим вариант подключения.</p>
          <p style="color:#64748b;font-size:12px;">Если удобно — ответьте на это письмо и приложите 1–3 примера накладных.</p>
          <p>— DocLogic</p>
        `;
        results.autoreply = await sendEmailToLead({ toEmail: lead.email, subject: subj, text: t, html: h });
        if (results.autoreply.ok) {
          console.log(`[AUTOREPLY] ✅ Отправлено на ${lead.email}`);
        } else {
          console.log(`[AUTOREPLY] ⚠️ Пропущено: ${results.autoreply.reason || "unknown"}`);
        }
      } catch (e) {
        results.autoreply = { error: String(e) };
        console.error(`[AUTOREPLY] ❌ Ошибка:`, e);
      }
    } else {
      results.autoreply = { skipped: true, reason: "No email" };
    }

    // Log summary
    console.log(`[LEAD] 📝 Новый запрос от ${lead.name} (${lead.company})`);
    console.log(`[LEAD] Результаты отправки:`, JSON.stringify(results, null, 2));

    res.status(200).json({ ok: true, results });
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

const port = Number(process.env.PORT || 8080);

// Log configuration status on startup
console.log("=".repeat(50));
console.log("📧 Email config:", {
  SMTP_HOST: process.env.SMTP_HOST ? "✅ установлен" : "❌ не установлен",
  EMAIL_TO: process.env.EMAIL_TO ? "✅ установлен" : "❌ не установлен",
});
console.log("📱 Telegram config:", {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "✅ установлен" : "❌ не установлен",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ? "✅ установлен" : "❌ не установлен",
});
console.log("=".repeat(50));

app.listen(port, () => console.log(`API listening on :${port}`));
