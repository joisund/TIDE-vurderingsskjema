"""Sammenlign faktiske linje-PDF-er med de frosne kildene fra nettleseren.

Valgfri prøve med pdfplumber. Kjør fra app-mappen med en produksjonsbuild:
  $env:TIDE_LINE_PDF_FIXTURE = '1'
  npm run test:browser -- line-training.spec.ts --project=Chromium -g "frittstående dokument|oppgradert grunnkursmal"
  python tests/pdf/verify-line.py <prøvemappe>
  Remove-Item Env:TIDE_LINE_PDF_FIXTURE

Kjør kontrollen én gang per prøvemappe. Begge har linje-kilder.json. Prøven av et nytt
dokument har standardmal.pdf, og migreringsprøven har v1-original.pdf, v2.pdf og v1-nytt-uttak.pdf.
Vanlige nettleserprøver krever ingen Python-pakker.
"""

import argparse
import json
from pathlib import Path
import re

import pdfplumber


LABELS = "20|21|22|X23|24|26|X27|28|X29|30|X31|X32|33 (M1)|34 (M2)|X35|X36|40|42|X43|X44|413|421|425|428|450|550".split("|")
NOTE = "Kjøres med leddbuss. Egen opplæring"
EXTRA_IDS = {"L10", "L22", "L23", "L24", "L25"}
CATALOG = list(zip(LABELS, [f"L{index:02}" for index in range(1, 27)], strict=True))
HEADING = re.compile(r"(?m)^Linje (.+?) · (L(?:0[1-9]|1\d|2[0-6]))[ \t]*$")


def compact(text):
    return re.sub(r"\s+", "", text)


def read_pages(path, version):
    title = "Bekreftet linjeopplæring"
    version_line = f"Linjer og bekreftede kjøredatoer · Kildeversjon {version}"
    with pdfplumber.open(path) as paper:
        for number, page in enumerate(paper.pages, 1):
            assert abs(page.width - 595.28) < 0.03 and abs(page.height - 841.89) < 0.03, number
            assert page.images, (path, number, "Mangler logo")
            [footer] = page.search(rf"\bSide\s+{number}\s+av\s+{len(paper.pages)}\b")
            assert page.height - 38 < footer["top"] < page.height - 6, (number, footer)
            for char in page.chars:
                assert char["text"] not in ("\ufffd", "\x00") and "NotoSans" in char["fontname"], (number, char)
                assert 3 < char["x0"] <= char["x1"] < page.width - 3, (number, char)
                assert 3 < char["top"] <= char["bottom"] < page.height - 3, (number, char)
            text = page.crop((0, 0, page.width, footer["top"] - 1)).extract_text()
            assert text, (path, number, "Tom side")
            lines = text.splitlines()
            assert lines[:2] == [title, version_line], (number, lines[:2])
            yield "\n".join(lines[2:])


def local_date(iso):
    return ".".join(reversed(iso.split("-")))


def entry_text(entry, line, times):
    author = entry["author"]
    confirmation = entry["confirmation"]
    actor = confirmation["actor"]
    date = entry["drivenDate"]
    assert entry["status"] == "confirmed" and author["role"] == "sjåfør" and actor["role"] == "instruktør"
    return "\n".join([
        f"Linje {line['label']} · Kjøredato {local_date(date)} · {date}",
        f"Utfylt av {author['name']} · Sjåfør",
        f"Bekreftet av {actor['name']} · Instruktør",
        f"Bekreftet {times[confirmation['confirmedAt']]} · Kildeversjon {confirmation['sourceVersion']}",
        f"Registrering {entry['entryId']} · {line['id']}",
        f"Utfyller-ID {author['id']} · Instruktør-ID {actor['id']}",
        f"Registrert {times[entry['recordedAt']]} · Sist ført {times[entry['editedAt']]}",
    ])


def verify_pdf(path, source, times):
    body = "\n".join(read_pages(path, source["sourceVersion"]))
    headings = list(HEADING.finditer(body))
    template = source["template"]
    assert template["version"] in (1, 2)
    standard = CATALOG if template["version"] == 1 else [row for row in CATALOG if row[1] not in EXTRA_IDS]
    recorded = set() if template["version"] == 1 else EXTRA_IDS & {entry["lineId"] for entry in source["entries"]}
    extra = source.get("previouslyRecordedLines", [])
    assert [(line["label"], line["id"]) for line in template["lines"]] == standard
    assert [(line["label"], line["id"]) for line in extra] == [row for row in CATALOG if row[1] in recorded]
    assert [match.groups() for match in headings] == [row for row in CATALOG if row in standard or row[1] in recorded]
    header = source["header"]
    expected_summary = "\n".join([
        f"Kandidat · {header['driverName']}",
        f"Fiktivt ansattnummer · {header['employeeNumber']}",
        f"Bekreftet frem til {times[source['confirmedThrough']]} (Europe/Oslo)",
        "Ubekreftede registreringer inngår ikke i denne filen.",
        f"Sjåførreferanse {source['driverRef']}",
        f"Dokumentreferanse {source['documentId']} · Bekreftet revisjon {source['confirmedRevision']}",
        f"Mal {template['id']} v{template['version']} · Regler v{source['ruleVersion']} · PDF v{source['pdfLayoutVersion']}",
    ])
    assert compact(body[:headings[0].start()]) == compact(expected_summary), path
    lines = sorted(template["lines"] + extra, key=lambda line: line["id"])
    for index, (line, heading) in enumerate(zip(lines, headings, strict=True)):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(body)
        rows = sorted((entry for entry in source["entries"] if entry["lineId"] == line["id"]), key=lambda entry: entry["drivenDate"])
        note = NOTE if line["id"] == "L10" else ""
        assert line.get("note", "") == note
        assert all(entry["author"]["driverRef"] == source["driverRef"] for entry in rows)
        marker = "Tidligere registrert utenfor grunnkurset" if line["id"] in recorded else ""
        expected = note + marker + ("\n".join(entry_text(entry, line, times) for entry in rows) or "Ikke dokumentert i denne versjonen")
        actual = body[heading.end():end]
        assert compact(actual) == compact(expected), (path, line["id"], actual, expected)
    print(f"{path.name}: {len(lines)} linjer og {len(source['entries'])} bekreftede registreringer samsvarer med frosset kilde.")
    return compact(body)


def verify_migration(folder, fixture):
    before = fixture["firstDocument"]
    after = fixture["finalDocument"]
    [early] = before["snapshots"]
    [archived, latest] = after["snapshots"]
    assert [early["sourceVersion"], latest["sourceVersion"]] == [1, 2]
    assert [early["template"]["version"], latest["template"]["version"]] == [1, 2]
    assert archived == early
    assert latest["entries"][:-1] == early["entries"]
    assert [entry["confirmation"]["actor"]["name"] for entry in latest["entries"]] == ["Øyvind Fiktiv", "Astrid Fiktiv Træn ÆØÅ"]
    assert [entry["drivenDate"] for entry in latest["entries"]] == ["2025-04-13", "2025-04-12"]
    assert [entry["drivenDate"] for entry in after["entries"] if entry["status"] == "draft"] == ["2025-04-15"]
    assert any(entry["status"] == "draft" for entry in before["entries"])
    times = fixture["times"]
    original = verify_pdf(folder / "v1-original.pdf", early, times)
    renewed = verify_pdf(folder / "v1-nytt-uttak.pdf", archived, times)
    assert original == renewed
    verify_pdf(folder / "v2.pdf", latest, times)


def verify_standard(folder, fixture):
    latest = fixture["finalDocument"]["snapshots"][-1]
    assert latest["template"]["version"] == 2
    assert len(latest["template"]["lines"]) == 21 and not latest["previouslyRecordedLines"]
    assert [entry["lineId"] for entry in latest["entries"]] == ["L01", "L01"]
    assert [entry["drivenDate"] for entry in latest["entries"]] == ["2025-04-13", "2025-04-12"]
    # Kilden inneholder datoene i omvendt rekkefølge. PDF-kontrollen forventer stigende datoer.
    verify_pdf(folder / "standardmal.pdf", latest, fixture["times"])


def verify(folder):
    fixture = json.loads((folder / "linje-kilder.json").read_text(encoding="utf-8"))
    if "firstDocument" in fixture:
        verify_migration(folder, fixture)
    else:
        verify_standard(folder, fixture)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    verify(parser.parse_args().folder)
