const express = require("express");
const { and, asc, count, eq } = require("drizzle-orm");

const db = require("../db/db");
const { lessons, registrations } = require("../db/schema");
const { authenticate, requireRole } = require("../middleware/auth");
const { HttpError } = require("../services/http-error");

const router = express.Router();

function parseLessonId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new HttpError(400, "A valid lesson id is required");
  }
  return id;
}

router.use(authenticate, requireRole("visitor"));

router.get("/mine", async (req, res, next) => {
  try {
    const schedule = await db
      .select({
        lessonId: lessons.id,
        subject: lessons.subject,
        teacher: lessons.teacher,
        room: lessons.room,
        startsAt: lessons.startsAt,
        endsAt: lessons.endsAt,
        registeredAt: registrations.createdAt,
      })
      .from(registrations)
      .innerJoin(lessons, eq(registrations.lessonId, lessons.id))
      .where(eq(registrations.userId, req.auth.id))
      .orderBy(asc(lessons.startsAt));

    return res.status(200).json(schedule);
  } catch (error) {
    return next(error);
  }
});

router.post("/:lessonId", async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req.params.lessonId);

    await db.transaction(async (tx) => {
      const [lesson] = await tx
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .for("update");
      if (!lesson) {
        throw new HttpError(404, "Lesson not found");
      }
      if (lesson.startsAt <= new Date()) {
        throw new HttpError(409, "Registration for this lesson is closed");
      }

      const [existing] = await tx
        .select({ lessonId: registrations.lessonId })
        .from(registrations)
        .where(
          and(
            eq(registrations.userId, req.auth.id),
            eq(registrations.lessonId, lessonId)
          )
        )
        .limit(1);
      if (existing) {
        throw new HttpError(409, "You are already registered for this lesson");
      }

      const [bookingCount] = await tx
        .select({ total: count() })
        .from(registrations)
        .where(eq(registrations.lessonId, lessonId));
      if (bookingCount.total >= lesson.capacity) {
        throw new HttpError(409, "This lesson is full");
      }

      await tx.insert(registrations).values({
        userId: req.auth.id,
        lessonId,
      });
    });

    return res.status(201).json({ message: "Registration confirmed", lessonId });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:lessonId", async (req, res, next) => {
  try {
    const lessonId = parseLessonId(req.params.lessonId);
    const [result] = await db
      .delete(registrations)
      .where(
        and(
          eq(registrations.userId, req.auth.id),
          eq(registrations.lessonId, lessonId)
        )
      );
    if (result.affectedRows === 0) {
      throw new HttpError(404, "Registration not found");
    }

    return res.status(200).json({ message: "Registration cancelled", lessonId });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
