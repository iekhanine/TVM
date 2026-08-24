/**
 * Future Supabase entity map.
 *
 * Prototype data currently lives in LocalStorage, but the UI is organized around
 * records that can later map cleanly to Supabase tables and realtime channels.
 */
export type FutureDatabaseEntities = {
  organizations: {
    id: string;
    name: string;
    created_at: string;
  };
  restaurants: {
    id: string;
    organization_id: string;
    name: string;
    phone?: string;
    website?: string;
  };
  locations: {
    id: string;
    restaurant_id: string;
    name: string;
    address: string;
    timezone: string;
  };
  menus: {
    id: string;
    location_id: string;
    name: string;
    enabled: boolean;
  };
  categories: {
    id: string;
    menu_id: string;
    name: string;
    sort_order: number;
  };
  menu_items: {
    id: string;
    category_id: string;
    name: string;
    description: string;
    price: number;
    enabled: boolean;
    sold_out: boolean;
  };
  screens: {
    id: string;
    location_id: string;
    name: string;
    slug: string;
    assigned_menu_id: string;
  };
  schedules: {
    id: string;
    menu_id: string;
    name: string;
    start_time: string;
    end_time: string;
    days: number[];
  };
  specials: {
    id: string;
    location_id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    enabled: boolean;
  };
  users: {
    id: string;
    organization_id: string;
    email: string;
    role: string;
  };
};
