import { createApp } from "../server/app";

export const config = {
    api: {
        bodyParser: false,
    },
};

// Safe handler for Vercel to allow JSON error responses on startup crash
export default async function handler(req: any, res: any) {
    try {
        const { app } = await createApp();
        app(req, res);
    } catch (e: any) {
        // Fallback error handler if the app fails to start or crash at top level
        console.error("Critical Vercel handler error:", e);
        res.status(500).json({
            error: "Internal Server Error (Critical)",
            details: process.env.NODE_ENV === 'development' ? e.message : "Server startup failed"
        });
    }
}
