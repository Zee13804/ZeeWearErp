const sharp = require('sharp');

async function compressToUnder50KB(buffer, maxBytes = 49000) {
  let quality = 80;
  let width = 1200;
  let result;

  while (quality >= 10) {
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

  return result;
}

module.exports = { compressToUnder50KB };
