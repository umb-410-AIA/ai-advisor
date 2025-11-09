#!/usr/bin/env python3

from __future__ import annotations

from typing import Any, Dict

from catalog_common import (
    build_arg_parser,
    clean_text,
    coalesce_statements,
    extract_noteworthy_sentences,
    extract_prereq_statements,
    load_json,
    normalize_path,
    write_json,
)

DEFAULT_INPUT = "data/course-catalog-scraper-2025-10-24.json"
DEFAULT_OUTPUT = "data/UMASS_BOSTON_coursecatalogstructured.json"


SESSION_FIELD_MAP = {
    "section": "section",
    "class_number": "class_number",
    "schedule/time": "schedule",
    "instructor": "instructor",
    "location": "location",
    "session": "session_type",
    "class dates": "dates",
    "status": "status",
    "credits": "credits",
}


def summarize_session(session: Dict[str, Any]) -> Dict[str, Any]:
    summary = {}
    for raw_key, output_key in SESSION_FIELD_MAP.items():
        value = clean_text(session.get(raw_key))
        if value:
            summary[output_key] = value
    notes = clean_text(session.get("class notes"))
    prereq = clean_text(session.get("pre requisites"))
    course_attrs = clean_text(session.get("course attributes"))
    if notes:
        summary["notes"] = notes
    if prereq:
        summary["session_prerequisites"] = prereq
    if course_attrs:
        summary["course_attributes"] = course_attrs
    return summary


def transform_entry(course_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    descriptors = data.get("course_descriptors") or {}
    description = clean_text(descriptors.get("description"))
    prereq_field = descriptors.get("pre requisites")

    prereqs = coalesce_statements(
        extract_prereq_statements(prereq_field, description)
    )
    notes = extract_noteworthy_sentences(description)

    descriptor_extras = {
        key: clean_text(value)
        for key, value in descriptors.items()
        if key not in {"description", "pre requisites"} and clean_text(value)
    }

    sessions_raw = data.get("sessions") or []
    sessions = [
        summary for summary in (summarize_session(session) for session in sessions_raw)
        if summary
    ]

    other = {}
    if descriptor_extras:
        other["descriptors"] = descriptor_extras
    if notes:
        other["notes"] = notes
    if sessions:
        other["sessions"] = sessions

    return {
        "coursename": clean_text(data.get("title")) or None,
        "courseid": clean_text(data.get("id") or course_id) or None,
        "coursedescription": description or None,
        "course-prerequsities": prereqs,
        "other": other or None,
    }


def main() -> None:
    parser = build_arg_parser(DEFAULT_INPUT, DEFAULT_OUTPUT)
    args = parser.parse_args()
    input_path = normalize_path(args.input)
    output_path = normalize_path(args.output)

    raw_data = load_json(input_path)
    if not isinstance(raw_data, dict):
        raise ValueError("UMass catalog input must be a dictionary of courses.")

    structured = [
        transform_entry(course_id, payload) for course_id, payload in raw_data.items()
    ]
    write_json(output_path, structured)
    print(f"Processed {len(structured)} UMass Boston courses -> {output_path}")


if __name__ == "__main__":
    main()
