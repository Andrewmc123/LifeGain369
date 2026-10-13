# Putting it online

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

**Updates reach everyone automatically.** Files are served with `Cache-Control: no-cache` and
the service worker (`sw.js`) fetches from the network first, so the next visit after a deploy
runs the new code — there are no version numbers to bump. When you add a new file under
`assets/`, also add it to the `SHELL` list in `sw.js` so it is available offline.

---

## Making it yours

`assets/core/config.js` holds everything that belongs to the publisher rather than the worker:
the product name, your contact email, a support/payment link, and the plans shown on
Help → Plans & support. Leave a value blank and the button that uses it is hidden.

## Tests

```bash
node tests/run-node.js
```

or open `tests/index.html` through the local server. GitHub Actions runs the same tests on
every push (`.github/workflows/tests.yml`).
