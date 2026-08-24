export type DisplayTheme = 'dark' | 'bright';

export type MenuDefinition = {
  id: string;
  name: string;
  description: string;
  categories: string[];
  enabled: boolean;
};

export type MenuItem = {
  id: string;
  menuId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  enabled: boolean;
  soldOut: boolean;
  featured: boolean;
  vegetarian: boolean;
  spicy: boolean;
  image?: string;
};

export type RestaurantSettings = {
  name: string;
  address: string;
  phone: string;
  website: string;
  currency: string;
  logoText: string;
  operatingHours: string;
};

export type MenuSchedule = {
  id: string;
  name: string;
  menuId: string;
  startTime: string;
  endTime: string;
  days: number[];
  enabled: boolean;
};

export type Special = {
  id: string;
  type: 'Daily Special' | 'Happy Hour' | 'Limited Time Item' | 'Event Promotion';
  title: string;
  description: string;
  price?: number;
  start: string;
  end: string;
  enabled: boolean;
};

export type Screen = {
  id: string;
  name: string;
  route: string;
  status: 'Online' | 'Offline';
  assignedMenuId: string;
  useSchedule: boolean;
  resolution: string;
  lastRefresh: string;
};

export type AppearanceSettings = {
  theme: DisplayTheme;
  background: string;
  accentColor: string;
  fontScale: number;
  showDescriptions: boolean;
  showCategoryHeaders: boolean;
  showLogo: boolean;
  showSpecialsBanner: boolean;
  columns: number;
};

export type Activity = {
  id: string;
  message: string;
  at: string;
};

export type AppData = {
  restaurant: RestaurantSettings;
  menus: MenuDefinition[];
  menuItems: MenuItem[];
  schedules: MenuSchedule[];
  specials: Special[];
  screens: Screen[];
  appearance: AppearanceSettings;
  manualMenuOverride: string;
  activities: Activity[];
};
