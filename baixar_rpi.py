#!/usr/bin/env python3
"""Baixa e extrai o XML de Marcas mais recente publicado no portal da RPI."""

from __future__ import annotations

import re
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

PORTAL = "https://revistas.inpi.gov.br/rpi/"
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "importacoes"
KEEP_EDITIONS = 4


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "MarcaFlow-RPI/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def find_latest_zip(html: str) -> str:
    links = re.findall(r'href=["\']([^"\']*RM(\d+)\.zip)["\']', html, flags=re.IGNORECASE)
    if links:
        href, _ = max(links, key=lambda item: int(item[1]))
        return urllib.parse.urljoin(PORTAL, href)

    numbers = [int(value) for value in re.findall(r"\b(2\d{3})\b", html)]
    if not numbers:
        raise RuntimeError("Nao foi possivel identificar a RPI mais recente no portal.")
    return f"https://revistas.inpi.gov.br/txt/RM{max(numbers)}.zip"


def cleanup_old_editions() -> None:
    editions = {}
    for path in OUT.glob("RM*.*"):
        match = re.fullmatch(r"RM(\d+)\.(xml|zip)", path.name, flags=re.IGNORECASE)
        if match:
            editions.setdefault(int(match.group(1)), []).append(path)
    for number in sorted(editions, reverse=True)[KEEP_EDITIONS:]:
        for path in editions[number]:
            path.unlink(missing_ok=True)


def main() -> int:
    OUT.mkdir(exist_ok=True)
    print("Consultando o portal oficial da RPI...")
    html = fetch(PORTAL).decode("utf-8", errors="replace")
    zip_url = find_latest_zip(html)
    zip_name = Path(urllib.parse.urlparse(zip_url).path).name
    zip_path = OUT / zip_name

    print(f"Baixando {zip_url}")
    zip_path.write_bytes(fetch(zip_url))
    with zipfile.ZipFile(zip_path) as archive:
        xml_files = [name for name in archive.namelist() if name.lower().endswith(".xml")]
        if not xml_files:
            raise RuntimeError("O ZIP baixado nao contem arquivo XML.")
        archive.extract(xml_files[0], OUT)
        xml_path = OUT / xml_files[0]

    print(f"XML pronto para importar: {xml_path}")
    cleanup_old_editions()
    print("Confira tambem o PDF oficial da secao V de Marcas no portal da RPI.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Erro: {error}", file=sys.stderr)
        raise SystemExit(1)
