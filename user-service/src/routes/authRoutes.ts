import { Router, type Request, type Response } from "express";
import {
  register,
  login,
  getUserByLogin,
  deleteUser,
} from "../controllers/authController";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  await register(req, res);
});

router.post("/login", async (req: Request, res: Response) => {
  await login(req, res);
});

router.get("/me", async (req: Request, res: Response) => {
  await getUserByLogin(req, res);
});

router.delete("/delete", async (req: Request, res: Response) => {
  await deleteUser(req, res);
});

export default router;
