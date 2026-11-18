# Parley

A private, Skype-style app for you and your people. It has:

- **Video and voice calls** (1-on-1, peer-to-peer, echo cancellation, high-quality Opus audio)
- **AI background-noise removal**: keyboards, fans, TV, kids and dogs are filtered out of your mic (RNNoise or GTCRN, running on your own computer)
- **Chat** with read receipts ("Seen"), typing indicator, emoji, stickers, **photos and files** (drag, paste or 📎: they wait above the message box until you press Send, so you can add a caption or change your mind), and messages to friends who are offline (delivered when they sign in)
- **Reactions** on any message or photo (👍 ❤️ 😂 … or any emoji), **replies** that quote the message, **edit** and **delete for everyone**, *bold* / _italic_ / `code` formatting, and **search in a chat** (Ctrl+F)
- **Link previews**, Teams-style: paste a YouTube link and a neat card appears inside the message (thumbnail with a play button, title, channel); other sites show their picture, headline and a line of description. Long links are shown tidied up
- **Save or copy photos**: hover a photo for Save, or right-click for Save / Save as… / Copy image; the photo viewer has the same, plus ← → to flip through
- **Status**: green Online, yellow Away (by itself after 10 minutes away from the computer, or by choice), red In a call, and Do not disturb (no message sounds or pop-ups; calls ring silently)
- **Profile pictures** and **color schemes** (Midnight, Daylight, Graphite, Ocean, Forest, Sunset, Grape, Rose, Black, or match your system)
- **Floating mini window**: minimize Parley (or close it to the tray) during a call and a small always-on-top video of the other person stays on screen, even over fullscreen videos. Drag it anywhere, resize it from any corner.
- **Screen sharing with computer sound**: pick a whole screen or a single window, and share what your computer is playing (YouTube, Spotify, a game) *without* sending your friend's own voice back to them. Your friend still sees your camera in the corner while you share.
- **Watch together**: pick a video file (or drop it on the call) and it streams live to your friend in stereo, while you both keep your cameras and chat. Either of you can pause, skip ±10 s, or drag the seek bar.
- **Call controls that get out of the way**: they fade after a few seconds without the mouse; double-click for full screen. The contacts list folds away during a call to give the video room, and comes back afterwards.
- **Call niceties**: a "You're muted" warning if you talk while muted, hold Space to talk while muted, keyboard shortcuts (Ctrl+Shift+M mute, Ctrl+Shift+O camera, …), a weak-connection warning, a "speaking" ring when the camera is off, a self-view you can drag to any corner, and "Call back" on missed calls
- **Runs in the background** (tray / menu-bar icon) so calls and messages still arrive when the window is closed; can start with your computer
- **Updates itself**: new versions download in the background; press Restart when it says one is ready
- **Your own ringtone**, **open links in the browser you choose**, **hideable contact bar**
- **Mac and Windows** desktop app. It also runs in Chrome or Edge at your server's URL, so a friend can join without installing anything.

```
 ┌──────────────┐   presence, chat, photos/files, call setup, updates   ┌──────────────┐
 │ Parley (Mac) │ ◀─────────────────── Parley server ─────────────────▶ │ Parley (Win) │
 └──────┬───────┘                    (Node, on Railway)                 └──────┬───────┘
        │                                                                      │
        └─────────────────── video / audio / screen / movie ───────────────────┘
                              direct peer-to-peer (WebRTC)
```

The server passes small messages back and forth and holds photos/files until they're picked up. Video never goes through it, so it costs almost nothing to run.

---

## 1. Deploy the server (Railway)

1. Push this whole folder to a GitHub repo.
2. In Railway: **New Project → Deploy from GitHub repo**, then pick the repo. It finds the root `package.json` and runs `npm start`.
3. Under **Variables**, add:
   | Variable | Value |
   |---|---|
   | `ACCESS_CODE` | A passcode you share with friends and family. **Set this**, or anyone with the URL can sign in. |
4. **Settings → Networking → Generate Domain.** You'll get something like `https://parley-production.up.railway.app`.
5. Check it: opening `https://<your-domain>/health` should show `{"ok":true,...}`.

Later pushes to the repo redeploy automatically.

### Optional variables
| Variable | What it does |
|---|---|
| `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` | A TURN relay for networks that can't connect directly (see below) |
| `FILES_DIR` | Where sent photos/files are kept. Default is a temp folder that's wiped on every redeploy. For files that survive redeploys, add a **Railway Volume** (e.g. mounted at `/data`) and set `FILES_DIR=/data/files`. |
| `MAX_FILE_MB` | Biggest file you can send (default 100) |
| `FILE_TTL_DAYS` | How long sent files stay downloadable (default 30). Photos are also kept on each computer that saw them. |
| `GITHUB_REPO` | Where updates come from (default `deedubbelyuu/parley`) |
| `GITHUB_TOKEN` | **Needed for updates once the repo is private.** A fine-grained token with read access to the repo's *Contents*. |
| `LINK_PREVIEWS` | Set to `0` to turn off link previews. When on, the server fetches the page of a link someone sends (never private/internal addresses) to get its title and picture. |

### TURN server (optional but recommended)
Most home networks connect directly. Some, like strict office Wi-Fi, some mobile hotspots and carrier-grade NAT, can't, and those calls fail with *"Couldn't connect…"*. A TURN server relays the call in that case. Get credentials from any TURN provider (Metered, Twilio, Cloudflare, or your own `coturn`) and add these to Railway:

```
TURN_URLS=turn:your.turn.host:80,turns:your.turn.host:443?transport=tcp
TURN_USERNAME=...
TURN_CREDENTIAL=...
```

---

## 2. Get the desktop app

### Option A: let GitHub build it (no Mac or PC setup needed)
The repo includes `.github/workflows/build-desktop.yml`.
- Push a tag (`git tag v1.2.0 && git push --tags`). After about 10 minutes the installers (`.dmg` for Mac, `.exe` for Windows) are attached to a GitHub Release you can send people a link to. **Releases are also how updates reach everyone** (see below).
- Or **GitHub → Actions → "Build desktop app" → Run workflow** and download from the run's **Artifacts**.

### Option B: build or run locally
```bash
cd app
npm install
npm start            # run it right away, no installer
npm run dist:mac     # on a Mac     → app/dist/Parley-<version>-universal.dmg (+ .zip for updates)
npm run dist:win     # on Windows   → app/dist/Parley-Setup-<version>.exe
```
Each OS has to build its own installer.

### First launch
The builds aren't signed with a paid Apple or Microsoft certificate, so each OS warns once:
- **Mac:** if it says the app "can't be opened", go to **System Settings → Privacy & Security** and click **Open Anyway**. If it says the app is "damaged", run `xattr -cr /Applications/Parley.app` in Terminal once. Keep Parley in **Applications** so it can update itself.
- **Windows:** SmartScreen shows **More info → Run anyway**.

Mac also asks for **Camera** and **Microphone** permission on the first call. The first time you share your screen it asks for **Screen & System Audio Recording**. Allow it, then restart Parley.

Sign in with your **server address** (the Railway domain), **your name**, and the **access code**.

### Updates
From v1.2.0 on, Parley checks your server for a newer GitHub Release about 20 seconds after signing in and every 3 hours (or **Settings → Check for updates**). It downloads in the background and shows **"Parley x.y.z is ready · Restart"** at the bottom of the contact list. To ship an update: bump `version` in `app/package.json`, commit, tag `v<version>`, push the tag.
- **Windows** installs silently and reopens Parley.
- **Mac** swaps the app in place and reopens it. Because the app isn't signed with a paid Apple certificate, macOS may ask for camera, microphone and screen-recording permission again after an update.
- Versions before 1.2.0 can't update themselves: install 1.2.0 by hand once.

---

## 3. Using it

| | |
|---|---|
| **Call** | Open a contact, then the phone icon (voice) or camera icon (video) |
| **Chat** | Type and press Enter (Shift+Enter for a new line). 😊 opens emoji and stickers; 📎 adds photos or files, or drag them onto the chat, or paste a screenshot. They wait above the message box (× removes one) until you press Send. Ticks show sent ✓, delivered ✓✓ and **Seen**. Formatting: `*bold*`, `_italic_`, `~strike~`, `` `code` ``. |
| **React, reply, edit, delete** | Hover a message for quick reactions, ↩ Reply and ⋯ More, or right-click it. Click a reaction to add or take back yours. ↑ in an empty message box edits your last message. Click a quote to jump to the original. |
| **Search** | The 🔍 in the chat header, or **Ctrl+F**. Enter goes to older matches, Shift+Enter to newer. |
| **Save a photo** | Hover it and click ⤓ (goes to Downloads), or right-click: **Save image**, **Save image as…**, **Copy image**. Click a photo to open the viewer; ← → flips through the chat's photos. |
| **Status** | The dot on your picture shows your status. Click your name (top left): **Available** (turns yellow "Away" by itself when you step away), **Appear away**, or **Do not disturb**. During a call everyone sees red "In a call". |
| **Stickers** | 😊 → **Stickers**: Pip the blob, plus **+ Add your own** (any picture or GIF; transparent PNGs look best) |
| **Profile picture** | Click your own picture (top left), or **Settings → Profile** |
| **Mini window** | Minimize Parley during a call, close it to the tray, or press the mini-window button. Drag it anywhere; resize from any corner or edge; double-click it (or the ↗ button at its top right) to go back. It stays above fullscreen videos and browsers. |
| **Full screen** | The full-screen button in the call, or double-click the video. Your friend's camera stays visible while you watch something together. Esc to leave. |
| **Share screen** | Click the monitor button and pick a screen or window. Leave **Share computer sound** ticked to include what your computer is playing. Your camera keeps going, so your friend sees your screen big and you in the corner. Click the button again to stop. |
| **Watch together** | Click the film button and choose a video file, or drop one onto the call. Your friend sees and hears it live, in stereo. Either of you can use ⏯, ±10 s and the seek bar. Each of you has your own volume slider. "Stop sharing" ends it. |
| **Hide contacts / chat** | The button at the **left** of the chat header (or **Ctrl+B**, ⌘B on Mac) folds the contacts list away. During a call, the button at the **right** end hides or shows the chat (**Ctrl+Shift+C**); drag the chat's left edge to make it wider. A red number on either button means there are messages you haven't seen. |
| **Keyboard shortcuts** | Settings → **Keyboard shortcuts** lists them all: Ctrl+, Settings, Ctrl+Shift+M mute, hold Space to talk while muted, Ctrl+Shift+O camera, Ctrl+Shift+E share screen, Ctrl+Shift+H hang up, Ctrl+Shift+A / S answer, Ctrl+Shift+D decline (⌘ instead of Ctrl on Mac). |
| **Background** | Closing the window keeps Parley running by the clock (Windows) / in the menu bar (Mac). Right-click that icon → **Quit Parley** to really quit. |
| **Settings (⚙)** | Always at the top right (the end of the chat header), or **Ctrl+,**. Profile picture. **Color scheme**. Camera, mic and speakers (they also switch mid-call). **Background noise removal** with a **Hear yourself** test. **Call audio quality**. Auto-hide call buttons. **Read receipts**, **link previews** and **message sound** on/off. **Ringtone**. **Keep running in the background / start with your computer**. **Check for updates**. **Open links in** (desktop app). **Open log file** for troubleshooting. **Keyboard shortcuts**. **Sign out** (at the bottom). |
| **Browser** | Friends can open your Railway URL in Chrome or Edge instead of installing. |

Watch-together plays whatever Chromium can play: **.mp4 (H.264/AAC)** and **.webm** are safest. Some `.mkv` and HEVC files won't play. Convert them first with HandBrake or `ffmpeg -i in.mkv -c:v libx264 -c:a aac out.mp4`.

---

## Known limits (and why)

- **Shared computer sound without echo** needs **Windows 10 22H2 / Windows 11** or **macOS 14.2+**. There, the OS leaves everything Parley plays (your friend's voice) out of what you share. On older systems Parley can't separate them, so it uses an *echo guard* instead: the shared sound dips while your friend talks. The screen picker tells you which one you'll get.
- **Computer sound** at all needs Windows 10/11 or macOS 13+ (best on 14.2+). Older systems share the picture without sound and show a message.
- **Headphones help** when sharing sound: your mic may still pick up a little of the video from your speakers.
- **The mini window can't cover games in "exclusive fullscreen" mode** (nothing can). Borderless/windowed fullscreen, browsers and video players are fine.
- **Background-noise removal**: *Standard* (RNNoise) keeps your voice full-quality and removes most noise. *Strong* (GTCRN) removes more, like TV and music, but your voice sounds a little less crisp. Use *Hear yourself* in Settings, with headphones, to compare.
- **One-on-one calls only.** Group calls need a media server (an SFU such as LiveKit). That's a reasonable v2.
- **Chat history is stored on each device.** The server holds undelivered messages in memory, and photos/files on disk for 30 days; without a Railway Volume both are lost on redeploy (photos you already saw stay on your computer).
- **Netflix, Disney+ and other DRM sites** show black when screen-shared; YouTube and most other sites work, sound included.
- **Some sites don't allow link previews** (Instagram, X/Twitter and others that block bots). Those links still work, they just don't get a card.
- **Both people need 1.3 or newer** for "screen + camera" sharing, reactions, replies and edits. Auto-update takes care of that within a few hours of a release.

## Troubleshooting

The desktop app keeps a log at `%APPDATA%\Parley\parley.log` (Windows) or `~/Library/Application Support/Parley/parley.log` (Mac). **Settings → Open log file** opens it. Screen-share sound (which capture mode was used), noise removal, updates and file transfers are written there.

## Project layout

```
package.json             ← server deps; Railway runs `npm start`
server/server.js         ← presence, chat relay + offline queue (reactions, edits, deletes too), read receipts,
                           profile pictures, photo/file hand-off, link previews, update proxy, call signaling,
                           serves the web version
app/                     ← Electron desktop app
  main.js                ← window, tray/background, mini window, screen picker + system sound,
                           permissions, notifications, auto-update
  preload.js             ← safe bridge between UI and main process
  assets/                ← app + tray icons
  renderer/              ← UI + all calling/chat logic (also served to browsers)
    emoji.js, stickers.js← emoji list and the built-in "Pip" stickers (SVG)
    vendor/noise/        ← AI noise-removal worklets + WASM (@sapphi-red/web-noise-suppressor, MIT)
  build/                 ← app icon, macOS entitlements
.github/workflows/       ← builds Mac .dmg/.zip + Windows .exe and attaches them (and update files) to the Release
tests/                   ← end-to-end tests (Electron ↔ Chrome), see tests/README.md
```
