import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Invalid calendar date');
export const schoolCalendarSchema = z.array(z.object({
  session: z.string().trim().min(1),
  term: z.enum(['First Term', 'Second Term', 'Third Term', 'Others']),
  start: date, end: date,
})).superRefine((rows, ctx) => {
  rows.forEach((row, i) => {
    if (row.end < row.start) ctx.addIssue({ code: 'custom', path: [i, 'end'], message: 'End must follow start' });
    rows.slice(0, i).forEach(previous => {
      if (previous.session === row.session && previous.term === row.term) ctx.addIssue({ code: 'custom', path: [i], message: 'Duplicate session and term' });
      if (row.start <= previous.end && previous.start <= row.end) ctx.addIssue({ code: 'custom', path: [i], message: 'Term dates overlap' });
    });
  });
});
export type SchoolCalendar = z.infer<typeof schoolCalendarSchema>;
export function calendarAssignment(value: Date | string, calendar: SchoolCalendar) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return undefined;
  return calendar.find(row => time >= Date.parse(row.start + 'T00:00:00+01:00') && time < Date.parse(row.end + 'T00:00:00+01:00') + 86400000);
}
export function resultPeriod(result: { academicSession?: string | null; academicTerm?: string | null; completedAt: Date | string }, calendar: SchoolCalendar) {
  if (result.academicSession && result.academicTerm) return { session: result.academicSession, term: result.academicTerm };
  return calendarAssignment(result.completedAt, calendar);
}
