"""Rebuild the original brand icons and portrait Apple startup images."""
from tempfile import TemporaryDirectory
from subprocess import run
from pathlib import Path
import re

from PIL import Image

root = Path(__file__).resolve().parents[1]
public = root / "public" / "pwa"
brand = (public / "brand.svg").read_text()
logo = re.sub(r'<rect[^>]*/>', '', brand)
apple = brand.replace(' rx="112"', '')


def render(svg, size):
    with TemporaryDirectory() as temporary:
        source = Path(temporary) / "icon.svg"
        image = source.with_suffix(".png")
        source.write_text(svg)
        run(["inkscape", str(source), f"--export-width={size}", f"--export-filename={image}"], check=True, capture_output=True)
        with Image.open(image) as png:
            return png.convert("RGBA")


for size in (192, 512):
    render(brand, size).save(public / f"icon-{size}.png", optimize=True)
render(apple, 180).convert("RGB").save(public / "apple-touch-icon.png", optimize=True)

maskable = Image.new("RGBA", (512, 512), "#12141C")
maskable.alpha_composite(render(logo, 374), (69, 69))
maskable.convert("RGB").save(public / "icon-maskable-512.png", optimize=True)

html = root / "index.html"
entries = []
for width, height, ratio in [
    (320, 568, 2), (375, 667, 2), (375, 812, 3), (390, 844, 3),
    (393, 852, 3), (402, 874, 3), (414, 896, 2), (414, 896, 3),
    (428, 926, 3), (430, 932, 3), (440, 956, 3),
]:
    pixels = (width * ratio, height * ratio)
    name = f"startup-{pixels[0]}x{pixels[1]}.png"
    image = Image.new("RGBA", pixels, "#09090B")
    size = round(pixels[0] * 0.19)
    image.alpha_composite(render(brand, size), ((pixels[0] - size) // 2, (pixels[1] - size) // 2))
    image.convert("RGB").save(public / name, optimize=True)
    media = f"(device-width: {width}px) and (device-height: {height}px) and (-webkit-device-pixel-ratio: {ratio}) and (orientation: portrait)"
    entries.append(f'    <link rel="apple-touch-startup-image" href="/pwa/{name}" media="{media}" />')
data = html.read_text()
start, end = "    <!-- apple-startup:start -->", "    <!-- apple-startup:end -->"
html.write_text(data.split(start)[0] + start + "\n" + "\n".join(entries) + "\n" + end + data.split(end)[1])
