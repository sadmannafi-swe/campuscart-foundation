# CampusCart ad: production report

## Deliverables (`deliverables/`)

| File | What it is |
|---|---|
| `CampusCart_Ad_1080x1920.mp4` | Final ad. 1080×1920 (9:16), 30 fps, H.264 + AAC 48 kHz, 45.0 s |
| `CampusCart_Ad_VO.wav` | Voice-over only, timed to the video, 48 kHz |
| `CampusCart_Ad_Thumbnail.png` | 1080×1920 cover image |
| `PRODUCTION_REPORT.md` | This report (copy of `../PRODUCTION_REPORT.md`) |

The editable source is this whole folder (`marketing/campuscart-ad/`); see "Rebuilding" below.

## Real website UI vs. made-for-the-video visuals

| Shot | Source |
|---|---|
| S1: campus photo | `src/assets/hero-campus.jpg`, the photo already used on the CampusCart site |
| S1/S6: daffodil logo, "CampusCart" wordmark | Redrawn in SVG from the site's BloomMark logo (same shape and colours) |
| S2: marketplace home, flash deals, featured stores, product page | **Real UI.** Screenshots of the current CampusCart code, mobile viewport |
| S3: Pre-Owned list and item page | **Real UI** |
| S4: menu drawer, Blood Donation requests, donors tab | **Real UI**. The on-screen notice "CampusCart only connects blood requesters and potential donors. It is not an emergency medical service" is the site's own text |
| S5: BashaLagbe list and room page | **Real UI** |
| S6: four-service tiles | **Real UI** screenshots, cropped into cards |
| Captions, phone frame, tap markers, backgrounds, transitions, end card | Video graphics made for the ad, not part of the website |
| Product, Pre-Owned and room photos inside the UI | 3D renders made for the ad (see below), shown through the real UI |

Nothing in the phone was redesigned or edited. The only change is that the sticky header and bottom navigation were captured separately and laid back on top, so the page can scroll smoothly underneath them. That is how the real site behaves.

## How the demo data was made

* **Separate local environment.** A throw-away in-memory MongoDB (`mongodb-memory-server`, database `campuscart_video_demo`) and the CampusCart dev servers ran on `localhost` inside the build container. `demo-data/seed.cjs` refuses any non-local database URL.
* **Through the real API.** Six fictional student accounts (`*@demo.campuscart.test`) were created. The six Pre-Owned items, three blood requests, five donor profiles and three BashaLagbe listings went through the normal API, so all server-side checks ran.
* **Written directly into the local database:**
  * Four fictional stores (TechDen DIU, PageStack Books, Hostel Hub, GearUp Campus), already approved.
  * Eleven products priced in ৳.
  * Two or three short fictional reviews per product, so star ratings appear.
  * Store approval is normally an admin step, so it was written straight into the local database instead.
* **Images.** Every product, Pre-Owned and room photo is a 3D studio render made with three.js (`assets-src/render/studio.html`), with no real brands. The four store logos are simple lettermarks. During capture, the demo image links (a fake Cloudinary account named `testcloud`) were answered from these local files, so no broken image links appear.
* **Fictional only.**
  * All names, stores, listings, reviews, hospitals (marked "(demo)") and phone numbers are invented.
  * Contact is "messages" only, so no personal details appear.
  * The video makes no claims about real users, sales, partnerships or statistics. The "11 listings · 4 stores" counters on screen are the demo database's own counts.
* **Clean-up.** After capture, the servers and the in-memory database were stopped (the data no longer exists) and `.env.local` was restored to its previous contents.

## Production was not touched

* No connection to the production MongoDB, Cloudinary or Vercel was made for this video.
* No website code was changed. The only new files are in `marketing/campuscart-ad/`, and they are not committed or deployed.
* The live site https://campuscart-foundation.vercel.app was not modified or redeployed.

## Audio

* **Voice-over.**
  * Made with Kokoro-82M (open model, Apache-2.0), voice `am_michael`: a warm, confident male voice, generated on the build machine.
  * Script: six lines, one per scene. "CampusCart" was written as "Campus Cart" so the voice pronounces it clearly.
* **Music and effects.**
  * Music is a generated "upbeat" underscore (about 112 bpm).
  * Effects: UI clicks on every tap, whooshes on screen changes, risers and a chime/sparkle on both logo reveals, and pops for the service tiles.
  * Both are synthesised by the MIT-licensed explainroo audio engine (`tools/vendor/explainroo-audio`, licence included), so there are no stock-music rights to clear.
  * The music ducks by about 8 dB under the voice.
* **Mix.** ffmpeg, two-pass EBU R128 to about −14 LUFS integrated and −1.5 dBTP, which suits Reels, TikTok and Shorts.

## QA performed (on the final MP4)

* **Specs (ffprobe).** H.264 video, 1080×1920, 30/1 fps, 45.000 s. AAC audio, 48 kHz stereo, 45.000 s. File size 21.3 MB.
* **Loudness (ffmpeg ebur128).** −14.5 LUFS integrated, 5.6 LU loudness range, −1.3 dBFS peak, no clipping.
* **Music under voice.** Narration stem is −20.6 LUFS; the music and effects stem is −32.9 LUFS (+3 dB in the mix). The bed sits about 9 LU below the voice and drops a further ~8 dB while the voice is speaking.
* **Sync.** Speech segments came from silencedetect on the VO stem, and each caption was compared with its spoken line:
  * S1: 0.4–4.4 s. The logo appears at 3.3 s, on "Meet Campus Cart".
  * S2: 5.9–11.2 s. The caption is on screen from 5.3 s.
  * S3: 15.8–19.9 s. The caption is on screen from 15.4 s.
  * S4: 22.9–25.8 s. The caption is on screen from 22.4 s.
  * S5: 29.9–32.8 s. The caption is on screen from 29.4 s.
  * S6:
    * "Four useful services" (36.6–38.1 s): on screen from 36.4 s.
    * "One connected campus community" (38.5–40.3 s): on screen from 38.3 s.
    * "Your campus. Your community. Your Campus Cart." (40.6–43.6 s): its three lines come in at 40.8, 41.5 and 42.4 s.
  * Every line finishes inside its own scene.
* **Visual review.** I reviewed frames every 1.5 s across the whole video, plus every second of the last 10 s. No broken images, no empty screens, and no text cut off by the phone or the frame edge. The blood scene shows the site's own "not an emergency medical service" notice and the caption "Not an emergency service."
* **Known cosmetic point.** The featured-store cards show the site's generic store icon instead of the demo lettermark logos. The local capture did not pick up the logo image, so the site used its own fallback. This is real site behaviour; nothing is broken on screen.

## Notes and limits

* **Remotion licence.** Remotion is free for individuals and companies with up to three employees. A larger organisation needs a Remotion company licence to re-render this project.
* **Voice quality.** The voice is synthetic. Levels, timing and gaps were checked by measurement, but no human listened before delivery. Please listen once, especially to "BashaLagbe" (not spoken; only shown on screen) and "Campus Cart".
* **Product images.** These are stylised 3D renders, not photos. Real seller photos will look different on the live site.

## Rebuilding

```bash
cd marketing/campuscart-ad
npm install
npm run studio                       # edit/preview in Remotion Studio
npm run render                       # -> out/video-silent.mp4
node tools/soundtrack.mjs            # -> audio/mix/music_sfx.wav, vo_full.wav
tools/mix.sh                         # -> deliverables/*.mp4, VO wav
npm run thumb                        # -> out/thumbnail.png
```

Timing for taps, screen changes, scrolls, VO placement and sound cues all lives in `src/timeline.json`.
Re-capturing the UI needs the local demo: start an in-memory MongoDB, point `.env.local` at it, run `npm run dev` in the repo, then run `demo-data/seed.cjs` and `demo-data/capture.cjs public/ui`.
