import { Router } from "express"
import { deleteCategory, getCategories, getCategoryById, updateCategory } from "../controllers/categoryController"
import { onlyMaitre } from "../middlewares/requireSignin"

const router = Router()

router.get("/categories", getCategories)
router.get("/category/:id", getCategoryById)
router.put("/category/:id", onlyMaitre, updateCategory)
router.delete("/category/:id", onlyMaitre, deleteCategory)

export default router
