import nodemailer from "nodemailer";

export async function sendOwnerWelcomeEmail(input: { name: string; email: string; organization: string; slug: string; temporaryPassword: string | null; existingUser: boolean }) {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(process.env.SMTP_PORT || 587);
  const from = process.env.MAIL_FROM || SMTP_USER;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !from) throw new Error("SMTP is not configured");
  const transporter = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  const loginUrl = process.env.WEB_APP_URL || "http://localhost:5173/login";
  const credential = input.existingUser
    ? "You already have a BOQ account. Use your existing password to sign in."
    : `Your temporary password is: ${input.temporaryPassword}\nPlease sign in and change it immediately.`;
  await transporter.sendMail({
    from, to: input.email, subject: `Your BOQ organization: ${input.organization}`,
    text: `Hello ${input.name},\n\nYou have been added as the owner of ${input.organization}.\nSlug: ${input.slug}\nSign in: ${loginUrl}\n\n${credential}`,
  });
}
