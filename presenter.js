(() => {
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('jamesgress-slides') : null;
  const storageKey = 'jamesgress-slide-state';
  const timer = document.querySelector('[data-presenter-timer]');
  const notes = document.querySelector('[data-presenter-notes]');
  const position = document.querySelector('[data-presenter-position]');
  const currentFrame = document.querySelector('[data-presenter-current]');
  const nextCard = document.querySelector('[data-presenter-next]');
  const resetButton = document.querySelector('[data-presenter-reset]');
  const prevButton = document.querySelector('[data-action="prev"]');
  const nextButton = document.querySelector('[data-action="next"]');
  const audienceUrl = new URL('index.html', new URL('./', window.location.href));
  let currentState = { index: 0, totalSlides: 1, title: 'Slide 1', notes: '' };
  let slideSummaries = [];
  let startedAt = Date.now();

  const clampIndex = (value) => Math.min(Math.max(value, 0), Math.max((currentState.totalSlides || slideSummaries.length || 1) - 1, 0));

  const formatElapsed = () => {
    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const updateTimer = () => {
    if (timer) {
      timer.textContent = formatElapsed();
    }
  };

  const escapeHtml = (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');

  const stripMarkup = (value) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = value;
    return wrapper.textContent?.trim() || '';
  };

  const previewText = (index) => {
    const slide = slideSummaries[index];
    if (!slide) {
      return { title: 'End of deck', body: 'You are on the final slide.' };
    }

    return {
      title: slide.title,
      body: slide.preview || 'No preview available.',
    };
  };

  const renderState = () => {
    const totalSlides = currentState.totalSlides || Math.max(slideSummaries.length, 1);
    if (position) {
      position.textContent = `Slide ${currentState.index + 1} of ${totalSlides}`;
    }

    if (notes) {
      notes.textContent = currentState.notes || 'No notes for this slide.';
    }

    if (currentFrame) {
      const previewUrl = new URL(audienceUrl);
      previewUrl.searchParams.set('embed', '1');
      previewUrl.hash = `slide-${currentState.index + 1}`;
      currentFrame.src = previewUrl.toString();
    }

    const next = previewText(currentState.index + 1);
    if (nextCard) {
      nextCard.innerHTML = `<strong>${escapeHtml(next.title)}</strong><p>${escapeHtml(next.body)}</p>`;
    }

    if (prevButton) {
      prevButton.disabled = currentState.index === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentState.index >= totalSlides - 1;
    }
  };

  const persistState = (state) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, updatedAt: Date.now() }));
    } catch {
      // Ignore storage failures.
    }
  };

  const applyState = (state) => {
    currentState = {
      ...currentState,
      ...state,
      totalSlides: state.totalSlides || currentState.totalSlides,
    };
    currentState.index = clampIndex(currentState.index);
    persistState(currentState);
    renderState();
  };

  const navigate = (index) => {
    const nextIndex = clampIndex(index);
    channel?.postMessage({ type: 'navigate', index: nextIndex });
    applyState({ index: nextIndex });
  };

  const loadSlides = async () => {
    const response = await fetch(audienceUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Unable to load audience deck: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const documentFragment = parser.parseFromString(html, 'text/html');
    slideSummaries = Array.from(documentFragment.querySelectorAll('.slide')).map((slide, index) => ({
      index,
      title: slide.dataset.title || slide.querySelector('h1, h2, h3')?.textContent?.trim() || `Slide ${index + 1}`,
      preview: stripMarkup(slide.querySelector('p, li')?.outerHTML || slide.textContent || '').slice(0, 160),
      notes: slide.querySelector('.speaker-notes')?.textContent?.trim() || '',
    }));

    const first = slideSummaries[0];
    applyState({ totalSlides: slideSummaries.length || 1, title: first?.title || currentState.title, notes: first?.notes || currentState.notes });
    renderState();
  };

  channel?.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.type === 'slide-state' && message.state) {
      applyState(message.state);
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey || !event.newValue) {
      return;
    }

    try {
      const state = JSON.parse(event.newValue);
      if (typeof state.index === 'number') {
        applyState(state);
      }
    } catch {
      // Ignore invalid storage payloads.
    }
  });

  prevButton?.addEventListener('click', () => navigate(Math.max(currentState.index - 1, 0)));
  nextButton?.addEventListener('click', () => navigate(currentState.index + 1));
  resetButton?.addEventListener('click', () => {
    startedAt = Date.now();
    updateTimer();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      navigate(currentState.index + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      navigate(Math.max(currentState.index - 1, 0));
    }
  });

  setInterval(updateTimer, 1000);
  updateTimer();

  loadSlides()
    .then(() => {
      channel?.postMessage({ type: 'request-state' });
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          applyState(JSON.parse(stored));
        }
      } catch {
        // Ignore storage failures.
      }
    })
    .catch(() => {
      if (nextCard) {
        nextCard.innerHTML = '<strong>Preview unavailable</strong><p>Open the audience view to continue.</p>';
      }
      channel?.postMessage({ type: 'request-state' });
    });
})();
