import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import ENV from "./config/env";
import errorMiddleware from "./middleware/error.middleware";
import companyAuthRoute from "./module/company/routes/auth.routes";
import companyRoute from "./module/company/routes/company.routes";
import geofenceRoute from "./module/company/routes/geofence.route";
import shiftRoute from "./module/company/routes/sift.routes";

//admin routes
import adminRoutes from "./module/admin/routes/admin.routes";

//employee routes
import decisionRoutes from "./module/decision/routes/decision.routes";
import attendanceRoutes from "./module/empolyee/routes/attendance.routes";
import employeeAuthRoute from "./module/empolyee/routes/auth.routes";
import employeeCategoryRoute from "./module/empolyee/routes/employee.category.routes";
import employeeOnboardingRoute from "./module/empolyee/routes/employee.routes";
import holidayRoutes from "./module/holiday/routes/holiday.routes";
import leavesRoutes from "./module/leaves/routes/leaves.route";
import subscriptionPlanRoutes from "./module/subscriptionPlane/routes/subscriptionPlan.routes";
import taskRoutes from "./module/task/routes/task.routes";



const app = express();

/**
 * Global Middleware Stack
 */
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  cors({
    origin: [
      // for local development URL
      "http://localhost:8080",
      "http://192.168.1.8:8080"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3000,
    message: { status: 429, message: "Too many requests, please try again later" },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

/**
 * Health Check Endpoint
 */
app.get("/", (_, res) => {
  res.json({
    message: "attendance management system",
    mode: ENV.mode === "development" ? "development" : "production",
    version: "1.0.0",
  });
});


/**
 * company routes
*/
app.use("/api/v1/company/auth", companyAuthRoute);
app.use("/api/v1/company/shift", shiftRoute);
app.use("/api/v1/company/geofence", geofenceRoute);
app.use("/api/v1/company", companyRoute);

/**
 * Employee routes
*/
app.use("/api/v1/employee/auth", employeeAuthRoute);
app.use("/api/v1/employee/category", employeeCategoryRoute);
app.use("/api/v1/employee", employeeOnboardingRoute);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/leaves", leavesRoutes);
app.use("/api/v1/task", taskRoutes);
app.use("/api/v1/decision", decisionRoutes);
app.use("/api/v1/holiday", holidayRoutes);
app.use("/api/v1/subscription-plan", subscriptionPlanRoutes);

/**
 * Admin routes
 */
app.use("/api/v1/admin", adminRoutes);


app.use(errorMiddleware);

/**
 * Server Initialization
 */
const PORT = ENV.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${ENV.mode}`);
});
