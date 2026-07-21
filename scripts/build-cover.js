// Generate a project cover image from the app icon artwork for README and packaging.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Centralize asset paths so the generated cover is easy to reference from README and packages.
const root = path.resolve(__dirname, '..');
const assetDir = path.join(root, 'assets');
const iconPath = path.join(assetDir, 'app-icon.png');
const coverPath = path.join(assetDir, 'cover.png');

function runPython(script) {
    // Pillow gives us deterministic image composition without adding runtime app dependencies.
    const result = spawnSync('python', ['-c', script], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        windowsHide: true
    });

    if (result.error) {
        throw new Error(`Python failed: ${result.error.message}`);
    }

    if (result.status !== 0) {
        throw new Error(`Python failed\n${result.stdout || ''}\n${result.stderr || ''}`);
    }

    return result.stdout;
}

if (!fs.existsSync(iconPath)) {
    throw new Error(`App icon not found: ${iconPath}. Run npm run build:icon first.`);
}

fs.mkdirSync(assetDir, { recursive: true });

// The Python block creates a warm, app-store-style cover:
// 1. draw a soft yellow/pink background;
// 2. place the generated app icon on the left with a shadow;
// 3. add the product name, English name, tagline and platform chips;
// 4. export a 1600x900 PNG suitable for README previews and release pages.
const pythonScript = String.raw`
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

icon_path = Path(r"${iconPath}")
cover_path = Path(r"${coverPath}")

width, height = 1600, 900
bg_top = (255, 232, 145)
bg_bottom = (255, 198, 83)
canvas = Image.new("RGBA", (width, height), bg_top + (255,))
pixels = canvas.load()

# Paint a vertical warm gradient that matches the cat notebook icon.
for y in range(height):
    t = y / (height - 1)
    r = int(bg_top[0] * (1 - t) + bg_bottom[0] * t)
    g = int(bg_top[1] * (1 - t) + bg_bottom[1] * t)
    b = int(bg_top[2] * (1 - t) + bg_bottom[2] * t)
    for x in range(width):
        pixels[x, y] = (r, g, b, 255)

draw = ImageDraw.Draw(canvas)

# Add soft decorative cards and notebook lines in the background.
for box, fill in [
    ((80, 80, 650, 780), (255, 255, 255, 62)),
    ((1030, 95, 1520, 780), (255, 244, 218, 76)),
    ((960, 610, 1515, 815), (255, 255, 255, 82)),
]:
    draw.rounded_rectangle(box, radius=56, fill=fill)

for y in range(185, 760, 66):
    draw.line((1010, y, 1485, y), fill=(162, 106, 45, 42), width=4)

# Font helpers prefer Microsoft YaHei on Windows, then fall back gracefully.
def pick_font(size, bold=False):
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()

title_font = pick_font(94, True)
subtitle_font = pick_font(48, True)
body_font = pick_font(34)
chip_font = pick_font(28, True)

# Paste the app icon with a soft drop shadow.
icon = Image.open(icon_path).convert("RGBA").resize((460, 460), Image.Resampling.LANCZOS)
shadow = Image.new("RGBA", icon.size, (0, 0, 0, 0))
shadow.putalpha(icon.getchannel("A"))
shadow = shadow.filter(ImageFilter.GaussianBlur(22))
shadow_color = Image.new("RGBA", shadow.size, (84, 54, 22, 100))
shadow_color.putalpha(shadow.getchannel("A"))
canvas.alpha_composite(shadow_color, (190, 238))
canvas.alpha_composite(icon, (170, 210))

# Draw title copy and product positioning.
title = "\u55b5\u55b5\u4fbf\u7b3a"
subtitle = "CatNote"
tagline = "\u8ba9\u7075\u611f\u6709\u5e8f\uff0c\u8ba9\u8bb0\u5f55\u66f4\u6e29\u6696\u3002"
description = "Windows x64  \u00b7  Electron  \u00b7  Local JSON"

text_x = 700
draw.text((text_x, 255), title, font=title_font, fill=(74, 40, 23))
draw.text((text_x + 4, 372), subtitle, font=subtitle_font, fill=(112, 66, 38))
draw.text((text_x + 4, 470), tagline, font=body_font, fill=(92, 58, 38))
draw.text((text_x + 4, 528), description, font=body_font, fill=(115, 74, 45))

# Draw compact feature chips.
chips = [
    "\u591a\u4e3b\u9898",
    "\u81ea\u52a8\u4fdd\u5b58",
    "\u684c\u9762\u4fbf\u7b3a",
    "Ctrl + Q",
]
chip_x = text_x + 4
chip_y = 625
for chip in chips:
    bbox = draw.textbbox((0, 0), chip, font=chip_font)
    chip_w = bbox[2] - bbox[0] + 42
    draw.rounded_rectangle((chip_x, chip_y, chip_x + chip_w, chip_y + 54), radius=27, fill=(255, 255, 255, 150))
    draw.text((chip_x + 21, chip_y + 9), chip, font=chip_font, fill=(90, 55, 35))
    chip_x += chip_w + 18

cover_path.parent.mkdir(parents=True, exist_ok=True)
canvas.convert("RGB").save(cover_path, "PNG")
print(f"Generated {cover_path}")
`;

process.stdout.write(runPython(pythonScript));
