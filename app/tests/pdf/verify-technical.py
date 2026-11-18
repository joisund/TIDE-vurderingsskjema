"""Kontroller begge faktiske PDF-eksportene mot den frosne nettleserkilden.

Valgfri kontroll med pdfplumber. Kjør fra app-mappen med en produksjonsbuild:
  $env:TIDE_TECHNICAL_PDF_FIXTURE = '1'
  npm run test:browser -- technical.spec.ts --project=Chromium -g "fører selv"
  python tests/pdf/verify-technical.py <prøvemappe>
  Remove-Item Env:TIDE_TECHNICAL_PDF_FIXTURE

Prøvemappen under test-results inneholder teknisk-kilde.json,
teknisk-instruktor.pdf og teknisk-sjafor.pdf. Vanlige nettleserprøver krever
ingen Python-pakker og lagrer ikke disse ekstra prøvefilene.
"""

import argparse
import json
from pathlib import Path
import re

import pdfplumber


POINT_ID = re.compile(r"\b(T[1-4]-\d{2})\b")
STATUSES = {"reviewed": "Gjennomgått", "not_applicable": "Gjelder ikke busstypen"}
FIELDS = {
    "driverName": "Kandidatnavn", "employeeNumber": "Fiktivt ansattnummer",
    "instructorName": "Instruktørnavn", "busType": "Busstype", "trainingDate": "Opplæringsdato",
}


def compact(text):
    # Uttrekket legger inn blanktegn ved visuelle linjeskift.
    return re.sub(r"\s+", "", text)


def heading(group):
    return f"{group['order']}. {group['title']}"


def read_pages(path, source):
    groups = source["template"]["groups"]
    running_headings = {heading(group): group["order"] for group in groups}
    ignored = {source["template"]["title"], "Punkt og merknad Status", *running_headings}
    with pdfplumber.open(path) as paper:
        count = len(paper.pages)
        assert paper.pages[0].images, "Mangler logo"
        [title] = paper.pages[0].search(source["template"]["title"], regex=False)
        [context] = paper.pages[0].search(source["template"]["vehicleContext"], regex=False)
        assert title["bottom"] + 1 <= context["top"], "Tittel og kjøretøykontekst overlapper"
        body, text = [], []
        groups_on_pages = []
        for number, page in enumerate(paper.pages, 1):
            assert abs(page.width - 595.28) < 0.03 and abs(page.height - 841.89) < 0.03, number
            for char in page.chars:
                assert 3 < char["x0"] <= char["x1"] < page.width - 3, (number, char)
                assert 3 < char["top"] <= char["bottom"] < page.height - 3, (number, char)
                assert "NotoSans" in char["fontname"] and char["text"] not in ("\ufffd", "\x00"), (number, char)
            [footer] = page.search(rf"\bSide\s+{number}\s+av\s+{count}\b")
            assert page.height - 38 < footer["top"] < page.height - 6, (number, footer)
            lines = (page.crop((0, 0, page.width, footer["top"] - 1)).extract_text() or "").splitlines()
            if number > 1:
                [group] = [running_headings[line.strip()] for line in lines if line.strip() in running_headings]
                groups_on_pages.append(group)
                assert "Punkt og merknad Status" in lines, number
                body.extend(line for line in lines if line.strip() not in ignored)
            text.append(page.extract_text() or "")
        assert list(dict.fromkeys(groups_on_pages)) == [1, 2, 3, 4]
        return text, "\n".join(body)


def check_content(text, body, source, local_time):
    groups = source["template"]["groups"]
    assert [len(group["points"]) for group in groups] == [13, 13, 14, 12]
    expected_ids = [f"T{group['order']}-{n:02}" for group in groups for n in range(1, len(group["points"]) + 1)]
    points = [point for group in groups for point in group["points"]]
    assert [p["id"] for p in points] == expected_ids == [row["id"] for row in source["points"]]
    assert POINT_ID.findall(body) == expected_ids
    sections = POINT_ID.split(body)[2::2]
    reasons = []
    for point, row, section in zip(points, source["points"], sections, strict=True):
        status = compact(STATUSES[row["status"]])
        content = compact(section)
        assert content.count(status) == 1, (point["id"], section[:200])
        expected = point["text"] + point.get("note", "")
        author = row["author"]["actor"]
        assert author["id"] == source["filledBy"]["id"] and author["role"] == "sjåfør"
        assert author["driverRef"] == source["driverRef"]
        if row["status"] == "not_applicable":
            expected += "Begrunnelse · " + row["reason"]
            reasons.append(len(row["reason"]))
        assert content.replace(status, "", 1) == compact(expected), (point["id"], section[:200], section[-150:])
    assert reasons.count(10_000) == 2, reasons
    paper = compact("\n".join(text))
    for field, label in FIELDS.items():
        value = source["header"][field]
        if field == "trainingDate":
            value = ".".join(reversed(value.split("-")))
        assert compact(f"{label} · {value}") in paper, label
    actor = source["confirmation"]["actor"]
    assert actor["role"] == "instruktør" and source["confirmation"]["confirmedAt"].endswith("Z")
    assert compact(f"Teknisk opplæring bekreftet av {actor['name']}") in paper
    assert compact(f"Instruktør · {local_time}") in paper
    assert compact(f"Utfylt av {source['filledBy']['name']} · Sjåfør") in paper
    assert "Midlertidigutkast" not in paper


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("test_output", type=Path)
    args = parser.parse_args()
    fixture = json.loads((args.test_output / "teknisk-kilde.json").read_text(encoding="utf-8"))
    source = fixture["snapshot"]
    role_texts = []
    for filename in ("teknisk-instruktor.pdf", "teknisk-sjafor.pdf"):
        text, body = read_pages(args.test_output / filename, source)
        check_content(text, body, source, fixture["confirmedAtLocal"])
        role_texts.append(text)
        print(f"{filename}: 52 punkter og fullstendige begrunnelser på {len(text)} stående A4-sider.")
    assert role_texts[0] == role_texts[1], "Rollene fikk ulikt PDF-innhold"


if __name__ == "__main__":
    main()
