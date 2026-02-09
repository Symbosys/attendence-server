import { Router } from "express";
import * as controller from "../controller/auth.controller";

const companyAuthRoute = Router()

companyAuthRoute.post("/request-otp", controller.requestOtp);
companyAuthRoute.post("/verify-otp", controller.verifyOtp);


export default companyAuthRoute
