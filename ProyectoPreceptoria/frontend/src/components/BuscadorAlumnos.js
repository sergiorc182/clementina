/**
 * COMPONENTE 3: BuscadorAlumnos (Vanilla JS)
 * Buscador institucional de alumnos por apellido, nombre, DNI, legajo o carrera
 * sobre la base de datos MySQL 'clementina'.
 */

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function crearBuscadorAlumnos(container, initialProps = {}) {
  let props = {
    alumnos: [],
    onEditar: () => {},
    ...initialProps
  };

  let textoBusqueda = '';
  let filtroCarrera = '';

  const obtenerCarrerasUnicas = () => {
    const set = new Set();
    (props.alumnos || []).forEach((a) => {
      if (a.carrera) set.add(a.carrera);
    });
    return Array.from(set).sort();
  };

  const filtrarAlumnos = () => {
    const q = textoBusqueda.trim().toLowerCase();
    return (props.alumnos || []).filter((a) => {
      if (filtroCarrera && a.carrera !== filtroCarrera) return false;
      if (!q) return true;
      const campos = [
        a.apellido,
        a.nombre,
        a.numero_documento,
        a.legajo,
        a.email,
        a.carrera
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return campos.includes(q);
    });
  };

  const render = () => {
    const carreras = obtenerCarrerasUnicas();
    const resultados = filtrarAlumnos();
    const mostrarResultados = textoBusqueda.trim().length > 0 || filtroCarrera !== '';

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Buscador de Alumnos</h3>
        </div>

        <div class="search-form" style="display: flex; flex-direction: column; gap: 0.9rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label for="buscadorTextoAlumno">Buscar por Apellido, Nombre, DNI o Legajo</label>
            <input
              id="buscadorTextoAlumno"
              type="text"
              placeholder="Ej: Pérez, 40111222 o LEG-2024..."
              value="${escapeHtml(textoBusqueda)}"
            />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label for="buscadorCarreraAlumno">Filtrar por Carrera</label>
            <select id="buscadorCarreraAlumno">
              <option value="">Todas las carreras (${carreras.length})</option>
              ${carreras
                .map(
                  (c) =>
                    `<option value="${escapeHtml(c)}" ${filtroCarrera === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
                )
                .join('')}
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
              ${mostrarResultados ? `${resultados.length} alumno(s) encontrado(s)` : `${(props.alumnos || []).length} alumno(s) disponibles`}
            </span>
            ${
              mostrarResultados
                ? `<button type="button" id="btnLimpiarBuscadorAlumno" class="btn btn-secondary btn-sm">Limpiar</button>`
                : ''
            }
          </div>

          ${
            mostrarResultados
              ? resultados.length === 0
                ? `<p class="empty-text" style="margin: 0.5rem 0;">No se encontraron alumnos que coincidan con la búsqueda.</p>`
                : `
                  <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 290px; overflow-y: auto; padding-right: 4px;">
                    ${resultados
                      .slice(0, 20)
                      .map((al) => {
                        const id = al.id || al.id_alumno;
                        return `
                          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px;">
                            <div style="min-width: 0;">
                              <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">
                                ${escapeHtml(al.apellido)}, ${escapeHtml(al.nombre)}
                              </div>
                              <div style="font-size: 0.78rem; color: var(--text-muted);">
                                DNI ${escapeHtml(al.numero_documento || '-')} · ${escapeHtml(al.carrera || 'Sin carrera')}
                              </div>
                            </div>
                            <button
                              type="button"
                              class="btn btn-warning btn-sm"
                              data-buscador-editar="${escapeHtml(id)}"
                              style="flex-shrink: 0;"
                            >
                              Editar
                            </button>
                          </div>
                        `;
                      })
                      .join('')}
                  </div>
                `
              : `<p style="font-size: 0.84rem; color: var(--text-muted); margin: 0;">Escribí un apellido, DNI o elegí una carrera para localizar rápidamente a un estudiante y editar su ficha.</p>`
          }
        </div>
      </div>
    `;

    const inputEl = container.querySelector('#buscadorTextoAlumno');
    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        const cursorPos = e.target.selectionStart;
        textoBusqueda = e.target.value;
        render();
        const nextInput = container.querySelector('#buscadorTextoAlumno');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(cursorPos, cursorPos);
        }
      });
    }

    const selectEl = container.querySelector('#buscadorCarreraAlumno');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        filtroCarrera = e.target.value;
        render();
      });
    }

    const btnLimpiar = container.querySelector('#btnLimpiarBuscadorAlumno');
    if (btnLimpiar) {
      btnLimpiar.addEventListener('click', () => {
        textoBusqueda = '';
        filtroCarrera = '';
        render();
      });
    }

    container.querySelectorAll('[data-buscador-editar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-buscador-editar');
        const encontrado = (props.alumnos || []).find(
          (a) => String(a.id || a.id_alumno) === String(id)
        );
        if (encontrado && props.onEditar) {
          props.onEditar(encontrado);
        }
      });
    });
  };

  render();

  return {
    update(newProps = {}) {
      props = { ...props, ...newProps };
      render();
    }
  };
}
