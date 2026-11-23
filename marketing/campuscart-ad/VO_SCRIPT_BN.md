# CampusCart Bengali voice-over: script and recording sheet

The video is already cut to these timings. Record each line as its own file, put them in `audio/vo-bn/`, and run `tools/mix-bn.sh`. The script picks up the files on its own, ducks the music under the voice, normalises the loudness and writes the final MP4.

**Voice:** natural Bangladeshi Bengali, male, warm, confident and trustworthy. Use standard Dhaka pronunciation (no West Bengal or Hindi colouring) and a calm, conversational pace that isn't dramatic.

**Format:** WAV, 48 kHz (44.1 kHz is fine), mono, 24-bit or 16-bit. Record in a quiet room and leave about 0.2 s of silence before and after each line. Don't add music or effects.

| File | Starts at | Must end by | Line |
|---|---|---|---|
| `line1.wav` | 0.3 s | 4.8 s (≈4.5 s) | ক্যাম্পাস জীবনের প্রতিদিনের প্রয়োজন, এবার এক প্ল্যাটফর্মেই। |
| `line2.wav` | 5.3 s | 16.5 s (≈11 s) | CampusCart-এ ক্রেতারা খুঁজে পাবেন পছন্দের পণ্য, আর বিক্রেতারা পাবেন নিজেদের ব্যবসা তুলে ধরার একটি নতুন সুযোগ। |
| `line3.wav` | 17.3 s | 22.8 s (≈5.5 s) | ব্যবহৃত পণ্য কেনাবেচাও হবে আরও সহজ। |
| `line4.wav` | 23.3 s | 28.8 s (≈5.5 s) | রক্তদাতা ও প্রয়োজনীয় মানুষের মধ্যে তৈরি হবে সহজ যোগাযোগ। |
| `line5.wav` | 29.3 s | 34.8 s (≈5.5 s) | ঘর, বাসা কিংবা রুমমেট খুঁজতেও থাকবে BashaLagbe। |
| `line6.wav` | 35.5 s | 44.5 s (≈9 s) | কেনাকাটা থেকে প্রয়োজনীয় সেবা—সবকিছুতেই আপনার ক্যাম্পাসের পাশে CampusCart। |

Pronunciation:

* **CampusCart:** "ক্যাম্পাস-কার্ট", one word, with a little stress on "কার্ট".
* **BashaLagbe:** "বাসা লাগবে", said as the Bengali phrase.
* Line 2 has a natural pause after "পছন্দের পণ্য,". Line 6 has a short pause at the dash (—).

If a take runs longer than its window, edit the start frames in `src/timeline-bn.json` (`vo[].from`, at 30 fps) or send it to me and I'll re-time the cut.
