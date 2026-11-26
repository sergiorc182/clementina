/**
 * COMPONENTE 2: ListaAlumnos (Vanilla JS)
 * Renderiza la tabla de alumnos matriculados en la base de datos 'clementina'.
 */

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function crearListaAlumnos(container, initialProps = {}) {
  let props = {
    alumnos: [],
    onEditar: () => {},
    onEliminar: () => {},
    cargando: false,
    ...initialProps
  };

  const render = () => {
    if (props.cargando) {
      container.innerHTML = `
        <div class="card">
          <p class="loading-text">Cargando listado de alumnos...</p>
        </div>
      `;
      return;
    }

    const alumnos = props.alumnos || [];

    if (alumnos.length === 0) {
      container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3>Alumnos Registrados (0)</h3>
          </div>
          <p class="empty-text">No hay alumnos registrados aún.</p>
        </div>
      `;
      return;
    }

    let rowsHtml = '';
    alumnos.forEach((alumno, idx) => {
      const id = alumno.id || alumno.id_alumno;
      const docHtml = alumno.numero_documento
        ? `<span class="badge-doc">${escapeHtml(alumno.id_tipo_documento || 'DNI')} ${escapeHtml(alumno.numero_documento)}</span>`
        : `<span class="text-muted">-</span>`;

      rowsHtml += `
        <tr>
          <td>
            <span class="badge-id">#${escapeHtml(id)}</span>
          </td>
          <td>${docHtml}</td>
          <td>
            <strong>${escapeHtml(alumno.apellido)}</strong>, ${escapeHtml(alumno.nombre)}
          </td>
          <td>${escapeHtml(alumno.email)}</td>
          <td>
            <span class="badge-carrera">${escapeHtml(alumno.carrera)}</span>
          </td>
          <td class="actions-cell">
            <button
              type="button"
              data-action="editar"
              data-idx="${idx}"
              class="btn btn-warning btn-sm"
              title="Editar alumno"
            >
              Editar
            </button>
            <button
              type="button"
              data-action="eliminar"
              data-id="${escapeHtml(id)}"
              class="btn btn-danger btn-sm"
              title="Eliminar alumno"
            >
              Eliminar
            </button>
          </td>
        </tr>
      `;
    });

    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>Alumnos Registrados (${alumnos.length})</h3>
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>DNI / Doc</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Carrera Matriculada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.querySelectorAll('button[data-action="editar"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        if (alumnos[idx]) {
          props.onEditar(alumnos[idx]);
        }
      });
    });

    container.querySelectorAll('button[data-action="eliminar"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        props.onEliminar(id);
      });
    });
  };

  const update = (newProps = {}) => {
    props = { ...props, ...newProps };
    render();
  };

  render();

  return { update };
}

