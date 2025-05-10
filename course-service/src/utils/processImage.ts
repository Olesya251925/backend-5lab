import fs from "fs";
import path from "path";
import sharp from "sharp";
import moment from "moment-timezone";

export const processCourseImage = async (imagePath: string): Promise<string> => {
  const imageExists = fs.existsSync(imagePath);
  if (!imageExists) {
    throw new Error("Файл изображения не найден");
  }

  const imageName = `${moment().tz("Asia/Kemerovo").format("YYYY-MM-DDTHH-mm-ss")}.png`;
  const uploadDir = path.join(__dirname, "..", "uploads");
  const newImagePath = path.join(uploadDir, imageName);
  const watermarkPath = path.join(__dirname, "..", "assets", "watermark.png");

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

  const watermarkBuffer = await sharp(watermarkPath).resize({ width: 100 }).toBuffer();

  await sharp(imagePath)
    .resize(800)
    .composite([{ input: watermarkBuffer, gravity: "southeast" }])
    .toFile(newImagePath);

  return `/uploads/${imageName}`;
};
