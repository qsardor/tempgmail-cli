# tempgmail

Zero-dependency CLI for **temporary `@gmail.com` addresses** — no browser, no API key, no sign-up required.

Uses [Emailnator](https://www.emailnator.com) under the hood via its reverse-engineered REST API.

## Install

```bash
npm install -g tempgmail
# or run directly
npx tempgmail new
```

## Usage

```bash
# Generate a new temp Gmail address
tempgmail new

# List inbox messages
tempgmail inbox jane.doe123@gmail.com

# Read a specific message
tempgmail read jane.doe123@gmail.com <messageId>

# Wait and print the first OTP code found (4-8 digits)
tempgmail otp jane.doe123@gmail.com

# Custom timeout (seconds)
tempgmail otp jane.doe123@gmail.com --timeout=60
```

## Programmatic API

```js
import { getSession, generateEmail, getInbox, waitForOTP, createAndWaitOTP } from "tempgmail";

// Quick one-liner
const { email, waitForOTP } = await createAndWaitOTP();
console.log("Email:", email);

// Send verification to this address, then:
const otp = await waitForOTP({ timeout: 120_000 });
console.log("OTP:", otp);
```

## How it works

1. `GET /` → grabs session cookies + `XSRF-TOKEN`
2. `POST /api/generate-email` → gets a fresh `@gmail.com` address
3. `POST /api/inbox` → polls for incoming messages
4. `POST /api/message-list` → reads message body and extracts OTP via regex

No Playwright, no Puppeteer, no headless browser. Pure `fetch`.

## Requirements

- Node.js ≥ 18

## License

MIT
