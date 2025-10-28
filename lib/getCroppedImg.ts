import { Area } from 'react-easy-crop';

/**
 * Convert a cropped region from react-easy-crop into a 1920×1080 JPEG Blob.
 * Used for consistent Fan Zone and Prize Wheel image uploads.
 */
export default async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  if (!imageSrc) throw new Error('No image source provided');
  if (!crop) throw new Error('No crop data provided');

  const image = new Image();
  image.crossOrigin = 'anonymous'; // ✅ prevents CORS-tainted canvas issues
  image.src = imageSrc;

  await new Promise((resolve, reject) => {
    image.onload = () => resolve(true);
    image.onerror = () => reject(new Error('Failed to load image for cropping'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not supported');

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to generate cropped blob'));
        resolve(blob);
      },
      'image/jpeg',
      0.9
    );
  });
}
