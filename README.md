# OneTime Menu

**OneTime Menu** is a browser-based digital restaurant menu platform prototype from **OneTime Labs**.

> Digital menus. Any screen. No proprietary hardware.

The core product idea is intentionally simple: if a television or display can open a modern web browser, it can run OneTime Menu. A restaurant can open a dedicated display URL in Chrome, Edge, Firefox, Safari, or another modern browser, put the browser into fullscreen mode, and use that screen as a digital menu board.

This repository is a working front-end MVP. It includes a product landing page, a restaurant administration dashboard, two display routes, realistic demo content, scheduling, specials, appearance controls, and cross-tab updates using browser storage events.

## Requirements

- Node.js 20.19 or newer recommended
- npm 10 or newer recommended
- A modern browser

No backend, paid API, proprietary player, or external service is required for this prototype.

## Install and run locally

```bash
npm install
npm run dev
```

Vite will print the local URL, normally `http://localhost:5173`.

## Production build

```bash
npm run build
```

The production files are written to `dist/`.

To preview the production build locally:

```bash
npm run preview
```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | OneTime Menu marketing and product landing page |
| `/admin` | The Copper Fork restaurant admin dashboard |
| `/display/main` | Fullscreen main counter menu display |
| `/display/bar` | Fullscreen secondary bar menu display |

## Demo walkthrough

A useful demo sequence is:

1. Open `/admin`.
2. Choose **Menu Items**.
3. Edit **The Copper Burger** and change its price.
4. Edit another item and mark it **SOLD OUT**.
5. Open `/display/main` in another browser tab.
6. Return to the admin tab and change another menu item. The display tab updates through LocalStorage browser events without a manual reload.
7. Choose **Appearance** and switch between **Modern Dark** and **Bright Casual**.
8. Choose **Specials** and create a promotion with an active date/time range.
9. Choose **Screens** and preview `/display/bar`.
10. Choose **Scheduling** and use the manual daypart override or return it to Automatic.

## Prototype functionality

### Admin dashboard

The admin prototype includes:

- Dashboard summary cards
- Recent activity
- Menu collection overview
- Menu item search and category filtering
- Add, edit, and delete menu items
- Enable/disable items
- SOLD OUT status
- Featured, spicy, and vegetarian flags
- Price and description editing
- Screen management and display URL copying
- Simulated screen refresh state
- Breakfast, lunch, dinner, and late-night scheduling
- Browser-time-based automatic daypart selection
- Manual daypart override
- Daily specials, happy hour, limited-time items, and event promotions
- Dark and bright display templates
- Background and accent color controls
- Font scaling
- Description, category header, logo, and specials visibility controls
- Two, three, or four display columns
- Editable restaurant settings
- Demo reset control

### Display behavior

The display routes are designed for televisions and digital signage:

- No application navigation or admin controls
- Full viewport rendering
- No scrollbars
- Responsive typography
- High contrast
- 1920x1080 and 4K-friendly layout
- Current menu period from the browser clock
- Manual schedule override support
- SOLD OUT indication
- Special promotion banner
- Cached LocalStorage data
- Safe fallback if a display configuration is missing
- Live reaction to LocalStorage changes made in other tabs
- Automatic reaction to browser resizing

For a Windows-based display, open a display route and press **F11** to put the browser into fullscreen mode.

## LocalStorage persistence

Prototype state is stored under this key:

```text
onetime-menu-demo-v1
```

The shared store is implemented in:

```text
src/hooks/useAppStore.tsx
```

The persistence helpers are in:

```text
src/utils/storage.ts
```

The application listens for the browser `storage` event so that changes made in one tab are loaded by display pages running in another tab. Components within the admin use the same React store, while separate tabs synchronize through the browser's native `storage` event.

This is a prototype substitute for production realtime messaging.

## Reset demo data

Open:

```text
/admin
```

Then choose:

```text
Restaurant Settings -> Reset LocalStorage Demo
```

You can also remove the `onetime-menu-demo-v1` LocalStorage key using browser developer tools and reload the page.

## Project structure

```text
src/
  admin/
    AdminPage.tsx
    AppearanceSection.tsx
    DashboardSection.tsx
    MenuItemsSection.tsx
    MenusSection.tsx
    SchedulingSection.tsx
    ScreensSection.tsx
    SettingsSection.tsx
    SpecialsSection.tsx
  components/
    BrandMark.tsx
    Modal.tsx
    StatCard.tsx
    Toggle.tsx
  data/
    demo.ts
  display/
    DisplayPage.tsx
  hooks/
    useAppStore.tsx
  pages/
    LandingPage.tsx
  types/
    database.ts
    menu.ts
  utils/
    storage.ts
    time.ts
  App.tsx
  main.tsx
  styles.css
```

The UI is intentionally split by responsibility instead of being placed into one large `App.tsx` file.

## Demo data model

The primary menu item type is defined in `src/types/menu.ts` and follows this structure:

```ts
{
  id: string
  name: string
  description: string
  price: number
  category: string
  enabled: boolean
  soldOut: boolean
  featured: boolean
  vegetarian: boolean
  spicy: boolean
  image?: string
}
```

The same file also defines restaurant settings, schedules, specials, screens, appearance settings, and activity records.

## Future Supabase architecture

`src/types/database.ts` documents a likely future relational model with these entities:

- `organizations`
- `restaurants`
- `locations`
- `menus`
- `categories`
- `menu_items`
- `screens`
- `schedules`
- `specials`
- `users`

A production Supabase migration can replace the LocalStorage store without requiring a major redesign of the UI.

A practical production path would be:

1. Add Supabase Auth for restaurant staff using Google OAuth and email/password.
2. Add organization, restaurant, location, and role membership tables.
3. Move menu data into Postgres with Row Level Security.
4. Give every display a stable screen slug or device token.
5. Subscribe display clients to Supabase Realtime changes for their location/menu.
6. Cache the last successful menu payload in LocalStorage or IndexedDB so signage continues displaying during brief internet interruptions.
7. Add an online heartbeat and last-seen timestamp for screen monitoring.
8. Add server-side schedule evaluation or keep timezone-aware client evaluation with a configured location timezone.
9. Add asset storage for logos and optional food images.
10. Add a lightweight kiosk/PWA mode for devices that support installed web apps while retaining normal browser URLs as the baseline deployment method.

The production architecture should preserve the main product principle: the browser is the player. Proprietary display hardware should remain optional, not mandatory.

## Authentication

Authentication is intentionally not implemented in this MVP. `/admin` loads directly so the restaurant workflow can be demonstrated without setup friction.

The app structure keeps authentication concerns separate from menu data so a future protected route wrapper can be added around `/admin` without modifying the public display routes.

## Technology

- React
- TypeScript
- Vite
- React Router
- Lucide React
- CSS
- Browser LocalStorage

## OneTime Labs

OneTime Menu is a OneTime Labs prototype built around a buy-once, avoid-unnecessary-lock-in philosophy.

**Product principle:** The restaurant should not have to buy special TVs. If a screen can run a modern browser, it can run OneTime Menu.
