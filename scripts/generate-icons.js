const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [16, 48, 128];
const iconDir = path.join(__dirname, "../public/icons");

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconDir)) {
	fs.mkdirSync(iconDir, { recursive: true });
}

// Create a simple icon - a colored square with rounded corners
async function generateIcon(size) {
	const padding = Math.round(size * 0.1);
	const radius = Math.round(size * 0.2);

	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: { r: 52, g: 120, b: 246, alpha: 1 } // Nice blue color
		}
	})
		.composite([
			{
				input: Buffer.from(`<svg width="${size}" height="${size}">
                    <rect x="${padding}" y="${padding}"
                          width="${size - 2 * padding}" height="${
					size - 2 * padding
				}"
                          rx="${radius}" ry="${radius}"
                          fill="#FFFFFF" fill-opacity="0.2"/>
                    <text x="50%" y="50%" text-anchor="middle" alignment-baseline="middle"
                          font-family="Arial" font-weight="bold" fill="white"
                          font-size="${Math.round(size * 0.4)}px">AB</text>
                </svg>`),
				top: 0,
				left: 0
			}
		])
		.toFile(path.join(iconDir, `icon${size}.png`));
}

// Generate all icon sizes
Promise.all(sizes.map((size) => generateIcon(size)))
	.then(() => console.log("Icons generated successfully"))
	.catch((err) => console.error("Error generating icons:", err));
