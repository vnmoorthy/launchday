import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { Mission } from "@/lib/types";

export const missions = pgTable("missions", {
  id: text("id").primaryKey(),
  passengerUserId: text("passenger_user_id").notNull(),
  data: jsonb("data").$type<Mission>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
