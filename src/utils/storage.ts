import { DEMO_DATA } from '../data/demo';
import type { AppData } from '../types/menu';
import { normalizeAppData } from './menuData';

export const STORAGE_KEY = 'onetime-menu-demo-v1';

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEMO_DATA);
    return normalizeAppData(JSON.parse(raw));
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
