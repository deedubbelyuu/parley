# Parley: session handoff

**Updated:** 2026-11-15 (after session 5: the 15-item feedback list from the family test)
**Use:** personal and family only. Not a product.
**Status:** v1.2.0 code is written into the local repo; Daylen pushes and tags it to build. Tested in a Linux sandbox: 36/36 checks in `tests/e2e.js` and 40/40 in `tests/v12.js`. Not yet tested on real Windows or Mac hardware. **v1.2.0 has to be installed by hand once**; after that, updates install themselves.

## Where things live
| What | Where |
|---|---|
| Repo | github.com/deedubbelyuu/parley (temporarily **public**) |
| Local copy | `C:\Users\DW\Documents\parley` (Windows PC, PowerShell) |
| Server | Railway, auto-deploys from `main`. Env: `ACCESS_CODE` (required). Optional: `TURN_*`, `FILES_DIR`, `MAX_FILE_MB`, `FILE_TTL_DAYS`, `GITHUB_REPO`, `GITHUB_TOKEN` |
| Installers + update files | GitHub Release for each `v*` tag, built by `.github/workflows/build-desktop.yml`: `.dmg`, `-mac.zip`, `latest-mac.yml`, `Parley-Setup-x.exe`, `.blockmap`, `latest.yml` |
| App log | `%APPDATA%\Parley\parley.log` / `~/Library/Application Support/Parley/parley.log`; Settings → Open log file |
| Main-process settings | `settings.json` next to the log (keepRunning, openAtLogin, miniBounds) |

## How Claude works on this repo
The cloud session can clone the public repo read-only (the GitHub API isn't reachable for it). It can't push. With the desktop app linked, Claude writes changed files straight into `Documents\parley` through the folder bridge, and Daylen runs `git add/commit/push` and tags.

## Session 5 changes (v1.2.0)
- **Screen-share echo (root fix):** the display-media handler now answers `audio: 'loopbackWithoutChrome'`. Electron 45 accepts it, though it isn't in the docs; checked in the sandbox, and the track reports `deviceId: 'loopbackWithoutChrome'`. The OS then captures all computer sound *except Parley's own process tree*:
  - Windows: WASAPI process loopback, used on build ≥ 19045 (Win10 22H2 and Win11).
  - macOS: CoreAudio tap, used on 14.2+.
  - Main tells the renderer which mode is possible (`loopback-supported` → `{supported, exclude}`).
  - Capture attempts go: exclude → plain loopback with our constraints → defaults → picture only.
  - "Excluded" is detected from the track's `deviceId`/`restrictOwnAudio`. Older OSes still get the echo guard, which now ducks to 3% (was 10%). The picker says which you'll get, and the log records `screen sound track {deviceId…}`.
  - Why v1.1 echoed: Chromium's `restrictOwnAudio` only works on Windows 11 (hard-coded check). Any other case fell back to the echo guard.
- **Mini window rewritten:** it's now a real `window.open('about:blank','parley-mini')` child, which shares the call's MediaStreams directly. It replaces both OS picture-in-picture and the old "shrink the main window" compact mode.
  - The window is frameless and resizable, uses `alwaysOnTop 'screen-saver'`, and has `skipTaskbar`. On Mac it is `type:'panel'` with `visibleOnFullScreen`. On Windows a 1.5 s `moveTop()` loop keeps it above browser and video fullscreen.
  - Corner and edge grips plus dragging go through `mini-get-bounds`/`mini-set-bounds` IPC (min 200×120). Bounds are saved in settings.json.
  - It opens on minimize **or hide** (close-to-tray) during a call and closes on restore/show or hang-up. Double-click or ⤢ expands.
  - It shows the movie, then the remote camera, then the avatar, plus a self-view. Controls (expand, mute, camera, hang up) auto-hide after 2.5 s.
  - The web version still uses video PiP.
- **Full screen:** the button or a double-click fullscreens the whole stage, so the friend's camera tile stays visible. The movie's native fullscreen is disabled (`controlslist="nofullscreen"`).
- **Auto-hide call UI:** `.stage.idle` after 3 s without pointer/keys. It fades the controls, timer and media bar and hides the cursor. Setting: `autoHideUi` (default on).
- **Background running (tray):** closing the window hides it (first time: a notification explains). Tray menu has Open, Start with Windows / Open at login (`setLoginItemSettings`, `--hidden`), Keep running, and Quit.
  - Incoming call → `incoming-call` IPC shows and focuses the window.
  - Unread count: tray icon dot and tooltip, and the Mac dock badge.
  - Settings → App mirrors the toggles.
- **Auto-update:** the app asks **our server** (`/updates/*`), which proxies the latest GitHub Release (cached 5 min). With `GITHUB_TOKEN` this keeps working after the repo goes private. Both endpoints need the `x-parley-code` header.
  - Windows: `electron-updater` with a generic feed (`setFeedURL` at runtime + `requestHeaders`), silent `quitAndInstall(true,true)`.
  - Mac: custom code. It downloads the `-mac.zip` (from `/updates/latest.json`), extracts it with `ditto`, then a detached shell script waits for exit, swaps the bundle (keeping `.old` until it succeeds), runs `xattr -cr` and `open`s it. (Squirrel.Mac refuses ad-hoc signed apps.)
  - Checks 20 s after sign-in, then every 3 h. Banner at the bottom of the contact list, disabled during calls. `package.json` has a placeholder generic `publish` URL just so `app-update.yml` gets generated.
- **Chat:**
  - **Auto-scroll:** nodes are reused per message id. A ResizeObserver keeps the view pinned to the bottom, and a "New messages" pill shows when scrolled up. This fixes the old bug where `innerHTML=''` jumped to the top.
  - **Read receipts:** `read {to, ts}` is relayed, or queued per sender while offline. Ticks: 🕓 sending, ✓ queued, ✓✓ delivered, accent ✓✓ + "Seen" read. Settings toggle.
  - **Message grouping**, last-message previews in the contact list, and "typing…" in the header.
- **Photos & files:** `POST /files` (streamed to `FILES_DIR`, random 128-bit id, `MAX_FILE_MB` 100, swept after `FILE_TTL_DAYS` 30) and `GET /files/:id`, both gated by access code and CORS.
  - The client shrinks photos to ≤2048 px (WebP if alpha, else JPEG). GIFs are kept as-is.
  - XHR upload with progress, retry on failure. Everything sent or received is cached in IndexedDB (`f:<localId>`, `file:<id>`), and photos auto-download.
  - Desktop saves files into Downloads with Open / Show in folder (`save-download` IPC). Lightbox for photos. Drag & drop, paste, 📎.
  - Messages carry a text fallback, so v1.1 clients show "📷 Photo" / "📎 name".
- **Emoji & stickers:** a picker with 9 categories plus recently used. A message that is only 1–3 emoji shows large.
  - Stickers: 18 built-in **Pip** stickers, an original blob drawn in SVG (`renderer/stickers.js`), sent by id.
  - Plus "your own" stickers: any image or GIF, ≤320 px, stored in IndexedDB, sent as a file with `sticker:true`.
- **Profile pictures:** a 256 px JPEG data URL (≤110 KB) sent with `profile`. The server keeps it in memory and puts `avatarRev` in presence. Clients fetch it with `get-avatar` and cache it in localStorage. A client re-sends its own picture after a server restart.
- **Color schemes:** `THEMES` in app.js set CSS variables (all colors are variables now): Midnight, Daylight, Graphite, Ocean, Forest, Sunset, Grape, Rose, Black, plus Match system. `nativeTheme` follows, so the Windows title bar matches.
- **UI polish:** a full styles.css rewrite with a gradient avatar fallback, search icon, pill composer, nicer empty state and login, softer modals and animations. The contacts toggle moved to the right end of the header.

## File map
```
package.json, package-lock.json   ← server deps (root, so Railway finds them)
server/server.js                  ← presence, chat relay + offline queue, read receipts, avatars, /files, /updates proxy, signaling
app/package.json                  ← Electron 45, electron-builder 26, electron-updater 6, version 1.2.0
app/main.js                       ← window, tray, mini window, permissions, screen picker + loopback modes, updater, log, link browser
app/preload.js                    ← contextBridge API (window.parley)
app/assets/                       ← icon.png, tray(.png|-unread), trayTemplate(@2x), trayUnreadTemplate(@2x)
app/renderer/index.html|styles.css|app.js|emoji.js|stickers.js
app/renderer/vendor/noise/        ← rnnoise/gtcrn worklets + wasm, LICENSE
app/build/icon.png, entitlements.mac.plist
.github/workflows/build-desktop.yml
tests/                            ← harness.js, e2e.js (36), v12.js (40), screens.js, repro-screen.js, README.md
```

## Key decisions
- WebRTC "perfect negotiation": the caller is impolite and the callee polite. The callee doesn't offer until the first offer arrives.
- Every call always has one audio and one video sender (placeholders + `replaceTrack`). Extra streams are announced with `stream-role`.
- **Don't add `setPermissionCheckHandler`**: it made `desktopCapturer.getSources()` return 0 sources.
- Tests run Electron **without** `--use-fake-ui-for-media-stream` (it bypasses our handlers). The old suite sets `autoHideUi=false` so the robot can click call buttons.
- The mini window must be opened by the renderer, because only a `window.open` child can share MediaStreams. Main triggers it with `executeJavaScript('window.__parleyMini.open()', true)`.
- Updates go through our server, not straight to GitHub, so the repo can go private.

## To verify on real hardware (next family test)
1. **Install v1.2.0 by hand** on each computer (last manual install).
2. Screen share with sound on Windows: the picker should say "your friend's voice is left out automatically". The friend must **not** hear themselves. Log: `screen sound track {"deviceId":"loopbackWithoutChrome"…}`. If it says `loopback`, send `parley.log`.
3. Same on Mac (14.2+): first-time permission prompt, then restart Parley.
4. Mini window: minimize during a call, then fullscreen a YouTube video in a browser. The mini window should stay on top. Resize from corners and drag it around.
5. Close the window, then get called: the window pops up. Tray menu: Start with Windows, then reboot and check it starts in the tray.
6. Photos (incl. a phone photo with rotation), a big file (50+ MB), stickers, profile pictures, read receipts.
7. **Auto-update:** after 1.2.0 is installed, bump to 1.2.1, tag and push. Within ~3 h (or Settings → Check for updates) the banner appears; Restart installs. Mac: check that it reopens and whether it re-asks for permissions.

## Backlog (priority order)
1. **Security: per-person passwords** (names locked to a password; close the "same name kicks the old session" hole). Needs Postgres on Railway.
2. **Security: limit sign-in attempts** for the access code.
3. **Security: call safety code** (4 emoji from both DTLS fingerprints).
4. Postgres-backed chat history, offline queue and avatars (currently in-memory, lost on redeploy), plus a Railway Volume for `FILES_DIR`.
5. Mac: a stable self-signed signing identity in CI so permissions survive updates (or a paid Apple cert).
6. Message reactions, reply-to, edit/delete; seeking bar for the watch-together viewer.
7. Browser version: auto PiP when switching tabs. Security: end-to-end encrypted chat.
8. Optional "both have the file" synced playback mode for watch-together (full quality, no streaming).
9. Nice-to-haves: group calls (LiveKit), paid code signing, bump Actions to checkout/setup-node v5.

## Deployment lessons
- After `winget install`, refresh `$env:Path` or open a new PowerShell window (a new tab isn't enough).
- **Always extract zips into `Documents`**, not `Documents\parley`, or everything nests as `parley/parley`.
- `gh auth login --web --scopes workflow` is needed to push `.github/workflows` files.
- `gh run watch <id>` / `gh run view <id>`; plain `gh run watch` only lists runs that have started.
- Updates only work if each Release has `latest.yml` (Windows) and the `-mac.zip` (Mac). The workflow attaches them; don't delete them from Releases.

## Going private, later
- Download links stop working for anyone else. Share installers via Drive or Dropbox.
- **Set `GITHUB_TOKEN` on Railway first** (fine-grained, this repo, Contents: read-only), or auto-update stops.
- Installed apps keep working, and Railway keeps deploying.
- Private repos use GitHub's limited free Actions minutes, and macOS minutes count much higher.
- `gh repo edit --visibility private --accept-visibility-change-consequences`
