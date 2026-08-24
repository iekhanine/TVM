import { DEMO_DATA } from '../data/demo';
import type { AppData, MenuDefinition, MenuItem, MenuSchedule, Screen } from '../types/menu';

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  Burgers: 'Entrees',
  Sandwiches: 'Entrees',
};

function migrateCategory(category: string): string {
  return LEGACY_CATEGORY_MAP[category] ?? category;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function normalizeAppData(value: unknown): AppData {
  const base = structuredClone(DEMO_DATA);

  if (!value || typeof value !== 'object') {
    return base;
  }

  const incoming = value as Record<string, unknown>;
  const incomingMenus = Array.isArray(incoming.menus) ? incoming.menus as MenuDefinition[] : null;
  const legacyCategories = Array.isArray(incoming.categories) ? (incoming.categories as string[]).map(migrateCategory) : [];

  let menus = incomingMenus?.length
    ? incomingMenus.map((menu) => ({
        ...menu,
        categories: unique((menu.categories ?? []).map(migrateCategory)),
        enabled: menu.enabled ?? true,
      }))
    : base.menus;

  if (!incomingMenus?.length && legacyCategories.length) {
    menus = menus.map((menu) => menu.id === 'menu-main'
      ? { ...menu, categories: unique([...menu.categories, ...legacyCategories]) }
      : menu);
  }

  const validMenuIds = new Set(menus.map((menu) => menu.id));
  const rawItems = Array.isArray(incoming.menuItems) ? incoming.menuItems as Array<Partial<MenuItem> & { category?: string }> : [];
  let menuItems: MenuItem[] = rawItems.length
    ? rawItems.map((item, index) => ({
        id: item.id ?? `migrated-item-${index}`,
        menuId: item.menuId && validMenuIds.has(item.menuId) ? item.menuId : 'menu-main',
        name: item.name ?? 'Untitled Item',
        description: item.description ?? '',
        price: Number(item.price ?? 0),
        category: migrateCategory(item.category ?? 'Entrees'),
        enabled: item.enabled ?? true,
        soldOut: item.soldOut ?? false,
        featured: item.featured ?? false,
        vegetarian: item.vegetarian ?? false,
        spicy: item.spicy ?? false,
        image: item.image,
      }))
    : base.menuItems;

  // Upgrade existing prototype data without overwriting Main Menu edits.
  // Newly introduced menu collections get their demo items only when they do not yet have items.
  for (const menu of base.menus.filter((entry) => entry.id !== 'menu-main')) {
    if (!menuItems.some((item) => item.menuId === menu.id)) {
      menuItems = [...menuItems, ...base.menuItems.filter((item) => item.menuId === menu.id)];
    }
  }

  // Ensure every item's category is represented by its parent menu.
  menus = menus.map((menu) => ({
    ...menu,
    categories: unique([
      ...menu.categories,
      ...menuItems.filter((item) => item.menuId === menu.id).map((item) => item.category),
    ]),
  }));

  const menuNameToId = new Map(menus.map((menu) => [menu.name, menu.id]));
  const rawScreens = Array.isArray(incoming.screens) ? incoming.screens as Array<Partial<Screen> & { assignedMenu?: string }> : [];
  const screens: Screen[] = rawScreens.length
    ? rawScreens.map((screen, index) => ({
        id: screen.id ?? `screen-${index}`,
        name: screen.name ?? `Screen ${index + 1}`,
        route: screen.route ?? `/display/screen-${index + 1}`,
        status: screen.status === 'Offline' ? 'Offline' : 'Online',
        assignedMenuId: screen.assignedMenuId && validMenuIds.has(screen.assignedMenuId)
          ? screen.assignedMenuId
          : menuNameToId.get(screen.assignedMenu ?? '') ?? (screen.id === 'screen-bar' ? 'menu-bar' : 'menu-main'),
        useSchedule: screen.useSchedule ?? screen.id !== 'screen-bar',
        resolution: screen.resolution ?? '1920 × 1080',
        lastRefresh: screen.lastRefresh ?? 'Live sync enabled',
      }))
    : base.screens;

  const rawSchedules = Array.isArray(incoming.schedules) ? incoming.schedules as Array<Partial<MenuSchedule>> : [];
  const schedules: MenuSchedule[] = rawSchedules.length
    ? rawSchedules.map((schedule, index) => {
        const fallback = base.schedules.find((entry) => entry.id === schedule.id) ?? base.schedules[index] ?? base.schedules[0];
        return {
          id: schedule.id ?? fallback.id,
          name: schedule.name ?? fallback.name,
          menuId: schedule.menuId && validMenuIds.has(schedule.menuId) ? schedule.menuId : fallback.menuId,
          startTime: schedule.startTime ?? fallback.startTime,
          endTime: schedule.endTime ?? fallback.endTime,
          days: Array.isArray(schedule.days) ? schedule.days : fallback.days,
          enabled: schedule.enabled ?? true,
        };
      })
    : base.schedules;

  const legacyManualPeriod = typeof incoming.manualPeriodOverride === 'string' ? incoming.manualPeriodOverride : '';
  const legacyManualSchedule = schedules.find((schedule) => schedule.name === legacyManualPeriod);
  const manualMenuOverride = typeof incoming.manualMenuOverride === 'string' && validMenuIds.has(incoming.manualMenuOverride)
    ? incoming.manualMenuOverride
    : legacyManualSchedule?.menuId ?? '';

  return {
    restaurant: { ...base.restaurant, ...(typeof incoming.restaurant === 'object' && incoming.restaurant ? incoming.restaurant : {}) },
    menus,
    menuItems,
    schedules,
    specials: Array.isArray(incoming.specials) ? incoming.specials as AppData['specials'] : base.specials,
    screens,
    appearance: { ...base.appearance, ...(typeof incoming.appearance === 'object' && incoming.appearance ? incoming.appearance : {}) },
    manualMenuOverride,
    activities: Array.isArray(incoming.activities) ? incoming.activities as AppData['activities'] : base.activities,
  };
}
