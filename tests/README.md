# Parley tests

End-to-end tests that run the real desktop app (Electron, "Alice") against the web version in Chrome ("Bob") through a local server. They're for a Linux machine or sandbox with Xvfb; you don't need them to use Parley.

```bash
# one-time setup
cd app && npm install && cd .. && npm install
npm i -g playwright            # or set NODE_PATH to a playwright install
mkdir -p /tmp/fx && cd /tmp/fx
ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=30 -f lavfi -i "sine=f=440" -f lavfi -i "sine=f=660" \
  -filter_complex "[1:a][2:a]amerge=inputs=2[a]" -map 0:v -map "[a]" -t 40 -c:v libx264 -pix_fmt yuv420p -c:a aac -ac 2 movie.mp4
ffmpeg -f lavfi -i "anoisesrc=color=pink:amplitude=0.4:sample_rate=48000" -t 30 -ac 1 noise.wav
ffmpeg -f lavfi -i "sine=frequency=523" -t 2 ring.wav
ffmpeg -f lavfi -i testsrc=size=3000x2000 -frames:v 1 photo.png
ffmpeg -f lavfi -i testsrc2=size=640x360:rate=30 -f lavfi -i "sine=f=440:sample_rate=48000" -f lavfi -i "anullsrc=r=48000:cl=mono" \
  -filter_complex "[1:a][2:a]join=inputs=2:channel_layout=stereo[a]" -map 0:v -map "[a]" -t 40 -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k movie-lr.mp4
head -c 3000000 /dev/urandom > doc.bin

# run
xvfb-run -a -s "-screen 0 1280x800x24" node tests/e2e.js      # calls, noise removal, screen share, watch-together (36 checks)
xvfb-run -a -s "-screen 0 1280x800x24" node tests/v12.js      # v1.2: chat, photos/files, stickers, avatars, themes, tray, mini window, update proxy (40 checks)
xvfb-run -a -s "-screen 0 1280x800x24" node tests/v13.js      # v1.3: layout, status, tray, reactions/replies/edit/delete, search, link previews, saving photos, stereo, seek bar, screen+camera, mini window (53 checks)
xvfb-run -a -s "-screen 0 1280x800x24" node tests/screens.js  # screenshots → /tmp/shots
```

**Important:** the Electron side runs *without* `--use-fake-ui-for-media-stream`. That flag auto-approves screen capture and skips Parley's own permission and display-media handlers. Because of it, the v1.0.0 tests passed while screen sharing was broken for real users.

**Not testable here:** system sound capture (Linux has none, so the "leave Parley's sound out" path only runs on Windows/Mac), real minimize (Xvfb has no window manager; the tests trigger the same code through hide/`__parleyMini.open()`), the tray icon's menu, and installing an update (the server's update proxy *is* tested against a fake GitHub API).
