import { Area } from 'react-easy-crop';

/** Convert a cropped region to a 1920×1080 JPEG Blob */
export default async function getCroppedImg(imageSrc: string, crop: Area) {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((res) => (image.onload = res));

  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

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

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob as Blob), 'image/jpeg', 0.9);
  });
}
