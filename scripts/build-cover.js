// Generate the README display image from the app icon and the optional cover reference.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Keep asset paths centralized so README and packaged builds share one cover.
const root = path.resolve(__dirname, '..');
const assetDir = path.join(root, 'assets');
const iconPath = path.join(assetDir, 'app-icon.png');
const sourceCoverPath = path.join(assetDir, 'cover-source.jpg');
const coverPath = path.join(assetDir, 'cover.png');

function runPython(script) {
    // Pillow gives deterministic composition and exact Chinese text rendering.
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

// The Python block creates the project display image:
// 1. use cover-source.jpg when present to preserve the user's chosen visual;
// 2. clean and rebuild only the right text area;
// 3. keep title and app name free of ruled lines;
// 4. place body copy and chips naturally on the right-side notebook lines.
const pythonScript = String.raw`
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

icon_path = Path(r"${iconPath}")
source_cover_path = Path(r"${sourceCoverPath}")
cover_path = Path(r"${coverPath}")

width, height = 1280, 708

def background_color(x, y):
    # Match the soft yellow-orange tone of the provided reference image.
    vertical = y / (height - 1)
    horizontal = x / (width - 1)
    r = int(255 - 2 * vertical)
    g = int(244 * (1 - vertical) + 198 * vertical - 7 * horizontal)
    b = int(128 * (1 - vertical) + 55 * vertical + 5 * horizontal)
    return max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), 255

def make_background():
    # Build a reusable clean background for repaired regions.
    image = Image.new("RGBA", (width, height), (255, 230, 92, 255))
    pixels = image.load()
    for yy in range(height):
        for xx in range(width):
            pixels[xx, yy] = background_color(xx, yy)
    return image

if source_cover_path.exists():
    # Use the supplied display image as the base so the left icon/card stays faithful.
    canvas = Image.open(source_cover_path).convert("RGBA").resize((width, height), Image.Resampling.LANCZOS)
else:
    # Fall back to a generated background and app icon when the source image is absent.
    canvas = make_background()

clean_bg = make_background()

# Feather in a clean right side to remove the previous text and old notebook rules.
mask = Image.new("L", (width, height), 0)
mask_pixels = mask.load()
for yy in range(height):
    for xx in range(width):
        if xx < 525:
            alpha = 0
        elif xx > 555:
            alpha = 255
        else:
            alpha = int((xx - 525) / 30 * 255)
        mask_pixels[xx, yy] = alpha
canvas = Image.composite(clean_bg, canvas, mask)

draw = ImageDraw.Draw(canvas)

def rounded_shadow(box, radius, blur, offset, shadow_fill):
    # Draw one soft shadow behind a rounded rectangle.
    layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)
    shifted = (box[0] + offset[0], box[1] + offset[1], box[2] + offset[0], box[3] + offset[1])
    layer_draw.rounded_rectangle(shifted, radius=radius, fill=shadow_fill)
    return layer.filter(ImageFilter.GaussianBlur(blur))

def pick_font(size, bold=False):
    # Prefer Microsoft YaHei for crisp Chinese text on Windows.
    candidates = [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()

def text_size(text, font):
    # Keep measurements stable for chip sizing and line placement.
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]

def draw_text_on_rule(x, rule_y, text, font, fill):
    # Place text just above a ruled line so it reads as written on the page.
    _, text_h = text_size(text, font)
    draw.text((x, rule_y - text_h - 8), text, font=font, fill=fill)

title_font = pick_font(62, True)
subtitle_font = pick_font(35, True)
body_font = pick_font(27)
chip_font = pick_font(22, True)

# Recreate a wider right notebook card so all text fits without clipping.
paper_box = (650, 72, 1217, 610)
canvas.alpha_composite(rounded_shadow(paper_box, 34, 18, (10, 14), (93, 62, 26, 42)))
draw.rounded_rectangle(paper_box, radius=34, fill=(255, 252, 226, 226))

# Recreate the lower floating note strip for the feature chips.
chip_paper = (650, 486, 1218, 646)
canvas.alpha_composite(rounded_shadow(chip_paper, 30, 16, (8, 12), (91, 58, 24, 42)))
draw.rounded_rectangle(chip_paper, radius=30, fill=(255, 255, 248, 236))

# Draw only lower notebook rules; the title block intentionally has no underline.
rule_color = (143, 89, 42, 56)
for rule_y in (392, 448, 506):
    draw.line((690, rule_y, 1185, rule_y), fill=rule_color, width=3)
for rule_y in (562, 616):
    draw.line((690, rule_y, 1185, rule_y), fill=rule_color, width=3)

text_x = 690
title_color = (70, 38, 23)
subtitle_color = (104, 61, 36)
body_color = (91, 57, 37)

# The main product name and English name sit in a clean title-safe area.
draw.text((text_x, 160), "\u55b5\u55b5\u4fbf\u7b7e", font=title_font, fill=title_color)
draw.text((text_x + 3, 244), "CatNote", font=subtitle_font, fill=subtitle_color)

# Supporting copy is aligned to the right-side notebook rules.
draw_text_on_rule(text_x + 3, 392, "\u8ba9\u7075\u611f\u6709\u5e8f\uff0c\u8ba9\u8bb0\u5f55\u66f4\u6e29\u6696\u3002", body_font, body_color)
draw_text_on_rule(text_x + 3, 448, "Windows x64  \u00b7  Electron  \u00b7  Local JSON", body_font, (112, 71, 45))

# Compact chips sit on the lower strip and mask the rule line under each label.
chips = [
    "\u591a\u4e3b\u9898",
    "\u81ea\u52a8\u4fdd\u5b58",
    "\u684c\u9762\u4fbf\u7b7e",
    "Ctrl + Q",
]
chip_x = 690
chip_y = 522
for chip in chips:
    chip_w, chip_h = text_size(chip, chip_font)
    pill_w = chip_w + 32
    draw.rounded_rectangle((chip_x, chip_y, chip_x + pill_w, chip_y + 43), radius=22, fill=(255, 255, 255, 226))
    draw.text((chip_x + 16, chip_y + 7), chip, font=chip_font, fill=(86, 52, 35))
    chip_x += pill_w + 14

cover_path.parent.mkdir(parents=True, exist_ok=True)
canvas.convert("RGB").save(cover_path, "PNG")
print(f"Generated {cover_path}")
`;

process.stdout.write(runPython(pythonScript));
