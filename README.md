# Planning Center Extensions

A small TypeScript-powered tool to scan Planning Center Services plans for items that were entered
by name and are not linked to a song. It compares those items to your Songs list using fuzzy
matching and lets you link the plan item to the correct song for historical accuracy.

## Getting Started

### GitHub Pages (no local setup)

1. In your GitHub repo, go to **Settings → Pages**.
2. Set **Source** to `main` (or your default branch) and **/root**.
3. Save, then wait for the Pages URL to appear.
4. Visit `https://<your-username>.github.io/<your-repo>/`.

> Tip: Because this is a static site (HTML + JS), GitHub Pages can host it directly without
> any build step.

### Local setup

1. Install dependencies.
   ```bash
   npm install
   ```
2. Compile TypeScript.
   ```bash
   npm run build
   ```
3. Serve the repo (GitHub Pages, `python -m http.server`, etc.).
4. Open `index.html` in your browser.

## Using the Song Linker

- Create a Planning Center API application and copy the **Application ID** and **Secret**.
- Enter your **Service Type ID** (found in the Planning Center Services URL).
- Choose how many recent plans to scan and adjust the match threshold.
- Click **Scan for unlinked songs** to see suggested matches.
- Click **Link song** to update the plan item.

## Notes

- The tool runs entirely in your browser; credentials are not stored.
- You need permissions to edit plan items within the service type.
- For large catalogs, expect the scan to take a bit longer.
