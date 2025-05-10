import fs from "fs";
import path from "path";
import sharp from "sharp";
import moment from "moment-timezone";

export const processCourseImage = async (imagePath: string): Promise<string> => {
  const possiblePaths = [
    path.join("/app/src/images", path.basename(imagePath)),
    path.join(__dirname, "../../src/images", path.basename(imagePath)),
    imagePath,
  ];

  const foundImagePath = possiblePaths.find((p) => fs.existsSync(p));

  if (!foundImagePath) {
    throw new Error(`Файл изображения не найден по путям: ${possiblePaths.join(", ")}`);
  }

  const possibleWatermarkPaths = [
    path.join("/app/src/assets", "watermark.png"),
    path.join(__dirname, "../../src/assets", "watermark.png"),
    path.join(__dirname, "../assets", "watermark.png"),
  ];

  const foundWatermarkPath = possibleWatermarkPaths.find((p) => fs.existsSync(p));

  if (!foundWatermarkPath) {
    throw new Error(`Водяной знак не найден по путям: ${possibleWatermarkPaths.join(", ")}`);
  }

  const imageName = `${moment().tz("Asia/Kemerovo").format("YYYY-MM-DDTHH-mm-ss")}.png`;
  const uploadDir = path.join(__dirname, "../../src/uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const newImagePath = path.join(uploadDir, imageName);

  const watermarkBuffer = await sharp(foundWatermarkPath).resize(100).toBuffer();

  await sharp(foundImagePath)
    .resize(800)
    .composite([
      {
        input: watermarkBuffer,
        gravity: "southeast",
        blend: "over",
      },
    ])
    .toFile(newImagePath);

  return `/uploads/${imageName}`;
};
