import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import mangaRouter from "./manga.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mangaRouter);

export default router;
