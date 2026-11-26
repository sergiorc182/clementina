/**
 * FiltroBuscador (Vanilla JS): Campo de selección con filtro activo en tiempo real.
 * Busca y filtra opciones a medida que se ingresan o eliminan caracteres.
 */

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function crearFiltroBuscador(container, initialProps = {}) {
  let props = {
    label: '',
    id: '',
    placeholder: 'Escriba para filtrar...',
    items: [],
    selectedId: '',
    onSelect: () => {},
    getItemKey: (it) => it.id,
    getItemLabel: (it) => String(it),
    getItemSubLabel: null,
    filterFn: null,
    disabled: false,
    ...initialProps
  };

  let busqueda = '';
  let abierto = false;
  let lastSelectedId = undefined;
  let lastItemsLength = -1;

  // Estructura base persistente para conservar el foco del input mientras el usuario escribe
  container.innerHTML = `
    <div class="filtro-buscador-group">
      <label class="filtro-label"></label>
      <div class="filtro-input-wrapper">
        <span class="filtro-icon"></span>
        <input type="text" class="filtro-input" autocomplete="off" />
        <button type="button" class="filtro-btn-clear" title="Borrar búsqueda" style="display: none;">✕</button>
        <button type="button" class="filtro-btn-toggle" tabindex="-1">▼</button>
      </div>
      <div class="filtro-dropdown" style="display: none;"></div>
    </div>
  `;

  const groupEl = container.querySelector('.filtro-buscador-group');
  const labelEl = container.querySelector('.filtro-label');
  const inputEl = container.querySelector('.filtro-input');
  const clearBtn = container.querySelector('.filtro-btn-clear');
  const toggleBtn = container.querySelector('.filtro-btn-toggle');
  const dropdownEl = container.querySelector('.filtro-dropdown');

  const sincronizarTextoSeleccionado = () => {
    if (props.selectedId && props.items && props.items.length > 0) {
      const seleccionado = props.items.find(
        (it) => String(props.getItemKey(it)) === String(props.selectedId)
      );
      if (seleccionado) {
        busqueda = props.getItemLabel(seleccionado);
      } else {
        busqueda = '';
      }
    } else if (!props.selectedId) {
      busqueda = '';
    }
    inputEl.value = busqueda;
  };

  const obtenerItemsFiltrados = () => {
    const termino = busqueda.trim().toLowerCase();
    const lista = props.items || [];
    return lista.filter((item) => {
      if (!termino) return true;
      if (props.filterFn) return props.filterFn(item, termino);
      const mainLabel = String(props.getItemLabel(item) || '').toLowerCase();
      const subLabel = props.getItemSubLabel
        ? String(props.getItemSubLabel(item) || '').toLowerCase()
        : '';
      return mainLabel.includes(termino) || subLabel.includes(termino);
    });
  };

  const renderDropdown = () => {
    // Botón limpiar
    if (busqueda && !props.disabled) {
      clearBtn.style.display = '';
    } else {
      clearBtn.style.display = 'none';
    }

    // Icono toggle
    toggleBtn.textContent = abierto ? '▲' : '▼';
    toggleBtn.disabled = Boolean(props.disabled);

    if (!abierto || props.disabled) {
      dropdownEl.style.display = 'none';
      dropdownEl.innerHTML = '';
      return;
    }

    const termino = busqueda.trim().toLowerCase();
    const itemsFiltrados = obtenerItemsFiltrados();

    let html = `
      <div class="filtro-dropdown-header">
        <span>
          ${itemsFiltrados.length} ${itemsFiltrados.length === 1 ? 'coincidencia' : 'coincidencias'}
        </span>
        ${
          termino
            ? `<span class="filtro-term-indicator">filtrando por: "<em>${escapeHtml(termino)}</em>"</span>`
            : ''
        }
      </div>
      <ul class="filtro-options-list">
    `;

    if (itemsFiltrados.length === 0) {
      html += `
        <li class="filtro-no-results">
          No se encontraron resultados para "<strong>${escapeHtml(busqueda)}</strong>"
        </li>
      `;
    } else {
      itemsFiltrados.forEach((item, idx) => {
        const key = props.getItemKey(item);
        const isSelected = String(key) === String(props.selectedId);
        const mainText = escapeHtml(props.getItemLabel(item));
        const subText = props.getItemSubLabel ? escapeHtml(props.getItemSubLabel(item)) : '';

        html += `
          <li class="filtro-option-item ${isSelected ? 'selected' : ''}" data-idx="${idx}">
            <div class="filtro-option-main">
              <span class="filtro-option-text">${mainText}</span>
              ${isSelected ? '<span class="filtro-check">✓</span>' : ''}
            </div>
            ${subText ? `<div class="filtro-option-sub">${subText}</div>` : ''}
          </li>
        `;
      });
    }

    html += `</ul>`;
    dropdownEl.innerHTML = html;
    dropdownEl.style.display = 'block';

    // Eventos de selección de cada opción
    const optionItems = dropdownEl.querySelectorAll('.filtro-option-item');
    optionItems.forEach((li) => {
      li.addEventListener('click', () => {
        const idx = Number(li.getAttribute('data-idx'));
        const item = itemsFiltrados[idx];
        if (!item) return;
        abierto = false;
        busqueda = props.getItemLabel(item);
        inputEl.value = busqueda;
        renderDropdown();
        props.onSelect(item);
      });
    });
  };

  // Eventos del input y botones
  inputEl.addEventListener('input', (e) => {
    busqueda = e.target.value;
    abierto = true;
    renderDropdown();
  });

  inputEl.addEventListener('focus', () => {
    if (!props.disabled) {
      abierto = true;
      renderDropdown();
    }
  });

  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    busqueda = '';
    inputEl.value = '';
    abierto = true;
    renderDropdown();
    inputEl.focus();
  });

  toggleBtn.addEventListener('click', () => {
    if (!props.disabled) {
      abierto = !abierto;
      renderDropdown();
    }
  });

  // Cerrar al hacer click fuera
  const handleClickOutside = (e) => {
    if (groupEl && !groupEl.contains(e.target)) {
      if (abierto) {
        abierto = false;
        sincronizarTextoSeleccionado();
        renderDropdown();
      }
    }
  };

  document.addEventListener('mousedown', handleClickOutside);

  const update = (newProps = {}) => {
    props = { ...props, ...newProps };

    if (props.label) {
      labelEl.style.display = '';
      labelEl.textContent = props.label;
      labelEl.setAttribute('for', props.id || '');
    } else {
      labelEl.style.display = 'none';
    }

    inputEl.id = props.id || '';
    inputEl.placeholder = props.placeholder || 'Escriba para filtrar...';
    inputEl.disabled = Boolean(props.disabled);

    const itemsLen = Array.isArray(props.items) ? props.items.length : 0;
    if (
      String(props.selectedId) !== String(lastSelectedId) ||
      (itemsLen !== lastItemsLength && props.selectedId)
    ) {
      lastSelectedId = props.selectedId;
      lastItemsLength = itemsLen;
      sincronizarTextoSeleccionado();
    }

    renderDropdown();
  };

  update(props);

  return {
    update,
    destroy: () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  };
}

