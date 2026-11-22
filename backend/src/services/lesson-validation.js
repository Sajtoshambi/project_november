const MAX_CAPACITY = 500;

function parseDate(value, fieldName) {
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date`);
  }
  return parsed;
}

function normalizeLessonInput(input) {
  const subject = typeof input.subject === "string" ? input.subject.trim() : "";
  const teacher = typeof input.teacher === "string" ? input.teacher.trim() : "";
  const room = typeof input.room === "string" ? input.room.trim() : "";
  const startsAt = parseDate(input.startsAt, "startsAt");
  const endsAt = parseDate(input.endsAt, "endsAt");
  const capacity = Number(input.capacity);

  if (!subject || subject.length > 120) {
    throw new Error("subject is required and must be at most 120 characters");
  }
  if (!teacher || teacher.length > 150) {
    throw new Error("teacher is required and must be at most 150 characters");
  }
  if (!room || room.length > 100) {
    throw new Error("room is required and must be at most 100 characters");
  }
  if (startsAt <= new Date()) {
    throw new Error("startsAt must be in the future");
  }
  if (endsAt <= startsAt) {
    throw new Error("endsAt must be later than startsAt");
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
    throw new Error(`capacity must be an integer between 1 and ${MAX_CAPACITY}`);
  }

  return { subject, teacher, room, startsAt, endsAt, capacity };
}

module.exports = { normalizeLessonInput };
