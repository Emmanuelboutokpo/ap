import { Router } from "express"
import { deleteCategory, getCategories, getCategoryById, updateCategory } from "../controllers/categoryController"
import { onlyMaitre } from "../middlewares/requireSignin"

const router = Router()

router.get("/", getCategories)
router.get("/:id", getCategoryById)
router.put("/:id", onlyMaitre, updateCategory)
router.delete("/:id", onlyMaitre, deleteCategory)

export default router
