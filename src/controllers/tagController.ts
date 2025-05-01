import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import Tag from "../models/tag";

async function getNextTagId(): Promise<number> {
  const lastTag = await Tag.findOne().sort({ tagId: -1 }).limit(1);
  return lastTag ? lastTag.tagId + 1 : 1;
}

export const createTag = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tag } = req.body;

  if (!tag) {
    res.status(400).json({ message: "Поле tag обязательно для заполнения" });
    return;
  }

  const nextTagId = await getNextTagId();
  const newTag = new Tag({ tagId: nextTagId, name: tag });
  await newTag.save();
  res.status(201).json(newTag);
});

export const getTags = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const tags = await Tag.find();
  res.json(tags);
});
