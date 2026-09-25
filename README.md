# James Gress

A dependency-free single-page personal site for GitHub Pages. Authored in plain HTML and CSS — no build step, no JavaScript.

## Files

- `index.html` — the page
- `styles.css` — styling
- `assets/00-jamesgress.png` — portrait asset

## Local preview

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## GitHub Pages setup

1. In GitHub, open `Settings` → `Pages`.
2. Set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys the static site directly with no build step.
