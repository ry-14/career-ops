// Minimal chip/tag input: type a value, press Enter or "," to add it as a
// removable chip. Used for the multi-value job_preferences fields (titles,
// industries, locations, skills) which are stored as text[] columns.
export function createTagInput(root, { placeholder = 'Type and press Enter', initial = [] } = {}) {
  root.className = `${root.className} flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-950/80 p-2.5 transition-all duration-200 ease-in-out focus-within:border-electric-500 focus-within:ring-2 focus-within:ring-electric-500/20`;

  let values = [...initial];

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.className = 'min-w-[140px] flex-1 bg-transparent px-1.5 py-1 text-sm text-white placeholder:text-slate-500 outline-none';

  function addValue(raw) {
    const val = raw.trim();
    if (val && !values.includes(val)) {
      values.push(val);
      render();
    }
  }

  function render() {
    root.innerHTML = '';
    values.forEach((val, i) => {
      const chip = document.createElement('span');
      chip.className = 'inline-flex items-center gap-1.5 rounded-full bg-electric-500/15 px-3 py-1.5 text-xs font-medium text-electric-400 ring-1 ring-electric-500/30';

      const label = document.createElement('span');
      label.textContent = val;
      chip.appendChild(label);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.setAttribute('aria-label', `Remove ${val}`);
      removeBtn.className = 'flex h-4 w-4 items-center justify-center rounded-full text-electric-400/70 transition-colors duration-150 hover:text-white';
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => {
        values.splice(i, 1);
        render();
      });
      chip.appendChild(removeBtn);
      root.appendChild(chip);
    });
    root.appendChild(input);
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue(input.value.replace(/,$/, ''));
      input.value = '';
    } else if (e.key === 'Backspace' && input.value === '' && values.length) {
      values.pop();
      render();
    }
  });

  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addValue(input.value);
      input.value = '';
    }
  });

  render();

  return {
    getValues: () => [...values],
    setValues: (arr) => {
      values = [...arr];
      render();
    },
  };
}
