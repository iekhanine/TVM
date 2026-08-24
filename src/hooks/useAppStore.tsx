import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppData,
  AppearanceSettings,
  MenuItem,
  MenuSchedule,
  RestaurantSettings,
  Special,
} from '../types/menu';
import { loadData, resetData, saveData, STORAGE_KEY } from '../utils/storage';

type Store = {
  data: AppData;
  updateRestaurant: (patch: Partial<RestaurantSettings>) => void;
  updateAppearance: (patch: Partial<AppearanceSettings>) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (id: string, patch: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  updateSchedule: (id: string, patch: Partial<MenuSchedule>) => void;
  addSpecial: (special: Special) => void;
  updateSpecial: (id: string, patch: Partial<Special>) => void;
  deleteSpecial: (id: string) => void;
  setManualPeriodOverride: (value: string) => void;
  refreshScreen: (id: string) => void;
  resetDemo: () => void;
};

const AppStoreContext = createContext<Store | null>(null);

const activityId = () => `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function withActivity(data: AppData, message: string): AppData {
  return {
    ...data,
    activities: [
      { id: activityId(), message, at: new Date().toISOString() },
      ...data.activities,
    ].slice(0, 20),
  };
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData());

  const commit = useCallback((updater: (current: AppData) => AppData) => {
    setData((current) => {
      const next = updater(current);
      saveData(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const sync = () => setData(loadData());
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('storage', sync);
    };
  }, []);

  const store = useMemo<Store>(() => ({
    data,
    updateRestaurant: (patch) => commit((current) => withActivity({ ...current, restaurant: { ...current.restaurant, ...patch } }, 'Restaurant settings updated')),
    updateAppearance: (patch) => commit((current) => withActivity({ ...current, appearance: { ...current.appearance, ...patch } }, 'Display appearance updated')),
    addMenuItem: (item) => commit((current) => withActivity({ ...current, menuItems: [...current.menuItems, item] }, `${item.name} added to the menu`)),
    updateMenuItem: (id, patch) => commit((current) => {
      const existing = current.menuItems.find((item) => item.id === id);
      const next = current.menuItems.map((item) => item.id === id ? { ...item, ...patch } : item);
      return withActivity({ ...current, menuItems: next }, `${existing?.name ?? 'Menu item'} updated`);
    }),
    deleteMenuItem: (id) => commit((current) => {
      const existing = current.menuItems.find((item) => item.id === id);
      return withActivity({ ...current, menuItems: current.menuItems.filter((item) => item.id !== id) }, `${existing?.name ?? 'Menu item'} deleted`);
    }),
    updateSchedule: (id, patch) => commit((current) => withActivity({
      ...current,
      schedules: current.schedules.map((schedule) => schedule.id === id ? { ...schedule, ...patch } : schedule),
    }, 'Menu schedule updated')),
    addSpecial: (special) => commit((current) => withActivity({ ...current, specials: [...current.specials, special] }, `${special.title} special published`)),
    updateSpecial: (id, patch) => commit((current) => withActivity({
      ...current,
      specials: current.specials.map((special) => special.id === id ? { ...special, ...patch } : special),
    }, 'Special updated')),
    deleteSpecial: (id) => commit((current) => withActivity({ ...current, specials: current.specials.filter((special) => special.id !== id) }, 'Special removed')),
    setManualPeriodOverride: (value) => commit((current) => withActivity({ ...current, manualPeriodOverride: value }, value ? `Display period overridden to ${value}` : 'Automatic menu scheduling restored')),
    refreshScreen: (id) => commit((current) => withActivity({
      ...current,
      screens: current.screens.map((screen) => screen.id === id ? { ...screen, lastRefresh: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } : screen),
    }, 'Display refresh requested')),
    resetDemo: () => {
      const next = resetData();
      setData(next);
      saveData(next);
    },
  }), [commit, data]);

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppStoreContext);
  if (!context) throw new Error('useAppStore must be used inside AppStoreProvider');
  return context;
}

export const localStorageKey = STORAGE_KEY;
