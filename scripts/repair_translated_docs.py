from __future__ import annotations

import re
from pathlib import Path

import argostranslate.translate


ROOT = Path(__file__).resolve().parents[1]
ORIGINAL_ROOT = ROOT / "test-output" / "MEL-Generator-1.0.0-source"

ORIGINALS = {
    ROOT / "ТРЕБОВАНИЯ.md": ORIGINAL_ROOT / "ТРЕБОВАНИЯ.md",
    ROOT / "ПРЕДЛОЖЕНИЕ_ПО_РАЗРАБОТКЕ.md": ORIGINAL_ROOT / "ПРЕДЛОЖЕНИЕ_ПО_РАЗРАБОТКЕ.md",
    ROOT / "design" / "ИНТЕРФЕЙС.md": ORIGINAL_ROOT / "design" / "ИНТЕРФЕЙС.md",
    ROOT / "release" / "TEST-REPORT.md": ORIGINAL_ROOT / "TEST-REPORT.md",
    ROOT / "research_fenix" / "efb_mmel_pool" / "РЕЕСТР.md": ORIGINAL_ROOT / "research_fenix" / "efb_mmel_pool" / "РЕЕСТР.md",
    ROOT / "research_fenix" / "efb_mmel_pool" / "ПУНКТЫ_MMEL.md": ORIGINAL_ROOT / "research_fenix" / "efb_mmel_pool" / "ПУНКТЫ_MMEL.md",
    ROOT / "research_fenix" / "efb_mmel_pool" / "ПРАВИЛА_СОЧЕТАНИЙ.md": ORIGINAL_ROOT / "research_fenix" / "efb_mmel_pool" / "ПРАВИЛА_СОЧЕТАНИЙ.md",
    ROOT / "research_fenix" / "efb_mmel_pool" / "КАТАЛОГ.md": ORIGINAL_ROOT / "research_fenix" / "efb_mmel_pool" / "КАТАЛОГ.md",
    ROOT / "research_fenix" / "efb_mmel_pool" / "01_ДОПУСК_С_УСЛОВИЯМИ.md": ORIGINAL_ROOT / "research_fenix" / "efb_mmel_pool" / "01_ДОПУСК_С_УСЛОВИЯМИ.md",
}

LINK = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")
CYRILLIC = re.compile(r"[А-Яа-яЁё]")


def translate_fragment(text: str) -> str:
    if not CYRILLIC.search(text):
        return text
    return argostranslate.translate.translate(text, "ru", "en")


def translate_link_line(original: str) -> str:
    output: list[str] = []
    position = 0
    for match in LINK.finditer(original):
        output.append(translate_fragment(original[position : match.start()]))
        output.append(f"[{translate_fragment(match.group(1)).strip()}]({match.group(2)})")
        position = match.end()
    output.append(translate_fragment(original[position:]))
    return "".join(output)


def restore_structure(original: str, translated: str) -> str:
    if LINK.search(original):
        translated = translate_link_line(original)

    heading = re.match(r"^(#{1,6})\s+", original)
    if heading:
        translated = re.sub(r"^#{1,6}\s*", "", translated)
        translated = f"{heading.group(1)} {translated.lstrip()}"

    bullet = re.match(r"^(\s*)-\s+", original)
    if bullet:
        translated = re.sub(r"^\s*-?\s*", "", translated)
        translated = f"{bullet.group(1)}- {translated}"

    numbered = re.match(r"^(\s*)(\d+)\.\s+", original)
    if numbered:
        translated = re.sub(r"^\s*\d+\.\s*", "", translated)
        translated = f"{numbered.group(1)}{numbered.group(2)}. {translated}"

    if original.startswith("|") and not translated.startswith("|"):
        translated = "| " + translated.lstrip()
    if original.rstrip().endswith("|") and not translated.rstrip().endswith("|"):
        translated = translated.rstrip() + " |"

    return translated


REPLACEMENTS = {
    "refusals": "failures",
    "Refusals": "Failures",
    "refusal": "failure",
    "Refusal": "Failure",
    "bounces": "failures",
    "Bounces": "Failures",
    "bounce": "failure",
    "Bounce": "Failure",
    "tolerances": "dispatch relief provisions",
    "Tolerances": "Dispatch relief provisions",
    "tolerance": "dispatch relief",
    "Tolerance": "Dispatch relief",
    "clearances": "dispatch relief provisions",
    "Clearances": "Dispatch relief provisions",
    "clearance": "dispatch relief",
    "Clearance": "Dispatch relief",
    "admission": "dispatch relief",
    "Admission": "Dispatch relief",
    "editorial offices": "revisions",
    "Editorial offices": "Revisions",
    "editorial date": "revision date",
    "Editorial date": "Revision date",
    "editorial number": "revision number",
    "Editorial number": "Revision number",
    "Editorial": "Revision",
    "editorial": "revision",
    "unsealed flight": "unpressurized flight",
    "unsealed configuration": "unpressurized configuration",
    "serviceable CPC friend": "the other CPC operative",
    "elimination within": "repair within",
    "Elimination within": "Repair within",
    "script signature": "scenario label",
    "appendix assumption": "application assumption",
    "accidentally mixed": "randomly shuffled",
    "Packages are issued without return": "Sets are drawn without replacement",
    "the pool is stirred again": "the pool is shuffled again",
    "The story resets": "History resets",
    "Equivalence refers to sets": "Equal probability applies to sets",
    "Conduct of the annex": "Application behavior",
    "Appointment": "Purpose",
    "Date of fixation": "Date established",
    "current volume": "current scope",
    "good condition": "operative condition",
    "not working units": "inoperative units",
    "non-working units": "inoperative units",
    "chassis failure": "landing gear failure",
    "installed by Fenix": "installed Fenix version",
    "conduct check": "functional check",
}


def polish(text: str) -> str:
    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)
    text = text.replace("faults", "failures").replace("Faults", "Failures")
    text = text.replace("53 waivers", "53 failures")
    text = re.sub(r"^(#{1,6})\s+#\s+", r"\1 ", text, flags=re.MULTILINE)
    text = re.sub(r"^(#{1,6})(\S)", r"\1 \2", text, flags=re.MULTILINE)

    repaired_lines: list[str] = []
    for line in text.splitlines(keepends=True):
        markers = [match.start() for match in re.finditer(r"\*\*", line)]
        offset = 0
        for index, original_pos in enumerate(markers):
            pos = original_pos + offset
            if index % 2 == 0:
                if pos > 0 and not line[pos - 1].isspace() and line[pos - 1] not in "([":
                    line = line[:pos] + " " + line[pos:]
                    offset += 1
            else:
                after = pos + 2
                if after < len(line) and not line[after].isspace() and line[after] not in ".,;:!?)]\n":
                    line = line[:after] + " " + line[after:]
                    offset += 1
        repaired_lines.append(line)
    text = "".join(repaired_lines)
    return text


def main() -> None:
    for destination, original_path in ORIGINALS.items():
        original_lines = original_path.read_text(encoding="utf-8").splitlines()
        translated_lines = destination.read_text(encoding="utf-8").splitlines()
        if len(original_lines) != len(translated_lines):
            continue
        repaired = [restore_structure(src, dst) for src, dst in zip(original_lines, translated_lines)]
        destination.write_text(polish("\n".join(repaired) + "\n"), encoding="utf-8", newline="\n")

    for path in ROOT.rglob("*.md"):
        if "node_modules" in path.parts or "test-output" in path.parts:
            continue
        polished = polish(path.read_text(encoding="utf-8"))
        lines = polished.splitlines(keepends=True)
        first_heading_seen = False
        in_fence = False
        for index, line in enumerate(lines):
            if line.lstrip().startswith("```"):
                in_fence = not in_fence
            if not in_fence and line.startswith("# "):
                if first_heading_seen:
                    lines[index] = "## " + line[2:]
                else:
                    first_heading_seen = True
        path.write_text("".join(lines), encoding="utf-8", newline="\n")
    readme_txt = ROOT / "release" / "README.txt"
    readme_txt.write_text(polish(readme_txt.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
