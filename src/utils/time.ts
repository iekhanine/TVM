import type { MenuSchedule } from '../types/menu';

const minutes = (value: string) => {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
};

function isWithinSchedule(schedule: MenuSchedule, current: number): boolean {
  const start = minutes(schedule.startTime);
  const end = minutes(schedule.endTime);
  if (end < start) return current >= start || current < end;
  return current >= start && current < end;
}

export function currentSchedule(schedules: MenuSchedule[], now = new Date()): MenuSchedule | undefined {
  const day = now.getDay();
  const current = now.getHours() * 60 + now.getMinutes();
  const candidates = schedules.filter((schedule) => schedule.enabled && schedule.days.includes(day) && isWithinSchedule(schedule, current));

  // When periods overlap, prefer the one that starts latest. This naturally gives Late Night priority.
  return candidates.sort((a, b) => minutes(b.startTime) - minutes(a.startTime))[0];
}

export function currentPeriod(schedules: MenuSchedule[], now = new Date()): string {
  return currentSchedule(schedules, now)?.name ?? 'All Day';
}

export function formatTime(value: string): string {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatActivity(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
