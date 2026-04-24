# Privacy Policy — Epoch Buddy

Last updated: 2026-04-24

Epoch Buddy ("the extension") performs all conversions locally in your browser. The extension does not read the contents of webpages, does not transmit your conversion inputs or results, and does not collect personally identifiable information.

## Data collection

Epoch Buddy does **not** collect:

- Personally identifiable information (name, email, identifiers)
- Authentication information (passwords, credentials)
- Financial, health, or location information
- Web history or browsing activity
- Page contents (beyond the user's current selection used for conversion)
- Your conversion input values or results

## Analytics

Epoch Buddy sends anonymous usage counts to Google Analytics to help us understand which features are used. The events we send are:

- Event names (e.g. `epoch_to_date`, `utc_to_epoch`, `settings_opened`, `floating_popup_shown`)
- Event parameters such as the theme chosen, the timezone added or removed, the preset used, or the star rating given
- A randomly generated install ID (not tied to your identity)
- Extension version and browser (Chrome or Firefox)

We do **not** send:

- Your conversion input values or results
- The selected text that triggers the floating popup
- The URL or content of any webpage
- Any account, login, or identifying information

You can disable analytics at any time from the **Settings** screen in the extension popup. The setting takes effect immediately.

The demo page at [/demo.html](https://shivams136.github.io/epoch-buddy/demo.html) uses the same anonymous analytics via Google's standard `gtag.js`; you can disable it using the "Disable analytics" link in the footer. The demo also honors the browser's Do-Not-Track signal.

Analytics data is processed by Google under [Google's privacy policy](https://policies.google.com/privacy).

## Data storage

Epoch Buddy uses browser local storage (`browser.storage.local` / equivalent) to store the following on your device. This data never leaves your device except for the anonymous analytics events described above.

- `history` — your last 10 conversions (cleared via the "Clear History" button)
- `theme`, `timezones` — your appearance and timezone preferences
- `ratingStars`, `ratingFooterHidden` — feedback-footer state
- `analyticsOptOut` — whether you've disabled analytics
- `ga_client_id` — a randomly generated install ID used only for analytics de-duplication

The demo page uses `localStorage` with the keys `epochBuddyDemoHistory` and `epochBuddyAnalyticsOptOut`.

## Permissions

- **Storage**: Used to store recent conversion history, preferences, and analytics opt-out state locally.
- **Host access (`<all_urls>` via content scripts)**: Used to enable the "highlight/select an epoch on any webpage and convert" feature. The extension reads only the text you select to perform the conversion and display the result.
- **Host permission for `www.google-analytics.com`**: Used to send the anonymous analytics events described above.

## Changes to this policy

If the extension's data practices change in the future, this privacy policy will be updated accordingly.

## Contact

If you have questions or concerns about this privacy policy, please open an issue on the project repository.
