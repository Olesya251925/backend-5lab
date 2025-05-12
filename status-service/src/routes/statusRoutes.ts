import { Router } from "express";
import { createStatus, getStatus } from "../controllers/statusController";

const router = Router();

router.post("/", (req, res, next) => {
  createStatus(req, res).catch(next);
});

router.get("/:id", (req, res, next) => {
  getStatus(req, res).catch(next);
});

export default router;
