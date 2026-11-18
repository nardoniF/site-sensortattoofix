#!/usr/bin/env python3
"""Gera PDF de etiquetas 90×25 mm em folha 145×100 mm (impressora)."""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

PAGE_W = 145 * mm
PAGE_H = 100 * mm
LABEL_W = 90 * mm
LABEL_H = 25 * mm
# 4 etiquetas empilhadas: 4×25 = 100 mm (altura exata da folha)
MARGIN_X = (PAGE_W - LABEL_W) / 2  # centraliza na sobra horizontal (~27.5 mm cada lado)

LABELS = [
    "25 mm × 1,0 mm",
    "20 mm × 1,0 mm",
    "25 mm × 0,5 mm",
    "20 mm × 0,5 mm",
    "25 mm × 1,0 mm — kit",
    "20 mm × 1,0 mm — kit",
    "Envelopes",
    "Saco plástico de envio",
    "Biodome 25 mm",
    "Smart bands",
    "15 mm × 0,5 mm",
    "15 mm × 1,0 mm",
]


def register_font() -> str:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for path in candidates:
        if Path(path).exists():
            pdfmetrics.registerFont(TTFont("LabelBold", path))
            return "LabelBold"
    return "Helvetica-Bold"


def draw_label(c: canvas.Canvas, x: float, y: float, text: str, font: str) -> None:
    c.setStrokeColorRGB(0.15, 0.15, 0.15)
    c.setLineWidth(0.6)
    c.setDash(1.2, 1.2)
    c.rect(x, y, LABEL_W, LABEL_H, stroke=1, fill=0)
    c.setDash()

    c.setFillColorRGB(0.05, 0.05, 0.05)
    # Duas linhas se tiver "—"
    if " — " in text:
        main, tag = text.split(" — ", 1)
        c.setFont(font, 13)
        c.drawCentredString(x + LABEL_W / 2, y + LABEL_H / 2 + 2.2 * mm, main)
        c.setFont(font, 10)
        c.drawCentredString(x + LABEL_W / 2, y + LABEL_H / 2 - 4.2 * mm, tag)
    else:
        size = 14 if len(text) < 22 else 12
        c.setFont(font, size)
        c.drawCentredString(x + LABEL_W / 2, y + LABEL_H / 2 - 2.2 * mm, text)


def build_pdf(out: Path) -> None:
    font = register_font()
    c = canvas.Canvas(str(out), pagesize=(PAGE_W, PAGE_H))
    c.setTitle("Etiquetas estoque 90x25 em folha 145x100")

    per_page = 4
    for i, text in enumerate(LABELS):
        if i and i % per_page == 0:
            c.showPage()
        slot = i % per_page
        # de cima para baixo
        y = PAGE_H - (slot + 1) * LABEL_H
        draw_label(c, MARGIN_X, y, text, font)

        # rodapé discreto só na 1ª etiqueta da página (métricas)
        if slot == 0:
            c.setFont("Helvetica", 5.5)
            c.setFillColorRGB(0.45, 0.45, 0.45)
            c.drawString(1.5 * mm, PAGE_H - 3 * mm, "Folha 145×100 mm · etiqueta 90×25 mm · corte no tracejado")

    c.save()


if __name__ == "__main__":
    out = Path("/opt/cursor/artifacts/etiquetas-estoque-145x100.pdf")
    out.parent.mkdir(parents=True, exist_ok=True)
    build_pdf(out)
    # cópia no repo para versionar
    repo = Path("/workspace/docs/etiquetas/etiquetas-estoque-145x100.pdf")
    repo.parent.mkdir(parents=True, exist_ok=True)
    repo.write_bytes(out.read_bytes())
    print(out)
    print(repo)
