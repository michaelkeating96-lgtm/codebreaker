# Codebreaker Game — Design Spec
**Date:** 2026-03-24
**Stack:** React (Vite) + Node.js + Express + Socket.io
**Hosting:** Vercel (frontend), Render (backend)

---

## Overview

A two-player browser-based code-breaking game (Mastermind-style) playable across separate devices. One player sets a secret 5-color code; the other has 10 attempts to guess it. After each guess, the guesser receives feedback on how many colors are correct and how many are in the right position. No accounts or login required — players identify by a display name.

---

## Architecture

### Frontend
- React app built with Vite
- Deployed as a static site on Vercel
- Both players load the same URL
- Communicates with the backend exclusively via Socket.io WebSocket events
- Holds no authoritative game state — only renders what the server sends

### Backend
- Node.js + Express server
- Socket.io for real-time bidirectional communication
- All game logic runs server-side (code evaluation, win/loss detection, turn management)
- In-memory room store (no database needed)
- Deployed on Render (free tier)

---

## Room & Lobby System

1. Player arrives, enters a display name
2. Chooses **Create Room** or **Join Room**
   - **Create Room:** Server generates a random 6-character alphanumeric room code; player waits in lobby displaying the code
   - **Join Room:** Player enters a code; if valid and room has space (< 2 players), they are admitted; otherwise an error is shown
3. Room locks once 2 players are connected — no additional players can join
4. The room **creator** picks their role first (Code Setter or Guesser); the other player is automatically assigned the opposite role
5. Both players confirm ready → game starts

---

## Gameplay Rules

| Rule | Value |
|---|---|
| Code length | 5 slots |
| Available colors | 6 |
| Duplicates in code | Allowed |
| Max guesses | 10 |

### Code Setter
- Presented with 5 empty slots and 6 color swatches
- Clicks to assign a color to each slot (duplicates permitted)
- Submits the code to the server — hidden from the guesser until round end

### Guesser
- Sees a board of 10 rows (one per guess), rendered top to bottom
- Active row: 5 clickable slots + 6 color swatches to compose a guess
- On submit, server evaluates and returns:
  - **Exact hits** — correct color in the correct position
  - **Color hits** — correct color in the wrong position
- Both players see the guess result and indicators appear simultaneously
- All previous guesses and their indicators remain visible throughout the round

### Round End Conditions
- **Guesser wins:** 5 exact hits in a single guess
- **Guesser loses:** 10 guesses exhausted without 5 exact hits
- Secret code is revealed to both players on round end

---

## Rematch Flow

1. Both players see a result screen (win/loss + revealed code)
2. Each player is prompted: **"Play Again?"**
3. If both accept:
   - The **winner** of the last round picks their role first. The winner is the guesser if they cracked the code, or the setter if the guesser exhausted all 10 guesses.
   - The other player is automatically assigned the opposite role
   - New round begins
4. If either player declines or disconnects, both are returned to the home screen

---

## Socket.io Events

| Event | Direction | Purpose |
|---|---|---|
| `create_room` | client → server | Create a new room; server returns room code |
| `join_room` | client → server | Join an existing room by code |
| `room_joined` | server → both | Confirms both players are in; triggers role selection |
| `pick_role` | client → server | Winner (or creator on first round) selects role |
| `roles_assigned` | server → both | Broadcasts final role assignments |
| `set_code` | client → server | Code setter submits secret code |
| `code_set` | server → guesser | Signals that code is set, guessing can begin |
| `submit_guess` | client → server | Guesser submits a 5-color guess |
| `guess_result` | server → both | Returns guess colors + exact hits + color hits |
| `game_over` | server → both | Win/loss result + reveals secret code |
| `play_again` | client → server | Player signals they want a rematch |
| `rematch_ready` | server → both | Both accepted; triggers role selection for new round |
| `opponent_disconnected` | server → remaining | Notifies player their opponent left |
| `join_error` | server → client | Room not found, already full, or other join failure — includes reason string |

---

## Server-Side Room State

```js
room: {
  code: String,           // 6-char room code
  players: [
    { id: String, name: String, role: "setter" | "guesser" }
  ],
  secretCode: [String],   // 5-element array of color identifiers
  guesses: [
    { colors: [String], exactHits: Number, colorHits: Number }
  ],
  status: "waiting" | "setting" | "guessing" | "finished",
  rematchVotes: { [playerId]: Boolean }
}
```

---

## Error Handling

| Scenario | Handling |
|---|---|
| Invalid/full room code on join | Server emits error event; client shows clear message ("Room not found or already full") |
| Player disconnects mid-game | Server emits `opponent_disconnected` to remaining player; room marked abandoned; both players see disconnect screen with option to return home |
| Duplicate `set_code` submission | Server ignores if code is already set for this round |
| Duplicate `submit_guess` submission | Server ignores if a guess is already being processed for that turn |
| One player declines rematch | Both players are returned to home screen |
| Tamper attempts | All evaluation logic is server-side; clients only send raw inputs, never computed results |

---

## UI Style (deferred)

Apple Liquid Glass aesthetic — modern, sleek, clean. Specific component design to be determined during implementation.

---

## Out of Scope

- User accounts or persistent history
- Spectator mode
- More than 2 players per room
- Mobile app (browser-only)
- Chat between players
