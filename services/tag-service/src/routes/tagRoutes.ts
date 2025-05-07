import express from "express";
import asyncHandler from "express-async-handler";
import * as tagController from "../controllers/tagController";

const router = express.Router();

router.post("/tags", asyncHandler(tagController.createTag));
router.get("/tags", asyncHandler(tagController.getTags));

export default router;
