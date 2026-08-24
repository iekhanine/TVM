import { DEMO_DATA } from '../data/demo';
import type { AppData } from '../types/menu';

export const STORAGE_KEY = 'onetime-menu-demo-v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEMO_DATA);
    return { ...structuredClone(DEMO_DATA), ...JSON.parse(raw) } as AppData;
  } catch {
    return structuredClone(DEMO_DATA);
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData(): AppData {
  localStorage.removeItem(STORAGE_KEY);
  return structuredClone(DEMO_DATA);
}
