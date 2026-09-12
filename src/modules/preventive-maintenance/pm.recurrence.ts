import type { PMRecurrenceConfig } from "./pm.types.js";
const DAY = 86_400_000;
function utcDate(date: Date) { return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())); }
export function generateOccurrenceDates(config: PMRecurrenceConfig, horizonEnd: Date): Date[] {
  const start = utcDate(config.startDate); const end = new Date(Math.min(utcDate(config.endDate ?? horizonEnd).getTime(), utcDate(horizonEnd).getTime())); const dates: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + DAY)) {
    const days = Math.floor((cursor.getTime() - start.getTime()) / DAY); const weeks = Math.floor(days / 7); const months = (cursor.getUTCFullYear() - start.getUTCFullYear()) * 12 + cursor.getUTCMonth() - start.getUTCMonth(); const years = cursor.getUTCFullYear() - start.getUTCFullYear();
    const weekdayMatches = (config.weekdays?.length ? config.weekdays : [start.getUTCDay()]).includes(cursor.getUTCDay());
    const matches = config.frequency === "daily" || config.frequency === "interval" ? days % config.interval === 0 : config.frequency === "weekly" ? weeks % config.interval === 0 && weekdayMatches : config.frequency === "monthly" ? months % config.interval === 0 && cursor.getUTCDate() === (config.monthDay ?? start.getUTCDate()) : years % config.interval === 0 && cursor.getUTCMonth() === start.getUTCMonth() && cursor.getUTCDate() === (config.monthDay ?? start.getUTCDate());
    if (matches) dates.push(new Date(cursor));
  }
  return dates;
}
