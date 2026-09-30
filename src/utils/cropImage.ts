interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_OUTPUT_DIMENSION = 1024;

export function cropImageToBlob(
  imageSrc: string,
  pixelCrop: PixelCrop,
  mimeType = "image/jpeg",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
    image.onload = () => {
      let { width, height } = pixelCrop;

      if (width > MAX_OUTPUT_DIMENSION || height > MAX_OUTPUT_DIMENSION) {
        const scale = Math.min(MAX_OUTPUT_DIMENSION / width, MAX_OUTPUT_DIMENSION / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality
      );
    };
    image.onerror = () => reject(new Error("Failed to load image"));
  });
}
