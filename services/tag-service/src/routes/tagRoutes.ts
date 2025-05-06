import express from "express";
import asyncHandler from "express-async-handler";
import * as tagController from "../controllers/tagController";

const router = express.Router();

router.post("/", asyncHandler(tagController.createTag));
router.get("/", asyncHandler(tagController.getTags));

export default router;
