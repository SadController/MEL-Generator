from __future__ import annotations

import re
from pathlib import Path

import argostranslate.translate


ROOT = Path(__file__).resolve().parents[1]

TARGETS = [
    Path("ТРЕБОВАНИЯ.md"),
    Path("ПРЕДЛОЖЕНИЕ_ПО_РАЗРАБОТКЕ.md"),
    Path("design/ИНТЕРФЕЙС.md"),
    Path("release/README.txt"),
    Path("release/TEST-REPORT.md"),
    Path("research_fenix/МАТРИЦА.md"),
    Path("research_fenix/ПРИМЕНИМОСТЬ_FENIX.md"),
    Path("research_fenix/ПРОВЕРКА_В_СИМУЛЯТОРЕ.md"),
    Path("research_fenix/alpha_vs_live_2026-09-14/СРАВНЕНИЕ.md"),
    Path("research_fenix/efb_mmel_pool/01_ДОПУСК_С_УСЛОВИЯМИ.md"),
    Path("research_fenix/efb_mmel_pool/КАТАЛОГ.md"),
    Path("research_fenix/efb_mmel_pool/ПРАВИЛА_СОЧЕТАНИЙ.md"),
    Path("research_fenix/efb_mmel_pool/ПУНКТЫ_MMEL.md"),
    Path("research_fenix/efb_mmel_pool/РЕЕСТР.md"),
    Path("research_fenix/live_A321_IAE_WTF_2026-09-13/МЕНЮ_384.md"),
    Path("research_fenix/live_A321_IAE_WTF_2026-09-13/ОТЧЁТ.md"),
    Path("research_fenix/live_A321_IAE_WTF_2026-09-13/СОПОСТАВЛЕНИЕ.md"),
    Path("sources_mel_mmel/РЕЕСТР.md"),
]

CYRILLIC = re.compile(r"[А-Яа-яЁё]")

# Keep destinations, URLs, inline code, and Windows paths byte-for-byte intact.
PROTECTED = re.compile(
    r"(?P<linkdest>\]\([^\n)]*\))"
    r"|(?P<code>`[^`\n]+`)"
    r"|(?P<url>https?://[^\s)>]+)"
    r"|(?P<winpath>[A-Za-z]:\\[^\s|]+)"
)


def protect(text: str) -> tuple[str, list[str]]:
    values: list[str] = []

    def replace(match: re.Match[str]) -> str:
        token = f"ZXQPH{len(values):04d}QXZ"
        values.append(match.group(0))
        return token

    return PROTECTED.sub(replace, text), values


def restore(text: str, values: list[str]) -> str:
    for index, value in enumerate(values):
        text = text.replace(f"ZXQPH{index:04d}QXZ", value)
    return text


def polish(text: str) -> str:
    replacements = {
        "conditions of admission": "dispatch conditions",
        "Conditions of admission": "Dispatch conditions",
        "admission conditions": "dispatch conditions",
        "Admission conditions": "Dispatch conditions",
        "elimination category": "repair category",
        "Elimination category": "Repair category",
        "Editorial and date": "Revision and date",
        "editorial number": "revision number",
        "Editorial number": "Revision number",
        "malfunctions": "failures",
        "Malfunctions": "Failures",
        "malfunction": "failure",
        "Malfunction": "Failure",
        "aircraft reception": "aircraft acceptance",
        "Aircraft reception": "Aircraft acceptance",
        "serviceability of": "operability of",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def translate_line(line: str) -> str:
    if not CYRILLIC.search(line):
        return line
    ending = "\n" if line.endswith("\n") else ""
    body = line[:-1] if ending else line
    masked, values = protect(body)
    translated = argostranslate.translate.translate(masked, "ru", "en")
    translated = restore(translated, values)
    return polish(translated) + ending


def main() -> None:
    for relative in TARGETS:
        path = ROOT / relative
        source = path.read_text(encoding="utf-8")
        translated = "".join(translate_line(line) for line in source.splitlines(keepends=True))
        path.write_text(translated, encoding="utf-8", newline="\n")
        remaining = len(CYRILLIC.findall(translated))
        print(f"{relative}: remaining Cyrillic={remaining}", flush=True)


if __name__ == "__main__":
    main()
