import { Router, type Request, type Response } from "express";

const router = Router();

function sendHealth(_req: Request, res: Response) {
  res.json({
    status: "ok",
    service: "texerra-api",
    timestamp: new Date().toISOString(),
  });
}

router.get("/", sendHealth);
router.get("/healthz", sendHealth);

export default router;
