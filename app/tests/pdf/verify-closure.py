"""Kontroller nedlastet PDF mot frossen kilde fra nettleserprøven.

Valgfri verktøykjede med pdfplumber. Kjør fra app-mappen:
  python tests/pdf/verify-closure.py <eksport.pdf> <frosset-kilde.json>

Kjør samme kontroll for begge faktiske nedlastingene fra instruktørprøven:
  python tests/pdf/verify-closure.py <prøvemappe>/instruktor.pdf <prøvemappe>/instruktor-kilde.json
  python tests/pdf/verify-closure.py <prøvemappe>/sjafor.pdf <prøvemappe>/instruktor-kilde.json
"""

import argparse
from collections import defaultdict
import json
from pathlib import Path
import re
import unicodedata

import pdfplumber


MARKS = {(205, 236, 205): "OK", (255, 240, 166): "KB", (246, 192, 191): "IR"}
ANSWERS = {"ok": "OK", "needs_improvement": "KB", "not_relevant": "IR"}


def compact(text):
    # Tekstuttrekk kan sette inn blanktegn ved visuelt linjeskift.
    # Tegnsetting, bokstaver og usynlige tegn kontrolleres separat og fjernes ikke.
    return re.sub(r"\s+", "", text)


def matrix(page, criteria, sets):
    expected_ids = [f"criterion-{index:02}" for index in range(1, 23)]
    assert sorted(criterion["id"] for criterion in criteria) == expected_ids
    columns = []
    positions = set()
    for answers in sets:
        assert sorted(answer["criterionId"] for answer in answers) == expected_ids
        columns.append({answer["criterionId"]: ANSWERS[answer["value"]] for answer in answers})
        positions.update(answer["id"] for answer in answers)
    assert len(positions) == 22 * len(sets)
    actual = defaultdict(dict)
    for cell in page.rects + page.curves:
        color = cell.get("non_stroking_color")
        if not cell["fill"] or not isinstance(color, (tuple, list)):
            continue
        mark = MARKS.get(tuple(round(channel * 255) for channel in color))
        if mark:
            ymin, ymax, xmin, xmax = (cell[key] for key in ("top", "bottom", "x0", "x1"))
            label = "".join(char["text"] for char in page.chars
                            if xmin < (char["x0"] + char["x1"]) / 2 < xmax
                            and ymin < (char["top"] + char["bottom"]) / 2 < ymax)
            assert label.strip() == mark
            actual[round(ymin, 1)][round(xmin, 1)] = mark
    assert len(actual) == 22
    for criterion_id, (_, row) in zip(expected_ids, sorted(actual.items())):
        assert [value for _, value in sorted(row.items())] == [column[criterion_id] for column in columns], criterion_id


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path)
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    run = json.loads(args.source.read_text(encoding="utf-8"))
    closure = run["closureSnapshot"]
    history = closure["history"]
    role = closure["closedBy"]["actor"]["role"]
    assert (closure["documentVersion"], closure["pdfLayoutVersion"]) == {
        "fadder": (1, 1), "instruktør": (2, 2),
    }[role]
    days = [history["firstDay"], *history.get("laterDays", [])]
    sets = [history["baseline"]["answers"]]
    originals = [closure["conclusion"]["text"], closure["closedBy"]["actor"]["name"]]
    for day in days:
        mentor = day["mentorDay"]
        sets.extend([day["driverAfterAnswers"], mentor["answers"]])
        originals.extend((
            *day["session"].values(),
            *day["driverEvaluation"]["texts"].values(),
            *[comment["text"] for comment in mentor["comments"].values()],
            *[comment["actor"]["name"] for comment in mentor["comments"].values()],
            *[review.get("rejectionComment") for review in mentor["reviews"].values()],
        ))
    originals.extend(answer.get("reason") for answers in sets for answer in answers)
    with pdfplumber.open(args.pdf) as document:
        assert len(document.pages) >= 2
        matrix(document.pages[0], history["content"]["criteria"], sets)
        full_text, body, confirmation_columns = [], [], [[], []]
        for index, page in enumerate(document.pages, 1):
            size = (841.89, 595.28) if index == 1 else (595.28, 841.89)
            assert abs(page.width - size[0]) < 0.02 and abs(page.height - size[1]) < 0.02
            footer, = page.search(rf"\bSide\s+{index}\s+av\s+{len(document.pages)}\b")
            assert page.height - 30 < footer["top"] < page.height - 10
            full_text.append(page.extract_text())
            if index > 1:
                body.append(page.crop((0, 96, page.width, footer["top"] - 3)).extract_text())
                if role == "instruktør":
                    boundaries = [28 + (page.width - 56) * fraction for fraction in (.38, .69, 1)]
                    for column, (left, right) in enumerate(zip(boundaries, boundaries[1:])):
                        confirmation_columns[column].append(page.crop((left, 80, right, footer["top"] - 3)).extract_text())
        plain = "\n".join(full_text)
        assert not any(unicodedata.category(char) in {"Cf", "Cc"} and char not in "\r\n\t" for char in plain)
        assert "\ufffd" not in plain
        for text in filter(None, originals):
            assert compact(text) in compact("\n".join(body) if len(text) > 900 else plain), text[:60]
        assert plain.count("Førvurdering bekreftet av") == 1
        assert plain.count("Ettervurdering bekreftet av") == len(days)
        assert all(day["mentorConfirmation"]["actor"]["role"] == role for day in days)
        if role == "fadder":
            assert plain.count("Fadderens del bekreftet av") == len(days)
        else:
            part_label = "Instruktørens del bekreftet av"
            professional_columns = [compact("".join(column)) for column in confirmation_columns]
            assert sum(column.count(compact(part_label)) for column in professional_columns) == len(days)
            for day in days:
                name = day["mentorConfirmation"]["actor"]["name"]
                label = compact(f"Dag {day['number']} · {part_label} {name}")
                assert any(label in column for column in professional_columns)
            assert "Instruktør" in full_text[0]
            assert all(compact("Fadderens del bekreftet av") not in column for column in professional_columns)
        print(f"{len(document.pages)} A4-sider, {22 * len(sets)} vurderinger og fulltekst verifisert.")


if __name__ == "__main__":
    main()
