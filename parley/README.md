# Parley

A private, Skype-style app for you and your people. It has:

- **Video and voice calls** (1-on-1, peer-to-peer, echo cancellation and noise suppression on)
- **Text chat**, including messages to friends who are offline (delivered when they sign in)
- **Floating mini window**: minimize Parley during a call and a small always-on-top video of the other person stays on screen
- **Screen sharing with computer sound**: pick a whole screen or a single window, and optionally share what your computer is playing (YouTube, Spotify, a game), with echo protection
- **Watch together**: pick a video file and it streams live to your friend, sound included, while you both keep your cameras and chat
- **Mac and Windows** desktop app. It also runs in Chrome or Edge at your server's URL, so a friend can join without installing anything.

```
 ┌──────────────┐        presence, chat, call setup        ┌──────────────┐
 │ Parley (Mac) │ ◀──────────── Parley server ───────────▶ │ Parley (Win) │
 └──────┬───────┘         (Node, on Railway)               └──────┬───────┘
        │                                                         │
        └──────────── video / audio / screen / movie ─────────────┘
                     direct peer-to-peer (WebRTC)
```

The server only passes small messages back and forth. Video never goes through it, so it costs almost nothing to run.

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

### Optional but recommended: TURN server
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
- **GitHub → Actions → "Build desktop app" → Run workflow.** After about 10 minutes, download `Parley-mac` (`.dmg`) and `Parley-windows` (`.exe`) from the run's **Artifacts**.
- Or push a tag (`git tag v1.0.0 && git push --tags`) and the installers get attached to a GitHub Release you can send people a link to.

### Option B: build or run locally
```bash
cd app
npm install
npm start            # run it right away, no installer
npm run dist:mac     # on a Mac     → app/dist/Parley-1.0.0-universal.dmg
npm run dist:win     # on Windows   → app/dist/Parley Setup 1.0.0.exe
```
Each OS has to build its own installer.

### First launch
The builds aren't signed with a paid Apple or Microsoft certificate, so each OS warns once:
- **Mac:** if it says the app "can't be opened", go to **System Settings → Privacy & Security** and click **Open Anyway**. If it says the app is "damaged", run `xattr -cr /Applications/Parley.app` in Terminal once.
- **Windows:** SmartScreen shows **More info → Run anyway**.

Mac also asks for **Camera** and **Microphone** permission on the first call. The first time you share your screen it asks for **Screen & System Audio Recording**. Allow it, then restart Parley.

Sign in with your **server address** (the Railway domain), **your name**, and the **access code**.

---

## 3. Using it

| | |
|---|---|
| **Call** | Open a contact, then the phone icon (voice) or camera icon (video) |
| **Mini window** | Minimize Parley during a call. You get a floating video of your friend (or their shared movie). The ▣ button does the same. Double-click the mini window, or press ⤢, to return. |
| **Share screen** | Click the monitor button and pick a screen or window. Leave **Share computer sound** ticked to include what your computer is playing. Click the button again to stop. |
| **Watch together** | Click the film button and choose a video file. You control play, pause and seek. Your friend sees and hears it live, with a volume slider. "Stop sharing" ends it. |
| **Devices** | The ⚙ gear picks camera, mic and speakers, and works mid-call too. |
| **Browser** | Friends can open your Railway URL in Chrome or Edge instead of installing. |

Watch-together plays whatever Chromium can play: **.mp4 (H.264/AAC)** and **.webm** are safest. Some `.mkv` and HEVC files won't play. Convert them first with HandBrake or `ffmpeg -i in.mkv -c:v libx264 -c:a aac out.mp4`.

---

## Known limits (and why)

- **Computer sound needs Windows 10/11 or macOS 14.2 (Sonoma) or newer.** Older systems share the picture without sound and show a message.
- **Echo guard:** Parley asks the OS to leave its own sound (your friend's voice) out of the shared sound. If the system can't confirm that, Parley turns on an *echo guard* instead: the shared sound briefly dips while your friend is talking, so they never hear themselves. You'll see a message when it's on.
- **Headphones help** when sharing sound. Parley tells your mic to ignore everything your computer plays, but on some systems the mic may still pick up a little of the video from your speakers.
- **One-on-one calls only.** Group calls need a media server (an SFU such as LiveKit). That's a reasonable v2.
- **Chat history is stored on each device.** The server holds messages for offline friends in memory only, so a redeploy drops anything still undelivered. Adding Postgres to the server would fix this.
- **Netflix, Disney+ and other DRM sites** show black when screen-shared; YouTube and most other sites work, sound included.

## Project layout

```
package.json             ← server deps; Railway runs `npm start`
server/server.js         ← presence, chat relay + offline queue, call signaling, serves the web version
app/                     ← Electron desktop app
  main.js                ← window, mini-window/PiP, screen picker, permissions, notifications
  preload.js             ← safe bridge between UI and main process
  renderer/              ← UI + all calling/chat logic (also served to browsers)
  build/                 ← app icon, macOS entitlements
.github/workflows/       ← builds Mac .dmg + Windows .exe
```
