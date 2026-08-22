"""tests for the alert cooldown + async analysis pipeline"""

import pytest

from services import notifications


@pytest.fixture(autouse=True)
def clean_cooldowns():
    notifications.reset_alert_cooldowns()
    yield
    notifications.reset_alert_cooldowns()


def test_first_alert_always_allowed():
    assert notifications.should_send_alert(job_id=1, status="warning") is True


def test_repeat_alert_within_cooldown_blocked():
    assert notifications.should_send_alert(1, "warning") is True
    notifications.mark_alert_sent(1, "warning")
    assert notifications.should_send_alert(1, "warning") is False


def test_cooldown_window_expires(monkeypatch):
    clock = {"t": 1000.0}
    monkeypatch.setattr(notifications.time, "monotonic", lambda: clock["t"])

    assert notifications.should_send_alert(2, "warning") is True
    notifications.mark_alert_sent(2, "warning")
    assert notifications.should_send_alert(2, "warning") is False

    clock["t"] += 601  # default cooldown is 600s
    assert notifications.should_send_alert(2, "warning") is True


def test_stop_severity_bypasses_cooldown():
    notifications.mark_alert_sent(3, "stop")
    # a crashed print is worth repeat texts
    assert notifications.should_send_alert(3, "stop") is True


def test_statuses_tracked_independently():
    notifications.mark_alert_sent(4, "warning")
    assert notifications.should_send_alert(4, "stop") is True
    assert notifications.should_send_alert(4, "warning") is False


def test_env_overrides_cooldown(monkeypatch):
    monkeypatch.setenv("ALERT_COOLDOWN_SECONDS", "30")
    assert notifications._cooldown_seconds() == 30

    monkeypatch.setenv("ALERT_COOLDOWN_SECONDS", "garbage")
    assert notifications._cooldown_seconds() == notifications.DEFAULT_COOLDOWN_SECONDS
