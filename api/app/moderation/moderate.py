"""Orchestrator — runs all moderation layers and returns a final action."""
import logging
import time
from typing import Literal, Optional

from app.moderation.claude_moderator import ContextType, evaluate_with_claude
from app.moderation.openai_prefilter import check_openai_moderation

logger = logging.getLogger("nave.moderation")

ModerationAction = Literal["allow", "block", "queue"]


class ModerationResult:
    __slots__ = (
        "action",
        "reasoning",
        "crisis",
        "crisis_resources",
        "layer1_result",
        "layer2_result",
    )

    def __init__(
        self,
        action: ModerationAction,
        reasoning: str,
        crisis: bool = False,
        crisis_resources: Optional[list] = None,
        layer1_result: Optional[dict] = None,
        layer2_result: Optional[dict] = None,
    ):
        self.action = action
        self.reasoning = reasoning
        self.crisis = crisis
        self.crisis_resources = crisis_resources or []
        self.layer1_result = layer1_result
        self.layer2_result = layer2_result


async def moderate_content(
    text: str,
    context_type: ContextType,
    user_id: str,
) -> ModerationResult:
    """Run all moderation layers and return a decision.

    Never raises — on any external error, defaults to action='queue'.
    Does NOT write to the queue; callers handle that so they can include
    the content_id after their INSERT.
    """
    from app.config import settings

    if not settings.moderation_enabled:
        return ModerationResult(action="allow", reasoning="Moderation disabled")

    start = time.perf_counter()
    layer1_result: Optional[dict] = None
    layer2_result: Optional[dict] = None

    # ── Layer 1: OpenAI pre-filter ──────────────────────────────────────────
    layer1_start = time.perf_counter()
    try:
        l1 = await check_openai_moderation(text)
        layer1_ms = (time.perf_counter() - layer1_start) * 1000
        layer1_result = {
            "hard_block": l1.hard_block,
            "soft_flag": l1.soft_flag,
            "review_flag": l1.review_flag,
            "scores": {k: round(v, 4) for k, v in l1.scores.items() if v > 0.01},
        }
        logger.info(
            "Layer 1: hard_block=%s soft_flag=%s review_flag=%s (%.0fms)",
            l1.hard_block, l1.soft_flag, l1.review_flag, layer1_ms,
        )

        if l1.hard_block:
            _log_decision("block", True, None, False, (time.perf_counter() - start) * 1000, 0, 0)
            return ModerationResult(
                action="block",
                reasoning="Blocked by pre-filter (hard category threshold exceeded)",
                layer1_result=layer1_result,
            )

        layer1_flagged = l1.soft_flag or l1.review_flag

    except Exception:
        layer1_ms = (time.perf_counter() - layer1_start) * 1000
        logger.exception("Layer 1 (OpenAI) failed (%.0fms) — routing to queue", layer1_ms)
        return ModerationResult(
            action="queue",
            reasoning="Layer 1 error — queued for review",
            layer1_result={"error": "layer1_failed"},
        )

    # ── Layer 2: Claude Haiku ────────────────────────────────────────────────
    layer2_start = time.perf_counter()
    try:
        l2 = await evaluate_with_claude(text, context_type)
        layer2_ms = (time.perf_counter() - layer2_start) * 1000
        layer2_result = {
            "decision": l2.decision,
            "category": l2.category,
            "confidence": l2.confidence,
            "reasoning": l2.reasoning,
            "crisis_indicators": l2.crisis_indicators,
            "suggested_resources": l2.suggested_resources,
            "input_tokens": l2.input_tokens,
            "output_tokens": l2.output_tokens,
            "malformed": l2.malformed,
        }
        logger.info(
            "Layer 2: decision=%s confidence=%.2f crisis=%s (%.0fms)",
            l2.decision, l2.confidence, l2.crisis_indicators, layer2_ms,
        )

        crisis = l2.crisis_indicators
        crisis_resources = []
        if crisis:
            from app.moderation.crisis_resources import get_resources
            crisis_resources = get_resources(l2.suggested_resources)

        if l2.decision == "reject":
            action: ModerationAction = "block"
        elif l2.decision == "allow" and not layer1_flagged and l2.confidence >= 0.8:
            action = "allow"
        else:
            action = "queue"

        _log_decision(
            action,
            layer1_flagged,
            l2.decision,
            crisis,
            (time.perf_counter() - start) * 1000,
            l2.input_tokens,
            l2.output_tokens,
        )
        return ModerationResult(
            action=action,
            reasoning=l2.reasoning,
            crisis=crisis,
            crisis_resources=crisis_resources,
            layer1_result=layer1_result,
            layer2_result=layer2_result,
        )

    except Exception:
        layer2_ms = (time.perf_counter() - layer2_start) * 1000
        logger.exception("Layer 2 (Claude) failed (%.0fms) — routing to queue", layer2_ms)
        return ModerationResult(
            action="queue",
            reasoning="Layer 2 error — queued for review",
            layer1_result=layer1_result,
            layer2_result={"error": "layer2_failed"},
        )


def _log_decision(
    action: str,
    layer1_flagged: bool,
    layer2_decision: Optional[str],
    crisis: bool,
    latency_ms: float,
    input_tokens: int,
    output_tokens: int,
) -> None:
    logger.info(
        "moderation.decision action=%s layer1_flagged=%s layer2_decision=%s crisis=%s "
        "latency_ms=%.0f input_tokens=%d output_tokens=%d",
        action, layer1_flagged, layer2_decision, crisis,
        latency_ms, input_tokens, output_tokens,
    )
