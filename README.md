# James Gress slide deck

This repository now hosts a dependency-free HTML slide deck for GitHub Pages. The deck is authored directly in semantic HTML, styled with plain CSS, and navigated with a small vanilla JavaScript controller.

## Files

- `index.html` - audience deck
- `styles.css` - shared audience and presenter styling
- `slides.js` - deck navigation, deep-linking, history sync, and presenter messaging
- `presenter.html` - presenter console
- `presenter.js` - presenter timer, notes, previews, and synchronized navigation
- `assets/00-jamesgress.png` - portrait asset

## Local preview

Because the presenter console fetches the audience deck, serve the repository through a simple local web server instead of opening the files directly from disk.

### Python

```bash
cd /home/runner/work/jamesgress/jamesgress
python3 -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`
- `http://localhost:8000/presenter.html`

## Authoring

Slides are defined as `<section class="slide">` elements in `/home/runner/work/jamesgress/jamesgress/index.html`.

Each slide can include optional speaker notes inside:

```html
<aside class="speaker-notes" hidden>
  <p>Private presenter note</p>
</aside>
```

Use relative URLs for assets and links so the deck works both locally and from a GitHub Pages project subpath.

## Controls

### Audience view

- `Previous` / `Next` buttons
- Keyboard: `←`, `→`, `Page Up`, `Page Down`, `Home`, `End`, and `Space`
- Touch swipe on phones and tablets
- Deep links like `#slide-2`
- Browser back/forward history integration

### Presenter view

- Live current-slide preview
- Next-slide preview
- Speaker notes for the active slide
- Elapsed timer with reset
- Remote navigation that stays synchronized with the audience deck

## GitHub Pages setup

1. In GitHub, open `Settings` → `Pages`.
2. Set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/pages.yml` deploys the static site directly with no build step.
