#!/usr/bin/env node
/**
 * tempgmail CLI
 */

import { getSession, generateEmail, getInbox, getMessage, waitForOTP } from "./index.js";
import fs from "fs";
import os from "os";
import path from "path";

const [,, cmd, ...args] = process.argv;
const historyFile = path.join(os.homedir(), ".tempgmail-history.json");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
  bold: "\x1b[1m"
};

function saveToHistory(email) {
  let history = [];
  if (fs.existsSync(historyFile)) {
    try { history = JSON.parse(fs.readFileSync(historyFile, "utf8")); } catch(e){}
  }
  history.push({ email, created_at: new Date().toISOString() });
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function clearHistory() {
  if (fs.existsSync(historyFile)) {
    fs.unlinkSync(historyFile);
  }
}

function getHistory() {
  if (fs.existsSync(historyFile)) {
    try { return JSON.parse(fs.readFileSync(historyFile, "utf8")); } catch(e){}
  }
  return [];
}

function printHelp() {
  console.log(`
${colors.cyan}${colors.bold}tempgmail${colors.reset} - Zero-dependency Temporary @gmail.com CLI

${colors.bold}Usage:${colors.reset}
  tempgmail new [amount] [options]  Generate new temp email(s)
  tempgmail list                    List generated email history
  tempgmail clear                   Clear generated email history
  tempgmail inbox <email>           List inbox messages
  tempgmail read <email> <msgId>    Read a specific message
  tempgmail otp <email>             Wait and print OTP code (4-8 digits)

${colors.bold}Options for 'new':${colors.reset}
  --domain       Use custom domain (e.g. @domain.com)
  --plus         Use plus Gmail (e.g. +suffix@gmail.com)
  --google       Use googleMail (e.g. @googlemail.com)
  --dot          Use dot Gmail (e.g. dot.in.address@gmail.com)
  (If no type options are provided, defaults to all 4 above)

${colors.bold}Examples:${colors.reset}
  tempgmail new
  tempgmail new 3
  tempgmail new --dot --plus
  tempgmail list
  tempgmail inbox jess.eldial4@gmail.com
`);
}

async function main() {
  try {
    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
      printHelp();
      return;
    }

    if (cmd === "new") {
      let amount = 1;
      if (args[0] && !isNaN(parseInt(args[0]))) {
        amount = parseInt(args.shift());
      }

      const selectedTypes = [];
      if (args.includes("--domain")) selectedTypes.push("domain");
      if (args.includes("--plus")) selectedTypes.push("plusGmail");
      if (args.includes("--google")) selectedTypes.push("googleMail");
      if (args.includes("--dot")) selectedTypes.push("dotGmail");
      
      const types = selectedTypes.length > 0 ? selectedTypes : ['domain', 'plusGmail', 'googleMail', 'dotGmail'];

      process.stdout.write(`Creating ${amount} email(s)... `);
      const session = await getSession();
      
      const emails = [];
      for (let i = 0; i < amount; i++) {
        const email = await generateEmail(session, types);
        emails.push(email);
        saveToHistory(email);
      }
      
      console.log(`\n${colors.green}✓ Success!${colors.reset}`);
      for (const email of emails) {
        console.log(`  ${colors.cyan}${email}${colors.reset} -> ${colors.yellow}https://emailnator.com/inbox/${email}${colors.reset}`);
      }

      if (args.includes("--json")) {
        console.log(JSON.stringify({ emails, session }));
      }
      return;
    }

    if (cmd === "list" || cmd === "l") {
      const history = getHistory();
      if (history.length === 0) {
        console.log(`${colors.yellow}No email history found.${colors.reset}`);
        return;
      }
      console.log(`\n${colors.bold}Generated Emails History:${colors.reset}\n`);
      history.forEach((h, i) => {
        console.log(`  ${i+1}. ${colors.cyan}${h.email}${colors.reset} (${new Date(h.created_at).toLocaleString()}) -> ${colors.yellow}https://emailnator.com/inbox/${h.email}${colors.reset}`);
      });
      console.log("");
      return;
    }

    if (cmd === "clear" || cmd === "c") {
      clearHistory();
      console.log(`${colors.green}✓ Email history cleared.${colors.reset}`);
      return;
    }

    if (cmd === "inbox") {
      const email = args[0];
      if (!email) { console.error(`${colors.red}Usage: tempgmail inbox <email>${colors.reset}`); process.exit(1); }
      process.stdout.write(`Fetching inbox for ${email}... `);
      const session = await getSession();
      const messages = await getInbox(session, email);
      if (messages.length === 0) {
        console.log(`\n${colors.yellow}Inbox is empty.${colors.reset}`);
      } else {
        console.log(`\n\n${colors.green}✓ ${messages.length} message(s):${colors.reset}\n`);
        for (const m of messages) {
          console.log(`  ${colors.bold}ID:${colors.reset} ${colors.cyan}${m.messageID}${colors.reset}`);
          console.log(`  ${colors.bold}From:${colors.reset} ${m.from}`);
          console.log(`  ${colors.bold}Subject:${colors.reset} ${m.subject}`);
          console.log(`  ${colors.bold}Time:${colors.reset} ${m.time}`);
          console.log(`  ${colors.bold}Link:${colors.reset} ${colors.yellow}https://emailnator.com/inbox/${email}/${m.messageID}${colors.reset}`);
          console.log("  ---");
        }
      }
      return;
    }

    if (cmd === "read") {
      const [email, messageId] = args;
      if (!email || !messageId) { console.error(`${colors.red}Usage: tempgmail read <email> <msgId>${colors.reset}`); process.exit(1); }
      const session = await getSession();
      const msg = await getMessage(session, email, messageId);
      console.log(`\n${colors.bold}Subject:${colors.reset} ${msg.subject}`);
      console.log(`${colors.bold}From:${colors.reset} ${msg.from}`);
      console.log(`\n${colors.bold}Body:${colors.reset}\n`);
      const text = (msg.html || msg.text || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      console.log(text);
      return;
    }

    if (cmd === "otp") {
      const email = args[0];
      if (!email) { console.error(`${colors.red}Usage: tempgmail otp <email>${colors.reset}`); process.exit(1); }
      const timeout = parseInt(args.find(a => a.startsWith("--timeout="))?.split("=")[1] || "120") * 1000;
      console.log(`Waiting for OTP in ${colors.cyan}${email}${colors.reset} (timeout: ${timeout / 1000}s)...`);
      const session = await getSession();
      const otp = await waitForOTP(session, email, { timeout });
      console.log(`\n${colors.green}✓ OTP:${colors.reset} ${colors.bold}${otp}${colors.reset}`);
      return;
    }

    console.error(`${colors.red}Unknown command: ${cmd}${colors.reset}`);
    printHelp();
    process.exit(1);

  } catch (err) {
    console.error(`\n${colors.red}✗ Error:${colors.reset}`, err.message);
    process.exit(1);
  }
}

main();
