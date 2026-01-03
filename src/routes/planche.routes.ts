import { Router } from 'express';
const router: Router = Router();
import { createPlanche, deletePlanche, getCatalogues, getPlancheById, getPlanches, updatePlanche } from '../controllers/plancheController';
import upload from '../middlewares/uploadMiddleware';
import { onlyMaitre, requireSignin } from '../middlewares/requireSignin';

router.post(
  "/planches",
  requireSignin,
  onlyMaitre,
  upload.fields([
    { name: "files", maxCount: 10 },
    { name: "audios", maxCount: 10 },
  ]),
  createPlanche
)

router.put(
  "/planche/:id",
  requireSignin,
    onlyMaitre,
    upload.fields([
        { name: "files", maxCount: 10 },
        { name: "audios", maxCount: 10 },
    ]),
    updatePlanche
);

router.get("/catalogue", getCatalogues)
router.get("/planche/:id", getPlancheById)
router.get("/planches", getPlanches)
router.delete("/planche/:id", onlyMaitre, deletePlanche)


export default router;