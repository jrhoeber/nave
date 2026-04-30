"""Image moderation using Google Cloud Vision SafeSearch.

Thresholds are tuned for Nave: a Catholic prayer community serving adults and
older teens (13+). Violence thresholds are more lenient than adult/racy thresholds
to accommodate religious art that depicts the Passion, martyrdom, and suffering.
"""
import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Literal

logger = logging.getLogger("nave.moderation.image")

ImageModerationAction = Literal["allow", "review", "block"]

# SafeSearch likelihood name → integer level (matches Vision API enum order)
_LIKELIHOOD_TO_INT: dict[str, int] = {
    "UNKNOWN": 0,
    "VERY_UNLIKELY": 1,
    "UNLIKELY": 2,
    "POSSIBLE": 3,
    "LIKELY": 4,
    "VERY_LIKELY": 5,
}

# Categories checked and their block / review thresholds (integer likelihood level).
# medical and spoof are ignored — prayer for the sick is common, and spoofs are not
# a community-safety concern for this audience.
_BLOCK_THRESHOLDS: dict[str, int] = {
    "adult": 4,     # LIKELY — zero tolerance for sexual content
    "racy": 4,      # LIKELY
    "violence": 5,  # VERY_LIKELY only — religious art depicts crucifixion and suffering
}
_REVIEW_THRESHOLDS: dict[str, int] = {
    "adult": 3,     # POSSIBLE
    "racy": 3,      # POSSIBLE
    "violence": 4,  # LIKELY
}


@dataclass
class ImageModerationResult:
    action: ImageModerationAction
    scores: dict[str, str] = field(default_factory=dict)  # category → likelihood name
    reasoning: str = ""


def _evaluate_annotation(annotation) -> ImageModerationResult:
    """Map a SafeSearchAnnotation to a moderation decision."""
    scores = {
        "adult": annotation.adult.name,
        "racy": annotation.racy.name,
        "violence": annotation.violence.name,
        "medical": annotation.medical.name,
        "spoof": annotation.spoof.name,
    }
    levels = {cat: _LIKELIHOOD_TO_INT.get(scores[cat], 0) for cat in _BLOCK_THRESHOLDS}

    for category, level in levels.items():
        if level >= _BLOCK_THRESHOLDS[category]:
            return ImageModerationResult(
                action="block",
                scores=scores,
                reasoning=f"Blocked: {category} content detected ({scores[category]})",
            )

    for category, level in levels.items():
        if level >= _REVIEW_THRESHOLDS[category]:
            return ImageModerationResult(
                action="review",
                scores=scores,
                reasoning=f"Flagged for review: {category} content detected ({scores[category]})",
            )

    return ImageModerationResult(
        action="allow",
        scores=scores,
        reasoning="Image passed SafeSearch moderation",
    )


def _call_vision_api(image_bytes: bytes) -> ImageModerationResult:
    """Blocking Vision API call — run via asyncio.to_thread."""
    from google.cloud import vision

    client = vision.ImageAnnotatorClient()
    image = vision.Image(content=image_bytes)
    response = client.safe_search_detection(image=image)

    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    return _evaluate_annotation(response.safe_search_annotation)


async def check_image_or_raise(
    conn,
    *,
    image_bytes: bytes,
    user_id: str,
    context_type: str,
    detail: str = "This content can't be posted in our community. If you believe this is a mistake, please contact us.",
) -> None:
    """Moderate image_bytes and raise HTTP 422 if it doesn't pass.

    On block or review: logs to moderation_queue then raises HTTPException.
    On allow: returns normally.
    """
    from fastapi import HTTPException

    from app.moderation.review_queue import add_to_queue

    result = await moderate_image(image_bytes)
    if result.action in ("block", "review"):
        logger.warning(
            "safesearch.%s user_id=%s context_type=%s reasoning=%r",
            result.action, user_id, context_type, result.reasoning,
        )
        try:
            await add_to_queue(
                conn,
                user_id=user_id,
                context_type=context_type,
                image_result={
                    "action": result.action,
                    "scores": result.scores,
                    "reasoning": result.reasoning,
                },
                final_action=result.action,
            )
        except Exception:
            pass
        raise HTTPException(status_code=422, detail=detail)


async def moderate_image(image_bytes: bytes) -> ImageModerationResult:
    """Run Cloud Vision SafeSearch on raw image bytes.

    Never raises — on any external error, defaults to action='review' so that
    uncertain images go to the human review queue rather than slipping through.
    """
    from app.config import settings

    if not settings.moderation_enabled:
        return ImageModerationResult(action="allow", reasoning="Moderation disabled")

    start = time.perf_counter()
    try:
        result = await asyncio.to_thread(_call_vision_api, image_bytes)
        latency_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "safesearch action=%s latency_ms=%.0f "
            "adult=%s racy=%s violence=%s medical=%s spoof=%s reasoning=%r",
            result.action, latency_ms,
            result.scores.get("adult"), result.scores.get("racy"),
            result.scores.get("violence"), result.scores.get("medical"),
            result.scores.get("spoof"), result.reasoning,
        )
        return result
    except Exception:
        latency_ms = (time.perf_counter() - start) * 1000
        logger.exception("safesearch failed latency_ms=%.0f — routing to review", latency_ms)
        return ImageModerationResult(
            action="review",
            scores={},
            reasoning="SafeSearch error — flagged for review",
        )
