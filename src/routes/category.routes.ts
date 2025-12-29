import { Router } from "express"
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from "../controllers/categoryController"
import { onlyMaitre } from "../middlewares/requireSignin"

const router = Router()

router.post("/", onlyMaitre, createCategory)
router.get("/", getCategories)
router.get("/:id", getCategoryById)
router.put("/:id", onlyMaitre, updateCategory)
router.delete("/:id", onlyMaitre, deleteCategory)

export default router
