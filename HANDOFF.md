# Parley: session handoff

**Updated:** 2026-11-14 (after session 4: fixes from first family test)
**Use:** personal and family only. Not a product.
**Status:** v1.1.0 code is ready in the local repo; push and tag to build. Screen sharing had a confirmed root cause and is fixed. It's verified end to end in a Linux sandbox, but not yet on real Windows or Mac hardware.

## Where things live
| What | Where |
|---|---|
| Repo | github.com/deedubbelyuu/parley (temporarily **public** so family can download installers) |
| Local copy | `C:\Users\DW\Documents\parley` (Windows PC, PowerShell) |
| Server | Railway, auto-deploys from `main`. Env: `ACCESS_CODE` (required); `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` (optional) |
| Installers | GitHub Release for each `v*` tag (`.dmg` + `.exe`), built by `.github/workflows/build-desktop.yml` |
| App log | `%APPDATA%\Parley\parley.log` / `~/Library/Application Support/Parley/parley.log`; Settings → Open log file |

## How Claude works on this repo
The cloud session can **clone the public repo read-only**. It can't push: the GitHub push attach was refused. With the desktop app linked, Claude writes changed files straight into `Documents\parley` through the folder bridge, and Daylen runs `git add/commit/push` and tags. If the repo goes private, Claude will need the repo added via claude.ai GitHub integration, or work only through the local folder.

## Session 4 changes (v1.1.0)
- **Screen share root cause:** `setPermissionRequestHandler` only allowed `media`, so Electron's separate **`display-capture`** permission was denied. `getDisplayMedia()` failed with NotAllowedError before the display-media handler ran, and the Windows build showed no error. The fix allows `display-capture`. Confirmed in the log as `permission denied: display-capture` when it's removed. **Don't add `setPermissionCheckHandler`**: it made `desktopCapturer.getSources()` return 0 sources.
- **Why v1.0.0 tests missed it:** `--use-fake-ui-for-media-stream` auto-grants screen capture and bypasses our handlers. The Electron side of the tests now runs without it.
- Screen share hardening: the handler grants the picked `{id, name}` directly instead of re-listing sources, because IDs differ between calls (seen: `screen:400:0` vs `screen:-3:0`). Other changes:
  - Capture attempts go: sound with our constraints → sound with defaults → picture only.
  - 15 s timeout.
  - Visible error toast on every OS.
  - Red **"You're sharing your screen"** banner with a Stop button.
  - Retry when `getSources` returns empty.
- **AI noise removal:** `@sapphi-red/web-noise-suppressor` 0.4.1 is vendored in `renderer/vendor/noise`.
  - Modes: *Standard* = RNNoise (full band, default), *Strong* = GTCRN (removes more but runs at 16 kHz internally, so voice is less crisp), *Off* = Chromium NS only.
  - The mic path is: raw track → 48 kHz AudioContext → worklet → `MediaStreamDestination` (mono) → sent. The processed track carries `_raw`, `_noise` and `_cleanup`.
  - The native `noiseSuppression` filter is turned off when AI mode is on.
  - The mode switches live mid-call (`Call.rebuildMic`).
  - CSP needs `'wasm-unsafe-eval'`.
  - Tested: pink noise is about 97% quieter.
- **Audio quality:** `tuneOpus()` rewrites the *remote* SDP.
  - The first audio m-section (mic) is mono at `maxaveragebitrate` 64k.
  - Later sections (screen sound, movie) are stereo at 192k.
  - FEC is on and DTX off.
  - `setAudioParams` sets the sender `maxBitrate` and high priority.
  - Presets: Data saver (24/64k), High (64/192k, default) and Maximum (128/320k).
  - Tested: movie audio measured 193 kbps stereo.
- **Watch together:** both sides get ⏯ and ±10 s (`media-ctl` and `media-state` signals). Other changes:
  - Receiver `jitterBufferTarget` is 400 ms for the movie.
  - Video is capped at 6 Mbps with `maintain-framerate`.
  - A clear error if `captureStream` gives no tracks.
  - The movie toolbar moved to the bottom, full width; it used to be crushed to about 240 px.
- **Ringtones:** 7 generated tones plus a custom file (stored as a Blob in IndexedDB `parley/files/ringtone`), with volume and preview. Ringtones play on the chosen speaker.
- **Open links in:** main detects browsers.
  - Windows: from registry `StartMenuInternet` (HKCU and HKLM) plus known paths.
  - Mac: `/Applications/*.app`.
  - The chosen browser is launched directly, with fallback to `shell.openExternal`.
- **Contact bar:** toggle button plus Ctrl/⌘+B, persisted.
- **Log file** in main (rotates at 1 MB). Renderer `log()` → IPC.

## File map
```
package.json, package-lock.json   ← server deps (root, so Railway finds them)
server/server.js                  ← presence, chat relay + offline queue, signaling, ICE config, serves web version
app/package.json                  ← Electron 45, electron-builder 26, version 1.1.0
app/main.js                       ← window, PiP/compact, permissions, screen picker + display-media handler, log file, link browser
app/preload.js                    ← contextBridge API (window.parley)
app/renderer/index.html|styles.css|app.js  ← UI + call/chat logic (also served to browsers)
app/renderer/vendor/noise/        ← rnnoise/gtcrn worklets + wasm, LICENSE
app/build/icon.png, entitlements.mac.plist
.github/workflows/build-desktop.yml
tests/                            ← harness.js, e2e.js (36 checks), screens.js, repro-screen.js, README.md
```

## Key decisions (unchanged from v1.0)
- WebRTC "perfect negotiation": the caller is impolite and the callee polite. The callee doesn't offer until the first offer arrives.
- Every call always has one audio and one video sender. Placeholder tracks plus `replaceTrack` handle mic swaps, camera and screen.
- Extra streams (screen sound, movie) are announced with `stream-role` before their tracks are added.
- Mini window: PiP on minimize, with a fallback to a 380×240 always-on-top window.
- Computer sound: `audio: 'loopback'` plus `restrictOwnAudio`. If it isn't confirmed, the echo guard ducks the shared sound while the friend talks.

## Tested (Linux sandbox, Electron 45 ↔ Chrome, real display-media handler)
36/36 in `tests/e2e.js`:
- Chat and links in the chosen browser.
- Sidebar toggle and persistence.
- Custom and built-in ringtones; the ringtone stops on answer.
- Noise removal: both modes, switching live, off, and mute.
- Opus fmtp.
- Screen share: banner, remote indicator, remote picture, log entries, Stop, and picker cancel.
- Watch-together: picture, stereo bitrate, remote pause/skip/resume, and stop.
- Hang-up and mic release.

**Not testable in the sandbox:** loopback computer sound (Linux has none), Windows browser registry on a real machine, and Mac permissions.

## To verify on real hardware (next family test)
1. Screen share on Windows: the banner appears, and the friend sees the screen **and hears computer sound**. Does the toast say "Echo guard on"? If anything fails, send `parley.log`.
2. Same on Mac: first-time Screen & System Audio Recording permission, then restart Parley.
3. Noise removal: type on a keyboard or run a fan during a call. Compare Standard and Strong with Hear yourself.
4. Watch together with a real movie: smoothness, and pause/skip from the viewer's side.
5. Ringtone: custom file plays on incoming calls.
6. Open links in: the list shows the installed browsers, and links open in the chosen one.

## Backlog (priority order)
1. **Security: per-person passwords** (names locked to a password; close the "same name kicks the old session" hole). Needs Postgres on Railway.
2. **Security: limit sign-in attempts** for the access code.
3. **Security: call safety code** (4 emoji from both DTLS fingerprints).
4. Browser version: auto PiP when switching tabs.
5. Security: end-to-end encrypted chat.
6. Postgres-backed chat history and offline queue (currently in-memory, lost on redeploy).
7. Optional "both have the file" synced playback mode for watch-together (full quality, no streaming).
8. Nice-to-haves: images and files in chat, group calls (LiveKit), auto-update (electron-updater), paid code signing, bump Actions to checkout/setup-node v5.

## Deployment lessons
- After `winget install`, refresh `$env:Path` or open a new PowerShell window (a new tab isn't enough).
- **Always extract zips into `Documents`**, not `Documents\parley`, or everything nests as `parley/parley`.
- `gh auth login --web --scopes workflow` is needed to push `.github/workflows` files.
- `gh run watch <id>` / `gh run view <id>`; plain `gh run watch` only lists runs that have started.

## Going private, later
- Download links stop working for anyone else. Share installers via Drive or Dropbox.
- Installed apps keep working, and Railway keeps deploying.
- Private repos use GitHub's limited free Actions minutes, and macOS minutes count much higher.
- `gh repo edit --visibility private --accept-visibility-change-consequences`
