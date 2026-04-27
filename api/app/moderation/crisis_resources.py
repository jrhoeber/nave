"""Crisis resource definitions returned when crisis_indicators is True."""
from typing import TypedDict


class CrisisResource(TypedDict):
    key: str
    name: str
    description: str
    contact: str


_RESOURCES: dict[str, CrisisResource] = {
    "988_lifeline": {
        "key": "988_lifeline",
        "name": "988 Suicide & Crisis Lifeline",
        "description": "Free, confidential 24/7 support for people in distress.",
        "contact": "Call or text 988",
    },
    "catholic_charities": {
        "key": "catholic_charities",
        "name": "Catholic Charities Counseling",
        "description": "Faith-based counseling referrals through your local Catholic Charities agency.",
        "contact": "catholiccharitiesusa.org",
    },
    "diocese_family_life": {
        "key": "diocese_family_life",
        "name": "Diocese Family Life Office",
        "description": "Your diocese's family life office can connect you with local Catholic counselors and support groups.",
        "contact": "Contact your local diocese",
    },
    "parish_priest": {
        "key": "parish_priest",
        "name": "Your Parish Priest",
        "description": "Your pastor is a trusted source of spiritual and personal support. You can reach out through your parish office.",
        "contact": "Contact your parish",
    },
}


def get_resources(keys: list[str]) -> list[CrisisResource]:
    """Return resource objects for the given keys."""
    return [_RESOURCES[k] for k in keys if k in _RESOURCES]


def get_all_resources() -> list[CrisisResource]:
    return list(_RESOURCES.values())
