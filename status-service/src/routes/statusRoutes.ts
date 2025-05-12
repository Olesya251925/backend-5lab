import { Router } from "express";
import { getStatus } from "../controllers/statusController";

const router = Router();

router.get("/:statusId", getStatus);

export default router;
