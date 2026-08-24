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
  MenuDefinition,
  MenuItem,
  MenuSchedule,
  RestaurantSettings,
  Screen,
  Special,
} from '../types/menu';
import { loadRemoteData, saveRemoteData, subscribeToRemoteData } from '../services/appData';
import { loadData, resetData, saveData, STORAGE_KEY } from '../utils/storage';

type Store = {
  data: AppData;
  updateRestaurant: (patch: Partial<RestaurantSettings>) => void;
  updateAppearance: (patch: Partial<AppearanceSettings>) => void;
  addMenu: (menu: MenuDefinition) => void;
  updateMenu: (id: string, patch: Partial<MenuDefinition>) => void;
  deleteMenu: (id: string) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (id: string, patch: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  updateSchedule: (id: string, patch: Partial<MenuSchedule>) => void;
  addSpecial: (special: Special) => void;
  updateSpecial: (id: string, patch: Partial<Special>) => void;
  deleteSpecial: (id: string) => void;
  setManualMenuOverride: (value: string) => void;
  updateScreen: (id: string, patch: Partial<Screen>) => void;
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

  const applyRemoteData = useCallback((next: AppData) => {
    saveData(next);
    setData(next);
  }, []);

  const commit = useCallback((updater: (current: AppData) => AppData) => {
    setData((current) => {
      const next = updater(current);
      saveData(next);
      void saveRemoteData(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    const cached = loadData();

    void loadRemoteData(cached).then((remote) => {
      if (active && remote) applyRemoteData(remote);
    });

    const unsubscribeRemote = subscribeToRemoteData((remote) => {
      if (active) applyRemoteData(remote);
    });

    const syncLocalTabs = () => setData(loadData());
    window.addEventListener('storage', syncLocalTabs);

    return () => {
      active = false;
      unsubscribeRemote();
      window.removeEventListener('storage', syncLocalTabs);
    };
  }, [applyRemoteData]);

  const store = useMemo<Store>(() => ({
    data,
    updateRestaurant: (patch) => commit((current) => withActivity({ ...current, restaurant: { ...current.restaurant, ...patch } }, 'Restaurant settings updated')),
    updateAppearance: (patch) => commit((current) => withActivity({ ...current, appearance: { ...current.appearance, ...patch } }, 'Display appearance updated')),
    addMenu: (menu) => commit((current) => withActivity({ ...current, menus: [...current.menus, menu] }, `${menu.name} created`)),
    updateMenu: (id, patch) => commit((current) => {
      const existing = current.menus.find((menu) => menu.id === id);
      return withActivity({
        ...current,
        menus: current.menus.map((menu) => menu.id === id ? { ...menu, ...patch } : menu),
      }, `${existing?.name ?? 'Menu'} updated`);
    }),
    deleteMenu: (id) => commit((current) => {
      const existing = current.menus.find((menu) => menu.id === id);
      const fallbackMenuId = current.menus.find((menu) => menu.id !== id)?.id ?? '';
      return withActivity({
        ...current,
        menus: current.menus.filter((menu) => menu.id !== id),
        menuItems: current.menuItems.filter((item) => item.menuId !== id),
        screens: current.screens.map((screen) => screen.assignedMenuId === id ? { ...screen, assignedMenuId: fallbackMenuId } : screen),
        schedules: current.schedules.map((schedule) => schedule.menuId === id ? { ...schedule, menuId: fallbackMenuId } : schedule),
        manualMenuOverride: current.manualMenuOverride === id ? '' : current.manualMenuOverride,
      }, `${existing?.name ?? 'Menu'} deleted`);
    }),
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
    setManualMenuOverride: (value) => commit((current) => withActivity({ ...current, manualMenuOverride: value }, value ? `Display menu overridden to ${current.menus.find((menu) => menu.id === value)?.name ?? 'selected menu'}` : 'Automatic menu scheduling restored')),
    updateScreen: (id, patch) => commit((current) => withActivity({
      ...current,
      screens: current.screens.map((screen) => screen.id === id ? { ...screen, ...patch } : screen),
    }, 'Screen configuration updated')),
    refreshScreen: (id) => commit((current) => withActivity({
      ...current,
      screens: current.screens.map((screen) => screen.id === id ? { ...screen, lastRefresh: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) } : screen),
    }, 'Display refresh requested')),
    resetDemo: () => {
      const next = resetData();
      setData(next);
      saveData(next);
      void saveRemoteData(next);
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
