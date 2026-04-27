"""Layer 1 — OpenAI Moderation API pre-filter."""
import asyncio
import logging
from typing import Any

logger = logging.getLogger("nave.moderation.openai")

# Thresholds: categories that, when exceeded, trigger a hard block or soft flag.
# self-harm is deliberately absent from HARD_BLOCK — it goes to human review only
# (prayer requests legitimately involve discussing self-harm in others or past self).
HARD_BLOCK_THRESHOLDS: dict[str, float] = {
    "sexual/minors": 0.05,
    "sexual": 0.3,
    "hate/threatening": 0.15,
    "violence/graphic": 0.4,
}

SOFT_FLAG_THRESHOLDS: dict[str, float] = {
    "harassment": 0.4,
    "harassment/threatening": 0.2,
    "hate": 0.3,
    "violence": 0.5,
}

# self-harm: flag for human review only — never auto-block
REVIEW_ONLY_THRESHOLDS: dict[str, float] = {
    "self-harm": 0.3,
    "self-harm/intent": 0.2,
    "self-harm/instructions": 0.1,
}


class OpenAIPrefilterResult:
    __slots__ = ("hard_block", "soft_flag", "review_flag", "categories", "scores")

    def __init__(
        self,
        hard_block: bool,
        soft_flag: bool,
        review_flag: bool,
        categories: dict[str, bool],
        scores: dict[str, float],
    ):
        self.hard_block = hard_block
        self.soft_flag = soft_flag
        self.review_flag = review_flag
        self.categories = categories
        self.scores = scores


async def check_openai_moderation(text: str) -> OpenAIPrefilterResult:
    """Call the OpenAI Moderation API and classify the result.

    Returns an OpenAIPrefilterResult. On any error, raises so the caller can
    default to 'queue' rather than silently allowing.
    """
    from app.config import settings

    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY not configured")

    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    response = await asyncio.wait_for(
        client.moderations.create(model="omni-moderation-latest", input=text),
        timeout=5.0,
    )

    result = response.results[0]
    scores: dict[str, float] = _extract_scores(result)
    categories: dict[str, bool] = _extract_categories(result)

    hard_block = _exceeds_any(scores, HARD_BLOCK_THRESHOLDS)
    soft_flag = _exceeds_any(scores, SOFT_FLAG_THRESHOLDS)
    review_flag = _exceeds_any(scores, REVIEW_ONLY_THRESHOLDS)

    logger.debug(
        "OpenAI moderation: hard_block=%s soft_flag=%s review_flag=%s scores=%s",
        hard_block,
        soft_flag,
        review_flag,
        {k: round(v, 3) for k, v in scores.items() if v > 0.01},
    )

    return OpenAIPrefilterResult(
        hard_block=hard_block,
        soft_flag=soft_flag,
        review_flag=review_flag,
        categories=categories,
        scores=scores,
    )


def _exceeds_any(scores: dict[str, float], thresholds: dict[str, float]) -> bool:
    return any(scores.get(cat, 0.0) > threshold for cat, threshold in thresholds.items())


def _extract_scores(result: Any) -> dict[str, float]:
    """Pull category_scores from the moderation result into a flat dict."""
    raw = result.category_scores
    # The SDK returns a CategoryScores object; convert to dict via model_dump if available
    if hasattr(raw, "model_dump"):
        return {k: float(v) for k, v in raw.model_dump().items() if v is not None}
    return vars(raw) if hasattr(raw, "__dict__") else {}


def _extract_categories(result: Any) -> dict[str, bool]:
    raw = result.categories
    if hasattr(raw, "model_dump"):
        return {k: bool(v) for k, v in raw.model_dump().items() if v is not None}
    return vars(raw) if hasattr(raw, "__dict__") else {}
