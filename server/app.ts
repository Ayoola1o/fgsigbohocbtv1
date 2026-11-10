import express from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { readAuthCookie } from "./auth-cookie";

const app = express();

app.use(compression());

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

// Stateless signed cookies work across Vercel serverless instances.
app.use((req, _res, next) => {
    (req as any).auth = readAuthCookie(req);
    next();
});

app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
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
