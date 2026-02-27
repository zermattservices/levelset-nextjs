# Onboarding Location Card Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current location card in onboarding Step 1 with a polished Google Maps integration featuring a static map preview, confirm flow, operating hours display, and background review sync.

**Architecture:** Enhance the existing `AccountSetupStep` component with a multi-state location card (searching → preview → confirmed). Extend the `google-search` API to return hours and ratings. Trigger background review sync after org creation.

**Tech Stack:** Next.js Pages Router, MUI v7 (TextField/Switch only), CSS Modules, Google Static Maps API, Google Places API (New) v1, existing `google-places.ts` sync library.

---

## Changes Summary

### 1. Remove CFA Green Banner
- Delete the `.cfaResult` section entirely from the location card
- When CFA lookup matches, silently populate the Location Name field (already happens)
- No visual "match found" indicator

### 2. Toggle Label Updates
- Change "Multiple locations?" to "Multi-unit?"
- Remove the sublabel "The Operator is the franchise owner/licensee" from the operator toggle
- Remove the sublabel "Add up to 3 locations during setup" from the multi-unit toggle

### 3. Location Card States

The location card has three visual states:

**State A: Searching (default)**
- Store Number input (existing)
- Location Name input (existing, auto-filled from CFA)
- Google Places auto-search runs in background after CFA match

**State B: Preview (after Google results return)**
- Static map thumbnail: `https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=15&size=600x200&scale=2&markers=color:red|{lat},{lng}&key={API_KEY}`
- 180px tall, full card width, rounded top corners (8px 8px 0 0)
- Business name (14px, semibold) + address (13px, muted) below the map
- "Search for a different location" link — reveals a search input with dropdown of results
- "Confirm Location" button — full-width, brand green, 44px tall
- If no results: show "No Google Maps listing found" with search input pre-visible

**State C: Confirmed**
- Compact map thumbnail (~100px tall)
- Business name + address inline
- Operating hours grid (7 rows): `Mon   6:00 AM – 10:00 PM` format
  - Uses `weekdayDescriptions` strings from Google Places API
  - 12px font, muted color, compact spacing
- "Change location" link to reset back to State B

### 4. API: Extend `google-search.ts`

Add to the Google Places field mask:
- `places.regularOpeningHours` (for `weekdayDescriptions`)
- `places.rating`
- `places.userRatingCount`

Update response interface to include:
```typescript
interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  // NEW:
  hoursDisplay: string[] | null;  // weekdayDescriptions
  rating: number | null;
  userRatingCount: number | null;
}
```

### 5. Component State Updates

Add to `LocationForm` interface:
```typescript
interface LocationForm {
  // existing fields...
  googleConfirmed: boolean;          // NEW: user clicked "Confirm Location"
  googleHoursDisplay: string[] | null; // NEW: weekday descriptions
  googleRating: number | null;        // NEW
  googleReviewCount: number | null;   // NEW
  googleSearchOverride: boolean;      // NEW: user clicked "Search for a different location"
}
```

### 6. Background Review Sync on Create

After `create-org.ts` creates the location with `google_place_id`:
- Update the location record with `google_hours_display`, `google_rating`, `google_review_count`, `google_last_synced_at`
- Fire a non-blocking POST to the internal `sync-google` endpoint (or call `syncPlaceDetailsFromGoogle` directly) to persist hours to `location_business_hours` table and kick off review sync
- This is best-effort — if it fails, the weekly cron will catch it

### 7. CSS Changes

New CSS classes needed:
- `.mapPreview` — container for the static map image
- `.mapImage` — the `<img>` tag styling (full-width, rounded top, object-fit cover)
- `.placeInfo` — business name + address container
- `.placeName` — 14px semibold
- `.placeAddress` — 13px muted
- `.confirmBtn` — full-width brand button
- `.searchOverrideLink` — text link styling
- `.searchOverrideInput` — search input when override is active
- `.confirmedCard` — the collapsed confirmed state
- `.hoursGrid` — 7-row grid for operating hours
- `.hoursRow` — single day row
- `.changeLink` — "Change location" link

### 8. Data Flow

```
Store Number (5 digits)
  → CFA Lookup (debounced 300ms)
    → Populate locationName
    → Build Google query: "Chick-fil-A {name} {state}"
      → POST /api/onboarding/google-search
        → Returns places[] with hours, rating, coordinates
          → Show State B (preview) with top result
            → User clicks "Confirm Location"
              → Set googleConfirmed=true, store all data
                → Show State C (confirmed + hours)

On Submit (Continue button):
  → POST /api/onboarding/create-org
    → Creates org + locations (with google_place_id, google_data)
    → After location created: update with hours/rating data
    → Fire non-blocking review sync
```
