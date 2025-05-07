import express, { Request, Response, NextFunction } from "express";
import {
  getLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
} from "../controllers/lessonController";

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

const router = express.Router();

const wrapAsync = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

router.get("/", wrapAsync(getLessons));
router.get("/:id", wrapAsync(getLessonById));
router.post("/", wrapAsync(createLesson));
router.put("/:id", wrapAsync(updateLesson));
router.delete("/:id", wrapAsync(deleteLesson));

export default router;
