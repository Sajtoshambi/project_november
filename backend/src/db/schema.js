const {
  mysqlTable,
  int,
  varchar,
  mysqlEnum,
  datetime,
  timestamp,
  index,
  primaryKey,
} = require("drizzle-orm/mysql-core");

const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: mysqlEnum("role", ["visitor", "admin"]).notNull().default("visitor"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

const rooms = mysqlTable("rooms", {
  name: varchar("name", { length: 100 }).primaryKey(),
});

const lessons = mysqlTable(
  "lessons",
  {
    id: int("id").primaryKey().autoincrement(),
    subject: varchar("subject", { length: 120 }).notNull(),
    teacher: varchar("teacher", { length: 150 }).notNull(),
    room: varchar("room", { length: 100 })
      .notNull()
      .references(() => rooms.name, { onDelete: "restrict" }),
    startsAt: datetime("starts_at", { mode: "date" }).notNull(),
    endsAt: datetime("ends_at", { mode: "date" }).notNull(),
    capacity: int("capacity", { unsigned: true }).notNull(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    roomScheduleIndex: index("lessons_room_schedule_idx").on(
      table.room,
      table.startsAt,
      table.endsAt
    ),
  })
);

const registrations = mysqlTable(
  "registrations",
  {
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: int("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    primaryKey: primaryKey({
      columns: [table.userId, table.lessonId],
      name: "registrations_user_lesson_pk",
    }),
    lessonIndex: index("registrations_lesson_idx").on(table.lessonId),
  })
);

module.exports = {
  users,
  rooms,
  lessons,
  registrations,
};

