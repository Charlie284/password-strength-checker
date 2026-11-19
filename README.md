# Password Strength Checker

A fast, client-side password guessability estimator built with plain HTML, CSS, and JavaScript.

## Features
- Real-time, pattern-aware strength estimation: length and character variety, capped by an
  offline guessability estimate that detects common passwords (including leetspeak), keyboard
  walks, alphabetic/numeric sequences, years, and repeated characters or blocks
- Visual strength meter
- Clear feedback on how to improve passwords
- Screen-reader announcements when the result changes
- No data leaves your browser

## How to use
Open `index.html` in any modern browser and start typing a password.

## Security note

All checks are performed locally; the common-password list is bundled in `script.js`. No
passwords are stored or transmitted. The result is guidance,
not a guarantee: this small estimator cannot model every leaked-password list or targeted guessing
strategy. Prefer a password manager and unique generated passwords; never reuse a password because
this page labels it strong.

## Test

Requires Node.js 20 or newer:

```sh
npm test
```
