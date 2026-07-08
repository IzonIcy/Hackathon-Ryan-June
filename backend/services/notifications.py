"""sends texts when the ai sees something bad (scaring the user lol)"""

import os
from twilio.rest import Client

# just make the client once at startup (twilio is lowkey confusing ngl)
_sms_client = None


def _get_sms_client():
    """idk why this is a function instead of just doing it at the top but whatever"""
    global _sms_client
    if _sms_client is not None:
        return _sms_client

    sid = os.getenv("TWILIO_ACCOUNT_SID")
    key = os.getenv("TWILIO_API_KEY_SID")
    secret = os.getenv("TWILIO_API_KEY_SECRET")

    if not sid or not key or not secret:
        print("[sms] twilio not configured, skipping texts (no cap)")
        return None

    _sms_client = Client(key, secret, sid)
    return _sms_client


def send_alert(
    machine_name, status, severity, observation, probable_cause, recommended_action
):
    """sends a text about a problem. returns true if it worked (or false if it didnt lol).
    TODO: maybe add email too? idk seems like alot of work"""
    client = _get_sms_client()
    if client is None:
        return False

    from_num = os.getenv("TWILIO_PHONE_NUMBER")
    to_num = os.getenv("ALERT_PHONE_NUMBER")
    if not from_num or not to_num:
        print("[sms] phone numbers not set in .env (bro set up ur env)")
        return False

    # build the message (this is gonna give the user a heart attack lol)
    msg = f"FabOps Alert - {machine_name}\n"
    msg += f"Status: {status.upper()} ({severity})\n"
    msg += f"AI says: {observation[:120]}\n"
    if probable_cause:
        msg += f"Probable cause: {probable_cause[:80]}\n"
    msg += f"Recommended: {recommended_action[:80]}"

    try:
        client.messages.create(body=msg, from_=from_num, to=to_num)
        print(f"[sms] text sent to {to_num} (they gonna freak out fr fr)")
        return True
    except Exception as e:
        print(f"[sms] failed (twilio refund plz): {e}")
        return False
