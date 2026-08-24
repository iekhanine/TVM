/**
 * OneTime Menu database notes.
 *
 * MVP: Supabase stores the complete AppData object in one JSONB row in
 * `public.one_time_menu_state`. This intentionally mirrors LocalStorage and
 * keeps the first backend integration extremely small.
 *
 * Later: the product can normalize the same UI data into the relational
 * entities documented below when multi-location permissions, reporting,
 * auditing, and larger restaurant groups require it.
 */

export type MvpMenuStateRow = {
  id: string;
  data: unknown;
  updated_at: string;
};

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
