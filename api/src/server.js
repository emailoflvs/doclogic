import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import multer from "multer";
import dotenv from "dotenv";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env file (for local development)
// In Docker, variables from env_file in docker-compose.yml are already in process.env
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

// Load Python config file and extract string variable values
function loadPythonConfig(filePath) {
  try {
    // Try multiple path resolutions
    let resolvedPath = resolve(process.cwd(), filePath);
    if (!existsSync(resolvedPath)) {
      // Try from parent directory (in case server runs from root)
      const parentResolved = resolve(process.cwd(), '..', filePath.replace(/^\.\.\//, ''));
      if (existsSync(parentResolved)) {
        resolvedPath = parentResolved;
      } else {
        console.error(`[CONFIG] File not found: ${resolvedPath} or ${parentResolved}`);
        return null;
      }
    }

    const content = readFileSync(resolvedPath, "utf-8");
    const config = {};

    // Match Python string assignments: VARIABLE_NAME = "value" or VARIABLE_NAME = """value"""
    // Handle triple quotes separately for multiline strings
    const tripleQuoteRegex = /^([A-Z_][A-Z0-9_]*)\s*=\s*"""(.*?)"""/gms;
    let match;

    // First, match triple-quoted strings
    while ((match = tripleQuoteRegex.exec(content)) !== null) {
      const varName = match[1];
      let varValue = match[2];

      // Unescape Python escape sequences
      varValue = varValue
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");

      config[varName] = varValue;
    }

    // Then match single/double-quoted strings (but not already matched ones)
    const singleQuoteRegex = /^([A-Z_][A-Z0-9_]*)\s*=\s*("|')(.*?)\2/gm;
    while ((match = singleQuoteRegex.exec(content)) !== null) {
      const varName = match[1];
      // Skip if already found in triple quotes
      if (config[varName]) continue;

      let varValue = match[3];

      // Unescape Python escape sequences
      varValue = varValue
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, "\\");

      config[varName] = varValue;
    }

    return config;
  } catch (e) {
    console.error(`[CONFIG] Error loading Python config:`, e.message);
    return null;
  }
}

// Get email-to-client config from Python file
// Returns null if file not found or not configured - NO HARDCODE
function getEmailToClientConfig() {
  const configPath = process.env.EMAIL_TO_CLIENT;
  if (!configPath) {
    console.error(`[CONFIG] EMAIL_TO_CLIENT not set in .env`);
    return null;
  }

  const config = loadPythonConfig(configPath);
  if (!config) {
    console.error(`[CONFIG] Failed to load config from ${configPath}`);
    return null;
  }

  // All required templates must be present
  if (!config.SUBJECT_TEMPLATE || !config.TEXT_TEMPLATE || !config.HTML_TEMPLATE) {
    console.error(`[CONFIG] Missing required templates in ${configPath}. Found: ${Object.keys(config).join(', ')}`);
    return null;
  }

  console.log(`[CONFIG] ✅ Loaded email-to-client config from ${configPath}`);
  console.log(`[CONFIG] Subject: ${config.SUBJECT_TEMPLATE.substring(0, 50)}...`);
  return {
    subject: config.SUBJECT_TEMPLATE,
    textTemplate: config.TEXT_TEMPLATE,
    htmlTemplate: config.HTML_TEMPLATE,
    fromTemplate: config.FROM_TEMPLATE || null,
  };
}

// Get email-order config from Python file (for emails to company about orders)
// Returns null if file not found or not configured - NO HARDCODE
function getEmailOrderConfig() {
  const configPath = process.env.EMAIL_ORDER;
  if (!configPath) {
    console.error(`[CONFIG] EMAIL_ORDER not set in .env`);
    return null;
  }

  const config = loadPythonConfig(configPath);
  if (!config) {
    console.error(`[CONFIG] Failed to load config from ${configPath}`);
    return null;
  }

  // All required templates must be present
  if (!config.SUBJECT_TEMPLATE || !config.TEXT_TEMPLATE || !config.HTML_TEMPLATE) {
    console.error(`[CONFIG] Missing required templates in ${configPath}. Found: ${Object.keys(config).join(', ')}`);
    return null;
  }

  console.log(`[CONFIG] ✅ Loaded email-order config from ${configPath}`);
  console.log(`[CONFIG] Subject: ${config.SUBJECT_TEMPLATE.substring(0, 50)}...`);
  return {
    subject: config.SUBJECT_TEMPLATE,
    textTemplate: config.TEXT_TEMPLATE,
    htmlTemplate: config.HTML_TEMPLATE,
    fromMode: config.FROM_MODE || null,
    fromTemplate: config.FROM_TEMPLATE || null,
  };
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

async function sendEmail({ subject, text, html, attachments, replyTo, lead, fromMode, fromTemplate }) {
  const transporter = buildTransporter();
  if (!transporter) return { skipped: true, reason: "SMTP_HOST not set" };

  try {
    const to = required("EMAIL_TO");
    // Get EMAIL_FROM from env - NO HARDCODED FALLBACK
    const systemFrom = process.env.EMAIL_FROM || process.env.SMTP_USER;
    if (!systemFrom) {
      console.error(`[EMAIL ORDER] ❌ EMAIL_FROM and SMTP_USER not set - cannot determine sender email`);
      return { skipped: true, reason: "EMAIL_FROM or SMTP_USER must be set in .env" };
    }

    // Use fromMode and fromTemplate from config file if provided, otherwise from .env, otherwise default
    const emailFromMode = fromMode || envOr("LEAD_EMAIL_FROM_MODE", "client").toLowerCase(); // client | system
    const emailFromTemplate = fromTemplate || envOr("LEAD_EMAIL_FROM_TEMPLATE", "{name} ({company}) <{email}>");

    const safeLead = lead || {};
    const clientEmail = (safeLead.email || "").trim();
    const clientName = (safeLead.name || "").trim();
    const clientCompany = (safeLead.company || "").trim();
    const clientNameCompany = `${clientName} ${clientCompany}`.trim();

    // Render template with actual values
    let fromRendered = renderTemplate(emailFromTemplate, {
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

    if (emailFromMode === "client" && clientEmail) {
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

async function sendEmailToLead({ toEmail, subject, text, html, from }) {
  const transporter = buildTransporter();
  if (!transporter) return { skipped: true, reason: "SMTP_HOST not set" };

  try {
    // Use provided 'from' header - NO HARDCODED FALLBACK
    if (!from) {
      console.error(`[AUTOREPLY] ❌ From header not provided - email will not be sent`);
      return { skipped: true, reason: "From header not provided" };
    }

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

    // Get email order templates from file - NO HARDCODED FALLBACK
    const orderConfig = getEmailOrderConfig();
    const results = {};

    // If templates not found in file, skip sending email
    if (!orderConfig) {
      console.error(`[EMAIL ORDER] ❌ Templates not loaded from file. Email will not be sent.`);
      results.email = { skipped: true, reason: "Email order templates file not found or invalid" };
    } else {
      console.log(`[EMAIL ORDER] ✅ Using templates from file`);
      const subject = renderTemplate(orderConfig.subject, { name: lead.name, company: lead.company }).trim();

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

      // Get site URL from env - NO HARDCODED FALLBACK
      const siteUrl = process.env.SITE_URL || process.env.WEBSITE_URL;
      if (!siteUrl) {
        console.error(`[EMAIL ORDER] ❌ SITE_URL or WEBSITE_URL not set in .env - siteUrl placeholder will remain as {siteUrl}`);
      } else {
        console.log(`[EMAIL ORDER] ✅ Site URL loaded from .env: ${siteUrl}`);
      }
      const varsHtml = {
        nameHtml: escapeHtml(lead.name),
        companyHtml: escapeHtml(lead.company || "-"),
        emailHtml: escapeHtml(lead.email || "-"),
        phoneHtml: escapeHtml(lead.phone || "-"),
        messageHtml: escapeHtml(lead.message || "-").replace(/\n/g, "<br/>"),
        createdAtHtml: escapeHtml(lead.createdAt),
        ipHtml: escapeHtml(String(lead.ip || "-")),
        siteUrl: siteUrl || "" // Empty string if not set - NO HARDCODED FALLBACK
      };

      const text = renderTemplate(orderConfig.textTemplate, varsText);
      const html = renderTemplate(orderConfig.htmlTemplate, varsHtml);

      // Send email only if templates are loaded
      try {
        results.email = await sendEmail({
          subject,
          text,
          html,
          attachments,
          lead,
          fromMode: orderConfig.fromMode,
          fromTemplate: orderConfig.fromTemplate
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
    }

    const tg =
`🆕 DocLogic — новый запрос
Имя: ${lead.name}
Компания: ${lead.company}
Email: ${lead.email || "-"}
Телефон: ${lead.phone || "-"}
Комментарий: ${lead.message || "-"}`;

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

    // Autoreply only if email provided and config file exists
    if (lead.email) {
      try {
        const clientConfig = getEmailToClientConfig();

        // NO HARDCODED FALLBACK - if config not found, skip sending
        if (!clientConfig) {
          console.error(`[AUTOREPLY] ❌ Config not loaded - skipping email send`);
          results.autoreply = { skipped: true, reason: "EMAIL_TO_CLIENT config file not found or invalid" };
        } else {
          // Render templates from config file ONLY - NO HARDCODE
          console.log(`[AUTOREPLY] ✅ Using templates from config file`);
          console.log(`[AUTOREPLY] Subject template: ${clientConfig.subject}`);
          console.log(`[AUTOREPLY] Text template length: ${clientConfig.textTemplate.length} chars`);
          console.log(`[AUTOREPLY] HTML template length: ${clientConfig.htmlTemplate.length} chars`);

          const subj = renderTemplate(clientConfig.subject, { name: lead.name }).trim();
          const varsText = { name: lead.name };
          // Get site URL from env - NO HARDCODED FALLBACK
          const siteUrl = process.env.SITE_URL || process.env.WEBSITE_URL;
          if (!siteUrl) {
            console.error(`[AUTOREPLY] ❌ SITE_URL or WEBSITE_URL not set in .env - siteUrl placeholder will remain as {siteUrl}`);
            console.error(`[AUTOREPLY] Debug: process.env keys containing 'SITE' or 'WEBSITE':`, Object.keys(process.env).filter(k => /SITE|WEBSITE/i.test(k)));
          } else {
            console.log(`[AUTOREPLY] ✅ Site URL loaded from .env: ${siteUrl}`);
          }
          const varsHtml = {
            nameHtml: escapeHtml(lead.name),
            siteUrl: siteUrl || "" // Empty string if not set - NO HARDCODED FALLBACK
          };
          const t = renderTemplate(clientConfig.textTemplate, varsText);
          const h = renderTemplate(clientConfig.htmlTemplate, varsHtml);

          console.log(`[AUTOREPLY] Rendered subject: ${subj}`);
          console.log(`[AUTOREPLY] Rendered text (first 100 chars): ${t.substring(0, 100)}`);
          console.log(`[AUTOREPLY] SiteUrl value: "${siteUrl}"`);
          console.log(`[AUTOREPLY] HTML contains siteUrl:`, h.includes(siteUrl || "{siteUrl}"));
          // Check button and footer links
          const buttonMatch = h.match(/<a[^>]*href="([^"]+)"[^>]*>[\s\S]*?Посетить сайт DocLogic<\/a>/);
          if (buttonMatch) {
            console.log(`[AUTOREPLY] ✅ Кнопка href: ${buttonMatch[1]}`);
          } else {
            console.log(`[AUTOREPLY] ⚠️ Кнопка не найдена или href пустой`);
          }
          const footerMatches = [...h.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
          if (footerMatches.length > 0) {
            const footerLink = footerMatches[footerMatches.length - 1];
            console.log(`[AUTOREPLY] ✅ Футер href: ${footerLink[1]}, текст: ${footerLink[2].trim()}`);
          }

          // Handle FROM_TEMPLATE - NO HARDCODED FALLBACK
          let fromHeader = null;
          if (clientConfig.fromTemplate) {
            // Get email from AUTOREPLY_FROM or EMAIL_FROM - NO HARDCODE
            let systemEmail = process.env.AUTOREPLY_FROM || process.env.EMAIL_FROM;
            if (!systemEmail) {
              console.error(`[AUTOREPLY] ❌ AUTOREPLY_FROM or EMAIL_FROM not set in .env - cannot determine sender email`);
              results.autoreply = { skipped: true, reason: "AUTOREPLY_FROM or EMAIL_FROM not configured in .env" };
            } else {
              // Remove quotes if present
              systemEmail = systemEmail.replace(/^["']|["']$/g, '');
              // Extract email if format is "Name <email>"
              const emailMatch = systemEmail.match(/<([^>]+)>/);
              if (emailMatch) {
                systemEmail = emailMatch[1];
              }
              // Render FROM_TEMPLATE with email placeholder
              fromHeader = renderTemplate(clientConfig.fromTemplate, { email: systemEmail });
              console.log(`[AUTOREPLY] From header: ${fromHeader}`);
            }
          } else {
            // If no FROM_TEMPLATE, require AUTOREPLY_FROM or EMAIL_FROM - NO HARDCODE
            let systemFrom = process.env.AUTOREPLY_FROM || process.env.EMAIL_FROM;
            if (!systemFrom) {
              console.error(`[AUTOREPLY] ❌ FROM_TEMPLATE not in config and AUTOREPLY_FROM/EMAIL_FROM not set - cannot send email`);
              results.autoreply = { skipped: true, reason: "FROM_TEMPLATE not in config and AUTOREPLY_FROM/EMAIL_FROM not configured" };
            } else {
              systemFrom = systemFrom.replace(/^["']|["']$/g, '');
              fromHeader = systemFrom;
            }
          }

          // Send email only if fromHeader is set
          if (fromHeader) {
            results.autoreply = await sendEmailToLead({
              toEmail: lead.email,
              subject: subj,
              text: t,
              html: h,
              from: fromHeader
            });
            if (results.autoreply.ok) {
              console.log(`[AUTOREPLY] ✅ Отправлено на ${lead.email}`);
            } else {
              console.log(`[AUTOREPLY] ⚠️ Пропущено: ${results.autoreply.reason || "unknown"}`);
            }
          }
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
