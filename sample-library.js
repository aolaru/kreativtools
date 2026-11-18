(() => {
  const search = document.getElementById('sampleSearch');
  if (!search) return;
  search.closest('.sample-controls').hidden = false;
  const category = document.getElementById('sampleCategory');
  const cards = Array.from(document.querySelectorAll('[data-sample-card]'));
  const count = document.getElementById('sampleCount');
  const empty = document.getElementById('sampleEmpty');
  const update = () => {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const searchable = `${card.textContent} ${card.dataset.tags || ''}`.toLocaleLowerCase();
      const match = (!query || searchable.includes(query)) && (!category || category.value === 'all' || card.dataset.category === category.value);
      card.hidden = !match;
      if (match) visible += 1;
    }
    count.textContent = `Showing ${visible} of ${cards.length} samples.`;
    empty.hidden = visible !== 0;
  };
  search.addEventListener('input', update);
  category?.addEventListener('change', update);
})();
