"""Unit tests for the moderation orchestrator.

All external API calls (OpenAI, Anthropic) are mocked.
Run integration tests with: RUN_INTEGRATION_TESTS=1 pytest tests/moderation/
"""
import asyncio
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

FIXTURES_PATH = Path(__file__).parent / "fixtures.json"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _make_l1(hard_block=False, soft_flag=False, review_flag=False):
    m = MagicMock()
    m.hard_block = hard_block
    m.soft_flag = soft_flag
    m.review_flag = review_flag
    m.scores = {}
    return m


def _make_l2(decision="allow", confidence=0.95, crisis=False, resources=None):
    from app.moderation.claude_moderator import ClaudeModerationResult
    return ClaudeModerationResult(
        decision=decision,
        category="other",
        confidence=confidence,
        reasoning="test",
        crisis_indicators=crisis,
        suggested_resources=resources or [],
        input_tokens=100,
        output_tokens=50,
    )


# ── Orchestrator unit tests ────────────────────────────────────────────────────

class TestOrchestratorDecisionLogic:
    """Test the orchestrator's decision routing without real API calls."""

    @pytest.mark.asyncio
    async def test_allow_when_both_clean(self):
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1())),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(return_value=_make_l2("allow", 0.95))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("Please pray for my mom", "post", "user-123")
            assert result.action == "allow"
            assert not result.crisis

    @pytest.mark.asyncio
    async def test_block_on_layer1_hard(self):
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1(hard_block=True))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("bad content", "post", "user-123")
            assert result.action == "block"

    @pytest.mark.asyncio
    async def test_block_on_layer2_reject(self):
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1())),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(return_value=_make_l2("reject", 0.95))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("harassment content", "post", "user-123")
            assert result.action == "block"

    @pytest.mark.asyncio
    async def test_queue_on_layer2_review(self):
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1())),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(return_value=_make_l2("review", 0.6))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("ambiguous content", "post", "user-123")
            assert result.action == "queue"

    @pytest.mark.asyncio
    async def test_queue_when_allow_low_confidence(self):
        """Allow with confidence < 0.8 should still queue."""
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1())),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(return_value=_make_l2("allow", 0.6))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("borderline content", "post", "user-123")
            assert result.action == "queue"

    @pytest.mark.asyncio
    async def test_queue_when_layer1_soft_flag_even_if_claude_allows(self):
        """Layer 1 soft flag + Claude allow → queue."""
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1(soft_flag=True))),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(return_value=_make_l2("allow", 0.95))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("edge case", "post", "user-123")
            assert result.action == "queue"

    @pytest.mark.asyncio
    async def test_crisis_propagates_on_allow(self):
        """crisis_indicators=True should propagate even when action=allow."""
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1())),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(
                return_value=_make_l2("allow", 0.95, crisis=True, resources=["988_lifeline"])
            )),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("struggling text", "post", "user-123")
            assert result.crisis is True
            assert len(result.crisis_resources) > 0

    @pytest.mark.asyncio
    async def test_layer1_result_attached_on_block(self):
        """Layer results are returned on the result object for the caller to queue."""
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1(hard_block=True))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("bad content", "post", "user-123")
            assert result.action == "block"
            assert result.layer1_result is not None
            assert result.layer1_result["hard_block"] is True

    @pytest.mark.asyncio
    async def test_layer1_error_defaults_to_queue(self):
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(side_effect=RuntimeError("API down"))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("some content", "post", "user-123")
            assert result.action == "queue"

    @pytest.mark.asyncio
    async def test_layer2_error_defaults_to_queue(self):
        with (
            patch("app.moderation.moderate.check_openai_moderation", new=AsyncMock(return_value=_make_l1())),
            patch("app.moderation.moderate.evaluate_with_claude", new=AsyncMock(side_effect=RuntimeError("timeout"))),
        ):
            from app.moderation.moderate import moderate_content
            result = await moderate_content("some content", "post", "user-123")
            assert result.action == "queue"

    @pytest.mark.asyncio
    async def test_moderation_disabled(self, monkeypatch):
        from app.config import settings
        monkeypatch.setattr(settings, "moderation_enabled", False)
        from app.moderation.moderate import moderate_content
        result = await moderate_content("anything at all", "post", "user-123")
        assert result.action == "allow"


# ── OpenAI prefilter unit tests ────────────────────────────────────────────────

class TestOpenAIPrefilter:
    def test_hard_block_on_sexual_minors(self):
        from app.moderation.openai_prefilter import (
            HARD_BLOCK_THRESHOLDS,
            _exceeds_any,
        )
        scores = {"sexual/minors": 0.1}  # above 0.05 threshold
        assert _exceeds_any(scores, HARD_BLOCK_THRESHOLDS)

    def test_no_block_below_threshold(self):
        from app.moderation.openai_prefilter import HARD_BLOCK_THRESHOLDS, _exceeds_any
        scores = {"sexual/minors": 0.01}  # below 0.05 threshold
        assert not _exceeds_any(scores, HARD_BLOCK_THRESHOLDS)

    def test_soft_flag_on_harassment(self):
        from app.moderation.openai_prefilter import SOFT_FLAG_THRESHOLDS, _exceeds_any
        scores = {"harassment": 0.5}  # above 0.4 threshold
        assert _exceeds_any(scores, SOFT_FLAG_THRESHOLDS)


# ── Claude moderator unit tests ────────────────────────────────────────────────

class TestClaudeModerator:
    @pytest.mark.asyncio
    async def test_malformed_json_defaults_to_review(self):
        """When Claude returns garbage, default to review."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="not json at all")]
        mock_response.usage = MagicMock(input_tokens=100, output_tokens=50)

        with patch("anthropic.AsyncAnthropic") as MockClient:
            instance = MockClient.return_value
            instance.messages.create = AsyncMock(return_value=mock_response)

            with patch("app.config.settings") as mock_settings:
                mock_settings.anthropic_api_key = "test-key"
                from app.moderation.claude_moderator import evaluate_with_claude
                result = await evaluate_with_claude("test text", "post")

            assert result.decision == "review"
            assert result.malformed is True

    @pytest.mark.asyncio
    async def test_valid_json_parsed_correctly(self):
        valid_json = json.dumps({
            "decision": "allow",
            "category": "prayer_request",
            "confidence": 0.97,
            "reasoning": "Legitimate prayer request",
            "crisis_indicators": False,
            "suggested_resources": [],
        })
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=valid_json)]
        mock_response.usage = MagicMock(input_tokens=200, output_tokens=80)

        with patch("anthropic.AsyncAnthropic") as MockClient:
            instance = MockClient.return_value
            instance.messages.create = AsyncMock(return_value=mock_response)

            with patch("app.config.settings") as mock_settings:
                mock_settings.anthropic_api_key = "test-key"
                from app.moderation.claude_moderator import evaluate_with_claude
                result = await evaluate_with_claude("Please pray for my mom", "prayer_request")

            assert result.decision == "allow"
            assert result.category == "prayer_request"
            assert result.confidence == pytest.approx(0.97)
            assert not result.crisis_indicators


# ── Crisis resources unit tests ────────────────────────────────────────────────

class TestCrisisResources:
    def test_returns_known_resources(self):
        from app.moderation.crisis_resources import get_resources
        resources = get_resources(["988_lifeline", "catholic_charities"])
        assert len(resources) == 2
        keys = {r["key"] for r in resources}
        assert "988_lifeline" in keys
        assert "catholic_charities" in keys

    def test_unknown_key_skipped(self):
        from app.moderation.crisis_resources import get_resources
        resources = get_resources(["unknown_key", "988_lifeline"])
        assert len(resources) == 1


# ── Integration tests (guarded by env flag) ────────────────────────────────────

@pytest.mark.skipif(
    not os.getenv("RUN_INTEGRATION_TESTS"),
    reason="Set RUN_INTEGRATION_TESTS=1 to run integration tests (uses real API credits)",
)
class TestIntegration:
    @pytest.mark.asyncio
    async def test_fixtures(self):
        """Run a subset of fixtures against real APIs."""
        fixtures = json.loads(FIXTURES_PATH.read_text())["fixtures"]
        # Only run a few to save credits
        subset = [f for f in fixtures if f["id"] in (
            "allow_cancer_prayer", "block_slur", "review_active_crisis"
        )]
        from app.moderation.moderate import moderate_content

        for fixture in subset:
            result = await moderate_content(
                text=fixture["text"],
                context_type=fixture["context_type"],
                user_id="00000000-0000-0000-0000-000000000001",
            )
            assert result.action == fixture["expected_action"], (
                f"Fixture '{fixture['id']}': expected {fixture['expected_action']!r}, got {result.action!r}"
            )
            if fixture["expected_crisis"]:
                assert result.crisis, f"Fixture '{fixture['id']}': expected crisis=True"
