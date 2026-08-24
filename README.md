# OneTime Menu

**OneTime Menu** is a browser-based digital restaurant menu platform prototype from **OneTime Labs**.

> Digital menus. Any screen. No proprietary hardware.

If a television or display can open a modern web browser, it can run OneTime Menu. Open a dedicated display URL in Chrome, Edge, Firefox, Safari, or another modern browser and place it into fullscreen mode.

This version supports both **LocalStorage** and an intentionally simple **Supabase backend**. LocalStorage remains the display cache; Supabase provides cross-device persistence and Realtime updates.

## Requirements

- Node.js 20.19 or newer
- npm
- A modern browser
- Optional: a Supabase project for cross-device sync

## Install

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Menu item organization

The Menu Items admin page uses category tabs rather than one long catalog. Fresh demo data starts with Appetizers, Entrees, Sides, and Drinks. Legacy Burgers and Sandwiches categories are automatically migrated into Entrees when existing LocalStorage or Supabase state is loaded. Custom categories are preserved.


## Menu Collections

OneTime Menu separates **menus** from **categories**. Demo menus include Main Menu, Breakfast Menu, Bar / Drinks, and Late Night Menu. Each menu owns its own category tabs and items. Screens can either stay assigned to one fixed menu or follow Scheduling, where each daypart maps to a specific menu. Existing pre-menu prototype state is migrated into Main Menu automatically.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page |
| `/admin` | Restaurant admin dashboard |
| `/display/main` | Fullscreen main counter menu |
| `/display/bar` | Fullscreen secondary bar menu |

# Supabase setup - simplest MVP configuration

The MVP deliberately uses **one table** instead of immediately creating a large relational schema.

Each restaurant/menu installation is stored as one JSONB state row:

```text
one_time_menu_state
  id          text primary key
  data        jsonb
  updated_at  timestamptz
```

This maps directly to the app's existing `AppData` object and makes backend setup almost plug-and-play.

## 1. Create a Supabase project

Create a normal Supabase project. No special configuration is required before running the SQL below.

## 2. Run the SQL file

Open **Supabase -> SQL Editor** and run:

```text
supabase/001_one_time_menu.sql
```

The SQL file:

- Creates `public.one_time_menu_state`
- Enables Row Level Security
- Adds prototype public read/write policies
- Grants browser access through the publishable key
- Adds the table to Supabase Realtime

## 3. Install dependencies

```bash
npm install
```

`@supabase/supabase-js` is already included in `package.json`.

## 4. Create `.env.local`

Copy `.env.example` to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
VITE_MENU_INSTANCE_ID=copper-fork
```

Get the URL and publishable key from the Supabase project dashboard.

Do **not** place a Supabase secret/service-role key in this browser application.

## 5. Start the app

```bash
npm run dev
```

That is the entire backend setup.

The first browser to connect checks for a row matching `VITE_MENU_INSTANCE_ID`. If it does not exist, the app seeds that row with the current cached/demo data automatically.

## Multiple restaurant instances

The same codebase can point at another restaurant simply by changing:

```env
VITE_MENU_INSTANCE_ID=another-restaurant
```

For the MVP this creates another independent JSONB state row in the same Supabase project.

Example:

```text
copper-fork
coffee-house-demo
northside-bar
location-002
```

## How synchronization works

The data flow is:

```text
Admin change
    |
    +--> LocalStorage cache immediately
    |
    +--> Supabase one_time_menu_state
                    |
                    +--> Supabase Realtime
                              |
                              +--> /display/main
                              +--> /display/bar
```

Admin updates are written locally first so the interface remains responsive. The same state is then upserted to Supabase.

Displays subscribe to Postgres changes for their configured `VITE_MENU_INSTANCE_ID`. When the Supabase row changes, the new menu state is applied without a browser reload and is cached locally.

If Supabase is temporarily unavailable, the last LocalStorage copy continues rendering.

## Running without Supabase

Supabase remains optional for local development.

If these variables are absent:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

the application falls back automatically to its original LocalStorage-only behavior.

## Important prototype security note

The SQL migration intentionally permits anonymous browser writes because `/admin` has no authentication in this MVP.

That means this configuration is appropriate for **development, demonstrations, and prototyping**, but not the final public production system.

Before deploying real restaurant customers, the next security milestone should be:

1. Supabase Auth on `/admin`
2. Anonymous/public display reads
3. Authenticated-only admin writes
4. Per-restaurant Row Level Security

The display hardware concept does not change.

## Key backend files

```text
.env.example
supabase/001_one_time_menu.sql
src/lib/supabase.ts
src/services/appData.ts
src/hooks/useAppStore.tsx
src/utils/storage.ts
src/types/database.ts
```

### `src/lib/supabase.ts`

Creates the Supabase client using Vite environment variables. If no credentials exist, it returns to LocalStorage-only mode.

### `src/services/appData.ts`

Contains the entire MVP Supabase data layer:

- Load restaurant state
- Auto-seed missing restaurant state
- Save restaurant state
- Subscribe to Realtime changes

### `src/hooks/useAppStore.tsx`

The existing React store remains the single UI interface. Components do not need to know whether data came from LocalStorage or Supabase.

## LocalStorage persistence

The cache key is:

```text
onetime-menu-demo-v1
```

LocalStorage is intentionally retained after adding Supabase. For signage, this provides a useful fallback if a display temporarily loses internet access.

## Reset demo data

Open:

```text
/admin
```

Then choose **Restaurant Settings -> Reset LocalStorage Demo**.

When Supabase is configured, reset also writes the demo state back to the configured Supabase menu instance.

## Project structure

```text
src/
  admin/
  components/
  data/
    demo.ts
  display/
    DisplayPage.tsx
  hooks/
    useAppStore.tsx
  lib/
    supabase.ts
  pages/
    LandingPage.tsx
  services/
    appData.ts
  types/
    database.ts
    menu.ts
  utils/
    storage.ts
    time.ts
  App.tsx
  main.tsx
  styles.css
supabase/
  001_one_time_menu.sql
.env.example
```

## Future normalized database

`src/types/database.ts` still documents the likely later relational entities:

- organizations
- restaurants
- locations
- menus
- categories
- menu_items
- screens
- schedules
- specials
- users

We are intentionally **not** using all those tables yet. The JSONB state table gives the MVP remote persistence and Realtime behavior with dramatically less code and setup.

Normalize only when the product actually needs stronger multi-user access control, reporting, history, large chains, or granular database queries.

## Technology

- React
- TypeScript
- Vite
- React Router
- Lucide React
- Supabase JS
- Supabase Postgres
- Supabase Realtime
- LocalStorage fallback cache
