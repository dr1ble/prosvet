from dataclasses import dataclass
from email.message import EmailMessage
from html import escape
from smtplib import SMTP, SMTP_SSL, SMTPException

from app.core.config import settings


class EmailDeliveryError(Exception):
    pass


@dataclass(frozen=True)
class SmtpConfig:
    host: str
    port: int
    username: str
    password: str
    from_email: str
    from_name: str
    use_tls: bool
    use_ssl: bool

    @property
    def is_enabled(self) -> bool:
        return bool(self.host and self.from_email)


class EmailSender:
    def __init__(self, config: SmtpConfig | None = None) -> None:
        self.config = config or SmtpConfig(
            host=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            from_email=settings.smtp_from_email,
            from_name=settings.smtp_from_name,
            use_tls=settings.smtp_use_tls,
            use_ssl=settings.smtp_use_ssl,
        )

    @property
    def is_enabled(self) -> bool:
        return self.config.is_enabled

    def send_password_reset(self, to_email: str, reset_token: str) -> None:
        if not self.is_enabled:
            return

        reset_url = settings.password_reset_url.strip()
        reset_link = f"{reset_url}?token={reset_token}" if reset_url else ""
        body_lines = [
            "Вы запросили восстановление пароля в приложении Просвет.",
            "",
            f"Код восстановления: {reset_token}",
            "Код действует 30 минут.",
        ]
        if reset_url:
            body_lines.extend(("", f"Ссылка для восстановления: {reset_link}"))
        body_lines.extend(("", "Если вы не запрашивали восстановление, просто проигнорируйте письмо."))

        message = EmailMessage()
        message["Subject"] = "Восстановление пароля в Просвет"
        message["From"] = f"{self.config.from_name} <{self.config.from_email}>"
        message["To"] = to_email
        message.set_content("\n".join(body_lines))
        message.add_alternative(_build_password_reset_html(reset_token, reset_link), subtype="html")

        try:
            smtp_class = SMTP_SSL if self.config.use_ssl else SMTP
            with smtp_class(self.config.host, self.config.port, timeout=10) as smtp:
                if self.config.use_tls and not self.config.use_ssl:
                    smtp.starttls()
                if self.config.username:
                    smtp.login(self.config.username, self.config.password)
                smtp.send_message(message)
        except SMTPException as exc:
            raise EmailDeliveryError("Could not send password reset email") from exc


def _build_password_reset_html(reset_token: str, reset_link: str) -> str:
    safe_token = escape(reset_token)
    safe_link = escape(reset_link, quote=True)
    action_button = ""
    if safe_link:
        action_button = f"""
        <a href="{safe_link}" style="display:inline-block;margin-top:20px;padding:14px 22px;border-radius:14px;background:#2563eb;color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:700;text-decoration:none;">
          Восстановить пароль
        </a>
        """

    return f"""<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Восстановление пароля в Просвет</title>
  </head>
  <body style="margin:0;padding:0;background:#eef2ff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#eef2ff 0%,#f8fafc 45%,#f5f3ff 100%);padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;box-shadow:0 24px 70px rgba(37,99,235,0.16);overflow:hidden;">
            <tr>
              <td style="padding:28px 32px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;">
                <div style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;opacity:0.85;">Просвет</div>
                <h1 style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:800;">Восстановление пароля</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#0f172a;font-family:Arial,sans-serif;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Вы запросили восстановление пароля в приложении <strong>Просвет</strong>.</p>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#475569;">Введите этот код на экране восстановления:</p>
                <div style="margin:0 0 18px;padding:18px 20px;border:1px solid #dbeafe;border-radius:18px;background:#f8fafc;text-align:center;">
                  <div style="font-family:'Courier New',monospace;font-size:28px;line-height:1.3;font-weight:800;letter-spacing:0.08em;color:#1d4ed8;">{safe_token}</div>
                </div>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">Код действует 30 минут.</p>
                {action_button}
                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется прежним.</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""
