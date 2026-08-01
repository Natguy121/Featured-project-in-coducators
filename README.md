# Guess The Flag

A single-file HTML/CSS/JS game: guess flags against the clock, or play a
20-questions-style geography guessing game against an AI or a friend. Coins
earned from wins buy hints in the store. Just open `index.html` in a browser
— no build step, no server required for solo/vs-AI play.

## Online play with a friend

Two modes support playing with a friend: the flag-guessing race and the
geography mystery-country game. They're powered by a shared Firebase
Realtime Database "room" that both players' browsers read and write to, so
a room code works between any two devices, anywhere.

Without a Firebase project configured, these modes show a clear inline
error ("Online play needs Firebase configuration...") and everything else
(solo flags, vs-AI geography, the store, coins) still works fully offline.

### Set up your own Firebase project (free tier is enough)

1. Go to https://console.firebase.google.com and create a project.
2. **Build > Realtime Database > Create Database.** Any region works; you'll
   set the security rules yourself in step 4.
3. **Build > Authentication > Sign-in method > enable "Anonymous".** The app
   signs each visitor in anonymously just so the security rules below can
   require `auth != null` — there's no real login, this only gates access to
   the database.
4. **Realtime Database > Rules**, paste:
   ```json
   {
     "rules": {
       "rooms":     { "$code": { ".read": "auth != null", ".write": "auth != null" } },
       "flagRooms": { "$code": { ".read": "auth != null", ".write": "auth != null" } },
       "users":     { ".read": "auth != null", ".write": "auth != null" },
       "global":    { ".read": "auth != null", ".write": "auth != null" }
     }
   }
   ```
   This lets any signed-in (anonymous) visitor read/write a room if they know
   its 5-character code — the same "security" a shareable room code already
   implies. Don't reuse this database for anything sensitive.
5. **Project settings (gear icon) > General > Your apps > Add app > Web**,
   then copy the `firebaseConfig` object it gives you.
6. Open `index.html`, find the `firebaseConfig` object (search for
   `YOUR_API_KEY`), and paste your real values in.

That's it — reload the page and the "Race a Friend Online" / "Play Online
with a Friend" screens will show "🟢 Connected" and work across devices.

### How it works

`createRoomChannel()` in `index.html` wraps a Firebase Realtime Database
path (`rooms/{code}/events` or `flagRooms/{code}/events`) in the same
`postMessage`/`onmessage` shape the old `BroadcastChannel`-based version
used, so the game logic itself didn't need to change — only the transport
did. Each room also gets a `meta` node (created when the room is made) so
joining a room can tell "not found" apart from "no messages yet."

Rooms aren't automatically deleted, so the database will accumulate old
rooms over time. For casual use this is harmless (rooms are tiny), but you
can periodically clear them from the Firebase console, or add a scheduled
Cloud Function if you want automatic cleanup.

## Owner mode & Global Chat

Signing in with the password `TOBO` (any username) flags that browser as
**Owner**, which unlocks two things on the Home screen:

- **🛡 Owner Panel** — a live list of every player who has ever signed in
  (from the `users/` node in Firebase), with `+`/`−` steppers to give or
  take away their coins and each of the four hint types.
- **📢 Global Chat** — every signed-in player sees a read-only feed at
  `global/messages`; only the Owner gets the compose box to post to it.

Every regular player's coins/hints are mirrored to `users/{username}` in
Firebase whenever they change (see `syncUserToFirebase()`), and each player
listens for changes to their own record so an Owner's edit shows up on their
screen immediately.

To change the password, edit the `OWNER_PASSWORD` constant in `index.html`.

**Security caveat:** this is a convenience gate, not real access control.
`index.html` is a static file anyone can view-source, so the `TOBO` check —
and the password itself — are visible to any visitor who looks. The Realtime
Database rules above also don't (and can't, without a server) distinguish
"the real Owner" from "any signed-in visitor who read the source and copied
the request" — they only require anonymous auth, same as every other path.
That's an inherent limit of a backend-less static site: real enforcement
would need a server (e.g. a Cloud Function that checks the password and
mints a custom auth claim, with rules keyed off that claim). Treat this
feature as a fun convenience for a trusted friend group, not a defense
against anyone determined to poke at it.
