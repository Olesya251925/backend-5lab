import express from "express";
import asyncHandler from "express-async-handler";
import * as courseController from "../controllers/courseController";

const router = express.Router();

router.get("/", asyncHandler(courseController.getCourses));
router.get("/:id", asyncHandler(courseController.getCourseById));
router.post("/", asyncHandler(courseController.createCourse));
router.put("/:id", asyncHandler(courseController.updateCourse));
router.delete("/:id", asyncHandler(courseController.deleteCourse));
router.get("/:id/tags", asyncHandler(courseController.getCourseWithTags));

router.post("/favorite/:id", asyncHandler(courseController.addToFavorites));
router.delete(
  "/favorite/:id",
  asyncHandler(courseController.removeFromFavorites),
);

export default router;
