(() => {
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!slides.length) {
    return;
  }

  const isEmbed = new URLSearchParams(window.location.search).get('embed') === '1';
  const channel = !isEmbed && typeof BroadcastChannel === 'function' ? new BroadcastChannel('jamesgress-slides') : null;
  const position = document.querySelector('[data-slide-position]');
  const prevButton = document.querySelector('[data-action="prev"]');
  const nextButton = document.querySelector('[data-action="next"]');
  const storageKey = 'jamesgress-slide-state';
  const totalSlides = slides.length;
  let currentIndex = 0;

  document.body.dataset.embed = String(isEmbed);

  const readNotes = (slide) => {
    const notes = slide.querySelector('.speaker-notes');
    return notes ? notes.textContent?.trim() || '' : '';
  };

  const slideState = (index) => {
    const slide = slides[index];
    return {
      index,
      totalSlides,
      hash: `#slide-${index + 1}`,
      title: slide.dataset.title || slide.querySelector('h1, h2, h3')?.textContent?.trim() || `Slide ${index + 1}`,
      notes: readNotes(slide),
    };
  };

  const persistState = (state) => {
    if (isEmbed) {
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...state, updatedAt: Date.now() }));
    } catch {
      // Ignore storage failures.
    }
  };

  const publishState = () => {
    if (isEmbed) {
      return;
    }

    const state = slideState(currentIndex);
    persistState(state);
    channel?.postMessage({ type: 'slide-state', state });
  };

  const render = () => {
    slides.forEach((slide, index) => {
      const active = index === currentIndex;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.tabIndex = active ? 0 : -1;
    });

    if (position) {
      position.textContent = `${currentIndex + 1} / ${totalSlides}`;
    }

    if (prevButton) {
      prevButton.disabled = currentIndex === 0;
    }

    if (nextButton) {
      nextButton.disabled = currentIndex === totalSlides - 1;
    }

    document.title = `${slideState(currentIndex).title} · James Gress`;
    publishState();
  };

  const parseHash = () => {
    const match = window.location.hash.match(/^#slide-(\d+)$/i);
    if (!match) {
      return 0;
    }

    const value = Number.parseInt(match[1], 10) - 1;
    if (Number.isNaN(value)) {
      return 0;
    }

    return Math.min(Math.max(value, 0), totalSlides - 1);
  };

  const syncHistory = (replace = false) => {
    const state = slideState(currentIndex);
    const method = replace ? 'replaceState' : 'pushState';
    const nextUrl = `${window.location.pathname}${window.location.search}${state.hash}`;
    history[method](state, '', nextUrl);
  };

  const goTo = (index, options = {}) => {
    const nextIndex = Math.min(Math.max(index, 0), totalSlides - 1);
    if (nextIndex === currentIndex && !options.force) {
      return;
    }

    currentIndex = nextIndex;
    render();

    if (options.updateHistory !== false) {
      syncHistory(Boolean(options.replace));
    }
  };

  const fromLocation = (replace = false) => {
    currentIndex = parseHash();
    render();
    syncHistory(replace);
  };

  prevButton?.addEventListener('click', () => goTo(currentIndex - 1));
  nextButton?.addEventListener('click', () => goTo(currentIndex + 1));

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      const tag = target.tagName;
      if (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }
    }

    if (['ArrowRight', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      goTo(currentIndex + 1);
    } else if (['ArrowLeft', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      goTo(currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      goTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      goTo(totalSlides - 1);
    }
  });

  let touchStartX = 0;
  let touchStartY = 0;
  document.addEventListener(
    'touchstart',
    (event) => {
      const touch = event.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true },
  );

  document.addEventListener(
    'touchend',
    (event) => {
      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        goTo(currentIndex + 1);
      } else {
        goTo(currentIndex - 1);
      }
    },
    { passive: true },
  );

  window.addEventListener('hashchange', () => {
    const nextIndex = parseHash();
    if (nextIndex !== currentIndex) {
      currentIndex = nextIndex;
      render();
    }
  });

  window.addEventListener('popstate', (event) => {
    if (event.state && typeof event.state.index === 'number') {
      currentIndex = Math.min(Math.max(event.state.index, 0), totalSlides - 1);
      render();
      return;
    }

    currentIndex = parseHash();
    render();
  });

  channel?.addEventListener('message', (event) => {
    const message = event.data;
    if (!message || typeof message !== 'object') {
      return;
    }

    if (message.type === 'navigate' && typeof message.index === 'number') {
      goTo(message.index);
    }

    if (message.type === 'request-state') {
      publishState();
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== storageKey || !event.newValue) {
      return;
    }

    try {
      const state = JSON.parse(event.newValue);
      if (typeof state.index === 'number' && state.index !== currentIndex) {
        goTo(state.index, { replace: true });
      }
    } catch {
      // Ignore invalid storage payloads.
    }
  });

  fromLocation(true);
})();
