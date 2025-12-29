import { Router } from "express"
import { createSubCategory, deleteSubCategory, getSubCategories, getSubCategoryById, updateSubCategory } from "../controllers/subCategoryController"
import { onlyMaitre } from "../middlewares/requireSignin"
 
const router = Router()

router.post("/", onlyMaitre,  createSubCategory)
router.get("/",   getSubCategories)
router.get("/:id",   getSubCategoryById)
router.put("/:id", onlyMaitre,   updateSubCategory)
router.delete("/:id", onlyMaitre, deleteSubCategory)

export default router
