import os
import sqlite3
import secrets
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage
import json
from datetime import datetime, date, timedelta
from email.utils import formataddr

from flask import Flask, request, jsonify, redirect, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash
import models

# Frontend folder
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

app = Flask(__name__)
CORS(app)

models.init_db()

def _load_env_file():
    """Load key=value pairs from backend/.env when present."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw_line in f:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                env_key = key.strip()
                env_value = value.strip().strip('"').strip("'")
                current_value = os.environ.get(env_key)
                if current_value is None or current_value == "":
                    os.environ[env_key] = env_value
    except Exception as ex:
        print(f"Warning: unable to load .env file: {ex}")


_load_env_file()

APP_NAME = (os.getenv("APP_NAME") or "Expense System").strip() or "Expense System"

OTP_TTL_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 30
OTP_MAX_VERIFY_ATTEMPTS = 5
RESET_TOKEN_TTL_MINUTES = 10

# Temporary in-memory stores (sufficient for single-process local app use)
REGISTRATION_OTP_STORE = {}
FORGOT_OTP_STORE = {}
PASSWORD_RESET_TOKEN_STORE = {}


def _parse_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _email_dev_fallback_enabled():
    return _parse_bool(os.getenv("EMAIL_DEV_FALLBACK"), False)


def _cleanup_expired_auth_state():
    now = datetime.utcnow()

    for username in list(REGISTRATION_OTP_STORE.keys()):
        record = REGISTRATION_OTP_STORE.get(username)
        if not record:
            continue
        if record.get("expires_at") and record["expires_at"] < now:
            REGISTRATION_OTP_STORE.pop(username, None)

    for username in list(FORGOT_OTP_STORE.keys()):
        record = FORGOT_OTP_STORE.get(username)
        if not record:
            continue
        if record.get("expires_at") and record["expires_at"] < now:
            FORGOT_OTP_STORE.pop(username, None)

    for token in list(PASSWORD_RESET_TOKEN_STORE.keys()):
        record = PASSWORD_RESET_TOKEN_STORE.get(token)
        if not record:
            continue
        if record.get("expires_at") and record["expires_at"] < now:
            PASSWORD_RESET_TOKEN_STORE.pop(token, None)


def _generate_otp():
    return f"{secrets.randbelow(1000000):06d}"


def _smtp_provider_state():
    host = (os.getenv("SMTP_HOST") or "").strip()
    port = int((os.getenv("SMTP_PORT") or "587").strip())
    use_tls = _parse_bool(os.getenv("SMTP_USE_TLS"), True)
    username = (os.getenv("SMTP_USERNAME") or "").strip()
    password = (os.getenv("SMTP_PASSWORD") or "").strip()
    sender = (os.getenv("SMTP_SENDER") or "").strip()

    placeholder_values = {
        "your-email@gmail.com",
        "your_email@gmail.com",
        "your-app-password",
        "your_app_password",
        "your-gmail-app-password",
        "your app password",
    }

    values = [host, username, password, sender]
    has_placeholders = any(v.lower() in placeholder_values for v in values if v)
    configured = all(values) and not has_placeholders

    return {
        "configured": configured,
        "has_placeholders": has_placeholders,
        "host": host,
        "port": port,
        "use_tls": use_tls,
        "username": username,
        "password": password,
        "sender": sender,
    }


def _brevo_provider_state():
    api_key = (os.getenv("BREVO_API_KEY") or "").strip()
    sender_email = (os.getenv("BREVO_SENDER_EMAIL") or "").strip()
    sender_name = (os.getenv("BREVO_SENDER_NAME") or "Expense System").strip()

    configured = bool(api_key and sender_email)

    return {
        "configured": configured,
        "api_key": api_key,
        "sender_email": sender_email,
        "sender_name": sender_name,
    }


def _build_otp_email(purpose, otp_code, username=None):
    safe_username = (username or "there").strip() or "there"

    if purpose == "registration":
        subject = f"{APP_NAME} - Verify your account"
        intro = "Thanks for creating your account."
        action_text = "confirm your registration"
        closing = "If you did not request this account, you can safely ignore this email."
    elif purpose == "forgot_password":
        subject = f"{APP_NAME} - Password reset code"
        intro = "We received a request to reset your password."
        action_text = "reset your password"
        closing = "If you did not request a password reset, please ignore this email and your password will remain unchanged."
    else:
        subject = f"{APP_NAME} - One-time password"
        intro = "A secure one-time password has been generated for your account."
        action_text = "continue"
        closing = "If you were not expecting this email, you can ignore it."

    plain_body = (
        f"Hello {safe_username},\n\n"
        f"{intro}\n\n"
        f"Your one-time password is: {otp_code}\n"
        f"It expires in {OTP_TTL_MINUTES} minutes.\n\n"
        f"Use this code to {action_text} in {APP_NAME}.\n\n"
        f"{closing}\n\n"
        f"Regards,\n"
        f"The {APP_NAME} Team"
    )

    html_body = f"""
    <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);border-radius:20px 20px 0 0;padding:28px 32px;color:#ffffff;">
          <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">{APP_NAME}</div>
          <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">{subject}</h1>
        </div>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello {safe_username},</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">{intro}</p>
          <div style="margin:28px 0;padding:22px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc;text-align:center;">
            <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#475569;margin-bottom:10px;">Your verification code</div>
            <div style="font-size:36px;font-weight:700;letter-spacing:0.18em;color:#0f172a;">{otp_code}</div>
            <div style="margin-top:10px;font-size:14px;color:#64748b;">This code expires in {OTP_TTL_MINUTES} minutes.</div>
          </div>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.6;">Use this code to {action_text} in {APP_NAME}.</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">{closing}</p>
          <p style="margin:0;font-size:15px;line-height:1.6;">Regards,<br>The {APP_NAME} Team</p>
        </div>
      </div>
    </div>
    """

    return subject, plain_body, html_body


def _build_welcome_email(username=None, full_name=None, budget_month=None, monthly_budget=None, daily_limit=None):
        safe_username = (username or "there").strip() or "there"
        safe_name = (full_name or "").strip()
        greeting_name = safe_name or safe_username

        month_section = ""
        budget_plain = "After signing in, you can set your monthly and daily budget from the dashboard.\n\n"
        if budget_month and (monthly_budget is not None) and (daily_limit is not None):
            month_label = _format_budget_month_label(budget_month)
            budget_plain = (
                f"Your budget for {month_label}:\n"
                f"  Monthly: {monthly_budget}\n\n"
                f"  Daily: {daily_limit}\n\n"
            )
            month_section = f"""
                    <div style="margin:18px 0;padding:16px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;">
                        <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#475569;margin-bottom:10px;">Budget for {month_label}</div>
                        <div style="font-size:16px;font-weight:700;color:#0f172a;">Monthly: {monthly_budget} &nbsp;&nbsp;
                        </div>
                         <div style="font-size:16px;font-weight:700;color:#0f172a;"> &nbsp;&nbsp;
                         Daily: {daily_limit}</div>
                    </div>
            """

        subject = f"Welcome to {APP_NAME}"
        plain_body = (
                f"Hello {greeting_name},\n\n"
                f"Welcome to {APP_NAME}. Your account has been created successfully.\n\n"
                f"Username: {safe_username}\n\n"
                f"{budget_plain}"
                f"You can now sign in and start managing your expenses with ease.\n\n"
                f"Regards,\n"
                f"The {APP_NAME} Team"
        )

        html_body = f"""
        <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
                <div style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);border-radius:20px 20px 0 0;padding:28px 32px;color:#ffffff;">
                    <div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">{APP_NAME}</div>
                    <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;">Welcome, {greeting_name}</h1>
                </div>
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:32px;">
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hello {greeting_name},</p>
                    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Welcome to {APP_NAME}. Your account has been created successfully.</p>
                    <div style="margin:28px 0;padding:22px;border:1px solid #cbd5e1;border-radius:16px;background:#f8fafc;">
                        <div style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#475569;margin-bottom:10px;">Your username</div>
                        <div style="font-size:22px;font-weight:700;color:#0f172a;">{safe_username}</div>
                    </div>
                    {month_section}
                    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">{('After signing in, you can set your monthly and daily budget from the dashboard.' if not month_section else 'Your budget has been saved and included above.')}</p>
                    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">You can now sign in and start managing your expenses with ease.</p>
                    <p style="margin:0;font-size:15px;line-height:1.6;">Regards,<br>The {APP_NAME} Team</p>
                </div>
            </div>
        </div>
        """

        return subject, plain_body, html_body


def _format_budget_month_label(month_value):
    raw_month = (month_value or "").strip()
    if not raw_month:
        return "this month"

    try:
        parsed_month = datetime.strptime(raw_month, "%Y-%m")
        return parsed_month.strftime("%B %Y")
    except ValueError:
        return raw_month


def _send_via_smtp(recipient_email, subject, body):
    smtp = _smtp_provider_state()
    if not smtp["configured"]:
        if smtp["has_placeholders"]:
            return False, "smtp placeholders detected"
        return False, "smtp not configured"

    try:
        plain_body = body.get("text") if isinstance(body, dict) else str(body)
        html_body = body.get("html") if isinstance(body, dict) else None

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = formataddr((APP_NAME, smtp["sender"]))
        msg["To"] = recipient_email
        msg["Reply-To"] = smtp["sender"]
        msg["X-Mailer"] = APP_NAME
        msg.set_content(plain_body)
        if html_body:
            msg.add_alternative(html_body, subtype="html")

        if smtp["use_tls"]:
            with smtplib.SMTP(smtp["host"], smtp["port"], timeout=20) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(smtp["username"], smtp["password"])
                server.send_message(msg)
        else:
            with smtplib.SMTP_SSL(smtp["host"], smtp["port"], timeout=20) as server:
                server.login(smtp["username"], smtp["password"])
                server.send_message(msg)

        return True, "sent"

    except smtplib.SMTPAuthenticationError as ex:
        host = (smtp.get("host") or "").lower()
        if "gmail" in host:
            return False, "email authentication failed: Gmail rejected the SMTP login. Use a 16-character Google App Password with 2-step verification enabled, not your normal Gmail password."
        return False, f"email authentication failed: SMTP server rejected the login ({getattr(ex, 'smtp_code', 'unknown')})."
    except Exception as ex:
        print(f"SMTP send failed: {ex}")
        return False, "failed to send otp"


def _send_via_brevo(recipient_email, subject, body):
    brevo = _brevo_provider_state()
    if not brevo["configured"]:
        return False, "brevo not configured"

    plain_body = body.get("text") if isinstance(body, dict) else str(body)
    html_body = body.get("html") if isinstance(body, dict) else None

    payload = {
        "sender": {
            "email": brevo["sender_email"],
            "name": brevo["sender_name"],
        },
        "to": [{"email": recipient_email}],
        "subject": subject,
        "textContent": plain_body,
    }

    if html_body:
        payload["htmlContent"] = html_body

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": brevo["api_key"],
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            if 200 <= response.status < 300:
                return True, "sent"
            return False, "failed to send otp"
    except urllib.error.HTTPError as ex:
        print(f"Brevo HTTP error: {ex.code}")
        if ex.code in (401, 403):
            return False, "email authentication failed: Brevo API key or sender email is invalid."
        return False, "failed to send otp"
    except Exception as ex:
        print(f"Brevo send failed: {ex}")
        return False, "failed to send otp"


def _send_otp_email(recipient_email, otp_code, purpose, username=None):
    subject, plain_body, html_body = _build_otp_email(purpose, otp_code, username=username)
    preferred = (os.getenv("OTP_EMAIL_PROVIDER") or "smtp").strip().lower()

    smtp_state = _smtp_provider_state()
    brevo_state = _brevo_provider_state()

    if not smtp_state["configured"] and not brevo_state["configured"]:
        if smtp_state["has_placeholders"]:
            return False, "smtp placeholders detected"
        return False, "email service is not configured"

    providers = ["smtp", "brevo"]
    if preferred == "brevo":
        providers = ["brevo", "smtp"]

    last_error = "failed to send otp"
    for provider in providers:
        if provider == "smtp":
            ok, message = _send_via_smtp(recipient_email, subject, {"text": plain_body, "html": html_body})
        else:
            ok, message = _send_via_brevo(recipient_email, subject, {"text": plain_body, "html": html_body})

        if ok:
            return True, "sent"

        if message not in {"smtp not configured", "brevo not configured"}:
            last_error = message

    return False, last_error


def _send_welcome_email(recipient_email, username=None, full_name=None, budget_month=None, monthly_budget=None, daily_limit=None):
    subject, plain_body, html_body = _build_welcome_email(
        username=username,
        full_name=full_name,
        budget_month=budget_month,
        monthly_budget=monthly_budget,
        daily_limit=daily_limit,
    )
    preferred = (os.getenv("OTP_EMAIL_PROVIDER") or "smtp").strip().lower()

    smtp_state = _smtp_provider_state()
    brevo_state = _brevo_provider_state()

    if not smtp_state["configured"] and not brevo_state["configured"]:
        return False, "email service is not configured"

    payload = {"text": plain_body, "html": html_body}
    providers = ["smtp", "brevo"]
    if preferred == "brevo":
        providers = ["brevo", "smtp"]

    last_error = "failed to send welcome email"
    for provider in providers:
        if provider == "smtp":
            ok, message = _send_via_smtp(recipient_email, subject, payload)
        else:
            ok, message = _send_via_brevo(recipient_email, subject, payload)

        if ok:
            return True, "sent"

        if message not in {"smtp not configured", "brevo not configured"}:
            last_error = message

    return False, last_error

# ---------------- HOME ---------------- #

@app.route("/")
def root():
    return redirect("/login.html")


# ---------------- LOGIN ---------------- #

@app.route("/login", methods=["POST"])
def login():

    data = request.json or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return {"message": "missing credentials"}, 400

    user = models.login_user(username, password)

    if user:
        # user row: id, full_name, username, email, password, gender, favorite_sport
        gender = user[5] if len(user) > 5 else None
        return {"message": "success", "username": username, "gender": gender}
    else:
        return {"message": "invalid"}, 401


# ---------------- REGISTER ---------------- #

@app.route("/register", methods=["POST"])
def register():
    _cleanup_expired_auth_state()

    data = request.json or {}

    full_name = data.get("full_name", "").strip()
    username  = data.get("username", "").strip()
    email     = data.get("email", "").strip().lower()
    password  = data.get("password", "")
    sport     = data.get("favorite_sport", "").strip()
    gender    = data.get("gender", "").strip().lower()

    # ✅ Validation
    if not full_name or not username or not email or not password or not sport or not gender:
        return {"message": "missing required fields"}, 400

    if gender not in ["male", "female"]:
        return {"message": "invalid gender"}, 400

    if len(password) < 6:
        return {"message": "password too short"}, 400

    # Basic email validation
    if "@" not in email or "." not in email:
        return {"message": "invalid email"}, 400

    conn = models.connect()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM users WHERE username=?", (username,))
        if cur.fetchone():
            return {"message": "username already exists"}, 409

        cur.execute("SELECT 1 FROM users WHERE email=?", (email,))
        if cur.fetchone():
            return {"message": "email already exists"}, 409
    finally:
        conn.close()

    conn = models.connect()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO users(full_name, username, email, password, favorite_sport, gender)
            VALUES(?,?,?,?,?,?)
            """,
            (
                full_name,
                username,
                email,
                generate_password_hash(password),
                sport,
                gender,
            ),
        )
        conn.commit()
    except Exception as ex:
        conn.rollback()
        error_msg = str(ex).upper()
        if "USERNAME" in error_msg:
            return {"message": "username already exists"}, 409
        if "EMAIL" in error_msg:
            return {"message": "email already exists"}, 409
        return {"message": "registration failed", "error": str(ex)}, 500
    finally:
        conn.close()

    return {"message": "registered", "username": username}


@app.route("/register/verify-otp", methods=["POST"])
def verify_registration_otp():
    return {"message": "email verification is disabled for registration"}, 410


@app.route('/forgot-password/request-otp', methods=['POST'])
def forgot_password_request_otp():
    _cleanup_expired_auth_state()

    data = request.json or {}
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()

    if not username or not email:
        return {"message": "username and email are required"}, 400

    conn = models.connect()
    cur = conn.cursor()
    try:
        cur.execute("SELECT email FROM users WHERE username=?", (username,))
        user = cur.fetchone()
    finally:
        conn.close()

    if not user:
        return {"message": "user not found"}, 404

    if user[0].lower() != email:
        return {"message": "email does not match username"}, 400

    now = datetime.utcnow()
    existing_pending = FORGOT_OTP_STORE.get(username)
    if existing_pending and existing_pending.get("last_sent_at"):
        seconds_since_last_send = (now - existing_pending["last_sent_at"]).total_seconds()
        if seconds_since_last_send < OTP_RESEND_COOLDOWN_SECONDS:
            wait_seconds = int(OTP_RESEND_COOLDOWN_SECONDS - seconds_since_last_send)
            return {
                "message": f"please wait {wait_seconds} seconds before requesting another otp"
            }, 429

    otp_code = _generate_otp()
    sent, send_msg = _send_otp_email(email, otp_code, purpose="forgot_password", username=username)
    if not sent:
        if _email_dev_fallback_enabled():
            FORGOT_OTP_STORE[username] = {
                "email": email,
                "otp": otp_code,
                "attempts": 0,
                "expires_at": now + timedelta(minutes=OTP_TTL_MINUTES),
                "last_sent_at": now,
            }
            print(f"DEV EMAIL FALLBACK: forgot-password OTP for {username} ({email}) is {otp_code}")
            return {"message": "otp_sent", "delivery": "dev_fallback", "otp_code": otp_code}, 200

        return {"message": send_msg}, 500

    FORGOT_OTP_STORE[username] = {
        "email": email,
        "otp": otp_code,
        "attempts": 0,
        "expires_at": now + timedelta(minutes=OTP_TTL_MINUTES),
        "last_sent_at": now,
    }

    return {"message": "otp_sent"}


@app.route('/forgot-password/verify-otp', methods=['POST'])
def forgot_password_verify_otp():
    _cleanup_expired_auth_state()

    data = request.json or {}
    username = (data.get('username') or '').strip()
    otp = (data.get('otp') or '').strip()

    if not username or not otp:
        return {"message": "username and otp are required"}, 400

    pending = FORGOT_OTP_STORE.get(username)
    if not pending:
        return {"message": "otp expired or not requested"}, 400

    if pending["expires_at"] < datetime.utcnow():
        FORGOT_OTP_STORE.pop(username, None)
        return {"message": "otp expired"}, 400

    if pending["attempts"] >= OTP_MAX_VERIFY_ATTEMPTS:
        FORGOT_OTP_STORE.pop(username, None)
        return {"message": "too many invalid otp attempts, please request a new otp"}, 429

    if otp != pending["otp"]:
        pending["attempts"] += 1
        return {"message": "invalid otp"}, 400

    FORGOT_OTP_STORE.pop(username, None)

    reset_token = secrets.token_urlsafe(32)
    PASSWORD_RESET_TOKEN_STORE[reset_token] = {
        "username": username,
        "expires_at": datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
    }

    return {"message": "otp_verified", "reset_token": reset_token}


@app.route('/forgot-password/reset-password', methods=['POST'])
def forgot_password_reset_password():
    _cleanup_expired_auth_state()

    data = request.json or {}
    username = (data.get('username') or '').strip()
    reset_token = (data.get('reset_token') or '').strip()
    new_password = data.get('new_password') or ''

    if not username or not reset_token or not new_password:
        return {"message": "username, reset token and new password are required"}, 400

    if len(new_password) < 6:
        return {"message": "password too short"}, 400

    token_info = PASSWORD_RESET_TOKEN_STORE.get(reset_token)
    if not token_info:
        return {"message": "invalid or expired reset token"}, 400

    if token_info["expires_at"] < datetime.utcnow():
        PASSWORD_RESET_TOKEN_STORE.pop(reset_token, None)
        return {"message": "invalid or expired reset token"}, 400

    if token_info["username"] != username:
        return {"message": "invalid reset token for username"}, 400

    conn = models.connect()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET password=? WHERE username=?",
            (generate_password_hash(new_password), username),
        )
        conn.commit()
        if cur.rowcount == 0:
            return {"message": "user not found"}, 404
    finally:
        conn.close()

    PASSWORD_RESET_TOKEN_STORE.pop(reset_token, None)
    return {"message": "updated"}


# ---------------- PROFILE ---------------- #

@app.route('/profile', methods=['GET', 'PUT'])
def profile():
    username = request.headers.get('X-Username')

    if not username:
        return {"message": "username is required"}, 401

    if request.method == 'GET':
        profile_data = models.get_user_profile(username)
        if not profile_data:
            return {"message": "user not found"}, 404
        return jsonify(profile_data)

    data = request.json or {}
    full_name = (data.get('full_name') or '').strip()
    new_username = (data.get('username') or '').strip()

    if not full_name or not new_username:
        return {"message": "full name and username are required"}, 400

    if len(new_username) < 3:
        return {"message": "username must be at least 3 characters"}, 400

    try:
        result = models.update_user_profile(
            username,
            full_name,
            new_username,
        )

        if result == 'invalid_password':
            return {"message": "current password is incorrect"}, 401

        if result != 'updated':
            return {"message": "user not found"}, 404

        updated_profile = models.get_user_profile(new_username)
        return jsonify({"message": "updated", "profile": updated_profile})

    except sqlite3.IntegrityError as ex:
        error_msg = str(ex).upper()
        if 'USERNAME' in error_msg:
            return {"message": "username already exists"}, 409
        if 'EMAIL' in error_msg:
            return {"message": "email already exists"}, 409
        return {"message": "profile update failed"}, 400
    except Exception as ex:
        return {"message": "profile update failed", "error": str(ex)}, 500


@app.route('/change-password', methods=['POST'])
def change_password():
    username = request.headers.get('X-Username')

    if not username:
        return {"message": "username is required"}, 401

    data = request.json or {}
    current_password = data.get('current_password') or ''
    new_password = data.get('new_password') or ''

    if not current_password or not new_password:
        return {"message": "current and new password are required"}, 400

    if len(new_password) < 6:
        return {"message": "new password must be at least 6 characters"}, 400

    if current_password == new_password:
        return {"message": "new password must be different"}, 400

    result = models.change_user_password(username, current_password, new_password)

    if result == 'not_found':
        return {"message": "user not found"}, 404
    if result == 'invalid_current':
        return {"message": "current password is incorrect"}, 401

    return {"message": "updated"}


# ---------------- GET EXPENSES ---------------- #

@app.route("/expenses", methods=["GET"])
def expenses():

    username = request.headers.get("X-Username")
    month = request.args.get("month")
    
    if not username:
        return {"message": "username is required"}, 401

    data = models.get_expenses(username, month)

    result = []

    for e in data:
        result.append({
            "id":          e[0],
            "date":        e[1],
            "category":    e[2],
            "amount":      e[3],
            "description": e[4]
        })

    return jsonify(result)


# ---------------- ADD EXPENSE ---------------- #

@app.route("/add-expense", methods=["POST"])
def add():

    try:
        data = request.json
        username = request.headers.get("X-Username")
        
        if not username:
            return {"message": "username is required"}, 401

        if not data.get("date") or not data.get("category") \
                or not data.get("amount") or not data.get("description"):
            return {"message": "missing required fields", "received": data}, 400

        # Validate date - no future dates allowed
        expense_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        today = date.today()
        
        if expense_date > today:
            return {"message": "Expense date cannot be in the future. Please select today or an earlier date."}, 400

        amount = float(data["amount"])

        success = models.add_expense(
            username,
            data["date"],
            data["category"],
            amount,
            data["description"]
        )

        if success:
            return {"message": "added"}
        else:
            return {"message": "user not found"}, 401

    except Exception as e:
        print(f"Error in add_expense: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"message": f"Error: {str(e)}"}, 500


# ---------------- DELETE EXPENSE ---------------- #

@app.route("/delete/<id>", methods=["DELETE"])
def delete(id):
    
    username = request.headers.get("X-Username")
    
    if not username:
        return {"message": "username is required"}, 401

    success = models.delete_expense(username, id)
    
    if success:
        return {"message": "deleted"}
    else:
        return {"message": "expense not found or unauthorized"}, 401


# ---------------- UPDATE EXPENSE ---------------- #

@app.route("/update/<int:id>", methods=["PUT"])
def update_expense(id):

    try:
        data = request.get_json()
        username = request.headers.get("X-Username")
        
        if not username:
            return jsonify({"message": "username is required"}), 401

        # Validate all fields are present
        if not data.get("date") or not data.get("category") \
                or not data.get("amount") or not data.get("description"):
            return jsonify({"message": "missing required fields"}), 400

        # Validate date - no future dates allowed
        expense_date = datetime.strptime(data["date"], "%Y-%m-%d").date()
        today = date.today()
        
        if expense_date > today:
            return jsonify({"message": "Expense date cannot be in the future. Please select today or an earlier date."}), 400

        amount = float(data["amount"])

        # Update in the database
        success = models.update_expense(
            username,
            id,
            data["date"],
            data["category"],
            amount,
            data["description"]
        )
        
        if success:
            return jsonify({"message": "updated"})
        else:
            return jsonify({"message": "expense not found or unauthorized"}), 401

    except Exception as e:
        print(f"Error in update_expense: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error: {str(e)}"}), 500


# ---------------- SET BUDGET ---------------- #

@app.route('/set-budget', methods=['POST'])
def set_budget():
    try:
        data = request.json
        username = request.headers.get('X-Username')

        if not username:
            return jsonify({"message": "username is required"}), 401

        month          = data.get('month')
        monthly_budget = data.get('monthly_budget')
        daily_limit    = data.get('daily_limit')

        if not month or monthly_budget is None or daily_limit is None:
            return jsonify({"message": "missing required fields"}), 400

        models.set_budget(username, month, float(monthly_budget), float(daily_limit))

        budget_email_status = "not sent"
        profile = models.get_user_profile(username)
        if profile and profile.get("email"):
            welcome_sent, welcome_msg = _send_welcome_email(
                profile["email"],
                username=username,
                full_name=profile.get("full_name"),
                budget_month=month,
                monthly_budget=float(monthly_budget),
                daily_limit=float(daily_limit),
            )
            if welcome_sent:
                budget_email_status = "sent"
                if not profile.get("welcome_email_sent"):
                    models.mark_welcome_sent(username)
            else:
                budget_email_status = welcome_msg

        return jsonify({"message": "saved", "budget_email": budget_email_status})

    except Exception as e:
        print(f"Error in set_budget: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"message": f"Error: {str(e)}"}), 500


def process_month_end_savings(username):
    last_month = (date.today().replace(day=1) - timedelta(days=1)).strftime('%Y-%m')

    if models.has_savings_record(username, last_month):
        return

    # If there was no monthly budget set last month, do nothing
    conn = models.connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE username=?", (username,))
    user = cur.fetchone()
    if not user:
        conn.close()
        return

    user_id = user[0]
    cur.execute("SELECT monthly_budget FROM budgets WHERE user_id=? AND month=?", (user_id, last_month))
    row = cur.fetchone()
    conn.close()

    if not row:
        return

    monthly_budget = row[0]
    if monthly_budget is None or monthly_budget <= 0:
        return

    expenses_last_month = models.get_monthly_expense_total(username, last_month)
    remaining = monthly_budget - expenses_last_month

    if remaining > 0:
        models.add_savings(username, last_month, remaining)


def get_total_savings_till_now(username):
    # Savings already finalized for previous months.
    closed_savings = models.get_savings(username)

    # Add current month's positive remaining budget (live savings till now).
    current_month = date.today().strftime('%Y-%m')
    current_budget = models.get_budget(username, current_month)

    current_month_savings = 0
    if current_budget and current_budget[0] and current_budget[0] > 0:
        current_month_expense = models.get_monthly_expense_total(username, current_month)
        remaining = float(current_budget[0]) - float(current_month_expense)
        if remaining > 0:
            current_month_savings = remaining

    return float(closed_savings) + float(current_month_savings)


# ---------------- GET BUDGET ---------------- #

@app.route('/get-budget', methods=['GET'])
def get_budget():
    try:
        username = request.headers.get('X-Username')

        if not username:
            return jsonify({"message": "username is required"}), 401

        # close previous month in savings if eligible
        process_month_end_savings(username)

        budget = models.get_budget(username)
        savings_total = get_total_savings_till_now(username)

        if budget:
            return jsonify({
                "monthly_budget": budget[0],
                "daily_limit":    budget[1],
                "savings_total":  savings_total
            })

        return jsonify({
            "monthly_budget": 0,
            "daily_limit":    0,
            "savings_total":  savings_total
        })

    except Exception as e:
        print(f"Error in get_budget: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ---------------- GET SAVINGS ---------------- #

@app.route('/savings', methods=['GET'])
def get_savings():
    username = request.headers.get('X-Username')
    if not username:
        return jsonify({"message": "username is required"}), 401

    try:
        process_month_end_savings(username)
        total = get_total_savings_till_now(username)
        return jsonify({"savings_total": total})
    except Exception as e:
        print(f"Error in get_savings: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ---------------- SERVE FRONTEND ---------------- #

@app.route("/<path:path>")
def serve_frontend(path):
    return send_from_directory(FRONTEND_DIR, path)


# ---------------- RUN SERVER ---------------- #

if __name__ == "__main__":
    app.run(debug=True)
