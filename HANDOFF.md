# Parley — session handoff

**Date:** 2026-11-13
**Status:** v1 working. Tested end to end, not yet deployed or installed on a real Mac or PC.

## What exists
- `server/server.js` (Node, Express 5, ws 8): sign-in with `ACCESS_CODE`, presence (online, in a call, last seen), chat relay with an in-memory offline queue plus delivery receipts, call signaling relay, ICE config (Google STUN plus optional TURN from env), heartbeat, and it serves `app/renderer` as a browser fallback.
- `app/` (Electron 45, electron-builder 26): one renderer (`renderer/app.js`) used by both the desktop app and the browser version.

## Key decisions
- **WebRTC "perfect negotiation"**: the caller is impolite and the callee polite. The callee doesn't offer until it has received the first offer. Renegotiation (adding or removing the watch-together tracks) works from either side.
- **Every call always has one audio and one video sender.** Placeholders are a silent audio track and a black canvas track. Camera on/off and screen share use `replaceTrack`, so they never renegotiate. On/off state is sent as signals (`cam`, `mic`, `screen`), so the other side shows an avatar or "Muted".
- **Watch together** = `videoElement.captureStream()` on a local file, added as a second stream. A `stream-role` signal arrives first so the receiver knows which stream is the movie.
- **Mini window**: on `minimize` during a call, main runs `requestPictureInPicture()` via `executeJavaScript(..., userGesture=true)`. If that's refused (for example, audio-only with no video to show), it falls back to "compact mode": the same window shrinks to 380×240, always on top, bottom-right corner.
- **Screen share (Electron)**: the custom picker calls `desktopCapturer.getSources()`, then IPC `select-screen-source`, then `getDisplayMedia()`, which `setDisplayMediaRequestHandler` answers. The older `chromeMediaSource: 'desktop'` getUserMedia path returned NotAllowedError on Electron 45, so it was dropped.
- **Mac signing**: `mac.identity: "-"` (ad-hoc), plus `disable-library-validation` in the entitlements so the unsigned arm64 build launches.

## Screen share with computer sound (added in session 2)
Two separate echo problems are solved separately:
1. **Loopback echo**: system audio includes the friend's voice, which would get sent back to them. The main process grants `audio: 'loopback'` (Windows and macOS only). The renderer asks for `restrictOwnAudio: true`, Chromium's built-in "leave out my own playout". If `track.getSettings().restrictOwnAudio !== true`, an **echo guard** kicks in: WebAudio watches the friend's incoming voice level (RMS > 0.015, 450 ms hold) and ducks the shared sound to 10%.
2. **Mic echo**: the mic hears the shared video from the speakers, which normal echo cancellation ignores because it only cancels call audio. The mic now asks for `echoCancellation: 'all'`, the newer Chromium mode that removes all computer playout. Older engines read it as `true`.
- Shared sound travels as its own stream (`stream-role: 'screen-audio'`) and is played in `<audio id="screenAudio">`. It uses a 128 kbps cap and `contentHint = 'music'`. Watch-together audio got the same treatment.
- `NSAudioCaptureUsageDescription` was added to the Mac Info.plist (required on macOS 14.2+).
- **Not yet verified on real hardware:** whether Electron 45 honors `restrictOwnAudio` together with `'loopback'` on Windows and Mac. On a real call, watch the sharer: if the "Echo guard on" message appears, it didn't, and the ducking fallback is doing the work. If so, try passing Chromium's `loopbackWithoutChrome` device id or the `electron-audio-loopback` package.

## Tested (automated, in a Linux sandbox)
- Screen sound (14/14), using a fake tone in place of real loopback: friend hears it, the "+ sound" flag shows, the echo guard ducks and recovers, the clean path sends the sound untouched, stop and hang-up clean up, no leftover senders.
- Browser vs browser (30/30): wrong access code, presence, chat plus unread badges plus links, offline queue and delivery receipt, video call both directions, audio track, mute and camera flags, chat during a call, screen share start/stop, watch together from caller and from callee (video and audio arrive, cameras keep running), PiP, hang up, decline, voice-only call, no page errors.
- Electron desktop vs browser (13/13): sign-in, incoming call, video connects, screen picker plus share plus stop, minimize → PiP, mini button → 380×240 always-on-top, expand restores, hang up, no renderer errors.
- Packaged Linux build launches. **Mac and Windows installers not yet built** (they need the GitHub Action or a real machine).

## Next steps / ideas
1. Deploy to Railway with `ACCESS_CODE`, run the GitHub Action, and test a real Mac ↔ Windows call across two different networks.
2. If any call fails with "Couldn't connect", add TURN env vars.
3. v2 ideas: Postgres for chat history and offline queue; sending images and files in chat (WebRTC data channel); group calls (LiveKit); auto-update (electron-updater plus GitHub Releases); paid code signing to remove the first-launch warnings.
