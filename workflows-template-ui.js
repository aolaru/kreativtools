(function initKreativWorkflowTemplates() {
  const readArray = (storageKey) => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeArray = (storageKey, entries) => {
    window.localStorage.setItem(storageKey, JSON.stringify(entries));
  };

  const createButton = (label, onClick) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost header-link';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  };

  const create = ({
    storageKey,
    list,
    nameInput,
    limitCard,
    updateStatus,
    describeTemplate,
    applyTemplate,
    collectTemplate,
    emptyText = 'No saved templates yet.',
    savedText = (name) => `${name} saved as a workflow template.`,
    deletedText = (name) => `${name} removed.`,
    maxTemplates = 8,
  }) => {
    const read = () => readArray(storageKey);
    const write = (templates) => writeArray(storageKey, templates);
    const hideLimit = () => {
      if (limitCard) limitCard.hidden = true;
    };
    const render = () => {
      const templates = read();
      list.replaceChildren();

      if (!templates.length) {
        const empty = document.createElement('p');
        empty.className = 'studio-stage-note';
        empty.textContent = emptyText;
        list.append(empty);
        return templates;
      }

      templates.forEach((template) => {
        const card = document.createElement('article');
        card.className = 'workflow-template-item';

        const meta = document.createElement('div');
        meta.className = 'workflow-template-copy';

        const title = document.createElement('strong');
        title.textContent = template.name;

        const details = document.createElement('span');
        details.textContent = describeTemplate(template);

        const actions = document.createElement('div');
        actions.className = 'workflow-template-actions';

        actions.append(
          createButton('Apply', () => applyTemplate(template)),
          createButton('Delete', () => {
            write(read().filter((entry) => entry.name !== template.name));
            render();
            hideLimit();
            updateStatus(deletedText(template.name));
          })
        );

        meta.append(title, details);
        card.append(meta, actions);
        list.append(card);
      });

      return templates;
    };

    const save = ({ name, beforeSave } = {}) => {
      const templateName = (name || nameInput?.value || '').trim();
      if (typeof beforeSave === 'function' && !beforeSave()) return false;

      if (!templateName) {
        updateStatus('Add a template name first.');
        return false;
      }

      const nextTemplate = { name: templateName, ...collectTemplate() };
      const templates = read();
      const existingIndex = templates.findIndex((entry) => entry.name.toLowerCase() === templateName.toLowerCase());

      if (existingIndex < 0 && templates.length >= maxTemplates) {
        updateStatus(`This browser keeps up to ${maxTemplates} named templates. Delete one before saving another.`);
        if (limitCard) limitCard.hidden = false;
        return false;
      }

      if (existingIndex >= 0) templates[existingIndex] = nextTemplate;
      else templates.unshift(nextTemplate);

      write(templates.slice(0, maxTemplates));
      if (nameInput) nameInput.value = '';
      render();
      hideLimit();
      updateStatus(savedText(templateName));
      return true;
    };

    return { read, write, render, save };
  };

  window.kreativWorkflowTemplates = { create };
})();
