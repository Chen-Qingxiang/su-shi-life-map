#!/usr/bin/env python3
"""Validate seed people, relation, event, and work data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_place_keys() -> set[str]:
    life_locations = load_json(DATA / "su-shi-life-locations.geojson")
    place_keys: set[str] = set()
    for feature in life_locations.get("features", []):
        properties = feature.get("properties") or {}
        if properties.get("kind") == "stop" and properties.get("place_key"):
            place_keys.add(properties["place_key"])
    return place_keys


def require_list(value: Any, label: str, errors: list[str]) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        errors.append(f"{label}: expected a JSON array")
        return []
    objects = []
    for index, item in enumerate(value):
        if not isinstance(item, dict):
            errors.append(f"{label}[{index}]: expected an object")
        else:
            objects.append(item)
    return objects


def collect_unique_ids(items: list[dict[str, Any]], id_field: str, label: str, errors: list[str]) -> set[str]:
    seen: set[str] = set()
    for index, item in enumerate(items):
        item_id = item.get(id_field)
        if not item_id:
            errors.append(f"{label}[{index}]: missing {id_field}")
        elif item_id in seen:
            errors.append(f"{label}[{index}]: duplicate {id_field} {item_id!r}")
        else:
            seen.add(item_id)
    return seen


def validate_place_keys(values: Any, known_place_keys: set[str], label: str, errors: list[str]) -> None:
    if values is None:
        return
    if not isinstance(values, list):
        errors.append(f"{label}: expected a list")
        return
    for place_key in values:
        if place_key not in known_place_keys:
            errors.append(f"{label}: unknown place_key {place_key!r}")


def validate_required_place_key(value: Any, known_place_keys: set[str], label: str, errors: list[str]) -> None:
    if value not in known_place_keys:
        errors.append(f"{label}: unknown place_key {value!r}")


def validate_id_list(values: Any, known_ids: set[str], label: str, errors: list[str]) -> None:
    if not isinstance(values, list):
        errors.append(f"{label}: expected a list")
        return
    for item_id in values:
        if item_id not in known_ids:
            errors.append(f"{label}: unknown id {item_id!r}")


def main() -> int:
    errors: list[str] = []
    place_keys = load_place_keys()

    people = require_list(load_json(DATA / "sushi-people.json"), "sushi-people.json", errors)
    relations = require_list(load_json(DATA / "sushi-relations.json"), "sushi-relations.json", errors)
    events = require_list(load_json(DATA / "sushi-events.json"), "sushi-events.json", errors)
    works = require_list(load_json(DATA / "sushi-works.json"), "sushi-works.json", errors)

    person_ids = collect_unique_ids(people, "person_id", "person", errors)
    relation_ids = collect_unique_ids(relations, "relation_id", "relation", errors)
    event_ids = collect_unique_ids(events, "event_id", "event", errors)
    work_ids = collect_unique_ids(works, "work_id", "work", errors)

    for person in people:
        person_id = person.get("person_id", "<missing>")
        native_place_key = person.get("native_place_key")
        if native_place_key is not None and native_place_key not in place_keys:
            errors.append(f"person {person_id}: unknown native_place_key {native_place_key!r}")
        validate_place_keys(person.get("related_place_keys", []), place_keys, f"person {person_id}.related_place_keys", errors)

    for relation in relations:
        relation_id = relation.get("relation_id", "<missing>")
        for field in ("source_person_id", "target_person_id"):
            person_id = relation.get(field)
            if person_id not in person_ids:
                errors.append(f"relation {relation_id}: unknown {field} {person_id!r}")
        validate_place_keys(relation.get("related_place_keys", []), place_keys, f"relation {relation_id}.related_place_keys", errors)

    for event in events:
        event_id = event.get("event_id", "<missing>")
        validate_required_place_key(event.get("place_key"), place_keys, f"event {event_id}.place_key", errors)
        validate_id_list(event.get("people", []), person_ids, f"event {event_id}.people", errors)
        validate_id_list(event.get("works", []), work_ids, f"event {event_id}.works", errors)

    for work in works:
        work_id = work.get("work_id", "<missing>")
        place_key = work.get("place_key")
        event_id = work.get("event_id")
        if place_key is not None and place_key not in place_keys:
            errors.append(f"work {work_id}: unknown place_key {place_key!r}")
        if event_id is not None and event_id not in event_ids:
            errors.append(f"work {work_id}: unknown event_id {event_id!r}")

    if errors:
        print("Knowledge data validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(
        "Validated "
        f"{len(person_ids)} people, "
        f"{len(relation_ids)} relations, "
        f"{len(event_ids)} events, and "
        f"{len(work_ids)} works."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
