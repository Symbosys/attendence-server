import { Router } from "express";
import * as controller from "../controller/auth.controller";

const employeeAuthRoute = Router()

employeeAuthRoute.post("/request-otp", controller.requestOtp);
employeeAuthRoute.post("/verify-otp", controller.verifyOtp);

export default employeeAuthRoute
