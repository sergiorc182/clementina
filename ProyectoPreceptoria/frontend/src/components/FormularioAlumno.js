/**
 * COMPONENTE 1: FormularioAlumno (Vanilla JS)
 * Permite registrar un nuevo alumno o editar uno existente en la base de datos 'clementina'.
 */

const API_CARRERAS = 'http://localhost:3000/api/alumnos/catalogo/carreras';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function crearFormularioAlumno(container, initialProps = {}) {
  let props = {
    alumnoSeleccionado: null,
    onGuardar: () => {},
    onCancelar: () => {},
    ...initialProps
  };

  let carreras = [];
  let lastAlumnoId = undefined;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h3 id="formAlumnoTitulo">Registrar Alumno</h3>
      </div>
      <form id="formAlumnoElement" class="form-grid">
        <div class="form-group">
          <label for="nombre">Nombre(s):</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            placeholder="Ej: Juan Carlos"
            required
          />
        </div>

        <div class="form-group">
          <label for="apellido">Apellido(s):</label>
          <input
            id="apellido"
            type="text"
            name="apellido"
            placeholder="Ej: Pérez"
            required
          />
        </div>

        <div class="form-group">
          <label for="numero_documento">DNI (N° Documento):</label>
          <input
            id="numero_documento"
            type="number"
            name="numero_documento"
            placeholder="Ej: 40123456"
          />
        </div>

        <div class="form-group">
          <label for="email">Email institucional/personal:</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Ej: juan.perez@isft182.edu.ar"
            required
          />
        </div>

        <div class="form-group">
          <label for="carrera">Carrera:</label>
          <select id="carrera" name="carrera" required>
            <option value="">-- Seleccione una carrera --</option>
          </select>
        </div>

        <div id="crearUsuarioGroup" class="form-group full-width" style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 0.7rem 0.9rem;">
          <label style="display: flex; align-items: center; gap: 0.55rem; cursor: pointer; text-transform: none; letter-spacing: 0; font-size: 0.88rem; margin: 0;">
            <input id="crear_usuario" type="checkbox" name="crear_usuario" checked style="width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;" />
            <span>Crear cuenta de acceso al portal (rol Alumno)</span>
          </label>
          <small class="help-text" style="margin-top: 0.3rem;">
            El estudiante podrá ingresar con su email y su DNI como contraseña inicial.
          </small>
        </div>

        <div class="form-actions">
          <button type="submit" id="btnSubmitAlumno" class="btn btn-primary">
            Registrar Alumno
          </button>
          <button type="button" id="btnCancelarAlumno" class="btn btn-secondary" style="display: none;">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;

  const tituloEl = container.querySelector('#formAlumnoTitulo');
  const formEl = container.querySelector('#formAlumnoElement');
  const nombreInput = container.querySelector('#nombre');
  const apellidoInput = container.querySelector('#apellido');
  const dniInput = container.querySelector('#numero_documento');
  const emailInput = container.querySelector('#email');
  const carreraSelect = container.querySelector('#carrera');
  const crearUsuarioGroup = container.querySelector('#crearUsuarioGroup');
  const crearUsuarioCheckbox = container.querySelector('#crear_usuario');
  const submitBtn = container.querySelector('#btnSubmitAlumno');
  const cancelarBtn = container.querySelector('#btnCancelarAlumno');

  const renderOpcionesCarreras = () => {
    const valorActual = carreraSelect.value;
    let html = `<option value="">-- Seleccione una carrera --</option>`;
    carreras.forEach((c) => {
      const nom = escapeHtml(c.nombre_carrera);
      html += `<option value="${nom}">${nom}</option>`;
    });
    carreraSelect.innerHTML = html;
    if (valorActual) {
      carreraSelect.value = valorActual;
    }
  };

  // Cargar catálogo de carreras de 'clementina' dejando el dropdown vacío al inicio
  fetch(API_CARRERAS)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.data.length > 0) {
        carreras = data.data;
      } else {
        throw new Error('Fallback');
      }
    })
    .catch(() => {
      carreras = [
        { id_carrera: 1, nombre_carrera: 'Tecnicatura Superior en Análisis de Sistemas' },
        { id_carrera: 2, nombre_carrera: 'Tecnicatura Superior en Desarrollo de Software' },
        { id_carrera: 3, nombre_carrera: 'Tecnicatura Superior en Enfermería' },
        { id_carrera: 4, nombre_carrera: 'Tecnicatura Superior en Administración' }
      ];
    })
    .finally(() => {
      renderOpcionesCarreras();
      if (props.alumnoSeleccionado) {
        carreraSelect.value = props.alumnoSeleccionado.carrera || '';
      }
    });

  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const crearUsuario = !props.alumnoSeleccionado && Boolean(crearUsuarioCheckbox?.checked);
    const formData = {
      nombre: nombreInput.value,
      apellido: apellidoInput.value,
      numero_documento: dniInput.value,
      email: emailInput.value,
      carrera: carreraSelect.value,
      crear_usuario: crearUsuario
    };

    if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.email.trim()) {
      if (window.ISFTNotify) {
        window.ISFTNotify('Por favor complete todos los campos obligatorios.', 'error');
      }
      return;
    }

    if (crearUsuario && String(formData.numero_documento || '').trim().length < 6) {
      if (window.ISFTNotify) {
        window.ISFTNotify('Ingrese el DNI (al menos 6 dígitos) para usarlo como contraseña inicial de la cuenta.', 'error');
      }
      dniInput.focus();
      return;
    }

    props.onGuardar(formData);
    if (!props.alumnoSeleccionado) {
      nombreInput.value = '';
      apellidoInput.value = '';
      dniInput.value = '';
      emailInput.value = '';
      carreraSelect.value = '';
      if (crearUsuarioCheckbox) crearUsuarioCheckbox.checked = true;
    }
  });

  cancelarBtn.addEventListener('click', () => {
    props.onCancelar();
  });

  const update = (newProps = {}) => {
    props = { ...props, ...newProps };
    const al = props.alumnoSeleccionado;
    const currentId = al ? al.id || al.id_alumno : null;

    tituloEl.textContent = al ? 'Modificar Alumno' : 'Registrar Alumno';
    submitBtn.textContent = al ? 'Guardar Cambios' : 'Registrar Alumno';
    cancelarBtn.style.display = al ? '' : 'none';
    if (crearUsuarioGroup) crearUsuarioGroup.style.display = al ? 'none' : '';

    if (currentId !== lastAlumnoId) {
      lastAlumnoId = currentId;
      if (al) {
        nombreInput.value = al.nombre || al.primer_nombre || '';
        apellidoInput.value = al.apellido || al.primer_apellido || '';
        emailInput.value = al.email || '';
        dniInput.value = al.numero_documento || '';
        carreraSelect.value = al.carrera || '';
      } else {
        nombreInput.value = '';
        apellidoInput.value = '';
        emailInput.value = '';
        dniInput.value = '';
        carreraSelect.value = '';
      }
    }
  };

  update(props);

  return { update };
}

