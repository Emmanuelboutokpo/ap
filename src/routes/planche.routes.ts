import { Router } from 'express';
const router: Router = Router();
import { createPlanche, deletePlanche, getPlancheById, getPlanches, updatePlanche } from '../controllers/plancheController';
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
  "/planches/:id",
  requireSignin,
    onlyMaitre,
    upload.fields([
        { name: "files", maxCount: 10 },
        { name: "audios", maxCount: 10 },
    ]),
    updatePlanche
);

router.get("/:id", getPlancheById)
router.get("/", getPlanches)
router.delete("/:id", onlyMaitre, deletePlanche)


export default router;