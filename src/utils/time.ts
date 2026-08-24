import type { MenuSchedule } from '../types/menu';

const minutes = (value: string) => {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
};

export function currentPeriod(schedules: MenuSchedule[], manualOverride: string, now = new Date()): string {
  if (manualOverride) return manualOverride;
  const day = now.getDay();
  const current = now.getHours() * 60 + now.getMinutes();
  const candidates = schedules.filter((schedule) => schedule.enabled && schedule.days.includes(day));
  const lateNight = candidates.find((schedule) => schedule.name === 'Late Night' && current >= minutes(schedule.startTime) && current <= minutes(schedule.endTime));
  if (lateNight) return lateNight.name;
  const match = candidates.find((schedule) => current >= minutes(schedule.startTime) && current < minutes(schedule.endTime));
  return match?.name ?? 'All Day';
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
