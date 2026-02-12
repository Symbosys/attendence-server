import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import {
    createCategory,
    deleteCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
} from "../controller/employee.category.controller.js";

const router = Router();

router.use(protectCompany);

router.route("/").post(createCategory).get(getAllCategories);

router.route("/:id").get(getCategoryById).put(updateCategory).delete(deleteCategory);

export default router;
