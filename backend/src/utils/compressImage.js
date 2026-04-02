const sharp = require('sharp');

async function compressToUnder50KB(buffer, maxBytes = 49000) {
  let quality = 80;
  let width = 1200;
  let result;

  while (quality >= 10 && width >= 100) {
    result = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

    if (result.length <= maxBytes) return result;

    if (quality > 30) {
      quality -= 15;
    } else {
      width = Math.round(width * 0.7);
      quality = 50;
    }
  }

  if (result.length > maxBytes) {
    const err = new Error(`Image cannot be compressed below 50 KB (final size: ${Math.round(result.length / 1024)} KB). Please upload a smaller image.`);
    err.status = 400;
    throw err;
  }

  return result;
}

module.exports = { compressToUnder50KB };
