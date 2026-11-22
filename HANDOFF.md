# Parley: session handoff

**Updated:** 2026-11-19 (after session 8: v1.4.0: Mac audio fixes, Mac mini-window back button, Mac screen-share permission help, call volume, call snapshots)
**Use:** personal and family only. Not a product.
**Status:** v1.4.0 is handed over as `parley-1.4.0.zip` (the PC went offline before the folder bridge could write the files). Daylen extracts it into `Documents` (it has no `.git`, so local history is untouched), then commits, pushes and tags `v1.4.0`; the family gets it by auto-update, and Railway redeploys the server (it now passes snapshot info through). Tested in a Linux sandbox: 36/36 `tests/e2e.js`, 40/40 `tests/v12.js`, 53/53 `tests/v13.js`, 19/19 `tests/v131.js`, 21/21 new `tests/v14.js`. **The Mac fixes are reasoned from the code and from Electron/Chromium behaviour; nobody has tried them on a real Mac yet** (checklist below).

## Where things live
| What | Where |
|---|---|
| Repo | github.com/deedubbelyuu/parley (temporarily **public**) |
| Local copy | `C:\Users\DW\Documents\parley` (Windows PC, PowerShell) |
| Server | Railway, auto-deploys from `main`. Env: `ACCESS_CODE` (required). Optional: `TURN_*`, `FILES_DIR`, `MAX_FILE_MB`, `FILE_TTL_DAYS`, `GITHUB_REPO`, `GITHUB_TOKEN`, `LINK_PREVIEWS` (0 = off) |
| Installers + update files | GitHub Release for each `v*` tag, built by `.github/workflows/build-desktop.yml`: `.dmg`, `-mac.zip`, `latest-mac.yml`, `Parley-Setup-x.exe`, `.blockmap`, `latest.yml` |
| App log | `%APPDATA%\Parley\parley.log` / `~/Library/Application Support/Parley/parley.log`; Settings → Open log file |
| Main-process settings | `settings.json` next to the log (keepRunning, openAtLogin, miniBounds) |
| Call snapshots | `Pictures/Parley Snapshots/<date time> - A & B/` on the computer of whoever pressed the button |

## How Claude works on this repo
The cloud session can clone the public repo read-only (the GitHub API isn't reachable for it). It can't push. With the desktop app linked, Claude writes changed files straight into `Documents\parley` through the folder bridge, and Daylen runs `git add/commit/push` and tags. When the bridge isn't available (PC off, or folder access not granted), Claude hands over a zip of the repo (without `.git` and `node_modules`) to extract into `Documents`.

## Session 8 changes (v1.4.0)
Reported from the Mac: the mic can't be changed, output volume can't be changed, the mini window's ↗ (back to the full window) does nothing, and screen sharing doesn't work at all. Also asked for: call snapshots.
- **Mac mic + volume (likely root cause): `echoCancellation: 'all'`.** On macOS, Chromium does "all" with Apple's own voice processing (VPIO). VPIO captures the default input whatever was picked, and it ducks everything you hear. Mac now uses plain `true` (Chromium's AEC3); Windows keeps `'all'`. See `IS_MAC_APP` in `audioConstraints()`.
- **Exact devices:** new `getMic(id)` / `getCam(id)` open `deviceId: {exact}` and check `getSettings().deviceId`. If that fails they fall back to `echoCancellation: true`, then to any mic. The old `{ideal}` let the browser pick another mic. `getLocalMedia` now opens the mic and camera separately.
- **Devices switch the moment you pick them** (Settings selects → `setDevicePref` + `Call.switchMic/switchCam`, in or out of a call).
  - If the new mic won't open, or opens the wrong device, `switchMic` releases the old mic and tries again. If that fails too, it goes back to the old mic. It shows the mic's name in a toast.
  - Speakers apply to every media element and to the sound AudioContext.
- **Call volume (`Volume`):** a speaker button in the call controls (`#volBtn` → `#volPop`):
  - **Voice** sets `el.remote.volume` (stored as `callVolume`).
  - **Shared sound** sets `#screenAudio` and the friend's movie (stored as `sharedVolume`).
  - The same sliders are in Settings. Range 0–100 % (element volume, so echo cancellation still hears it). The movie bar's slider is the same as Shared sound when the movie is the friend's.
- **Mini window ↗ on Mac (root cause):** `setVisibleOnAllWorkspaces(true, {visibleOnFullScreen:true})` makes Electron call `app.dock.hide()`. That turned Parley into a menu-bar-only app while the mini window was open. The main window had been minimized *into* the Dock, so it could never come back.
  - Now it passes `skipTransformProcessType: true`. The `panel` window type floats over full-screen apps by itself.
  - On Mac, `showMain()` also does `dock.show()`, `app.show()`, `app.focus({steal:true})` and `moveTop()`.
  - `mini-expand` closes the mini window itself instead of relying on restore/show events.
  - `acceptFirstMouse: true`, so the first click on an inactive mini window counts.
- **Mac screen share:** most likely the unsigned-update problem. Every update has a new ad-hoc signature, so macOS stops honouring the old Screen Recording grant while the switch in System Settings still *looks* on (`getMediaAccessStatus('screen')` returns `denied`). Now:
  - The picker checks first (`screen-permission` IPC). If permission is denied it shows a **fix panel** (`ScreenFix`) instead of the screens.
    - **Fix it** runs `tccutil reset ScreenCapture com.daylen.parley` (and `AudioCapture`), then `getSources()` so macOS asks again.
    - **Restart Parley** uses the `relaunch-app` IPC.
    - The same panel is in Settings → App on Mac, and it opens by itself when a share fails while permission is missing.
  - On Mac, a timeout or NotAllowed while permission is missing stops the retry chain (no more 3 × 15 s wait).
  - Shared sound: Electron 45 uses CoreAudio taps. Without "System Audio Recording" permission the audio track arrives **ended**, with no error. We now drop ended tracks, share without sound, and say which switch to turn on.
  - An error in `startScreenAudio` can no longer stop the `screen` signal (the signal that tells the friend to show the screen).
  - The real fix for both is backlog #5 (a stable signing identity).
- **Call snapshots (`Snap`):** 📷 button in the controls, or Ctrl+Shift+P. The presser sends the signal `snap {snapId}`. **Each side captures its own** full-res screen and camera, and sends them as chat photos with `full: true` (no 2048 px shrink) and `file.snap = {id, what: 'screen'|'face', of}`.
  - Screen: `snapshot-screen` IPC → `desktopCapturer.getSources` with `thumbnailSize` set to the display's real pixel size. It uses the display Parley is on, or the screen being shared (`Call.screenSourceId`). Saved as PNG. On Mac it needs screen permission (otherwise it's skipped). The web version sends no screen.
  - Camera: only if it's already on. It uses `ImageCapture.takePhoto()` when the camera's photo size is bigger than the call video. Otherwise it raises the camera to its maximum with `applyConstraints` for about 0.7 s, grabs a frame, and restores the old constraints. Saved as JPEG 0.95. In the sandbox the call ran at 1280×720 and the snapshot came out at 3840×2160.
  - The presser's app saves everything to `Pictures/Parley Snapshots/<date time> - A & B/` (`save-snapshot` IPC), including the friend's pictures as they arrive, and shows an "Open folder" toast. Photos get captions like "Snapshot · Bob's camera · 3840×2160".
  - The other side always sees a flash and a toast. The setting **Call snapshots include my screen** (`snapScreen`, default on) leaves your screen out.
  - Server `cleanFileRef` now passes `snap` through (`cleanSnap`). Older clients ignore the signal and just see ordinary photos.
- **Toast fix:** a toast with a button kept `pointer-events: auto` after it hid, so an invisible toast could block the hang-up button. That's cleared on hide now, and during a call toasts sit above the call controls.
- **Tests:** new `tests/v14.js` (21 checks). Chromium's fake devices give 3 mics ("Fake Default Audio Input", "Fake Audio Input 1/2"), which is enough to test live switching. App settings in localStorage are prefixed `parley:`.

## Session 7 changes (v1.3.1)
- **Reacting made the chat jump (root cause found).** Three parts:
  - The scroll handler re-derived "stuck to bottom" from position on *every* scroll event, including the one our own `scrollToBottom()` causes. That event lands a frame later; if a photo or link card grew in between, it read as "you scrolled up" and the chat stopped following. Now `scrollToBottom` sets `S.autoScroll` (only if scrollTop really changed) and the handler finishes the job instead of unsticking. Before the fix, a link card at the bottom left the chat 226 px above the bottom; reacting made it 253.
  - Link cards attached a microtask after a rebuilt message (even when cached), i.e. after `scrollToBottom` had already measured. `Previews.done` (url → data) now attaches cached cards synchronously; the logo "small" probe result is cached on the data (`d._small`).
  - Reactions no longer `bump(m)`: `renderMessages` keeps a per-node `rx` key and `patchReactions()` swaps only the `.reactions` row in the existing node. No rebuild means the photo or card stays put.
  - **Manual scroll anchoring** (`Anchor`) while reading further up (`.messages` keeps `overflow-anchor: none`). It anchors on the first message that *starts* inside the view, captured at the top of `renderMessages` and on user scrolls, and restored after render and from the ResizeObserver when not stuck. Content changing above the view no longer moves what you're reading.
- **Settings always top right:** `#settingsBtn` now lives at the right end of the chat header, in and out of calls. The old `#callSettingsBtn` and the sidebar gear are gone. With no chat open, `#emptySettingsBtn` floats top right of the empty screen. New shortcut **Ctrl/⌘+,**.
- **One status indicator by your name:** the `.sdot` before "Online" is removed. The dot on your avatar is the indicator (same as contacts); the line under your name is just the word + chevron.
- **Teams-style link cards:** the card is now *inside* the bubble (`Previews.attach(b, url)`), laid out horizontally:
  - Left: a 132 px 16:9 thumbnail. Videos get a round dark play button; logos are shown as a contained square.
  - Right: the title (link color, 2 lines), then the channel (video) or description, then a site line with an icon.
  - The bubble is 360 px wide when it has a card. In a narrow chat (`@container chat (max-width: 520px)`, e.g. beside a call) the card stacks with the picture on top.
  - Long links in the text are shown tidied by `prettyUrl()`: YouTube `si`/`pp`/`feature` params are dropped, with a middle ellipsis past 52 chars. The `href` and tooltip stay the full URL.
  - Server `/preview` now also sends `author` and `domain`. YouTube `description` is still the channel, so 1.3.0 clients look the same.
- **Tests:**
  - New `tests/v131.js` (19 checks). It uses plain DOM clicks for reactions, because Playwright's clicks scroll the target into view and hide jumps.
  - `screens.js` adds a long YouTube link and an article card. `e2e.js` uses `#settingsBtn` in calls.
  - **Playwright 1.56** is needed for Electron 45; the 1.59 alpha bundled with @playwright/mcp can't attach.
  - Gotcha: `/preview` responses carry `Cache-Control: max-age=3600`, so Electron's HTTP cache (`~/.config/Parley/Cache`) can serve stale cards between runs. Delete `Cache`, `IndexedDB` and `WebStorage` there for clean screenshots.

## Session 6 changes (v1.3.0)
- **Watch-together audio (root fix): it was arriving in mono.** Chrome only decodes Opus as stereo when the *receiver's own* SDP says `stereo=1`; we only munged the remote description. `setLocal(pc, type)` now runs `tuneOpus` on our own offer/answer too (falls back to the plain description if Chromium ever refuses the munge, logged as "tuned local description refused"). Fixes screen-share sound too. Test: a left-only tone arrives as L≈0.088 / R=0.
  - Sharer's video no longer shows the browser's own controls; our media bar has ⏯, ±10 s and a **seek bar** for both sides (`media-ctl seekTo`, `media-state` now carries `t` and `d`, re-sent every 4 s while playing).
  - Drop a video file on the call to start watch-together.
- **Screen share keeps the camera.** The screen goes out as an extra track (`stream-role: 'screen'`, `screenSender`), camera stays on `videoSender` (dropped to 700 kbps while sharing). Receiver shows it in `#screenVideo` with stage class `has-screen` (same layout as `has-media`: tile top right). `screen` signal carries `separate: true`. v1.2 senders (screen in place of camera) still display correctly.
- **Layout:** contacts toggle at the **left** of the chat header, chat toggle at the **right** (in calls only, `#chatPanelBtn`, Ctrl+Shift+C), both with red unread badges. Chat toggle removed from the call controls. Chat panel resizable (drag its left edge, `chatWidth`). The contacts list folds away automatically when a call starts (`callLayout`) and comes back after, unless you toggled it yourself. Call controls shrink via a container query when the stage is narrow; hang-up is a wider pill set apart. (In 1.3.0 a ⚙ appeared in the call header during calls; 1.3.1 makes the header ⚙ permanent.)
- **Sign out moved into Settings** (Account section at the bottom).
- **Status (`Presence`):** online (green), away (yellow: manual, or automatic after 10 min of system idle via `powerMonitor.getSystemIdleTime`, or screen lock), busy/in a call (**red**, was yellow), dnd (red with bar: no message sound/notifications, ring is silent). Server accepts `online|away|busy|dnd`. Status menu by clicking your name.
- **Chat:**
  - Attachments (drop, paste, 📎) wait in a **tray** above the composer (× to remove, + to add) until Send. Text waits for the uploads so the receiver gets photo → caption in order.
  - **Reactions** (`react {to,id,emoji,on}`), **replies** (`reply {id,from,text}` on chat), **edit** (`edit {to,id,text}`, ↑ edits last), **delete for everyone** (`delete {to,id}`). Server relays and queues all of them for offline people (`deliver()`); chat-acks only for chats. Stored on messages as `reactions`, `reply`, `edited`, `deleted`; `rev` bumps re-render (edits/deletes; reactions patch in place since 1.3.1).
  - Hover bar (5 quick reactions, more, reply, ⋯) and right-click menus (messages, photos, contacts → Mark as unread).
  - **Link previews:** `GET /preview?url=` on the server (OG/Twitter tags, YouTube via oEmbed + i.ytimg.com thumbnail, picture inlined as a data URL ≤1.5 MB, private/internal IPs refused, redirects checked per hop, 6 h server cache). Client caches cards in IndexedDB (`lp:<url>`, 7 days) and misses for a day. Settings toggle.
  - **Save/copy photos:** hover ⤓, right-click Save / Save as… (`save-as` IPC → save dialog) / Copy image (`copy-image` IPC; Electron 45's main-process clipboard is the async web-style API, handled). Lightbox: Save, Save as…, Copy, ← →.
  - Formatting (`*bold*`, `_italic_`, `~strike~`, `` `code` ``, fenced blocks), **Ctrl+F search** in a chat, per-chat **drafts**, a "New messages" divider, missed calls with **Call back**, notifications that open the right chat (`open-chat` IPC).
- **Calls:** "You're muted" hint (watches a clone of the raw mic), hold Space to talk while muted, shortcuts (Ctrl/⌘+Shift + M/O/E/H/A/S/D/C), weak-connection flag from `getStats` (RTT + loss), green "speaking" ring when the camera is off, self-view draggable to any corner (`selfCorner`).
- **Mini window:** 28 px controls, hang-up a wider red pill 12 px+ away from mic/camera, back-to-window button moved to the top-right corner, self-view bottom right, shows the shared screen when there is one, new hang-up icon (a handset lying down).
- **Desktop app:** right-click menu for text (cut/copy/paste + spelling fixes, copy link), Windows menu bar hidden (`autoHideMenuBar`; Alt shows it).

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
  - The client shrinks photos to ≤2048 px (WebP if alpha, else JPEG). GIFs are kept as-is. (Call snapshots skip this: `full: true`.)
  - XHR upload with progress, retry on failure. Everything sent or received is cached in IndexedDB (`f:<localId>`, `file:<id>`), and photos auto-download.
  - Desktop saves files into Downloads with Open / Show in folder (`save-download` IPC). Lightbox for photos. Drag & drop, paste, 📎.
  - Messages carry a text fallback, so v1.1 clients show "📷 Photo" / "📎 name".
- **Emoji & stickers:** a picker with 9 categories plus recently used. A message that is only 1–3 emoji shows large.
  - Stickers: 18 built-in **Pip** stickers, an original blob drawn in SVG (`renderer/stickers.js`), sent by id.
  - Plus "your own" stickers: any image or GIF, ≤320 px, stored in IndexedDB, sent as a file with `sticker:true`.
- **Profile pictures:** a 256 px JPEG data URL (≤110 KB) sent with `profile`. The server keeps it in memory and puts `avatarRev` in presence. Clients fetch it with `get-avatar` and cache it in localStorage. A client re-sends its own picture after a server restart.
- **Color schemes:** `THEMES` in app.js set CSS variables (all colors are variables now): Midnight, Daylight, Graphite, Ocean, Forest, Sunset, Grape, Rose, Black, plus Match system. `nativeTheme` follows, so the Windows title bar matches.
- **UI polish:** a full styles.css rewrite with a gradient avatar fallback, search icon, pill composer, nicer empty state and login, softer modals and animations.

## File map
```
package.json, package-lock.json   ← server deps (root, so Railway finds them)
server/server.js                  ← presence/status, chat relay + offline queue (react/edit/delete too), read receipts, avatars, /files, /preview, /updates proxy, signaling
app/package.json                  ← Electron 45, electron-builder 26, electron-updater 6, version 1.4.0
app/main.js                       ← window, tray, mini window, permissions (+ Mac screen-permission fix), screen picker + loopback modes, snapshot screenshots, updater, log, link browser
app/preload.js                    ← contextBridge API (window.parley)
app/assets/                       ← icon.png, tray(.png|-unread), trayTemplate(@2x), trayUnreadTemplate(@2x)
app/renderer/index.html|styles.css|app.js|emoji.js|stickers.js
app/renderer/vendor/noise/        ← rnnoise/gtcrn worklets + wasm, LICENSE
app/build/icon.png, entitlements.mac.plist
.github/workflows/build-desktop.yml
tests/                            ← harness.js, e2e.js (36), v12.js (40), v13.js (53), v131.js (19), v14.js (21), screens.js, repro-screen.js, README.md
```

## Key decisions
- WebRTC "perfect negotiation": the caller is impolite and the callee polite. The callee doesn't offer until the first offer arrives.
- Every call always has one audio and one video sender (placeholders + `replaceTrack`). Extra streams are announced with `stream-role`.
- **Don't add `setPermissionCheckHandler`**: it made `desktopCapturer.getSources()` return 0 sources.
- Tests run Electron **without** `--use-fake-ui-for-media-stream` (it bypasses our handlers). The old suite sets `autoHideUi=false` so the robot can click call buttons.
- The mini window must be opened by the renderer, because only a `window.open` child can share MediaStreams. Main triggers it with `executeJavaScript('window.__parleyMini.open()', true)`.
- Updates go through our server, not straight to GitHub, so the repo can go private.
- **Munge our own SDP too** (`setLocal`), not just the remote one: stereo receive depends on the local description.
- Screen share is a separate track (not `replaceTrack` on the camera) so the camera keeps going.
- Link previews are fetched by the server, never by the app (keeps the app's CSP tight: `img-src 'self' data: blob:`).
- Attachments never auto-send; the tray is per conversation (in memory).
- **Only the user unsticks the chat.** Our own scroll-to-bottom never counts as "scrolled up" (`S.autoScroll`). Reactions patch their row in place instead of rebuilding the message.
- Settings has exactly one home: top right.
- **Mac: never `echoCancellation: 'all'`** (it switches on macOS voice processing: wrong mic, ducked volume).
- **Mac: always call `setVisibleOnAllWorkspaces` with `skipTransformProcessType: true`** (otherwise the Dock icon disappears and a minimized window can't come back).
- Devices are opened with `{exact}` and checked; never `{ideal}`.
- Snapshots are captured by each person on their own computer (the only way to get full resolution). A camera that's off is never turned on for one.

## To verify on real hardware (v1.4.0), Mac first
1. **Mac, after auto-updating to 1.4.0:** press Share screen. If the fix panel shows, press Fix it → Allow → Restart Parley, then share again. Does the friend see the screen? If not, send `parley.log` (look for `screen permission`, `tccutil reset`, `screen share attempt failed`).
2. **Mac shared sound:** does the friend hear it? If the toast says macOS didn't allow it: System Settings → Screen & System Audio Recording → "System Audio Recording Only" → Parley on, then restart.
3. **Mac mic:** Settings → Microphone → pick another one during a call. The toast shows its name and the friend hears the new mic. Log line: `mic opened: <name> (echo: browser)`.
4. **Mac volume:** speaker button in the call. The Voice slider changes the friend's loudness. System volume keys should work normally again, and other apps shouldn't get quieter during calls any more.
5. **Mac mini window:** minimize during a call → ↗ (or double-click) brings the full window back. The Dock icon stays the whole time. One click on mute works even when Parley isn't the front app.
6. **Snapshot** Windows ↔ Mac: four pictures in the chat (screen at full display size, e.g. 2560×1440 or 3024×1964; camera at the webcam's max), and the folder in Pictures/Parley Snapshots on the presser's computer. Check the call video doesn't stay at high resolution / low frame rate afterwards.
7. **Echo on Mac with speakers** (no headphones): the Mac now uses Chromium's echo canceller instead of macOS's. The friend shouldn't hear themselves.

## To verify on real hardware (v1.3.1)
1. **Auto-update to 1.3.1** on each computer (Settings → Check for updates).
2. Paste a YouTube link: a compact card inside the bubble (thumbnail + play, title, channel, "YouTube"). Shrink the chat beside a call: the card stacks.
3. React to a YouTube card or photo at the bottom of a chat: the chat stays at the bottom. Scroll up a bit and react: nothing moves.
4. ⚙ at the top right with no chat open, in a chat, and in a call; Ctrl+, (⌘, on Mac) opens Settings.
5. Your name shows one dot (on your picture) and just the word "Online" / "Away" / "Do not disturb".

## To verify on real hardware (next family test, v1.3.0)
1. **Auto-update to 1.3.0** on each computer (Settings → Check for updates, or wait up to 3 h). Mac: does it reopen, and does it re-ask for permissions?
2. **Watch together** with music-heavy video and headphones: stereo (instruments left/right), no echo, seek bar works from both sides.
3. **Screen share**: friend sees the screen big **and** your camera in the corner.
4. Drag a photo in → it waits → add a caption → Send. Right-click a photo → Save as… / Copy image (paste it into Paint/Preview).
5. Paste a YouTube link → thumbnail + title on both sides.
6. Reactions, reply, ↑ to edit, delete; Ctrl+F; status menu (Do not disturb silences messages); walk away 10 min → others see yellow Away.
7. Mini window: smaller controls, hang-up apart, ↗ top-right goes back.

## Earlier checklist (v1.2.0)
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
5. **Mac: a stable self-signed signing identity in CI so permissions survive updates** (or a paid Apple cert). This is now the most useful non-security item: until it's done, every update costs Mac users the screen-recording permission (1.4.0 makes getting it back one click and a restart).
6. ~~Message reactions, reply-to, edit/delete; seeking bar for the watch-together viewer~~ (done in 1.3.0).
7. Browser version: auto PiP when switching tabs. Security: end-to-end encrypted chat.
7b. Nice-to-haves seen in Skype/Teams but not done yet: GIF search, voice messages, pinned chats, quick reply from the notification, "Delete for me", play YouTube inline from the card (Teams does this).
8. Optional "both have the file" synced playback mode for watch-together (full quality, no streaming).
9. Nice-to-haves: group calls (LiveKit), paid code signing, bump Actions to checkout/setup-node v5, call volume above 100 % (WebAudio gain), a combined "both of us" snapshot image.

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
