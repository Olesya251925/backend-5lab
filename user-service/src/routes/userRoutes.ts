import { Router, type Response } from "express";
import { getProfile, deleteUser } from "../controllers/userController";
import { authMiddleware } from "../middlewares/authMiddleware";
import type { AuthRequest } from "../types/auth";

const router = Router();

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  await getProfile(req, res);
});

router.delete("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  await deleteUser(req, res);
});

export default router;
