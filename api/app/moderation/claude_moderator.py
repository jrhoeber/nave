"""Layer 2 — Claude Haiku 4.5 contextual moderator."""
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Literal

logger = logging.getLogger("nave.moderation.claude")

_POLICY_PATH = Path(__file__).parent / "policy.md"

ContextType = Literal["post", "prayer_request", "comment"]

ModerationDecision = Literal["allow", "review", "reject"]
ModerationCategory = Literal[
    "spiritual_struggle",
    "prayer_request",
    "theological_discussion",
    "harassment",
    "blasphemy",
    "sexual",
    "self_harm_concern",
    "spam",
    "other",
]


class ClaudeModerationResult:
    __slots__ = (
        "decision",
        "category",
        "confidence",
        "reasoning",
        "crisis_indicators",
        "suggested_resources",
        "input_tokens",
        "output_tokens",
        "malformed",
    )

    def __init__(
        self,
        decision: ModerationDecision,
        category: ModerationCategory,
        confidence: float,
        reasoning: str,
        crisis_indicators: bool,
        suggested_resources: list[str],
        input_tokens: int = 0,
        output_tokens: int = 0,
        malformed: bool = False,
    ):
        self.decision = decision
        self.category = category
        self.confidence = confidence
        self.reasoning = reasoning
        self.crisis_indicators = crisis_indicators
        self.suggested_resources = suggested_resources
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens
        self.malformed = malformed


_FALLBACK = ClaudeModerationResult(
    decision="review",
    category="other",
    confidence=0.0,
    reasoning="Malformed response from Claude — defaulting to review",
    crisis_indicators=False,
    suggested_resources=[],
    malformed=True,
)


async def evaluate_with_claude(
    text: str, context_type: ContextType
) -> ClaudeModerationResult:
    """Run Layer 2 moderation using Claude Haiku 4.5 with prompt caching."""
    from app.config import settings

    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")

    import anthropic

    policy_text = _POLICY_PATH.read_text(encoding="utf-8")

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    user_message = (
        f"Content type: {context_type}\n\n"
        f"Content to evaluate:\n{text}"
    )

    response = await asyncio.wait_for(
        client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=300,
            temperature=0.0,
            system=[
                {
                    "type": "text",
                    "text": policy_text,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {"role": "user", "content": user_message},
                {"role": "assistant", "content": "{"},
            ],
        ),
        timeout=10.0,
    )

    input_tokens = response.usage.input_tokens if response.usage else 0
    output_tokens = response.usage.output_tokens if response.usage else 0

    raw_text = response.content[0].text if response.content else ""

    try:
        # Prepend the "{" we used as assistant prefill
        clean = "{" + raw_text.strip()
        # Strip markdown code fences if present
        if clean.startswith("{```"):
            clean = clean[1:].strip()
            clean = clean.split("```", 2)[1]
            if clean.startswith("json"):
                clean = clean[4:]
            clean = clean.rsplit("```", 1)[0]

        data = json.loads(clean)
        result = ClaudeModerationResult(
            decision=data.get("decision", "review"),
            category=data.get("category", "other"),
            confidence=float(data.get("confidence", 0.5)),
            reasoning=data.get("reasoning", ""),
            crisis_indicators=bool(data.get("crisis_indicators", False)),
            suggested_resources=data.get("suggested_resources") or [],
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
        logger.debug(
            "Claude moderation: decision=%s category=%s confidence=%.2f crisis=%s",
            result.decision,
            result.category,
            result.confidence,
            result.crisis_indicators,
        )
        return result
    except Exception:
        logger.warning(
            "Claude returned malformed JSON (len=%d): %r", len(raw_text), raw_text[:200]
        )
        return ClaudeModerationResult(
            decision="review",
            category="other",
            confidence=0.0,
            reasoning="Malformed response — defaulting to review",
            crisis_indicators=False,
            suggested_resources=[],
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            malformed=True,
        )
