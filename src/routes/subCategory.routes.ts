import { Router } from "express"
import { deleteSubCategory, getSubCategories, getSubCategoryById, updateSubCategory } from "../controllers/subCategoryController"
import { onlyMaitre } from "../middlewares/requireSignin"
 
const router = Router()

 router.get("/subcategories",   getSubCategories)
router.get("/subcategory/:id",   getSubCategoryById)
router.put("/subcategory/:id", onlyMaitre,   updateSubCategory)
router.delete("/subcategory/:id", onlyMaitre, deleteSubCategory)

export default router
