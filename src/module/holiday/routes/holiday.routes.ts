import { Router } from "express";
import { protectCompany } from "../../../middleware/auth.middleware.js";
import {
    createHoliday,
    deleteHoliday,
    getAllHolidays,
    getHolidayById,
    updateHoliday,
} from "../controller/holiday.controller.js";

const router = Router();

// Public route to get all holidays by company ID (can be used by anyone with companyId)
router.get("/all/:companyId", getAllHolidays);

// Protected routes (Company Admin only for management)
router.use(protectCompany);

router.route("/")
  .post(createHoliday)
  .get(getAllHolidays);

router.route("/:id")
  .get(getHolidayById)
  .put(updateHoliday)
  .delete(deleteHoliday);

export default router;
