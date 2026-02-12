import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import {
    createTask,
    deleteTask,
    getAllTasks,
    getTaskById,
    updateTask,
} from "../controller/task.controller.js";

const router = Router();

// Public route to get all tasks by company ID
router.get("/all/:companyId", getAllTasks);

// Protected routes (Company only)
router.use(protectCompany);

router.route("/").post(createTask);

router.route("/:id").get(getTaskById).put(updateTask).delete(deleteTask);

export default router;
