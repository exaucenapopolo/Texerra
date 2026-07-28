import { Router, type IRouter } from "express";
import healthRouter from "./health";
import countriesRouter from "./countries";
import servicesRouter from "./services";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import topupsRouter from "./topups";
import meRouter from "./me";
import statsRouter from "./stats";
import contactRouter from "./contact";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/me", meRouter);
router.use("/countries", countriesRouter);
router.use("/services", servicesRouter);
router.use("/orders", ordersRouter);
router.use("/payments", paymentsRouter);
router.use("/topups", topupsRouter);
router.use("/stats", statsRouter);
router.use("/contact", contactRouter);

export default router;
