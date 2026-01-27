import express from "express";
import session from "express-session";
import { registerRoutes } from "./routes";

const app = express();

declare module 'http' {
    interface IncomingMessage {
        rawBody: unknown
    }
}
app.use(express.json({
    limit: '50mb',
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ extended: false }));

// Basic session setup for admin login
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret";
app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 24 * 60 * 60 * 1000 },
    })
);

app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            if (logLine.length > 80) {
                logLine = logLine.slice(0, 79) + "…";
            }

            console.log(logLine);
        }
    });

    next();
});

let server: any = null;

export async function createApp() {
    if (!server) {
        server = await registerRoutes(app);

        // Global error handler - MUST be registered AFTER all routes
        // This ensures errors from route handlers are caught and returned as JSON
        app.use((err: any, _req: any, res: any, _next: any) => {
            const status = err.status || err.statusCode || 500;
            const message = err.message || "Internal Server Error";

            console.error("Error handler caught:", err);

            // Always return JSON to prevent "unexpected token" errors on client
            res.status(status).json({
                error: message,
                details: process.env.NODE_ENV === 'development' ? err.stack : undefined
            });
        });
    }
    return { app, server };
}

// For Vercel, we might just need the app, but registerRoutes adds routes to it.
// If registerRoutes is purely side-effecting on app, we could simpler.
// But it returns a server (http.Server).
