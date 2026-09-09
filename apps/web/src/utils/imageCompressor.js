/**
 * Lightweight client-side image downscaler and compressor.
 * Constrains image dimensions to a maximum bounding box (default 1920px)
 * to ensure instant upload times and prevent token bloat while keeping OCR sharp.
 * @param {File|Blob} file
 * @param {number} [maxDimension=1920]
 * @param {number} [quality=0.85]
 * @returns {Promise<{ dataUrl: string, base64: string, mimeType: string, name: string, size: number }>}
 */
export function compressImage(file, maxDimension = 1920, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Invalid image file.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions if exceeding maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as high quality JPEG
        const mimeType = 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split('base64,')[1];
        
        // Approximate byte size of base64
        const approxSize = Math.round((base64.length * 3) / 4);

        resolve({
          dataUrl,
          base64,
          mimeType,
          name: file.name || `photo_${Date.now()}.jpg`,
          size: approxSize
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
