# CampusCart Bengali launch ad (79 s): production report

## Deliverables (`deliverables-bn75/`)

| File | Description |
|---|---|
| `CampusCart_Bangla_Ad_79s_1080x1920.mp4` | Final ad: 9:16, 1080×1920, 30 fps, H.264 + AAC 48 kHz, with the Bengali voice-over mixed in |
| `CampusCart_Bangla_VO_bn-BD.wav` / `.mp3` | Voice-over only, timed to the video |
| `CampusCart_Bangla_Thumbnail.png` | 1080×1920 cover |
| `PRODUCTION_REPORT_BN75.md` | This report |

**Editable source:** `src/AdBn75.tsx` (composition), `src/timeline-bn75.json` (screens, scrolls, taps, sound cues), `src/vo-bn75.json` (voice and subtitle timing), `tools/vo_script_bn75.json` (the script), `tools/vo_bn75.py`, `tools/soundtrack-bn75.mjs`, `tools/mix-bn75.sh`.

## Voice-over

* **Voice:** Microsoft neural voice **bn-BD-PradeepNeural**, the Bangladeshi Bengali male voice, at rate −4% and pitch −2 Hz for a warmer delivery.
* **How it was generated:** the Azure Speech key was not available in this session (`AZURE_SPEECH_KEY` was unset and the Azure host was blocked). As you asked, I used another route: the `edge-tts` client, which reaches the same Microsoft neural voice through Edge's free "Read Aloud" service, with no key.
* **Licensing caveat:** this is Microsoft's consumer read-aloud service, not the licensed commercial Azure API. Before the paid public launch, regenerate the 25 lines through Azure AI Speech with your key. It is the same voice, so the cut, captions and mix stay unchanged; only `tools/vo_bn75.py` needs to call Azure instead.
* **Script:**
  * 25 lines of standard Bangladeshi Bengali, in `tools/vo_script_bn75.json`.
  * Brand names are written in Bengali script in the spoken text so the voice pronounces them naturally (ক্যাম্পাসকার্ট, প্রি-ওনড, ব্লাড ডোনেশন, বাসা লাগবে).
  * The on-screen subtitles show the original names: CampusCart, Pre-Owned, Blood Donation, BashaLagbe.
* **Speech check:** Whisper (small) speech recognition transcribed seven sample lines back to the expected Bengali words, for example "toiri korte parben nijer online store" and "manusher shonge jogajog korte royeche Blood Donation". This is a measurement, not a listening test.
* **Subtitles:** each subtitle is the exact text of the voice chunk playing at that moment. Because each chunk is a separate audio file, timing is exact.

## Story and screens

| Time | Scene | What's shown | Source |
|---|---|---|---|
| 0–6.5 s | Opening | DIU campus building, students on the lawn, campus at night, CampusCart logo reveal | **Authentic DIU photos**, Wikimedia Commons, CC BY 4.0 / CC0. Credits on screen and in `public/photo/diu/ATTRIBUTION.md`. **Real logo** files |
| 6.5–21 s | Buyer journey | Home, campus stores list, all products, flash deals, product page, Add to Cart (with the real "Added to cart" confirmation), cart, checkout | **Real mobile UI** |
| 21–38 s | Seller journey | Seller landing, "Create Seller Account", choose university, account form, "Seller account created. Now set up your store." store form, seller dashboard, My Products, Add New Product, storefront as buyers see it, order management, store profile | **Real mobile UI**. The forms were filled with demo values; the store form was not submitted |
| 38–46 s | Pre-Owned | List, used laptop, bicycle | **Real mobile UI** |
| 46–57 s | Blood Donation | Menu, requests, **B+ group filter**, request details, donors | **Real mobile UI**, including the site's own "not an emergency medical service" notice. The caption also says "এটি জরুরি চিকিৎসা সেবা নয়" |
| 57–65 s | BashaLagbe | List, single room with facilities, shared room with roommate details, apartment with rent | **Real mobile UI** |
| 65–79 s | Closing | Four service cards, "এক ক্যাম্পাস। অসংখ্য সম্ভাবনা।", "কেনাকাটা থেকে প্রয়োজনীয় সেবা—সবকিছু এক প্ল্যাটফর্মে।", logo, "CampusCart — আপনার ক্যাম্পাস, আপনার কমিউনিটি।", "শিগগিরই আসছে।" | Real UI screenshots inside video graphics |

* **Step rail (concept graphic):** the steps beside the phone in the buyer and seller scenes are video graphics, not website UI:
  * Seller: শিক্ষার্থী → স্টোর তৈরি → পণ্য আপলোড → স্টোর লাইভ → ক্রেতারা খুঁজে পান.
  * Buyer: পণ্য খুঁজুন → স্টোর ঘুরে দেখুন → বিস্তারিত দেখুন → কার্টে যোগ করুন → অর্ডার করুন.
* **Seller approval:** "Store goes live" stands for the site's real admin-approval step, which isn't shown.
* **Feature coverage:** every feature shown exists in the current CampusCart code. No conceptual screens were needed.
* **No URL:** no domain, URL, browser address bar or QR code appears anywhere.

## Demo data

* **Fictional only.**
  * Everything was created in a temporary in-memory MongoDB on the build machine (`demo-data/seed.cjs`, `demo-data/capture-v2.cjs`, `demo-data/capture-store-step.cjs`).
  * Contents: 6 student accounts, 4 stores, 11 products in ৳ with short reviews, 6 Pre-Owned items, 3 blood requests at hospitals marked "(demo)", 5 donors, and 3 BashaLagbe places.
* **Demo orders:**
  * Three demo orders were placed by demo buyers through the real checkout API, so the seller order screens aren't empty.
  * All phone numbers are a placeholder, 01700000000.
  * The orders aren't presented as real activity: no testimonials, real customers or statistics are claimed.
* **Images:** product and room images are 3D renders made for the video, with no real brands.
* **Clean-up:** the database was deleted after capture and `.env.local` was restored.

## Production was not modified

* No connection to the production database, Cloudinary or Vercel settings.
* No site code changes and nothing deployed.
* The live site was only viewed (read-only) to confirm the mobile layout.

## Audio mix

* **Music:** a generated "upbeat" underscore. Explainroo's audio engine (MIT licence, vendored) synthesises it, so no music rights are needed.
* **Sound effects:**
  * A click on every tap.
  * Whooshes on screen changes and swipes between scenes.
  * A riser, chime and sparkle on both logo reveals.
  * Pops for the closing cards.
* **Levels:** the music ducks about 8 dB under each block of speech and sits well under the voice. The whole mix is normalised to −14 LUFS / −1.5 dBTP.

## QA

Filled in from the checks on the final file below.
