import cors from "cors";
import express from "express";
import { default as helmet } from "helmet";
import { authRouter } from "./auth/routes.js";
import { userRouter } from "./auth/user-routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/auth", authRouter);
  app.use("/api/users", userRouter);

  app.get("/api/health", (_request, response) => {
    response.status(200).json({
      status: "ok",
      service: "pos-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      const status =
        typeof error === "object" && error !== null && "status" in error
          ? Number(error.status)
          : 500;

      response.status(status >= 400 && status < 600 ? status : 500).json({
        error:
          status >= 400 && status < 600
            ? "Request failed"
            : "Internal server error",
      });
    },
  );

  return app;
}
