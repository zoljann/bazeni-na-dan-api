import nodemailer from 'nodemailer';
import { ENV } from './env';

const transporter = nodemailer.createTransport({
  host: ENV.SMTP_HOST,
  port: ENV.SMTP_PORT,
  secure: ENV.SMTP_PORT === 465,
  auth: {
    user: ENV.SMTP_USER,
    pass: ENV.SMTP_PASS
  }
});

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${ENV.FRONTEND_URL}/resetovanje-lozinke?token=${encodeURIComponent(token)}`;

  const subject = 'Reset lozinke – Bazeni na dan';

  const text = [
    'Zatražen je reset lozinke za vaš Bazeni na dan nalog.',
    '',
    'Za promjenu lozinke otvorite sljedeći link:',
    resetUrl,
    '',
    'Ako niste vi zatražili ovu promjenu, možete ignorisati ovaj email.'
  ].join('\n');

  const html = `
  <!doctype html>
  <html lang="bs">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${subject}</title>
    </head>
    <body style="margin:0;padding:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#ffffff;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;">
        <tr>
          <td align="center" style="padding:24px 16px;">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;width:100%;border-collapse:collapse;">
              
              <tr>
                <td style="padding-bottom:6px;">
                  <p style="margin:0;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">
                    Bazeni na dan
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:12px;">
                  <h1 style="margin:0;font-size:20px;font-weight:700;color:#0f172a;">
                    Reset lozinke
                  </h1>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:14px;">
                  <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
                    Zatražen je reset lozinke za vaš
                    <strong>Bazeni na dan</strong> nalog.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:10px 0 18px;">
                  <a
                    href="${resetUrl}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                      display:inline-block;
                      padding:10px 22px;
                      border-radius:999px;
                      background:#0ea5e9;
                      color:#ffffff;
                      font-size:13px;
                      font-weight:700;
                      text-decoration:none;
                      letter-spacing:0.04em;
                      text-transform:uppercase;
                    "
                  >
                    Promijeni lozinku
                  </a>
                </td>
              </tr>

              <tr>
                <td style="padding-bottom:10px;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                    Ako dugme ne radi, kopirajte i zalijepite ovu adresu u vaš browser:
                  </p>
                  <p style="margin:6px 0 0;font-size:12px;line-height:1.5;word-break:break-all;color:#0f172a;">
                    <a
                      href="${resetUrl}"
                      target="_blank"
                      rel="noopener noreferrer"
                      style="color:#0ea5e9;text-decoration:underline;"
                    >
                      ${resetUrl}
                    </a>
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding-top:16px;border-top:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:11px;line-height:1.6;color:#9ca3af;">
                    Ako niste vi zatražili ovu promjenu, slobodno ignorišite ovaj email.
                  </p>
                  <p style="margin:4px 0 0;font-size:11px;line-height:1.6;color:#9ca3af;">
                    © ${new Date().getFullYear()} Bazeni na dan
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;

  await transporter.sendMail({
    from: ENV.SMTP_FROM,
    to,
    subject,
    text,
    html
  });
}
