# Outreach Companion

A record keeper for street outreach. It holds, for each person you meet:

- **where they stay** — situation, place, cross streets, how long, who is with them, safety notes
- **what they are trying to accomplish** — goals in their own words, why it matters, next steps, status
- **a photo** — taken with consent, shrunk automatically so the app stays fast
- **My Story** — their own account of how they got here, their strengths and hopes
- needs, barriers, benefits, a documents checklist, a contact log, and referrals
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

## Printing and emailing

Open a person → **Documentation** tab.

Choose which sections belong in this particular document. A shelter referral does not need
someone's whole life story; a housing application does not need the contact log. There are
ready-made starting points (Full record, Referral packet, Story sheet, Housing application
support, Contact card), and you can tick sections on or off from there.

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
