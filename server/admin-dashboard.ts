import type { Express } from "express";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { exams, examSessions, questions, results, students } from "../shared/schema";
import { db, pool } from './db';
import { summarizeDashboard } from '../shared/admin-dashboard';

const bannerSchema = z.string().max(1_398_127).regex(
  /^(?:data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2})?$/,
);

export function registerAdminDashboard(app: Express, requireAdmin: (req: any, res: any) => boolean) {
  app.get("/api/admin/dashboard", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.set("Cache-Control", "no-store");
    try {
      const [enrollment, activeExams, bank, activeAttempts, completed] = await Promise.all([
        db.select({ total: count() }).from(students).where(eq(students.isTestUser, false)),
        db.select({ total: count() }).from(exams).where(eq(exams.isActive, true)),
        db.select({ total: count() }).from(questions),
        db.select({ total: count() }).from(examSessions).innerJoin(exams, eq(examSessions.examId, exams.id))
          .where(and(eq(examSessions.isCompleted, false), eq(examSessions.isTestAttempt, false), eq(exams.isActive, true))),
        db.select({
          id: results.id, studentName: results.studentName,
          title: exams.title, classLevel: exams.classLevel, department: exams.department,
          percentage: results.percentage, passed: results.passed, completedAt: results.completedAt,
        }).from(results).leftJoin(exams, eq(results.examId, exams.id)).where(eq(results.isTestAttempt, false)),
      ]);
      res.json({
        students: enrollment[0].total, activeExams: activeExams[0].total,
        questions: bank[0].total, activeAttempts: activeAttempts[0].total,
        summary: summarizeDashboard(completed.map((result) => ({ ...result, completedAt: result.completedAt.toISOString() }))),
      });
    } catch (error) {
      console.error("Dashboard metrics failed", error);
      res.status(500).json({ error: "Could not load dashboard metrics" });
    }
  });

  app.get("/api/admin/dashboard/banner", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.set("Cache-Control", "no-store");
    try {
      const { rows } = await pool.query<{ banner_image: string }>(
        "select banner_image from public.dashboard_branding where id = 'global'",
      );
      res.json({ image: rows[0]?.banner_image ?? "" });
    } catch (error) {
      console.error("Dashboard banner could not be loaded", error);
      res.status(503).json({ error: "Dashboard banner storage is unavailable" });
    }
  });

  app.put("/api/admin/dashboard/banner", async (req, res) => {
    if (!requireAdmin(req, res)) return;
    const image = bannerSchema.safeParse(req.body?.image);
    if (!image.success) return res.status(400).json({ error: "Choose a JPEG, PNG, or WebP image up to 1 MB" });
    try {
      await pool.query(
        "insert into public.dashboard_branding (id, banner_image) values ('global', $1) on conflict (id) do update set banner_image = excluded.banner_image",
        [image.data],
      );
      res.json({ image: image.data });
    } catch (error) {
      console.error("Dashboard banner could not be saved", error);
      res.status(503).json({ error: "Dashboard banner storage is unavailable" });
    }
  });
}
