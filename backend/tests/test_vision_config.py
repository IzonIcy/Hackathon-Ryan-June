"""provider resolution tests, no network"""

import pytest

from services.vision import (
    DEFAULT_BASE_URL,
    DEFAULT_HOSTED_MODEL,
    DEFAULT_LOCAL_MODEL,
    resolve_vision_config,
)


def test_defaults_to_openai_when_nothing_is_set():
    cfg = resolve_vision_config({})
    assert cfg.base_url == DEFAULT_BASE_URL == "https://api.openai.com/v1"
    assert cfg.model == DEFAULT_HOSTED_MODEL == "gpt-4o-mini"
    assert cfg.is_local is False
    assert cfg.api_key is None


def test_honors_openai_base_url():
    cfg = resolve_vision_config({"OPENAI_BASE_URL": "https://api.eaon.dev/v1/"})
    assert cfg.base_url == "https://api.eaon.dev/v1"
    assert cfg.chat_completions_url == "https://api.eaon.dev/v1/chat/completions"
    assert cfg.is_local is False


def test_localhost_is_local_and_defaults_to_a_local_model():
    cfg = resolve_vision_config({"OPENAI_BASE_URL": "http://localhost:11434/v1"})
    assert cfg.is_local is True
    assert cfg.model == DEFAULT_LOCAL_MODEL
    assert cfg.api_key is None


def test_compose_service_name_counts_as_local():
    cfg = resolve_vision_config({"OPENAI_BASE_URL": "http://ollama:11434/v1"})
    assert cfg.is_local is True
    assert cfg.chat_completions_url == "http://ollama:11434/v1/chat/completions"


def test_model_resolution_order():
    env = {
        "OPENAI_BASE_URL": "http://127.0.0.1:11434/v1",
        "OPENAI_MODEL": "llama3.2-vision",
    }
    assert resolve_vision_config(env).model == "llama3.2-vision"
    assert resolve_vision_config(env, model="qwen2.5vl").model == "qwen2.5vl"


def test_explicit_base_url_beats_the_environment():
    cfg = resolve_vision_config(
        {"OPENAI_BASE_URL": "https://api.openai.com/v1"},
        base_url="http://localhost:11434/v1",
    )
    assert cfg.base_url == "http://localhost:11434/v1"
    assert cfg.is_local is True


def test_api_key_resolution():
    env = {"OPENAI_API_KEY": "sk-from-env"}
    assert resolve_vision_config(env).api_key == "sk-from-env"
    assert resolve_vision_config(env, api_key="sk-explicit").api_key == "sk-explicit"


def test_empty_base_url_falls_back_to_the_default():
    cfg = resolve_vision_config({"OPENAI_BASE_URL": ""})
    assert cfg.base_url == DEFAULT_BASE_URL


@pytest.mark.parametrize(
    "bad",
    ["localhost:11434/v1", "ftp://example.com/v1", "not a url", "http://"],
)
def test_malformed_base_url_is_refused(bad):
    with pytest.raises(ValueError) as caught:
        resolve_vision_config({"OPENAI_BASE_URL": bad})

    message = str(caught.value)
    assert "OPENAI_BASE_URL" in message
    assert "http(s)" in message
    assert repr(bad) in message


def test_empty_model_is_refused():
    with pytest.raises(ValueError, match="OPENAI_MODEL"):
        resolve_vision_config({"OPENAI_MODEL": "   "})
