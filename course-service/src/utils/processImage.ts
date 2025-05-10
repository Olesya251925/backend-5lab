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

  const imageName = `${moment().tz("Asia/Kemerovo").format("YYYY-MM-DDTHH-mm-ss")}.png`;
  const uploadDir = path.join(__dirname, "../../src/uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const newImagePath = path.join(uploadDir, imageName);

  // Обработка изображения
  await sharp(foundImagePath).resize(800).toFile(newImagePath);

  return `/uploads/${imageName}`;
};
