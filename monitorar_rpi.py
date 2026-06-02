#!/usr/bin/env python3
"""Cruza a RPI de marcas com uma carteira local e gera relatorio operacional."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from baixar_rpi import OUT, main as baixar_rpi

ROOT = Path(__file__).resolve().parent
DEFAULT_PORTFOLIO = ROOT / "carteira-monitorada.json"
REPORTS = ROOT / "relatorios"


def digits(value: object) -> str:
    return re.sub(r"\D", "", str(value or ""))


def parse_date(value: Optional[str]) -> date:
    if not value:
        return date.today()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            pass
    raise ValueError(f"Data da revista invalida: {value}")


def load_portfolio(path: Path) -> dict[str, dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    processes = payload.get("processes", [])
    portfolio = {}
    for process in processes:
        number = digits(process.get("number"))
        if number:
            portfolio[number] = process
    if not portfolio:
        raise RuntimeError("A carteira nao possui processos numerados para acompanhar.")
    return portfolio


def dispatch_rule(name: str) -> dict:
    text = name.casefold()
    if "publicação de pedido" in text and "oposição" in text:
        return {"severity": "atencao", "action": "Monitorar prazo de oposicao", "legal_days": 60, "internal_days": 55}
    if "oposição" in text:
        return {"severity": "critico", "action": "Preparar manifestacao a oposicao", "legal_days": 60, "internal_days": 55}
    if "exigência formal" in text:
        return {"severity": "critico", "action": "Responder exigencia formal", "legal_days": 5, "internal_days": 4}
    if "exigência" in text:
        return {"severity": "atencao", "action": "Responder exigencia", "legal_days": 60, "internal_days": 55}
    if "indeferimento" in text:
        return {"severity": "critico", "action": "Avaliar recurso contra indeferimento", "legal_days": 60, "internal_days": 55}
    if "concessão de registro" in text:
        return {"severity": "informativo", "action": "Baixar e arquivar certificado"}
    if "deferimento do pedido" in text:
        return {"severity": "informativo", "action": "Acompanhar concessao automatica"}
    return {"severity": "revisar", "action": "Conferir despacho no PDF oficial"}


def newest_xml() -> Path:
    files = list(OUT.glob("RM*.xml"))
    if not files:
        raise RuntimeError("Nenhum XML encontrado. Execute baixar_rpi.py ou use --baixar.")
    return max(files, key=lambda path: path.stat().st_mtime)


def parse_rpi(xml_path: Path, portfolio: dict[str, dict]) -> dict:
    rpi_number = ""
    publication_date = date.today()
    total_processes = 0
    matched_processes = set()
    movements = []

    for event, element in ET.iterparse(xml_path, events=("start", "end")):
        if event == "start" and element.tag == "revista":
            rpi_number = element.attrib.get("numero", xml_path.stem.removeprefix("RM"))
            publication_date = parse_date(element.attrib.get("data"))
        if event != "end" or element.tag != "processo":
            continue

        total_processes += 1
        number = digits(element.attrib.get("numero"))
        tracked = portfolio.get(number)
        if tracked:
            matched_processes.add(number)
            for dispatch in element.findall("./despachos/despacho"):
                name = dispatch.attrib.get("nome", "Despacho sem nome")
                rule = dispatch_rule(name)
                movement = {
                    "rpi": rpi_number,
                    "publicationDate": publication_date.isoformat(),
                    "processNumber": number,
                    "brand": tracked.get("brand", "Marca nao informada"),
                    "classes": tracked.get("classes", ""),
                    "owner": tracked.get("owner", ""),
                    "dispatchCode": dispatch.attrib.get("codigo", "Sem codigo"),
                    "dispatchName": name,
                    "severity": rule["severity"],
                    "nextAction": rule["action"],
                    "legalDeadline": "",
                    "internalDeadline": "",
                }
                if "legal_days" in rule:
                    movement["legalDeadline"] = (publication_date + timedelta(days=rule["legal_days"])).isoformat()
                if "internal_days" in rule:
                    movement["internalDeadline"] = (publication_date + timedelta(days=rule["internal_days"])).isoformat()
                movements.append(movement)
        element.clear()

    return {
        "rpi": rpi_number or xml_path.stem,
        "publicationDate": publication_date.isoformat(),
        "xml": str(xml_path),
        "totalProcesses": total_processes,
        "trackedProcesses": len(portfolio),
        "matchedProcesses": len(matched_processes),
        "movements": movements,
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
    }


def markdown(report: dict) -> str:
    lines = [
        f"# Monitoramento RPI {report['rpi']}",
        "",
        f"- Publicacao: {report['publicationDate']}",
        f"- Processos na revista: {report['totalProcesses']}",
        f"- Processos acompanhados: {report['trackedProcesses']}",
        f"- Processos encontrados: {report['matchedProcesses']}",
        f"- Despachos encontrados: {len(report['movements'])}",
        "",
        "> O XML e usado para triagem. Confira cada despacho no PDF oficial da secao V de Marcas antes de cumprir prazo ou tomar decisao processual.",
        "",
    ]
    if not report["movements"]:
        lines += ["## Resultado", "", "Nenhuma movimentacao encontrada para a carteira monitorada.", ""]
        return "\n".join(lines)

    lines += ["## Movimentacoes", ""]
    for item in report["movements"]:
        lines += [
            f"### {item['brand']} - {item['processNumber']}",
            "",
            f"- Despacho: `{item['dispatchCode']}` - {item['dispatchName']}",
            f"- Nivel: **{item['severity']}**",
            f"- Proxima acao: {item['nextAction']}",
        ]
        if item["legalDeadline"]:
            lines.append(f"- Prazo legal sugerido: {item['legalDeadline']}")
        if item["internalDeadline"]:
            lines.append(f"- Prazo interno sugerido: {item['internalDeadline']}")
        lines.append("")
    return "\n".join(lines)


def notify(report: dict, report_path: Path) -> None:
    count = len(report["movements"])
    title = f"MarcaFlow: RPI {report['rpi']}"
    message = f"{count} despacho(s) encontrado(s). Relatorio: {report_path.name}"
    script = f'display notification {json.dumps(message)} with title {json.dumps(title)}'
    subprocess.run(["osascript", "-e", script], check=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--portfolio", type=Path, default=DEFAULT_PORTFOLIO)
    parser.add_argument("--xml", type=Path)
    parser.add_argument("--baixar", action="store_true", help="Baixa a RPI mais recente antes do cruzamento.")
    parser.add_argument("--notify", action="store_true", help="Exibe notificacao local no macOS.")
    args = parser.parse_args()

    if args.baixar:
        result = baixar_rpi()
        if result:
            return result
    xml_path = args.xml or newest_xml()
    portfolio = load_portfolio(args.portfolio)
    report = parse_rpi(xml_path, portfolio)

    REPORTS.mkdir(exist_ok=True)
    stem = f"monitoramento-RPI-{report['rpi']}"
    json_path = REPORTS / f"{stem}.json"
    md_path = REPORTS / f"{stem}.md"
    latest_path = REPORTS / "ultimo-monitoramento.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    content = markdown(report)
    md_path.write_text(content, encoding="utf-8")
    latest_path.write_text(content, encoding="utf-8")

    print(f"RPI {report['rpi']}: {len(report['movements'])} despacho(s) em {report['matchedProcesses']} processo(s) monitorado(s).")
    print(f"Relatorio: {md_path}")
    print("Confira os despachos no PDF oficial da secao V de Marcas.")
    if args.notify:
        notify(report, md_path)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"Erro: {error}", file=sys.stderr)
        raise SystemExit(1)
