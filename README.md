# Outreach Companion

A record keeper for street outreach. It holds, for each person you meet:

- **where they stay** — situation, place, cross streets, how long, who is with them, safety notes
- **what they are trying to accomplish** — goals in their own words, why it matters, next steps, status
- **a photo** — taken with consent, shrunk automatically so the app stays fast
- **My Story** — their own account of how they got here, their strengths and hopes
- needs, barriers, benefits, a documents checklist, a contact log, and referrals
- **a plan** — what stage they are at, and what is worth doing next
- **local resources** — NYC hotlines, shelter intake, departments, and the paperwork each step needs
- **documentation** you can print, save as PDF, email, or download as a file

Everything is stored **on the device only**. There is no account, no server, and nothing is
uploaded anywhere.

---

## Starting it

**Double-click `Start App.bat`.** It opens the app in your browser and leaves a small black
window open — keep that window open while you work, and close it when you are done.

You can also just double-click `index.html`. Everything works that way except the
"Use my current location" button, which browsers only allow over a real connection.

Works in Chrome, Edge, and Firefox, on a laptop, tablet, or phone.

---

## Using it in the field

1. **Ask first.** Explain what you are writing down and why. Record what they agreed to on the
   Overview tab — including whether a photo and their story may be shared.
2. **Start small.** A name they go by and where they stay is enough for a first contact.
   Nothing in this app is required; a blank field is a record of their choice.
3. **Use their words.** Goals and My Story should read the way they said it, not the way a
   form wants it. "Get my daughter back" beats "family reunification services".
4. **Log every contact.** One line each time. This is what demonstrates continuity of care
   when an agency asks.

---

## Seeing it work: the sample caseload

A new install is empty, which makes the app hard to judge and harder to learn. On the Overview
screen (or in Settings) there is **Load sample caseload**: six invented people who between them
trigger every rule in the app — someone who may qualify as chronically homeless, someone recently
housed, a first contact with no consent yet, an overdue follow-up, a young adult who should never
be sent to adult intake, and a duplicate.

They are **badged "sample"**, never mix with real records, and **Remove sample records** takes all
six and nothing else. Good for training a new worker.

---

## Today, and the plan

**Today** is the screen the app opens on. It is the round before you walk it:

- **Due now** — follow-ups you set, on the day they fall due
- **Needs attention** — consent never recorded, a goal marked stuck, someone nobody has seen in weeks
- **Going quiet** — no contact in over 14 days and nothing planned (change the window in Settings)
- a **backup reminder** when it has been more than a week

Every person also has a **Plan & next steps** tab:

- **A stage** — First contact → Building trust → Engaged → Papers in hand → Assessed → Housed →
  Staying housed. The stage is worked out from what is in the record, not set by hand, so it stays
  honest. You can override it when the record does not tell the whole story.
- **Next steps**, generated from the record and sorted into *Needs attention*, *This week*, and
  *When the moment is right*. That last group is deliberate: a blank field is usually trust that
  has not been earned yet, not sloppy data entry, and the app never treats it as a failing.
- **Milestones** — date of engagement, assessment date, move-in date. One tap each. These are the
  dates funders and agencies ask for later and that nobody can reconstruct from memory.
- **A priority housing check.** Permanent supportive housing is usually gated on HUD's
  *chronically homeless* definition — a disabling condition plus a year of homelessness, or four
  or more episodes in three years. Workers routinely miss that someone already qualifies, so the
  app raises it. **It is a prompt to check with your coordinated entry lead, never a
  determination.**
- **Possible duplicates** — two workers meeting the same person on different nights is normal.
  It is only cheap to fix early.

### What intake will ask anyway

The Plan tab tracks which of HUD's Universal Data Elements are already known. **This app is not
an HMIS and reports to nobody** — but intake asks these same questions, and making someone
recount the worst years of their life a second time because a form was blank is a harm worth
avoiding. Fill them in as they come up naturally, never as a checklist run at someone.

**The Social Security number itself is deliberately not stored.** A phone in the field is the
wrong place for it. The app only records whether it is held somewhere official.

One note on assessment tools: the **VI-SPDAT was retired in 2023** and communities have moved to
their own replacements. This app does not score anyone, and you should not treat anything here as
a substitute for your local coordinated entry assessment.

---

## Overview: the caseload at a glance

- **Where the caseload is** — how many people sit at each stage. A pile-up at one stage is
  usually a bottleneck worth naming; most caseloads stall at paperwork.
- **Contact over time** — contacts per week for the last twelve weeks. Showing up repeatedly
  *is* the intervention, and this is the shape of it.
- **Progress worth reporting** — engaged, photo ID in hand, housed, and how many may qualify for
  permanent supportive housing. The numbers a funder asks for, without counting by hand.
- **What people need** and **where people stay**, ranked.

Charts are hand-drawn SVG — no library, nothing loaded from the internet — and every bar states
its number in text beside it, so nothing depends on reading a bar by eye or on seeing colour.

## History: one timeline

The **History** tab merges contacts, milestones, goals and referrals onto a single dated spine,
newest first, with anything still in the future marked *planned*. Those four things all carry
dates but live in four different places, so nobody ever sees the shape of a person's arc. This is
usually the first thing a worker covering someone else's caseload actually needs.

The editable contact log sits underneath, unchanged.

---

## Local resources (Help → NYC resources)

Forty-one New York City resources, grouped by how urgent they are: **Right now**, **A bed
tonight**, **Young people under 25**, **Money, food and health**, **Keeping or finding housing**,
**City departments**, and other lines worth having.

- Every number is a **tap-to-dial link** on a phone.
- **Search** filters the whole sheet — try "veteran", "food", "youth".
- **Print this sheet** produces a clean street sheet with the app furniture stripped out and web
  addresses spelled out in full, so it works on paper. Hand it to someone.

**Everything carries a "checked" date, and some entries are marked "check first".** That is not
padding. NYC shelter intake moved during 2026 — the old 30th Street centre at 400 East 30th Street
has closed, and sources disagreed on both the exact changeover date and the women's intake
address. Rather than pick one and sound confident, the app shows the disagreement and tells you to
ring ahead. **A worker sending someone across the city to a closed door in February is a real
harm.**

The pack lives in [`assets/resources-nyc.js`](assets/resources-nyc.js) as plain data. Correct
anything that has changed and it updates everywhere. Another city is another file of the same
shape — nothing else in the app is New York specific.

## Documents needed (Help → Documents needed)

Eight checklists covering what paperwork each step actually requires: shelter, IDNYC, Social
Security card, birth certificate, State ID, HRA benefits, CityFHEPS, and veterans' services.

The first one matters most: **asking for shelter in New York City requires no documents at all.**
If someone is turned away for lack of ID, that refusal is often reversible — the card says so, and
gives the Coalition for the Homeless crisis line to call.

---

## Printing and emailing

Open a person → **Documentation** tab.

Choose which sections belong in this particular document. A shelter referral does not need
someone's whole life story; a housing application does not need the contact log. There are
ready-made starting points (Full record, Referral packet, Story sheet, Housing application
support, Contact card), and you can tick sections on or off from there.

The **Housing history & key dates** section collects the things a receiving agency asks for
first — how long they have been homeless, engagement and assessment dates, Continuum of Care,
and the chronic-homelessness flag where it applies. It is in the Referral and Housing presets and
out of the Story sheet.

**Your next steps never leave the team.** The suggestions on the Plan tab are internal prompts
for the worker and are deliberately excluded from every printed and emailed document.

Then:

| Button | What it does |
| --- | --- |
| **Print this record** | Opens the normal print dialog. Pick **Save as PDF** as the printer to get a PDF file. |
| **Open in email app** | Opens your email program with the record already written into the message. |
| **Download as web page (.html)** | One self-contained file, photo included. Attach it to an email or open it on any computer. |
| **Download as plain text (.txt)** | For pasting into another system. |
| **Copy text to clipboard** | Same, without a file. |

Long records get shortened when sent by email link — email programs limit how much text a
link may carry. For the complete record, download the `.html` file and attach it.

**Only send someone's record onward when they have agreed to it.**

---

## Backups — please read this one

The records live in this browser, on this device. That is what keeps them private, and it is
also the risk: **clearing your browsing data will erase them.** So will reinstalling the
browser, or using a different one.

Settings → **Download backup file** saves everything as a single `.json` file. Do it weekly,
and before any browser or computer update. Keep the file somewhere safe — it contains
everything, including photos.

To restore, or to combine two workers' devices, use **Restore**:

- **Merge** adds records from the file and updates ones that were edited more recently there.
  Records edited more recently on this device win, so careful field notes are never
  overwritten by an older copy.
- **Replace** wipes what is on this device first.

**Export list as CSV** gives a spreadsheet of everyone for reporting or grant returns.

---

## If storage runs out

Photos take the most space. Each one is shrunk to about 10–60 KB before it is saved, but
browsers still cap how much a single page may store. If a warning appears, download a backup
first, then remove photos from older records.

---

## What is in the folder

```
index.html            the app
Start App.bat         launcher (serves the app locally, then opens it)
assets/
  styles.css          appearance of the app
  packet-style.js     appearance of the printed/emailed document
  workflow.js         stages, next steps, duplicate and priority checks
  resources-nyc.js    NYC hotlines, shelters, departments, document checklists
  sample-data.js      the six-person demo caseload
  storage.js          local saving, backup and restore
  doc.js              builds the document in print, text and file form
  app.js              screens and editing
render.yaml           Render blueprint, for hosting it online
README.md             this file
```

No installation, no dependencies, no internet connection required.

---

## Putting it online (Render)

`render.yaml` publishes the app as a **static site** — there is no backend and no database,
on purpose.

**Hosting it online does not put anyone's records online.** The site only serves the app
itself; every record still lives in the browser of whoever is using it. Two workers on the
same URL do not see each other's records, and neither does the host. The trade-off is the
same as before: each device holds its own data, and backups are still yours to keep.

To deploy:

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, connect the repository, and confirm. Render reads
   `render.yaml` and needs no further settings.
3. Every later `git push` redeploys automatically.

The blueprint sets a strict Content-Security-Policy — the app loads nothing from the
internet, so nothing external is permitted. If you ever add an outside font, script, or
analytics tag, it will be blocked until you widen that policy in `render.yaml`.

**Cache note:** asset URLs in `index.html` end in `?v=1`. After editing anything in
`assets/`, bump that number (`?v=2`, …) or returning browsers will keep running the old code.

---

## A note on what this app is for

It collects information about people who rarely get to control their own story. Ask before
you write. Show them what you wrote if they want to see it. Let them correct it.

The **My Story** section is there on purpose: a person is more than a list of needs and
barriers, and the document you hand to an agency should say so.
