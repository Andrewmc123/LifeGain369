# LifeGain369

A private, offline record keeper for street outreach. For each person you meet it holds where
they stay, what they are working toward, their story in their own words, a photo (with
consent), needs, documents, contacts and referrals, and it turns that into **next steps**,
a **shift plan**, printable **documentation**, and a **funder report**.

Everything is stored **on the device only**. There is no account and no server, and records
are never uploaded. With the passcode lock on, they are also **encrypted**.

---

## Quick start

- **Windows:** double-click `Start App.bat`. Keep the small black window open while you work.
- **Anywhere:** double-click `index.html`. Everything works except GPS and installing, which
  browsers only allow over a real connection (some browsers also hold back the passcode lock;
  Settings says so if yours does).
- **Hosted:** see [docs/deploy.md](docs/deploy.md) to publish it (free on Render). Hosted, it
  installs to a phone's home screen and works with no signal.

New install? Overview → **Explore with sample data** loads six invented people who between
them show every part of the app working.

## What it does

| | |
| --- | --- |
| **Today** | Who is due, who has gone quiet, what needs attention, and a backup reminder. |
| **Plan & next steps** | A stage worked out from the record, prompts sorted by urgency, milestones, a priority-housing (chronic homelessness) check, duplicate detection, and what intake will ask. |
| **Documentation** | Pick sections, then print, save as PDF, email, or download as a file. |
| **Funder report** | Totals for any period, with no names, as a printout or spreadsheet. |
| **Passcode lock** | Encrypts records and backups; locks itself when left alone. |
| **NYC resources** | 41 hotlines, intake sites and departments, plus what paperwork each step needs. Another city is another data file. |

The full guide is in [docs/user-guide.md](docs/user-guide.md).

## Project layout

```
index.html               the app
sw.js                    offline support (service worker)
manifest.webmanifest     makes it installable
Start App.bat            local launcher (serves the app, then opens it)
render.yaml              hosting blueprint with a strict security policy

assets/
  core/      util · config · crypto · store · flow · doc · report   (no DOM; tested)
  data/      catalogs · resources-nyc · sample-data                 (plain data)
  ui/        ui (form fields, charts, files) · packet-style
  views/     one file per screen: today, overview, people, person, plan,
             history, documentation, report, settings, help, lock
  app.js     shared state, rendering, field binding
  actions.js every button and input, as one lookup table
  main.js    start-up, saving on close, auto-lock, offline
  css/       styles · refine · features

tests/       node tests/run-node.js, or open tests/index.html
docs/        user guide and deployment
```

Plain scripts, no build step and no dependencies, on purpose: the app must open straight
from a file on a laptop with no internet.

## Plans

The app is free for outreach workers. Teams and cities pay for hosting, set-up, training and
support around it. Edit `assets/core/config.js` to set your contact email, payment link and
plans, which appear on Help → Plans & support.

## Development

```bash
node tests/run-node.js
```

Tests cover dates, stage and prompt rules, the funder report, import sanitising, CSV safety
and encryption. They run on every push via GitHub Actions.

---

## A note on what this app is for

It collects information about people who rarely get to control their own story. Ask before
you write. Show them what you wrote if they want to see it. Let them correct it.
