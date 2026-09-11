<h1 align="center">tempgmail</h1>

<p align="center">
  <strong>Instant temporary @gmail.com addresses from your terminal.</strong><br>
  No browser. No API key. No dependencies.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tempgmail"><img src="https://img.shields.io/npm/v/tempgmail?color=green&label=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node.js >= 18">
  <img src="https://img.shields.io/badge/dependencies-0-brightgreen" alt="Zero dependencies">
</p>

---

## Why?

Most temp-mail CLIs rely on a **headless Chromium browser** (Puppeteer/Playwright) just to bypass Cloudflare and grab a session token. That's slow, heavy, and overkill.

`tempgmail` reverse-engineered the Emailnator REST API and hits it directly with native `fetch` — no browser, no native addons, no `node_modules`.

## Install

```sh
npm install -g tempgmail
```

Or run without installing:

```sh
npx tempgmail new
```

## Usage

```
tempgmail new [amount] [options]   Generate new temp email(s)
tempgmail list                     Show previously generated emails
tempgmail clear                    Clear email history
tempgmail inbox <email>            List messages in an inbox
tempgmail read <email> <msgId>     Read a specific message
tempgmail otp <email>              Wait and print the first OTP found
```

### Generate an email

```sh
$ tempgmail new

Creating 1 email(s)...
✓ Success!
  combtmp+e1kae@gmail.com -> https://emailnator.com/inbox/combtmp+e1kae@gmail.com
```

### Generate multiple at once

```sh
$ tempgmail new 3
```

### Filter by address type

```sh
$ tempgmail new --dot          # dot.in.address@gmail.com style
$ tempgmail new --plus         # address+suffix@gmail.com style
$ tempgmail new --google       # address@googlemail.com style
$ tempgmail new --domain       # custom domain
$ tempgmail new --dot --plus   # combine multiple
```

### Check inbox

```sh
$ tempgmail inbox combtmp+e1kae@gmail.com
```

### Wait for an OTP

```sh
$ tempgmail otp combtmp+e1kae@gmail.com
# Waits up to 120s by default, prints the code when it arrives

$ tempgmail otp combtmp+e1kae@gmail.com --timeout=60
```

### Email history

```sh
$ tempgmail list    # see all previously generated addresses
$ tempgmail clear   # wipe history
```

## Programmatic API

```js
import {
  getSession,
  generateEmail,
  getInbox,
  getMessage,
  waitForOTP,
  createAndWaitOTP,
} from "tempgmail";

// One-liner: create + wait for OTP
const { email, waitForOTP } = await createAndWaitOTP();
console.log("Email:", email);

// Register on a service using `email`, then:
const otp = await waitForOTP({ timeout: 120_000 });
console.log("OTP:", otp);
```

### API Reference

| Function | Description |
|---|---|
| `getSession()` | Returns `{ cookies, xsrf }` — a fresh session |
| `generateEmail(session, types?)` | Returns a new `@gmail.com` address |
| `getInbox(session, email)` | Returns array of messages |
| `getMessage(session, email, messageId)` | Returns full message body |
| `waitForOTP(session, email, options?)` | Polls inbox and returns first OTP match |
| `createAndWaitOTP(options?)` | Convenience wrapper for the full flow |

### `waitForOTP` options

```js
{
  timeout: 120_000,       // ms to wait before throwing (default: 120s)
  interval: 4_000,        // polling interval in ms (default: 4s)
  pattern: /\b\d{4,8}\b/ // regex to extract code (default: 4-8 digit number)
}
```

## How it works

1. `GET https://emailnator.com/` — grab session cookie + `XSRF-TOKEN`
2. `POST /api/generate-email` — create a fresh disposable address
3. `POST /api/inbox` — poll for new messages
4. `POST /api/message-list` — read message body, extract OTP via regex

Everything runs in a single Node.js process. No Chromium. No native modules.

## Requirements

- Node.js ≥ 18 (native `fetch` + `getSetCookie()`)

## License

MIT — see [LICENSE](LICENSE)
