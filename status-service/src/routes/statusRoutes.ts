import { Router } from "express";
import { getStatus } from "../controllers/statusController";

const router = Router();

router.get("/:id", async (req, res, next) => {
  try {
    await getStatus(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
