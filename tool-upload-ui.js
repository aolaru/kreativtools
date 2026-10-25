(function () {
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const createLoadedBar = (uploadCard) => {
    const bar = document.createElement('div');
    bar.className = 'loaded-file-bar is-hidden';
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = `
      <div class="loaded-file-copy">
        <strong>No file loaded</strong>
        <span>Upload a file to begin.</span>
      </div>
      <div class="loaded-file-actions">
        <button type="button" class="ghost" data-upload-replace>Replace File</button>
        <button type="button" class="ghost" data-upload-remove>Remove</button>
      </div>
    `;
    uploadCard.appendChild(bar);
    return bar;
  };

  const init = ({
    input,
    dropzone,
    workspace,
    feedbackTarget,
    resetMode = 'reload',
    onReset,
  }) => {
    if (!input || !dropzone) return null;

    const uploadCard = dropzone.closest('.upload-card');
    if (!uploadCard) return null;

    // Upload buttons handle their own activation; do not also activate the dropzone.
    dropzone.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (event) => event.stopPropagation());
      button.addEventListener('keydown', (event) => event.stopPropagation());
    });

    const bar = uploadCard.querySelector('.loaded-file-bar') || createLoadedBar(uploadCard);
    const nameEl = bar.querySelector('.loaded-file-copy strong');
    const metaEl = bar.querySelector('.loaded-file-copy span');
    const replaceButton = bar.querySelector('[data-upload-replace]');
    const removeButton = bar.querySelector('[data-upload-remove]');
    const feedback = dropzone.querySelector('[id].status');
    if (feedback) {
      feedback.classList.add('tool-feedback');
      feedback.classList.remove('status-empty');
      feedback.setAttribute('role', 'status');
      feedback.setAttribute('aria-live', 'polite');
      feedback.setAttribute('aria-atomic', 'true');
    }

    const setVisibleState = (isLoaded) => {
      dropzone.classList.toggle('is-hidden', isLoaded);
      bar.classList.toggle('is-hidden', !isLoaded);
      if (workspace) {
        workspace.classList.toggle('workspace-has-loaded-bar', isLoaded);
      }
      if (feedback) {
        const destination = isLoaded && workspace
          ? feedbackTarget || workspace.querySelector('.controls') || workspace
          : uploadCard;
        destination.appendChild(feedback);
      }
    };

    const setLoaded = ({ name, size, meta, countLabel }) => {
      nameEl.textContent = countLabel || name || 'Loaded file';
      metaEl.textContent = meta || [formatBytes(size), 'Ready to continue'].filter(Boolean).join(' • ') || 'Ready to continue';
      setVisibleState(true);
    };

    const clear = () => {
      nameEl.textContent = 'No file loaded';
      metaEl.textContent = 'Upload a file to begin.';
      setVisibleState(false);
    };

    replaceButton?.addEventListener('click', () => input.click());
    removeButton?.addEventListener('click', () => {
      if (typeof onReset === 'function') {
        onReset();
        return;
      }
      if (resetMode === 'reload') {
        window.location.reload();
        return;
      }
      clear();
    });

    clear();

    return { setLoaded, clear, elements: { bar, nameEl, metaEl } };
  };

  window.kreativUploadUi = { init };
})();
