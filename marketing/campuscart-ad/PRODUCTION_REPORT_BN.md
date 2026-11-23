# CampusCart Bengali launch ad: production report

## Status

| Deliverable | Status |
|---|---|
| Video: 1080×1920, 9:16, 30 fps, 45 s, Bengali on-screen text, music and sound effects | Done (see QA below) |
| Bengali voice-over | **Not recorded.** The Azure key for the Bangladeshi voice (bn-BD Pradeep) was declined, and no other free Bengali voice is suitable (see below). The video is cut to the six lines in `VO_SCRIPT_BN.md`; drop in recordings and run `tools/mix-bn.sh` |
| Thumbnail | `deliverables-bn/CampusCart_Bangla_Thumbnail.png` (1080×1920) |
| Editable source | This folder: `src/AdBn.tsx`, `src/timeline-bn.json`, `tools/*-bn.*` |

Until the voice-over exists, the MP4 is named `CampusCart_Bangla_Ad_PREVIEW_no-voiceover.mp4`. Once the voice is added, the same script writes `CampusCart_Bangla_Ad_1080x1920.mp4` and `CampusCart_Bangla_VO.wav`.

### Why there is no voice yet

* **Azure Neural TTS, bn-BD-PradeepNeural.** The best Bangladeshi male voice, but it needs your Azure Speech key, and the key request was declined.
* **Meta MMS Bengali.** Licensed CC BY-NC (non-commercial only), so it can't be used in an ad.
* **Indic Parler-TTS.** Needs a Hugging Face token, and the training data is mostly Indian speakers, so it risks the West Bengali accent you asked to avoid.
* **espeak and similar.** Robotic, which the brief rules out.

Any of these unblocks it:

* Add an Azure Speech key in the environment settings (host `southeastasia.tts.speech.microsoft.com`, header `Ocp-Apim-Subscription-Key`), then ask me to generate it.
* Upload a recording made from `VO_SCRIPT_BN.md`.

## Real UI vs. made-for-the-video visuals

| Scene | What's on screen | Source |
|---|---|---|
| 1 (0–5 s) | DIU campus building, students on the lawn, campus at night | **Authentic DIU photos**, Wikimedia Commons, CC BY 4.0 / CC0. Credit is shown on screen; full list in `public/photo/diu/ATTRIBUTION.md` |
| 1 / 6 | CampusCart logo | **The site's own logo file** (`public/brand/campuscart-logo.png`). The mark is cropped and the wordmark recoloured white for dark backgrounds, without being redrawn |
| 2 (5–17 s) | Buyer: marketplace home, flash deals, product page. Seller: store page, "My Products", add-product form | **Real mobile UI** |
| 3 (17–23 s) | Pre-Owned list and item | **Real mobile UI** |
| 4 (23–29 s) | Menu, Blood Donation requests and donors | **Real mobile UI**, including the site's notice that it is not an emergency medical service. The caption also says "এটি জরুরি চিকিৎসা সেবা নয়" |
| 5 (29–35 s) | BashaLagbe list and room | **Real mobile UI** |
| 6 (35–45 s) | Four service cards, end card | Real UI screenshots in designed cards. End text, CTA and "শিগগিরই আসছে" are video graphics |
| All | Captions, phone frame, tap markers, backgrounds | Made for the video |
| Inside the UI | Product, Pre-Owned and room images | 3D renders made for the video (no real brands) |

* **Real mobile layout.** I inspected the live site at 390 px width. Its mobile layout matches the local copy that was captured. The live site currently shows 0 listings, which is why demo data was needed.
* **No URL or domain anywhere.** No browser address bar, URL, domain, QR code or "visit our website" appears in the video. I checked every captured screen's text for URLs; there were none.

## Demo data

* **Fully fictional, local throw-away database.** Everything lived in a temporary in-memory MongoDB on this build machine, through the normal API where possible (`demo-data/seed.cjs`). It contained:
  * 6 student accounts and 4 stores.
  * 11 products in ৳, with short reviews so ratings show.
  * 6 Pre-Owned items, 3 blood requests (hospitals marked "(demo)"), 5 donors and 3 BashaLagbe places.
* **Seller screens.** These are the dashboard of one fictional demo seller. Its counters ("0 orders") are the real empty state.
* **Clean-up.** The database was deleted when the servers stopped, and `.env.local` was restored.

## Production was not modified

* No connection to the production database, Cloudinary or Vercel deployment settings was made.
* No site code was changed and nothing was deployed.
* The live site was only viewed (read-only) to check the mobile layout.

## Audio

* **Music.** A generated "upbeat" underscore. Explainroo's audio engine (MIT licence, included) also makes the effects, so there are no rights to clear.
* **Sound effects.** A click on every tap, whooshes on screen changes, a riser with a chime and sparkle on both logo reveals, and pops for the service cards.
* **Mix.** With the voice-over, the music ducks about 8 dB under the voice and the mix is normalised to −14 LUFS / −1.5 dBTP. The music-only preview is normalised to −18 LUFS.

## QA

Filled in from checks on the rendered file. See the bottom of this report.
