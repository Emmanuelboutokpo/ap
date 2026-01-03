import { Router } from "express"
import { deleteSubCategory, getSubCategories, getSubCategoryById, updateSubCategory } from "../controllers/subCategoryController"
import { onlyMaitre } from "../middlewares/requireSignin"
 
const router = Router()

 router.get("/",   getSubCategories)
router.get("/:id",   getSubCategoryById)
router.put("/:id", onlyMaitre,   updateSubCategory)
router.delete("/:id", onlyMaitre, deleteSubCategory)

export default router
