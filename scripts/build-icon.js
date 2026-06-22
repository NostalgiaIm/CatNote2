// Convert the project icon source image into app-ready PNG and ICO assets.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// Keep all paths centralized so packaging and runtime windows use the same icon files.
const root = path.resolve(__dirname, '..');
const iconDir = path.join(root, 'assets');
const sourcePath = path.join(iconDir, 'icon-source.jpg');
const pngPath = path.join(iconDir, 'app-icon.png');
const icoPath = path.join(iconDir, 'app-icon.ico');

function runPython(script) {
    // Use the local Python/Pillow installation for reliable image processing.
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

if (!fs.existsSync(sourcePath)) {
    throw new Error(`Icon source image not found: ${sourcePath}`);
}

fs.mkdirSync(iconDir, { recursive: true });

// The Python block performs the visual work:
// 1. crop the user-provided cat notebook image into a centered square;
// 2. flood-remove white screenshot corners connected to the image border;
// 3. place the cleaned artwork on a consistent warm yellow app-icon background;
// 4. slightly enhance color/contrast for small Windows icon sizes;
// 5. apply an app-icon rounded rectangle mask;
// 6. export a 1024px PNG plus a multi-resolution Windows ICO.
const pythonScript = String.raw`
from pathlib import Path
from collections import deque
from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageDraw

source_path = Path(r"${sourcePath}")
png_path = Path(r"${pngPath}")
ico_path = Path(r"${icoPath}")

img = Image.open(source_path).convert("RGBA")

# Crop a square region that keeps the cat, pencil and notebook readable at icon size.
w, h = img.size
side = min(w, h)
left = max(0, int((w - side) / 2))
top = max(0, int((h - side) / 2))
img = img.crop((left, top, left + side, top + side))

# Resize early to give all cleanup operations a consistent working canvas.
canvas_size = 1024
img = img.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)

# Use the dominant warm yellow from the picture as the repaired background color.
background_color = (255, 210, 64, 255)

def is_border_white(pixel):
    # Detect only near-white screenshot/background artifacts; the cat itself is protected by flood fill.
    r, g, b, a = pixel
    return a > 0 and r > 222 and g > 222 and b > 208 and (max(r, g, b) - min(r, g, b)) < 58

def is_border_dark(pixel):
    # Detect the dark line artifact attached to the imported thumbnail edge.
    r, g, b, a = pixel
    return a > 0 and r < 38 and g < 30 and b < 26

def flood_edge_artifacts(predicate):
    # Flood fill from every edge so only artifacts connected to the outer border are removed.
    visited = bytearray(canvas_size * canvas_size)
    artifact_mask = Image.new("L", (canvas_size, canvas_size), 0)
    mask_pixels = artifact_mask.load()
    queue = deque()

    def enqueue_if_artifact(x, y):
        idx = y * canvas_size + x
        if not visited[idx] and predicate(pixels[x, y]):
            visited[idx] = 1
            queue.append((x, y))

    for i in range(canvas_size):
        enqueue_if_artifact(i, 0)
        enqueue_if_artifact(i, canvas_size - 1)
        enqueue_if_artifact(0, i)
        enqueue_if_artifact(canvas_size - 1, i)

    while queue:
        x, y = queue.popleft()
        mask_pixels[x, y] = 255
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < canvas_size and 0 <= ny < canvas_size:
                enqueue_if_artifact(nx, ny)

    return artifact_mask

# Flood fill from every edge so only white/dark areas connected to the outer screenshot border are removed.
pixels = img.load()
white_mask = flood_edge_artifacts(is_border_white)
dark_mask = flood_edge_artifacts(is_border_dark)
remove_mask = ImageChops.lighter(white_mask, dark_mask)

# Expand the cleanup mask slightly to remove antialiased white fringes around the old rounded border.
remove_mask = remove_mask.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(0.8))
alpha = img.getchannel("A")
alpha = ImageChops.subtract(alpha, remove_mask)
img.putalpha(alpha)

# Paint a fresh warm background underneath the cleaned original artwork.
base = Image.new("RGBA", img.size, background_color)
base_draw = ImageDraw.Draw(base)
base_draw.rounded_rectangle((0, 0, canvas_size - 1, canvas_size - 1), radius=190, fill=background_color)

# Add a very soft center highlight so the icon keeps the cheerful original tone without white corners.
highlight = Image.new("RGBA", img.size, (0, 0, 0, 0))
highlight_draw = ImageDraw.Draw(highlight)
highlight_draw.ellipse((-160, -190, canvas_size + 120, canvas_size + 110), fill=(255, 232, 120, 70))
highlight = highlight.filter(ImageFilter.GaussianBlur(48))
base = Image.alpha_composite(base, highlight)
img = Image.alpha_composite(base, img)

# Slight polish for icon readability: richer color, cleaner contrast, softer JPEG noise.
img = ImageEnhance.Color(img).enhance(1.06)
img = ImageEnhance.Contrast(img).enhance(1.03)
img = ImageEnhance.Sharpness(img).enhance(1.12)

# Create an app-icon mask with generous rounded corners.
mask = Image.new("L", img.size, 0)
draw = ImageDraw.Draw(mask)
radius = 186
draw.rounded_rectangle((0, 0, canvas_size - 1, canvas_size - 1), radius=radius, fill=255)

# Feather the outermost edge lightly so Windows icons look clean at small sizes.
soft_mask = mask.filter(ImageFilter.GaussianBlur(0.45))
img.putalpha(soft_mask)

# Save a high-resolution project PNG preview.
png_path.parent.mkdir(parents=True, exist_ok=True)
img.save(png_path, "PNG")

# Save a multi-resolution Windows ICO in one file.
ico_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
img.save(ico_path, "ICO", sizes=ico_sizes)

print(f"Generated {png_path}")
print(f"Generated {ico_path}")
`;

process.stdout.write(runPython(pythonScript));
