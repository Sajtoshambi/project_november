const express = require("express");
const { and, asc, count, eq, gt, lt } = require("drizzle-orm");

const db = require("../db/db");
const { lessons, registrations, rooms } = require("../db/schema");
const { authenticate, requireRole } = require("../middleware/auth");
const { normalizeLessonInput } = require("../services/lesson-validation");
const { HttpError } = require("../services/http-error");

const router = express.Router();

function parseLessonId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, "A valid lesson id is required");
  }
  return id;
}

router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const lessonList = await db.select().from(lessons).orderBy(asc(lessons.startsAt));
    const registrationCounts = await db
      .select({
        lessonId: registrations.lessonId,
        registered: count(),
      })
      .from(registrations)
      .groupBy(registrations.lessonId);
    const countsByLesson = new Map(
      registrationCounts.map((entry) => [entry.lessonId, entry.registered])
    );

    return res.status(200).json(
      lessonList.map((lesson) => {
        const registered = countsByLesson.get(lesson.id) || 0;
        return {
          ...lesson,
          registered,
          available: Math.max(lesson.capacity - registered, 0),
        };
      })
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/", requireRole("admin"), async (req, res, next) => {
  try {
    const lesson = normalizeLessonInput(req.body || {});
    const created = await db.transaction(async (tx) => {
      await tx
        .insert(rooms)
        .values({ name: lesson.room })
        .onDuplicateKeyUpdate({ set: { name: lesson.room } });
      await tx.select().from(rooms).where(eq(rooms.name, lesson.room)).for("update");

      const [conflict] = await tx
        .select({ id: lessons.id })
        .from(lessons)
        .where(
          and(
            eq(lessons.room, lesson.room),
            lt(lessons.startsAt, lesson.endsAt),
            gt(lessons.endsAt, lesson.startsAt)
          )
        )
        .limit(1);

      if (conflict) {
        throw new HttpError(409, "That room is already booked during this time");
      }

      const [result] = await tx.insert(lessons).values({
        ...lesson,
        createdBy: req.auth.id,
      });
      return { ...lesson, id: result.insertId };
    });

    return res.status(201).json({ lesson: created });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", requireRole("admin"), async (req, res, next) => {
  try {
    const id = parseLessonId(req.params.id);
    const [result] = await db.delete(lessons).where(eq(lessons.id, id));
    if (result.affectedRows === 0) {
      throw new HttpError(404, "Lesson not found");
    }
    return res.status(200).json({ message: "Lesson and its registrations were deleted" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
