CREATE TABLE `rooms` (
	`name` varchar(100) NOT NULL,
	CONSTRAINT `rooms_name` PRIMARY KEY(`name`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subject` varchar(120) NOT NULL,
	`teacher` varchar(150) NOT NULL,
	`room` varchar(100) NOT NULL,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`capacity` int unsigned NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `registrations` (
	`user_id` int NOT NULL,
	`lesson_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `registrations_user_lesson_pk` PRIMARY KEY(`user_id`,`lesson_id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `role` enum('visitor','admin') DEFAULT 'visitor' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_room_rooms_name_fk` FOREIGN KEY (`room`) REFERENCES `rooms`(`name`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `lessons` ADD CONSTRAINT `lessons_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `registrations` ADD CONSTRAINT `registrations_lesson_id_lessons_id_fk` FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lessons_room_schedule_idx` ON `lessons` (`room`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `registrations_lesson_idx` ON `registrations` (`lesson_id`);