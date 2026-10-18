from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

root = Path(__file__).resolve().parents[1]
font_path = root / "assets" / "fonts" / "Oranienbaum-Regular.ttf"
out = root / "assets" / "textures" / "class_texture.png"
bak = out.with_suffix(".png.bak")
if out.exists() and not bak.exists():
    bak.write_bytes(out.read_bytes())

size = 768
cell = size // 3
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

font_big = ImageFont.truetype(str(font_path), 118)
font_sup = ImageFont.truetype(str(font_path), 58)

labels = [
    ("2", "1"),
    ("2", "2"),
    ("2", "3"),
    ("3", "1"),
    ("3", "2"),
    ("3", "3"),
    ("4", "1"),
    ("4", "2"),
    ("4", "3"),
]

for i, (base, exp) in enumerate(labels):
    col = i % 3
    row = i // 3
    cx = col * cell + cell // 2
    cy = row * cell + cell // 2

    bb = draw.textbbox((0, 0), base, font=font_big)
    eb = draw.textbbox((0, 0), exp, font=font_sup)
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    ew, eh = eb[2] - eb[0], eb[3] - eb[1]
    gap = 4
    total_w = bw + gap + ew
    x0 = cx - total_w // 2 - bb[0]
    y0 = cy - bh // 2 - bb[1]
    for ox, oy, a in [(0, 0, 255), (1, 0, 90), (-1, 0, 90), (0, 1, 90), (0, -1, 90)]:
        draw.text((x0 + ox, y0 + oy), base, font=font_big, fill=(255, 255, 255, a))
    sx = x0 + bw + gap - eb[0]
    sy = y0 - eh * 0.35 - eb[1]
    for ox, oy, a in [(0, 0, 255), (1, 0, 80), (-1, 0, 80), (0, 1, 80), (0, -1, 80)]:
        draw.text((sx + ox, sy + oy), exp, font=font_sup, fill=(255, 255, 255, a))

img.save(out)
print("wrote", out, img.size)
