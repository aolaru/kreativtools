(function () {
  const controllers = new WeakMap();

  const create = ({ prepareButton, downloadButton, workspace, status }) => {
    if (controllers.has(prepareButton)) return controllers.get(prepareButton);
    const controls = prepareButton.closest('.controls') || prepareButton.parentElement;
    const steps = document.createElement('p');
    steps.className = 'export-steps';
    steps.textContent = '1. Prepare your file. 2. Review the result. 3. Download.';
    const state = document.createElement('p');
    state.className = 'export-state';
    state.setAttribute('role', 'status');
    state.setAttribute('aria-live', 'polite');
    controls.prepend(steps);
    controls.append(state);
    const preview = document.createElement('div');
    preview.className = 'export-preview';
    preview.hidden = true;
    controls.append(preview);

    let result = null;
    let previewUrl = '';
    let version = 0;
    let working = false;
    const label = prepareButton.textContent;

    const render = () => {
      const ready = !downloadButton.disabled;
      prepareButton.classList.toggle('primary', !ready);
      prepareButton.classList.toggle('ghost', ready);
      downloadButton.classList.toggle('primary', ready);
      downloadButton.classList.toggle('secondary-button', !ready);
      const busy = working || (prepareButton.dataset.exportStarted === 'true' && prepareButton.disabled && !ready);
      prepareButton.setAttribute('aria-busy', String(busy));
      state.dataset.state = busy ? 'processing' : ready ? 'ready' : 'waiting';
      state.textContent = busy ? 'Preparing your file...' : ready
        ? result ? `${result.filename} - ${(result.blob.size / 1024).toFixed(1)} KB. Ready to download.` : 'Ready to download. Check the result before sharing.'
        : prepareButton.disabled && prepareButton.dataset.exportWaiting
          ? prepareButton.dataset.exportWaiting : 'Prepare the file to enable Download.';
    };

    const reset = () => {
      version += 1;
      result = null;
      preview.querySelector('audio, video')?.pause();
      preview.replaceChildren();
      preview.hidden = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
      downloadButton.disabled = true;
      if (working) {
        working = false;
        prepareButton.disabled = false;
        prepareButton.textContent = label;
      }
      delete prepareButton.dataset.exportStarted;
      render();
    };

    const prepare = async (build) => {
      if (working) return;
      reset();
      const request = version;
      working = true;
      prepareButton.disabled = true;
      prepareButton.textContent = 'Preparing...';
      render();
      try {
        // Allow the processing state to paint before synchronous encoding starts.
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (request !== version) return;
        const output = await build();
        if (request !== version) return;
        if (!output?.blob?.size || !output.filename) throw new Error('No output was generated. Check your file and settings.');
        result = output;
        const kind = output.blob.type.split('/')[0];
        if (kind === 'audio' || kind === 'video') {
          const caption = document.createElement('p');
          caption.textContent = `Prepared ${kind}`;
          const media = document.createElement(kind);
          media.className = 'export-media';
          media.controls = true;
          media.preload = 'metadata';
          media.setAttribute('aria-label', `Prepared ${kind} preview`);
          previewUrl = URL.createObjectURL(output.blob);
          media.src = previewUrl;
          preview.append(caption, media);
          preview.hidden = false;
        }
        downloadButton.disabled = false;
        status.textContent = `Ready: ${output.filename}. Use Download to keep the file.`;
      } catch (error) {
        if (request === version) status.textContent = error.message || 'Could not prepare this file. Please try again.';
      } finally {
        if (request === version) {
          working = false;
          prepareButton.disabled = false;
          prepareButton.textContent = label;
          render();
        }
      }
    };

    const download = () => {
      if (!result || working) return;
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `Downloaded ${result.filename}`;
    };

    prepareButton.addEventListener('click', () => {
      reset();
      prepareButton.dataset.exportStarted = 'true';
      render();
    }, true);
    new MutationObserver(render).observe(downloadButton, { attributes: true, attributeFilter: ['disabled'] });
    new MutationObserver(render).observe(prepareButton, { attributes: true, attributeFilter: ['disabled'] });
    const invalidate = (event) => {
      if (event.target.matches('input, select, textarea') && !event.target.matches('[data-export-ignore]')) {
        const hadResult = working || !downloadButton.disabled;
        reset();
        if (hadResult && status) status.textContent = 'Settings changed. Prepare the file again before downloading.';
      }
    };
    workspace.addEventListener('input', invalidate, true);
    workspace.addEventListener('change', invalidate, true);
    document.querySelectorAll('.upload-card input[type="file"]').forEach((input) => input.addEventListener('change', reset, true));
    document.querySelectorAll('.dropzone').forEach((zone) => zone.addEventListener('drop', reset, true));
    const controller = { prepare, download, reset };
    controllers.set(prepareButton, controller);
    const mobileBar = document.createElement('div');
    mobileBar.className = 'mobile-export-bar';
    mobileBar.setAttribute('role', 'region');
    mobileBar.setAttribute('aria-label', 'Quick file action');
    const mobileLabel = document.createElement('span');
    const mobileAction = document.createElement('button');
    mobileAction.type = 'button';
    mobileAction.className = 'primary';
    mobileBar.append(mobileLabel, mobileAction);
    document.body.append(mobileBar);
    let actionTarget = prepareButton;
    const renderMobile = () => {
      const ready = !downloadButton.disabled;
      const cancel = controls.querySelector('button[id$="CancelButton"]:not([hidden])');
      actionTarget = cancel || (ready ? downloadButton : prepareButton);
      const height = window.visualViewport?.height || innerHeight;
      const inView = [prepareButton, downloadButton, cancel].filter(Boolean).some((button) => {
        const bounds = button.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < height;
      });
      const editing = document.activeElement?.matches('textarea, input:not([type="checkbox"]):not([type="file"]), [contenteditable="true"]');
      const visible = !workspace.classList.contains('is-hidden') && !inView && !editing && matchMedia('(max-width: 700px)').matches;
      mobileBar.hidden = !visible;
      document.body.classList.toggle('has-mobile-export-bar', visible);
      mobileAction.textContent = actionTarget.textContent;
      mobileAction.disabled = actionTarget.disabled;
      mobileLabel.textContent = cancel ? 'Processing locally' : ready ? 'Your file is ready' : 'Next step';
    };
    mobileAction.addEventListener('click', () => actionTarget.click());
    new IntersectionObserver(renderMobile, { threshold: [0, 1] }).observe(controls);
    new MutationObserver(renderMobile).observe(workspace, { attributes: true, subtree: true, attributeFilter: ['class', 'disabled', 'hidden'] });
    window.addEventListener('scroll', renderMobile, { passive: true });
    window.addEventListener('resize', renderMobile, { passive: true });
    window.visualViewport?.addEventListener('resize', renderMobile);
    document.addEventListener('focusin', renderMobile);
    document.addEventListener('focusout', () => requestAnimationFrame(renderMobile));
    renderMobile();
    render();
    return controller;
  };

  window.kreativExportUi = { create };
  document.addEventListener('DOMContentLoaded', () => {
    const prepareButton = document.querySelector('[data-export-prepare]');
    const downloadButton = document.querySelector('[data-export-download]');
    if (!prepareButton || !downloadButton) return;
    create({ prepareButton, downloadButton, workspace: prepareButton.closest('.workspace'), status: document.querySelector('.tool-feedback') });
  });
})();
