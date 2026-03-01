# The Approach — Event Funnel Page Design

**Date:** 2026-02-27
**Event:** The Approach 2026 (March 22–24, Chick-fil-A Talent Hub)
**Route:** `/the-approach` on the marketing site
**Purpose:** QR code landing page for booth visitors — dynamic content per timeslot, lead capture form

---

## Overview

A funnel page on the marketing site that dynamically changes content based on which Talent Hub timeslot is active during the 3-day event. Visitors scan a QR code at the Levelset booth (or from chocolates/materials), land on this page, see messaging tailored to the session they just attended, and fill out a lead capture form to "claim their offer."

The page uses the standard site layout (Header, Footer) and matches the existing Levelset marketing aesthetic. It is password-protected during pre-event prep.

---

## 1. Timeslot System

### 1.1 The 8 Timeslots

Content is stored in a Supabase table (`the_approach`) and fetched at page load. Each row represents one timeslot.

| # | Day | Hub Window | After Session | Content Theme |
|---|-----|-----------|---------------|---------------|
| 1 | Sun | 12:00–5:00pm | Registration (none) | General intro — "Built for CFA" |
| 2 | Mon | 8:00–8:30am | Breakfast | Fresh start — quick overview |
| 3 | Mon | 11:00am–1:30pm | Groeschel + Robinson + Labs | Leadership clarity, onboarding, culture, Gen Z |
| 4 | Mon | 3:15–5:30pm | Qubein + Andrada + Labs | Employer branding backed by data |
| 5 | Mon | 6:30–7:00pm | McChesney (4DX) | Execution scoreboard |
| 6 | Tue | 7:45–8:15am | Breakfast | Last chance, quick overview |
| 7 | Tue | 10:00–11:10am | Taylor/SHRM + Elmore + Labs | Future of work, AI, generational |
| 8 | Tue | 12:15–1:30pm | Strategy Lab + Moraitakis | Action planning |

### 1.2 Auto-Selection Logic

The page auto-selects the current timeslot based on Central Time (event timezone). Between windows, it defaults to the most recent timeslot. Before the event starts (before Sunday 12pm), it defaults to timeslot 1.

### 1.3 Dev Dropdown

A small select element at the top of the page lets you manually override the active timeslot. Always visible (useful at the booth to switch live). Styled unobtrusively — small text, muted colors, sits above the hero.

---

## 2. Database Schema

### 2.1 `the_approach` — Timeslot Content

```sql
CREATE TABLE the_approach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeslot_number INTEGER NOT NULL UNIQUE,
  day_label TEXT NOT NULL,                    -- "Sunday" / "Monday" / "Tuesday"
  time_range TEXT NOT NULL,                   -- "12:00 PM – 5:00 PM"
  starts_at TIMESTAMPTZ NOT NULL,            -- For auto-selection logic
  ends_at TIMESTAMPTZ NOT NULL,              -- For auto-selection logic
  badge_text TEXT,                           -- e.g. "Coming from the Leadership Forum?"
  headline TEXT NOT NULL,                    -- Hero headline
  subtext TEXT NOT NULL,                     -- Hero description paragraph
  feature_cards JSONB NOT NULL DEFAULT '[]', -- Array of {icon, title, description}
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**`feature_cards` JSONB structure:**
```json
[
  {
    "icon": "chart-bar",
    "title": "Position-Based Ratings",
    "description": "Every position rated on the same criteria. Rolling averages show real trends."
  },
  {
    "icon": "shield",
    "title": "Consistent Discipline",
    "description": "Progressive accountability that's fair, documented, and consistent across shifts."
  }
]
```

### 2.2 `leads` — Unified Lead Capture

A generic leads table used across all lead sources (The Approach, free trial signups, waitlist, etc.). The `source` column identifies where the lead came from.

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,                     -- "the_approach", "free_trial", "waitlist", etc.
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_operator BOOLEAN,
  role TEXT,
  is_multi_unit BOOLEAN,
  locations JSONB DEFAULT '[]',             -- Array of enriched store data
  metadata JSONB DEFAULT '{}',              -- Source-specific data (e.g. timeslot_number for Approach)
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT false,
  notes TEXT
);
```

The unique constraint is on `(email, source)` so a person can exist as a lead from multiple sources without conflict.

**`locations` JSONB structure:**
```json
[
  {
    "store_number": "05294",
    "location_name": "CFA Buda",
    "operator_name": "John Doe",
    "state": "TX"
  }
]
```

**`metadata` JSONB examples:**
- The Approach: `{ "timeslot_number": 3 }`
- Free trial: `{ "plan_tier": "pro", "billing_cycle": "monthly" }`

The `location_name`, `operator_name`, and `state` are enriched on the backend via `cfa_location_directory` lookup. The user only enters the store number.

---

## 3. Page Structure

The page lives at `apps/marketing/src/app/the-approach/page.tsx` and uses the standard site layout (Header, Footer via root layout). It is a client component (`'use client'`) for interactivity.

### 3.1 Password Gate

On first visit, the page shows a centered password input over the content. Password is `"levelset"`. Stored in `sessionStorage` so refreshes don't re-prompt.

### 3.2 Sections (top to bottom)

1. **Dev Timeslot Selector** — Small dropdown + day/time label. Always visible.

2. **Hero Section** — Dark green background (same style as site hero).
   - Dynamic badge text (e.g. "Coming from the Leadership Forum?")
   - Dynamic headline
   - Dynamic subtext
   - Styled identically to the main site hero

3. **Feature Cards** — 2-3 cards per timeslot.
   - Icon + title + short description
   - Same card style as the FeaturesOverview on the homepage
   - Content pulled from `feature_cards` JSONB

4. **Lead Capture Form** — "Claim Your Exclusive Offer" section.
   - Light background section
   - Form fields (see §4)
   - Submit button
   - Success state after submission

5. **Social Proof** — Brief credibility line.
   - "Built by CFA operators, for CFA operators."
   - Optional: quote from an existing operator if available

6. **Standard Footer** — From the site layout (automatic).

### 3.3 Mobile Optimization

- All sections are single-column on mobile
- Form inputs are full-width with generous touch targets (min 44px)
- Feature cards stack vertically
- Hero text is left-aligned on mobile for readability
- No horizontal scrolling anywhere

---

## 4. Lead Capture Form

### 4.1 Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| First Name | text | yes | |
| Last Name | text | yes | |
| Email | email | yes | |
| Are you the Operator? | yes/no toggle | yes | |
| Role | select dropdown | yes | Options differ based on operator answer |
| Multi-unit? | yes/no toggle | yes | |
| Store Number | text (5-digit) | yes | Placeholder: `01234`. Numeric only. 1 field default. |
| Store Number 2 | text (5-digit) | conditional | Shown when multi-unit = yes |
| + Add Location | button | — | Shown when multi-unit = yes and < 3 locations. Adds 3rd field. Max 3. |

**Role options:**
- If "Are you the Operator?" = Yes → Role is auto-set to "Operator" (field hidden or disabled)
- If No → Dropdown: "Talent Director", "Director", "Team Lead", "Manager", "Other"

**Store number behavior:**
- Single field shown by default
- When "Multi-unit?" is toggled on, a second field appears
- "Add another location" button appears below, adds a 3rd field (max 3)
- When "Multi-unit?" is toggled off, extra fields hide and clear
- Input accepts only digits, max 5 characters, placeholder `01234`
- No location name displayed to the user

### 4.2 Submission Flow

1. Client validates all required fields
2. `POST /api/the-approach/submit`
3. Backend:
   a. Validates input
   b. Looks up each store number in `cfa_location_directory` → enriches with name/operator/state
   c. Inserts row into `leads`
   d. Sends confirmation email via Resend
   e. Returns success
4. Client shows success message: "You're in! Check your email for next steps."

### 4.3 Duplicate Handling

If the same email submits again for the same source, update the existing row rather than creating a duplicate. This lets someone correct their store number if they made a typo. The unique constraint is on `(email, source)`, so the same person can exist as a lead from different sources (e.g., The Approach + free trial signup later).

---

## 5. API Routes

### 5.1 `GET /api/the-approach/content`

Returns all active timeslots from `the_approach` table, ordered by `timeslot_number`.

**Response:**
```json
{
  "timeslots": [
    {
      "timeslot_number": 1,
      "day_label": "Sunday",
      "time_range": "12:00 PM – 5:00 PM",
      "starts_at": "2026-03-22T18:00:00Z",
      "ends_at": "2026-03-22T23:00:00Z",
      "badge_text": "Welcome to The Approach",
      "headline": "The team performance platform built for CFA",
      "subtext": "...",
      "feature_cards": [...]
    }
  ]
}
```

No auth required (public endpoint). Could be cached/revalidated.

### 5.2 `POST /api/the-approach/submit`

Accepts lead form submission. No auth required.

**Request body:**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "is_operator": true,
  "role": "Operator",
  "is_multi_unit": false,
  "store_numbers": ["05294"],
  "timeslot_number": 3
}
```

**Backend steps:**
1. Validate required fields
2. Look up each store number in `cfa_location_directory`
3. Upsert into `leads` (keyed on email + source `the_approach`)
4. Send Resend confirmation email
5. Return `{ success: true }`

---

## 6. Resend Email Template

A simple branded confirmation email:

- **From:** Levelset or Andrew directly
- **Subject:** "Thanks for visiting Levelset at The Approach"
- **Body:** Brief thank-you, reminder of the offer (placeholder for now since offer TBD), link to levelset.io

Template will be created in Resend dashboard. The API route references the template ID.

---

## 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/YYYYMMDD_the_approach.sql` | NEW | Creates `the_approach` (timeslot content) and `leads` (unified lead capture) tables |
| `apps/marketing/src/app/the-approach/page.tsx` | NEW | Page component (metadata + wrapper) |
| `apps/marketing/src/app/the-approach/TheApproachPage.tsx` | NEW | Client component with all page logic |
| `apps/marketing/src/app/api/the-approach/content/route.ts` | NEW | GET endpoint for timeslot content |
| `apps/marketing/src/app/api/the-approach/submit/route.ts` | NEW | POST endpoint for lead form submission |
| `scripts/seed-the-approach-content.ts` | NEW | Seeds the 8 timeslots with initial content |

No modifications to existing files needed — the page inherits Header/Footer from the root layout automatically.

---

## 8. Content Seeding (Initial Timeslot Data)

A seed script populates all 8 timeslots. Content is derived from the Session-to-Pitch Mapping in the playbook. Example entries:

**Timeslot 1 (Sunday Registration):**
- Badge: `"Welcome to The Approach"`
- Headline: `"The team performance platform built for Chick-fil-A"`
- Subtext: `"Levelset replaces the binders and spreadsheets you use to track ratings, discipline, and your roster — all in one platform built exclusively for how CFA restaurants operate."`
- Cards: Position-Based Ratings, Discipline Tracking, Unified Roster

**Timeslot 3 (After Groeschel + Labs):**
- Badge: `"Coming from the Leadership Forum?"`
- Headline: `"Give your team the clarity they're asking for"`
- Subtext: `"Craig Groeschel talked about leading with clarity. Levelset delivers it — clear expectations per position, visible progress, and consistent standards across every shift and every supervisor."`
- Cards: PEA Ratings, Culture & Consistency, Onboarding Tracking

**Timeslot 5 (After McChesney 4DX):**
- Badge: `"Thinking about execution?"`
- Headline: `"Your talent strategy scoreboard"`
- Subtext: `"Chris McChesney's whole point: strategies fail without visible execution. Levelset is your scoreboard — team performance made visible, trackable, and actionable every single day."`
- Cards: PEA Analytics, Discipline Tracking, Position Mastery

**Timeslot 8 (Final — Strategy Lab):**
- Badge: `"Building your action plan?"`
- Headline: `"Put Levelset on it"`
- Subtext: `"You just built your 6-month talent strategy. Levelset is how you operationalize it — start your trial this week and have your team rated within days."`
- Cards: Full Platform Overview, Quick Setup, Founder Onboarding

---

## 9. Not Included (YAGNI)

- No admin UI for editing timeslot content (edit directly in Supabase)
- No analytics dashboard for leads (query the table directly)
- No Google Places lookup (only CFA directory lookup)
- No trial signup flow (mobile not supported for onboarding)
- No real-time WebSocket updates (page fetches content on load)
