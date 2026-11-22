const test = require("node:test");
const assert = require("node:assert/strict");

const { normalizeLessonInput } = require("../src/services/lesson-validation");

function validInput() {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
  return {
    subject: "  Mathematics ",
    teacher: "  A. Teacher ",
    room: " A1 ",
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    capacity: 20,
  };
}

test("lesson input is trimmed and dates are normalized", () => {
  const lesson = normalizeLessonInput(validInput());

  assert.equal(lesson.subject, "Mathematics");
  assert.equal(lesson.teacher, "A. Teacher");
  assert.equal(lesson.room, "A1");
  assert.ok(lesson.startsAt instanceof Date);
  assert.ok(lesson.endsAt > lesson.startsAt);
});

test("lessons reject invalid date order and out-of-range capacity", () => {
  const invalidOrder = validInput();
  invalidOrder.endsAt = invalidOrder.startsAt;
  assert.throws(() => normalizeLessonInput(invalidOrder), {
    message: "endsAt must be later than startsAt",
  });

  const invalidCapacity = validInput();
  invalidCapacity.capacity = 0;
  assert.throws(() => normalizeLessonInput(invalidCapacity), {
    message: "capacity must be an integer between 1 and 500",
  });
});

test("lessons reject invalid dates and missing room data", () => {
  const invalidDate = validInput();
  invalidDate.startsAt = "not-a-date";
  assert.throws(() => normalizeLessonInput(invalidDate), {
    message: "startsAt must be a valid date",
  });

  const missingRoom = validInput();
  missingRoom.room = "  ";
  assert.throws(() => normalizeLessonInput(missingRoom), {
    message: "room is required and must be at most 100 characters",
  });
});
