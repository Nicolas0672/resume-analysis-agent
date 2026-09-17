from __future__ import annotations

import inspect
import json
import sys
import types
from pathlib import Path
from typing import Any, Union, get_args, get_origin

from pydantic import BaseModel
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))
# Adjust this import to wherever these models actually live.
from backend.agent.model import (
    CandidateAnalysis,
    CandidateGap,
    CandidateStrength,
    Evidence,
    EvidenceMapping,
    EvidenceMappingResult,
    EvidenceWithDetails,
    Feedback,
    Feedbacks,
    InvestigateOutput,
    InterviewDetails,
    InterviewPlan,
    RegeneratedBullets,
    RegeneratedBulletsList,
    ResumeReference,
    TailorAnalysis,
    TailorDecisionMatched,
    TailorDecisionUnmatched,
    TailorMatched,
    TailorMatchList,
    TailorUnmatched,
    TailorUnmatchedList,
)

# ---------------------------------------------------------------------
# Root models
# ---------------------------------------------------------------------

ROOT_MODELS = [
    CandidateAnalysis,
    InterviewPlan,
    InvestigateOutput,
    EvidenceMappingResult,
    TailorAnalysis,
    Feedbacks,
    RegeneratedBulletsList,
]


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------

def type_name(annotation: Any) -> str:
    """
    Convert a Python/Pydantic annotation into a readable type string.
    """

    if annotation is None:
        return "None"

    origin = get_origin(annotation)
    args = get_args(annotation)

    # list[str], list[Foo], etc.
    if origin is list:
        if args:
            return f"list[{type_name(args[0])}]"
        return "list"

    # Optional[T] / Union[T, None]
    if origin in (Union, types.UnionType):
        non_none = [arg for arg in args if arg is not type(None)]

        if len(non_none) == 1:
            return f"Optional[{type_name(non_none[0])}]"

        return " | ".join(type_name(arg) for arg in args)

    # Literal["foo", "bar"]
    if str(origin) == "typing.Literal":
        values = ", ".join(repr(arg) for arg in args)
        return f"Literal[{values}]"

    if inspect.isclass(annotation):
        return annotation.__name__

    return str(annotation).replace("typing.", "")


def referenced_models(annotation: Any) -> list[type[BaseModel]]:
    """
    Recursively find BaseModel classes referenced by a field annotation.
    """

    found = []

    if inspect.isclass(annotation):
        if issubclass(annotation, BaseModel):
            found.append(annotation)
            return found

    for arg in get_args(annotation):
        found.extend(referenced_models(arg))

    return found


def is_optional(annotation: Any) -> bool:
    origin = get_origin(annotation)

    if origin in (Union, types.UnionType):
        return type(None) in get_args(annotation)

    return False


# ---------------------------------------------------------------------
# Discover all models automatically
# ---------------------------------------------------------------------

def discover_models() -> list[type[BaseModel]]:
    discovered: dict[str, type[BaseModel]] = {}

    queue = list(ROOT_MODELS)

    while queue:
        model = queue.pop()

        if model.__name__ in discovered:
            continue

        discovered[model.__name__] = model

        for field in model.model_fields.values():
            for referenced in referenced_models(field.annotation):
                queue.append(referenced)

    return sorted(discovered.values(), key=lambda m: m.__name__)


# ---------------------------------------------------------------------
# Generate Mermaid class diagram
# ---------------------------------------------------------------------

def generate_class_diagram(models: list[type[BaseModel]]) -> str:
    lines = [
        "```mermaid",
        "classDiagram",
        "",
    ]

    # Classes + fields
    for model in models:
        lines.append(f"    class {model.__name__} {{")

        for field_name, field in model.model_fields.items():
            annotation = type_name(field.annotation)

            optional_marker = "?" if is_optional(field.annotation) else ""

            lines.append(
                f"        {annotation} {field_name}{optional_marker}"
            )

        lines.append("    }")
        lines.append("")

    # Relationships
    relationships: set[str] = set()

    for model in models:
        for field_name, field in model.model_fields.items():
            for referenced in referenced_models(field.annotation):

                if referenced is model:
                    continue

                annotation = type_name(field.annotation)

                # Determine whether this is a list relationship
                if annotation.startswith("list["):
                    relationship = (
                        f"    {model.__name__} \"1\" --> \"*\" "
                        f"{referenced.__name__} : {field_name}"
                    )
                else:
                    relationship = (
                        f"    {model.__name__} --> "
                        f"{referenced.__name__} : {field_name}"
                    )

                relationships.add(relationship)

    lines.extend(sorted(relationships))

    lines.append("```")

    return "\n".join(lines)


# ---------------------------------------------------------------------
# Generate pipeline diagram
# ---------------------------------------------------------------------

def generate_pipeline_diagram() -> str:
    return """```mermaid
flowchart TD

    A[CandidateAnalysis]
        --> B[InterviewPlan]

    B
        --> C[InterviewDetails]

    C
        --> D[InvestigateOutput]

    D
        --> E[Evidence]

    E
        --> F[EvidenceMapping]

    F
        --> G[EvidenceMappingResult]

    G
        --> H[TailorAnalysis]

    H
        --> I[TailorMatched]

    H
        --> J[TailorUnmatched]

    I
        --> K[TailorDecisionMatched]

    J
        --> L[TailorDecisionUnmatched]

    K
        --> M[ResumeBullet]

    L
        --> M

    K
        --> N[Feedback]

    L
        --> N

    N
        --> O[RegeneratedBullets]

    O
        --> M
```"""


# ---------------------------------------------------------------------
# Generate field-level detail
# ---------------------------------------------------------------------

def generate_field_reference(models: list[type[BaseModel]]) -> str:
    lines = [
        "# Pydantic Model Field Reference",
        "",
        "> Automatically generated from the Pydantic models.",
        "",
    ]

    for model in models:
        lines.append(f"## `{model.__name__}`")
        lines.append("")

        if model.__doc__:
            lines.append(model.__doc__.strip())
            lines.append("")

        lines.append("| Field | Type | Required | Default |")
        lines.append("|---|---|---|---|")

        for name, field in model.model_fields.items():
            annotation = type_name(field.annotation)

            required = "Yes" if field.is_required() else "No"

            if field.default is None:
                default = "`None`"
            elif field.default is not None:
                default = f"`{field.default}`"
            else:
                default = "factory"

            lines.append(
                f"| `{name}` | `{annotation}` | "
                f"{required} | {default} |"
            )

        lines.append("")

        # Field descriptions
        for name, field in model.model_fields.items():
            if field.description:
                lines.append(
                    f"**`{name}`:** {field.description}"
                )
                lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------

def main():
    models = discover_models()

    output_dir = Path("docs")
    output_dir.mkdir(exist_ok=True)

    output_file = output_dir / "model_graph.md"

    schema_dump = {
        model.__name__: model.model_json_schema()
        for model in models
    }

    content = [
        "# Pydantic Model Architecture",
        "",
        "Automatically generated from the application's Pydantic models.",
        "",
        "## Model Pipeline",
        "",
        generate_pipeline_diagram(),
        "",
        "## Nested Model Structure",
        "",
        generate_class_diagram(models),
        "",
        "## Field Reference",
        "",
        generate_field_reference(models),
        "",
        "## Raw JSON Schema",
        "",
        "```json",
        json.dumps(schema_dump, indent=2, default=str),
        "```",
        "",
    ]

    output_file.write_text("\n".join(content), encoding="utf-8")

    print(f"Generated: {output_file}")
    print("")
    print("Models discovered:")
    for model in models:
        print(f"  - {model.__name__}")


if __name__ == "__main__":
    main()