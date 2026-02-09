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

//employee routes
import attendanceRoutes from "./module/empolyee/routes/attendance.routes";
import employeeAuthRoute from "./module/empolyee/routes/auth.routes";
import employeeOnboardingRoute from "./module/empolyee/routes/employee.routes";
import leavesRoutes from "./module/leaves/routes/leaves.route";

const app = express();

/**
 * Global Middleware Stack
 */
app.use(express.json({ limit: "20mb" }));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
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
app.use("/api/v1/employee", employeeOnboardingRoute);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/leaves", leavesRoutes);

app.use(errorMiddleware);

/**
 * Server Initialization
 */
const PORT = ENV.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${ENV.mode}`);
});
