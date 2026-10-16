/**
 * Email transport abstraction.
 *
 * Drivers (EMAIL_DRIVER):
 *  - "smtp"   (default when SMTP_HOST is set) — any SMTP provider (Infomaniak, Brevo, SES, Postmark…)
 *  - "memory" — stores messages in memory (automated tests)
 *  - none     — nothing is sent; messages are logged as "skipped" so nobody is told an email went out.
 *
 * Credentials are only read from environment variables, on the server.
 */
export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string;
  fromAddress?: string;
  replyTo?: string;
};

export type SendResult =
  | { status: "sent"; messageId: string | null }
  | { status: "failed"; error: string }
  | { status: "skipped"; error: string };

type Driver = "smtp" | "memory" | "none";

export function emailDriver(): Driver {
  const explicit = process.env.EMAIL_DRIVER?.toLowerCase();
  if (explicit === "memory") return "memory";
  if (explicit === "none") return "none";
  if (explicit === "smtp" || process.env.SMTP_HOST) return process.env.SMTP_HOST ? "smtp" : "none";
  return "none";
}

export function isEmailConfigured(): boolean {
  return emailDriver() !== "none";
}

const globalOutbox = globalThis as unknown as { __lemanOutbox?: OutgoingEmail[] };
export function memoryOutbox(): OutgoingEmail[] {
  globalOutbox.__lemanOutbox ??= [];
  return globalOutbox.__lemanOutbox;
}

type Transporter = { sendMail: (opts: Record<string, unknown>) => Promise<{ messageId?: string }> };
let transporter: Transporter | null = null;

async function getSmtpTransport(): Promise<Transporter> {
  if (transporter) return transporter;
  const nodemailer = await import("nodemailer");
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  }) as unknown as Transporter;
  return transporter;
}

function fromHeader(name: string | undefined, address: string | undefined): string | null {
  const addr = address || process.env.SMTP_FROM;
  if (!addr) return null;
  const safeName = (name ?? "").replace(/["\r\n<>]/g, "").trim();
  return safeName ? `"${safeName}" <${addr}>` : addr;
}

export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const driver = emailDriver();
  if (driver === "none") {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[email] Envoi désactivé (SMTP non configuré) → ${email.to} : ${email.subject}`);
    }
    return { status: "skipped", error: "Envoi d'e-mails non configuré (SMTP_HOST manquant)." };
  }
  if (driver === "memory") {
    memoryOutbox().push(email);
    return { status: "sent", messageId: `memory-${memoryOutbox().length}` };
  }
  const from = fromHeader(email.fromName, email.fromAddress);
  if (!from) return { status: "failed", error: "Adresse d'expéditeur manquante (SMTP_FROM ou paramètre « adresse d'expédition »)." };
  try {
    const t = await getSmtpTransport();
    const info = await t.sendMail({
      from,
      to: email.to,
      replyTo: email.replyTo || undefined,
      subject: email.subject.replace(/[\r\n]+/g, " "),
      text: email.text,
      html: email.html,
    });
    return { status: "sent", messageId: info.messageId ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] échec d'envoi", message);
    return { status: "failed", error: message.slice(0, 500) };
  }
}
