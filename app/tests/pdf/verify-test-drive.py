"""Kontroller faktiske testkjørings-PDF-er med pdfplumber.

Kjør fra app-mappen med en produksjonsbuild:
  $env:TIDE_TEST_DRIVE_PDF_FIXTURE = '1'
  npm run test:browser -- test-drive.spec.ts --project=Chromium -g 'avsluttet testkjøring'
  python tests/pdf/verify-test-drive.py <prøvemappe>
  Remove-Item Env:TIDE_TEST_DRIVE_PDF_FIXTURE

Vanlige nettleserprøver krever ingen Python-pakker.
"""

import argparse
from datetime import datetime
import json
from pathlib import Path
import re
from zoneinfo import ZoneInfo

import pdfplumber


def compact(text):
    return re.sub(r"\s+", "", text)


def fixture_text(text):
    return text.replace("🙂", "[U+1F642]")


def time_text(iso):
    local = datetime.fromisoformat(iso).astimezone(ZoneInfo("Europe/Oslo"))
    offset = int(local.utcoffset().total_seconds() / 3600)
    return f"{local:%d.%m.%Y, %H:%M:%S} GMT{offset:+d}"


def verify_matrix(page, source):
    [matrix_header] = page.search("Evalueringskriterium", regex=False)
    header = page.crop((0, matrix_header["top"] - 1, page.width, matrix_header["bottom"] + 1))
    headings = ["Kandidat før", "Kandidat etter", "Instruktør"]
    boundaries = [36]
    for heading in headings:
        [cell] = header.search(heading, regex=False)
        boundaries.append(cell["x0"] - 4)
    boundaries.append(page.width - 36)
    assert boundaries == sorted(boundaries), headings

    rows = [(word["text"], word["top"] - 1) for word in page.extract_words()
            if word["top"] > matrix_header["bottom"] and 40 < word["x0"] < 42
            and re.fullmatch(r"\d+\.", word["text"])]
    assert [number for number, _ in rows] == [f"{number}." for number in range(1, 23)], rows
    template = source["template"]
    assert len(template["criteria"]) == 22
    before = source["candidateAssessments"]["before"]
    after = source["candidateAssessments"]["after"]
    instructor = source["instructorAssessment"]
    candidate_choices = {choice["id"]: choice["label"] for choice in template["candidateChoices"]}
    instructor_choices = {choice["id"]: choice["label"] for choice in template["instructorChoices"]}
    _, footer_top = next((match["text"], match["top"]) for match in page.search(r"Side 1 av \d+"))
    tops = [top for _, top in rows] + [footer_top - 1]
    for index, (criterion, row, next_top) in enumerate(zip(template["criteria"], rows, tops[1:], strict=True)):
        criterion_id = criterion["id"]
        number, top = row
        expected = [
            f"{number} {criterion['label']}",
            candidate_choices[before["answers"][criterion_id]],
            candidate_choices[after["answers"][criterion_id]],
            instructor_choices[instructor["answers"][criterion_id]],
        ]
        cells = [page.crop((left, top, right, next_top)).extract_text()
                 for left, right in zip(boundaries, boundaries[1:])]
        assert [compact(cell) for cell in cells] == [compact(cell) for cell in expected], (index + 1, cells, expected)


def verify_pdf(path, source):
    instructor = source["instructorAssessment"]
    title = source["template"]["source"]["title"]
    with pdfplumber.open(path) as pdf:
        bodies = []
        for index, page in enumerate(pdf.pages, 1):
            assert abs(page.width - 595.28) < 0.03 and abs(page.height - 841.89) < 0.03, index
            assert page.images, (path, index, "Mangler logo")
            [footer] = page.search(f"Side {index} av {len(pdf.pages)}", regex=False)
            assert 805 < footer["top"] < 825, (path, index, footer)
            assert f"Løpsreferanse {source['runId']}" in page.extract_text()
            for glyph in page.chars:
                assert glyph["text"] not in ("\ufffd", "\x00") and "NotoSans" in glyph["fontname"], (index, glyph)
                assert 35 < glyph["x0"] <= glyph["x1"] < 561, (index, glyph)
                assert 40 < glyph["top"] <= glyph["bottom"] < 835, (index, glyph)
            extracted = page.crop((0, 0, page.width, footer["top"] - 1)).extract_text().splitlines()
            assert extracted[0] == title, (path, index, extracted[:1])
            assert len(extracted) > 1, (path, index, "Tom side")
            bodies.append("\n".join(extracted[1:]))

        verify_matrix(pdf.pages[0], source)
        result_choices = {choice["id"]: choice["label"] for choice in source["template"]["resultChoices"]}
        expected_header_values = [
            source["candidate"]["name"], source["candidate"]["email"], source["instructor"]["name"], source["department"]["name"],
            *(value if key != "driveDate" else ".".join(reversed(value.split("-"))) for key, value in source["header"].items()),
            f"Samlet resultat · {result_choices[instructor['result']]}",
        ]
        receipts = [
            ("Førvurdering levert", source["candidate"]["name"], source["candidateAssessments"]["before"]["submittedAt"]),
            ("Ettervurdering levert", source["candidate"]["name"], source["candidateAssessments"]["after"]["submittedAt"]),
            ("Instruktørvurdering levert", source["instructor"]["name"], instructor["submittedAt"]),
            ("Avsluttet", source["instructor"]["name"], source["closedAt"]),
        ]
        for value in expected_header_values + [f"{label} · {name} · {time_text(at)}" for label, name, at in receipts]:
            assert fixture_text(value) in bodies[0], (path, value)

    expected_comments = ["Instruktørens kommentarer"]
    for index, criterion in enumerate(source["template"]["criteria"], 1):
        comment = instructor["comments"].get(criterion["id"], "")
        if comment.strip():
            expected_comments.extend([f"{index}. {criterion['label']}", comment])
    expected_comments.extend(["Samlet kommentar", instructor["overallComment"]])
    assert compact("\n".join(bodies[1:])) == compact(fixture_text("\n".join(expected_comments))), path
    if "🙂" in json.dumps(source, ensure_ascii=False):
        assert "[U+XXXX] er Unicode-koden til et tegn PDF-skriften ikke kan gjengi." in bodies[0], path
    assert len(bodies) == 4, (path, "Tomrom eller tekst ga uventede sideskift")
    assert sum(bool(re.search(r"\bLinje \d{3}\b", page)) for page in bodies[1:]) > 1, path
    print(f"{path.name}: 22 kriterier, tre svarkolonner og fullstendige kommentarer på {len(bodies)} sider.")
    return bodies


def verify(folder):
    source = json.loads((folder / "testkjoring-kilde.json").read_text(encoding="utf-8"))
    assert source["documentVersion"] == 1
    assert source["closedBy"] == source["instructorAssessment"]["authorId"] == source["instructor"]["id"]
    candidate = verify_pdf(folder / "kandidat.pdf", source)
    instructor = verify_pdf(folder / "instruktor.pdf", source)
    renewed = verify_pdf(folder / "kandidat-ny-okt.pdf", source)
    assert candidate == instructor == renewed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    verify(parser.parse_args().folder)
