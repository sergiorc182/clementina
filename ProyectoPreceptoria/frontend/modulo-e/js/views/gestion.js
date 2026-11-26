import { api } from '../api.js';
import {
  getTemplateInfo,
  setCustomTemplate,
  resetCustomTemplate,
  abrirPlantillaEnBlanco
} from '../services/pdfStamper.js';

/**
 * Componente CustomDropdown accesible y reactivo en Vanilla JS.
 * Reproduce exactamente el comportamiento del CustomDropdown de React.
 */
function createCustomDropdown({
  label,
  value,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  onChange
}) {
  const container = document.createElement('div');
  container.className = 'form-group custom-dropdown-container';
  container.style.marginBottom = '0';
  container.style.position = 'relative';

  let isOpen = false;
  let currentValue = value;
  let currentOptions = [...options];

  const renderDropdown = () => {
    container.style.zIndex = isOpen ? '1001' : '1';
    const selectedOpt = currentOptions.find((o) => String(o.value) === String(currentValue));

    container.innerHTML = `
      ${label ? `<label class="form-label" style="font-weight: 700;">${label}</label>` : ''}
      <button
        type="button"
        class="form-select custom-dropdown-trigger"
        ${disabled ? 'disabled' : ''}
        style="
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          text-align: left;
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          background: ${disabled ? '#f1f5f9' : '#ffffff'};
          font-weight: 600;
          user-select: none;
          padding: 0.65rem 0.85rem;
          height: 42px;
        "
      >
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 0.5rem;">
          ${selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <span style="font-size: 0.65rem; color: #64748b; transform: ${isOpen ? 'rotate(180deg)' : 'none'}; transition: transform 0.15s ease;">
          ▼
        </span>
      </button>

      ${isOpen ? `
        <ul
          class="custom-dropdown-list"
          style="
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            right: 0;
            max-height: 260px;
            overflow-y: auto;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-shadow: 0 12px 24px -4px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            z-index: 1000;
            padding: 0.35rem 0;
            margin: 0;
            list-style: none;
          "
        >
          ${currentOptions.length === 0 ? `
            <li style="padding: 0.6rem 1rem; color: var(--text-muted); font-size: 0.88rem;">
              No hay opciones disponibles
            </li>
          ` : currentOptions.map((opt) => {
      const isSelected = String(opt.value) === String(currentValue);
      return `
              <li
                class="custom-dropdown-item"
                data-val="${opt.value}"
                style="
                  padding: 0.6rem 1rem;
                  font-size: 0.88rem;
                  cursor: pointer;
                  background: ${isSelected ? '#e0f2fe' : 'transparent'};
                  color: ${isSelected ? '#0369a1' : 'var(--text-main)'};
                  font-weight: ${isSelected ? '700' : '400'};
                  border-left: ${isSelected ? '4px solid #0284c7' : '4px solid transparent'};
                  transition: background 0.1s;
                "
              >
                ${opt.label}
              </li>
            `;
    }).join('')}
        </ul>
      ` : ''}
    `;

    const trigger = container.querySelector('.custom-dropdown-trigger');
    if (trigger && !disabled) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        isOpen = !isOpen;
        renderDropdown();
      });
    }

    if (isOpen) {
      container.querySelectorAll('.custom-dropdown-item').forEach((item) => {
        const itemVal = item.getAttribute('data-val');
        const isSelected = String(itemVal) === String(currentValue);

        item.addEventListener('mouseenter', () => {
          if (!isSelected) item.style.background = '#f8fafc';
        });
        item.addEventListener('mouseleave', () => {
          if (!isSelected) item.style.background = 'transparent';
        });
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          currentValue = itemVal;
          isOpen = false;
          renderDropdown();
          if (onChange) onChange(itemVal);
        });
      });
    }
  };

  const handleClickOutside = (e) => {
    if (isOpen && !container.contains(e.target)) {
      isOpen = false;
      renderDropdown();
    }
  };

  document.addEventListener('click', handleClickOutside);
  renderDropdown();

  return {
    element: container,
    getValue: () => currentValue,
    setValue: (newVal) => {
      currentValue = newVal;
      renderDropdown();
    },
    setOptions: (newOpts) => {
      currentOptions = [...newOpts];
      renderDropdown();
    },
    destroy: () => {
      document.removeEventListener('click', handleClickOutside);
    }
  };
}

/**
 * Vista de Gestión Académica (Preceptoría)
 * 100% equivalente a GestionAcademicaView.jsx en React.
 */
export async function initGestionView(container, notify) {
  // Pestañas: 'materias' | 'horarios' | 'carreras'
  let activeTab = 'materias';
  let carreras = [];

  // =========================================================================
  // PESTAÑA 1: MATERIAS Y CARGAS HORARIAS
  // =========================================================================
  let carreraMateriasCombo = 3;
  let carreraMateriasConfirmada = 3;
  let materiasTab1 = [];
  let loadingTab1 = false;

  // =========================================================================
  // PESTAÑA 2: HORARIOS DE CURSADA
  // =========================================================================
  let carreraHorarioCombo = 3;
  let anioHorarioCombo = 'todos';
  let materiaHorarioCombo = 'todas';
  let materiasOpcionesComboHorario = [];

  let carreraHorarioConfirmada = 3;
  let anioHorarioConfirmado = 'todos';
  let materiaHorarioConfirmada = 'todas';
  let materiasHorarioList = [];
  let loadingTab2 = false;

  // Materia seleccionada para el modal de asignación/edición de horario
  let materiaParaModalHorario = null;

  // =========================================================================
  // ESTADOS DE FORMULARIOS / MODALES
  // =========================================================================
  let carreraForm = {
    id_carrera: null,
    nombre_carrera: '',
    nombre_carrera_corto: '',
    nro_resolucion: '',
    titulo: ''
  };
  let showCarreraModal = false;

  let materiaForm = {
    id_materia: null,
    nombre_materia: '',
    anio_cursada: 2,
    horas: 4,
    cva: ''
  };
  let showMateriaModal = false;

  let horarioForm = {
    id_horario: null,
    dia_semana: 'Lunes',
    hora_inicio: '18:00',
    hora_fin: '22:00',
    aula: 'Aula 1',
    comision: 'Comisión Única'
  };
  let showHorarioModal = false;

  // Componentes Dropdown activos
  let dropdownTab1Carrera = null;
  let dropdownTab2Carrera = null;
  let dropdownTab2Anio = null;
  let dropdownTab2Materia = null;

  const onNotify = (msg, type = 'info') => {
    if (notify) notify(msg, type);
  };

  // Cargar catálogo de carreras inicial
  const cargarCarreras = async () => {
    try {
      const res = await api.getCarreras();
      carreras = res || [];
      if (carreras.length > 0) {
        const idDefault = carreras.some((c) => c.id_carrera === 3) ? 3 : carreras[0].id_carrera;
        carreraMateriasCombo = idDefault;
        carreraMateriasConfirmada = idDefault;
        carreraHorarioCombo = idDefault;
        carreraHorarioConfirmada = idDefault;

        const [resTab1, resTab2] = await Promise.all([
          api.getMateriasCarrera(idDefault),
          api.getMateriasCarrera(idDefault)
        ]);
        materiasTab1 = resTab1.materias || [];
        materiasHorarioList = resTab2.materias || [];
        materiasOpcionesComboHorario = resTab2.materias || [];
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Actualizar opciones de materias en el combobox de Horarios
  const actualizarOpcionesMateriasHorario = async () => {
    if (!carreraHorarioCombo) return;
    try {
      const res = await api.getMateriasCarrera(carreraHorarioCombo);
      materiasOpcionesComboHorario = res.materias || [];
      actualizarDropdownMateriaHorario();
    } catch (err) {
      console.error(err);
    }
  };

  const getMateriasComboFiltradasPorAnio = () => {
    return materiasOpcionesComboHorario.filter((m) => {
      if (anioHorarioCombo === 'todos') return true;
      return Number(m.anio_cursada) === Number(anioHorarioCombo);
    });
  };

  const actualizarDropdownMateriaHorario = () => {
    if (!dropdownTab2Materia) return;
    const filtradas = getMateriasComboFiltradasPorAnio();

    const opciones = [
      { value: 'todas', label: 'Todas las Materias' },
      ...filtradas.map((m) => ({
        value: String(m.id_materia),
        label: `Año ${m.anio_cursada}º · ${m.nombre_materia} (${m.horas} hs/sem)`
      }))
    ];

    if (materiaHorarioCombo !== 'todas') {
      const existe = filtradas.some((m) => String(m.id_materia) === String(materiaHorarioCombo));
      if (!existe) {
        materiaHorarioCombo = 'todas';
      }
    }

    dropdownTab2Materia.setOptions(opciones);
    dropdownTab2Materia.setValue(materiaHorarioCombo);
  };

  // =========================================================================
  // HANDLERS BÚSQUEDA PESTAÑA 1 (Materias y Cargas Horarias)
  // =========================================================================
  const handleBuscarMateriasTab1 = async () => {
    loadingTab1 = true;
    render();
    try {
      const res = await api.getMateriasCarrera(carreraMateriasCombo);
      materiasTab1 = res.materias || [];
      carreraMateriasConfirmada = carreraMateriasCombo;
      const car = carreras.find((c) => c.id_carrera === carreraMateriasCombo);
      onNotify(`Materias cargadas para ${car?.nombre_carrera || 'la carrera seleccionada'}`, 'success');
    } catch (err) {
      onNotify('Error al obtener asignaturas de la carrera', 'error');
    } finally {
      loadingTab1 = false;
      render();
    }
  };

  // =========================================================================
  // HANDLERS BÚSQUEDA PESTAÑA 2 (Horarios de Cursada)
  // =========================================================================
  const handleBuscarHorariosTab2 = async () => {
    loadingTab2 = true;
    render();
    try {
      const res = await api.getMateriasCarrera(carreraHorarioCombo);
      const mats = res.materias || [];
      materiasHorarioList = mats;
      carreraHorarioConfirmada = carreraHorarioCombo;
      anioHorarioConfirmado = anioHorarioCombo;
      materiaHorarioConfirmada = materiaHorarioCombo;

      const car = carreras.find((c) => c.id_carrera === carreraHorarioCombo);
      if (materiaHorarioCombo === 'todas') {
        const cant = anioHorarioCombo === 'todos'
          ? mats.length
          : mats.filter((m) => Number(m.anio_cursada) === Number(anioHorarioCombo)).length;
        onNotify(`Horarios de cursada cargados: ${cant} materias (${car?.nombre_carrera_corto || car?.nombre_carrera})`, 'info');
      } else {
        const mat = mats.find((m) => String(m.id_materia) === String(materiaHorarioCombo));
        onNotify(`Horarios cargados para ${mat?.nombre_materia || 'la materia seleccionada'}`, 'success');
      }
    } catch (err) {
      onNotify('Error al cargar cronograma de horarios', 'error');
    } finally {
      loadingTab2 = false;
      render();
    }
  };

  // =========================================================================
  // HANDLERS CARRERAS
  // =========================================================================
  const handleGuardarCarrera = async (e) => {
    if (e) e.preventDefault();
    if (!carreraForm.nombre_carrera || !carreraForm.nro_resolucion) {
      onNotify('Complete el nombre y resolución de la carrera', 'error');
      return;
    }
    await api.saveCarrera(carreraForm);
    showCarreraModal = false;
    await cargarCarreras();
    onNotify(carreraForm.id_carrera ? 'Carrera modificada con éxito' : 'Nueva carrera creada con éxito', 'success');
    render();
  };

  const handleEliminarCarrera = async (idCarrera) => {
    if (window.confirm('¿Está seguro de eliminar esta carrera y todas sus materias asociadas?')) {
      await api.deleteCarrera(idCarrera);
      await cargarCarreras();
      onNotify('Carrera eliminada', 'success');
      render();
    }
  };

  // =========================================================================
  // HANDLERS MATERIAS
  // =========================================================================
  const handleGuardarMateria = async (e) => {
    if (e) e.preventDefault();
    if (!materiaForm.nombre_materia) {
      onNotify('Ingrese el nombre de la materia', 'error');
      return;
    }
    await api.saveMateria(carreraMateriasConfirmada, {
      ...materiaForm,
      anio_cursada: Number(materiaForm.anio_cursada),
      horas: Number(materiaForm.horas)
    });
    showMateriaModal = false;
    const res = await api.getMateriasCarrera(carreraMateriasConfirmada);
    materiasTab1 = res.materias || [];
    if (carreraHorarioConfirmada === carreraMateriasConfirmada) {
      materiasHorarioList = res.materias || [];
      materiasOpcionesComboHorario = res.materias || [];
    }
    onNotify(materiaForm.id_materia ? 'Materia actualizada' : 'Materia agregada a la carrera', 'success');
    render();
  };

  const handleEliminarMateria = async (idMateria) => {
    if (window.confirm('¿Desea eliminar esta materia?')) {
      await api.deleteMateria(carreraMateriasConfirmada, idMateria);
      const res = await api.getMateriasCarrera(carreraMateriasConfirmada);
      materiasTab1 = res.materias || [];
      if (carreraHorarioConfirmada === carreraMateriasConfirmada) {
        materiasHorarioList = res.materias || [];
        materiasOpcionesComboHorario = res.materias || [];
      }
      onNotify('Materia eliminada', 'success');
      render();
    }
  };

  // =========================================================================
  // HANDLERS HORARIOS
  // =========================================================================
  const getMateriasAMostrarHorarios = () => {
    return materiasHorarioList.filter((m) => {
      if (materiaHorarioConfirmada !== 'todas') {
        return String(m.id_materia) === String(materiaHorarioConfirmada);
      }
      if (anioHorarioConfirmado === 'todos') return true;
      return Number(m.anio_cursada) === Number(anioHorarioConfirmado);
    });
  };

  const handleAbrirModalNuevoHorario = (materiaDestino) => {
    if (!materiaDestino) {
      onNotify('Seleccione una materia específica para asignarle un horario', 'error');
      return;
    }
    materiaParaModalHorario = materiaDestino;

    horarioForm = {
      id_horario: null,
      dia_semana: 'Lunes',
      hora_inicio: '18:00',
      hora_fin: '22:00',
      aula: 'Aula 1',
      comision: 'Comisión Única'
    };
    showHorarioModal = true;
    renderModales();
  };

  const handleEditarHorario = (materia, horario) => {
    materiaParaModalHorario = materia;
    horarioForm = { ...horario };
    showHorarioModal = true;
    renderModales();
  };

  const handleGuardarHorario = async (e) => {
    if (e) e.preventDefault();
    const idMat = materiaParaModalHorario?.id_materia;
    if (!idMat) {
      onNotify('Seleccione primero una materia', 'error');
      return;
    }
    await api.saveHorario(carreraHorarioConfirmada, idMat, horarioForm);
    showHorarioModal = false;
    const res = await api.getMateriasCarrera(carreraHorarioConfirmada);
    materiasHorarioList = res.materias || [];
    if (carreraMateriasConfirmada === carreraHorarioConfirmada) {
      materiasTab1 = res.materias || [];
    }
    onNotify(horarioForm.id_horario ? 'Horario actualizado con éxito' : 'Nuevo horario asignado a la materia', 'success');
    render();
  };

  const handleEliminarHorario = async (idMateria, idHorario) => {
    if (window.confirm('¿Desea eliminar esta franja horaria?')) {
      await api.deleteHorario(carreraHorarioConfirmada, idMateria, idHorario);
      const res = await api.getMateriasCarrera(carreraHorarioConfirmada);
      materiasHorarioList = res.materias || [];
      if (carreraMateriasConfirmada === carreraHorarioConfirmada) {
        materiasTab1 = res.materias || [];
      }
      onNotify('Horario eliminado con éxito', 'success');
      render();
    }
  };

  // =========================================================================
  // RENDER PRINCIPAL
  // =========================================================================
  const render = () => {
    // Si la estructura general ya está montada, solo actualizamos la pestaña activa y su contenido
    const existingShell = container.querySelector('.gestion-academica-view');
    if (!existingShell) {
      container.innerHTML = `
        <div class="gestion-academica-view view-fade-in">
          <!-- Encabezado Institucional -->
          <div class="page-header" style="margin-bottom: 1.5rem;">
            <h2 class="page-title">Gestión Académica — Preceptoría</h2>
            <p class="page-subtitle">
              Panel de administración para registrar y modificar <strong>Carreras</strong>, <strong>Materias (con carga horaria)</strong> y 
              precargar los <strong>Horarios de Cursada</strong> antes de la matriculación de los estudiantes.
            </p>
          </div>

          <!-- Selector de Pestañas (1. Materias, 2. Horarios, 3. Carreras) -->
          <div class="gestion-tabs-container">
            <button
              type="button"
              id="tab-btn-materias"
              class="gestion-tab-btn ${activeTab === 'materias' ? 'active' : ''}"
            >
              Materias y Cargas Horarias
            </button>
            <button
              type="button"
              id="tab-btn-horarios"
              class="gestion-tab-btn ${activeTab === 'horarios' ? 'active' : ''}"
            >
              Horarios de Cursada
            </button>
            <button
              type="button"
              id="tab-btn-carreras"
              class="gestion-tab-btn ${activeTab === 'carreras' ? 'active' : ''}"
            >
              Carreras Institucionales
            </button>
          </div>

          <!-- Contenedor del contenido de la pestaña activa -->
          <div id="gestion-tab-body"></div>

          <!-- Modales Dinámicos -->
          <div id="gestion-modales-root"></div>
        </div>
      `;

      // Listeners de Pestañas
      container.querySelector('#tab-btn-materias').addEventListener('click', () => {
        if (activeTab === 'materias') return;
        activeTab = 'materias';
        render();
      });
      container.querySelector('#tab-btn-horarios').addEventListener('click', () => {
        if (activeTab === 'horarios') return;
        activeTab = 'horarios';
        render();
      });
      container.querySelector('#tab-btn-carreras').addEventListener('click', () => {
        if (activeTab === 'carreras') return;
        activeTab = 'carreras';
        render();
      });
    }

    // Actualizar clases de botones de pestañas
    const btnMat = container.querySelector('#tab-btn-materias');
    const btnHor = container.querySelector('#tab-btn-horarios');
    const btnCar = container.querySelector('#tab-btn-carreras');
    if (btnMat) btnMat.className = `gestion-tab-btn ${activeTab === 'materias' ? 'active' : ''}`;
    if (btnHor) btnHor.className = `gestion-tab-btn ${activeTab === 'horarios' ? 'active' : ''}`;
    if (btnCar) btnCar.className = `gestion-tab-btn ${activeTab === 'carreras' ? 'active' : ''}`;

    // Destruir dropdowns anteriores para evitar memory leaks
    if (dropdownTab1Carrera) { dropdownTab1Carrera.destroy(); dropdownTab1Carrera = null; }
    if (dropdownTab2Carrera) { dropdownTab2Carrera.destroy(); dropdownTab2Carrera = null; }
    if (dropdownTab2Anio) { dropdownTab2Anio.destroy(); dropdownTab2Anio = null; }
    if (dropdownTab2Materia) { dropdownTab2Materia.destroy(); dropdownTab2Materia = null; }

    const body = container.querySelector('#gestion-tab-body');
    if (!body) return;

    if (activeTab === 'materias') {
      renderTabMaterias(body);
    } else if (activeTab === 'horarios') {
      renderTabHorarios(body);
    } else if (activeTab === 'carreras') {
      renderTabCarreras(body);
    }

    renderModales();
  };

  // =========================================================================
  // PESTAÑA 1: MATERIAS Y CARGAS HORARIAS
  // =========================================================================
  const renderTabMaterias = (root) => {
    root.innerHTML = `
      <div>
        <div class="card" style="margin-bottom: 1.5rem; overflow: visible; position: relative; z-index: 30;">
          <div class="gestion-materias-toolbar">
            <div class="gestion-materias-search-group">
              <div id="dropdown-tab1-carrera-mount" style="flex: 1;"></div>
              <button
                type="button"
                id="tab1-btn-buscar"
                class="btn-search"
                style="height: 42px; padding: 0 1.35rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"
                ${loadingTab1 ? 'disabled' : ''}
              >
                ${loadingTab1 ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            <button
              type="button"
              id="tab1-btn-nueva-materia"
              class="btn-primary"
              style="height: 42px; display: inline-flex; align-items: center; justify-content: center;"
            >
              + Nueva Materia para esta Carrera
            </button>
          </div>
        </div>

        <!-- Grilla de Materias agrupadas por Año -->
        <div id="tab1-materias-lista">
          ${[1, 2, 3].map((anio) => {
      const matsAnio = materiasTab1.filter((m) => Number(m.anio_cursada) === anio);
      return `
              <div class="card" style="margin-bottom: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 2px solid var(--border); padding-bottom: 0.5rem;">
                  <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin: 0;">
                    ${anio}º Año de Cursada
                  </h3>
                  <span class="badge" style="background: #e2e8f0; color: #334155;">
                    ${matsAnio.length} materias registradas
                  </span>
                </div>

                ${matsAnio.length === 0 ? `
                  <p style="color: var(--text-muted); font-size: 0.9rem; font-style: italic; margin: 0;">
                    No hay materias cargadas para este año.
                  </p>
                ` : `
                  <div class="table-responsive">
                    <table class="custom-table" style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background: var(--bg-hover); border-bottom: 1px solid var(--border); textAlign: left; font-size: 0.85rem;">
                          <th style="padding: 0.6rem 1rem;">#</th>
                          <th style="padding: 0.6rem 1rem;">Nombre de la Materia</th>
                          <th style="padding: 0.6rem 1rem;">Carga Horaria Semanal</th>
                          <th style="padding: 0.6rem 1rem;">Horarios Configurados</th>
                          <th style="padding: 0.6rem 1rem; text-align: center;">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${matsAnio.map((m, idx) => `
                          <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 0.75rem 1rem; font-weight: 600; color: var(--text-muted);">
                              ${idx + 1}
                            </td>
                            <td style="padding: 0.75rem 1rem; font-weight: 700;">
                              ${m.nombre_materia}
                            </td>
                            <td style="padding: 0.75rem 1rem;">
                              <span class="badge badge-info" style="font-weight: 700;">
                                ${m.horas || 4} hs / sem
                              </span>
                            </td>
                            <td style="padding: 0.75rem 1rem; font-size: 0.85rem; color: var(--text-muted);">
                              ${(m.horarios && m.horarios.length > 0) ? `
                                ${m.horarios.map((h) => `
                                  <div>
                                    ${h.dia_semana} ${h.hora_inicio}-${h.hora_fin} (${h.aula || 'Aula a designar'})
                                  </div>
                                `).join('')}
                              ` : `
                                <span style="color: #b45309;">Sin horario asignado</span>
                              `}
                            </td>
                            <td style="padding: 0.75rem 1rem; text-align: center;">
                              <button
                                type="button"
                                class="btn-icon tab1-btn-editar-mat"
                                data-id="${m.id_materia}"
                                style="margin-right: 0.4rem; background: #e0f2fe; color: #0369a1; border: none; padding: 0.35rem 0.6rem; border-radius: 4px; cursor: pointer;"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                class="btn-icon tab1-btn-borrar-mat"
                                data-id="${m.id_materia}"
                                style="background: #fee2e2; color: #b91c1c; border: none; padding: 0.35rem 0.6rem; border-radius: 4px; cursor: pointer;"
                              >
                                Borrar
                              </button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;

    // Montar CustomDropdown de Carrera
    dropdownTab1Carrera = createCustomDropdown({
      label: 'Seleccionar Carrera:',
      value: carreraMateriasCombo,
      options: carreras.map((c) => ({
        value: c.id_carrera,
        label: `${c.nombre_carrera} (${c.nro_resolucion})`
      })),
      onChange: (val) => {
        carreraMateriasCombo = Number(val);
      }
    });
    root.querySelector('#dropdown-tab1-carrera-mount').appendChild(dropdownTab1Carrera.element);

    // Listener Buscar
    root.querySelector('#tab1-btn-buscar').addEventListener('click', handleBuscarMateriasTab1);

    // Listener Nueva Materia
    root.querySelector('#tab1-btn-nueva-materia').addEventListener('click', () => {
      materiaForm = {
        id_materia: null,
        nombre_materia: '',
        anio_cursada: 2,
        horas: 4,
        cva: ''
      };
      showMateriaModal = true;
      renderModales();
    });

    // Listeners Editar / Borrar en tabla
    root.querySelectorAll('.tab1-btn-editar-mat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idM = Number(btn.getAttribute('data-id'));
        const mat = materiasTab1.find((m) => m.id_materia === idM);
        if (mat) {
          materiaForm = {
            id_materia: mat.id_materia,
            nombre_materia: mat.nombre_materia,
            anio_cursada: mat.anio_cursada,
            horas: mat.horas || 4,
            cva: mat.cva || ''
          };
          showMateriaModal = true;
          renderModales();
        }
      });
    });

    root.querySelectorAll('.tab1-btn-borrar-mat').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idM = Number(btn.getAttribute('data-id'));
        handleEliminarMateria(idM);
      });
    });
  };

  // =========================================================================
  // PESTAÑA 2: HORARIOS DE CURSADA
  // =========================================================================
  const renderTabHorarios = (root) => {
    const carreraActualHorario = carreras.find((c) => c.id_carrera === carreraHorarioConfirmada) || {};
    const materiasAMostrarHorarios = getMateriasAMostrarHorarios();
    const materiaIndividualActual = materiasHorarioList.find((m) => String(m.id_materia) === String(materiaHorarioConfirmada));

    root.innerHTML = `
      <div>
        <!-- Barra de Filtro Carrera, Año, Materia y Acciones -->
        <div class="card" style="margin-bottom: 1.5rem; overflow: visible; position: relative; z-index: 30;">
          <div class="gestion-horarios-grid">
            <!-- 1. Carrera -->
            <div id="dropdown-tab2-carrera-mount"></div>

            <!-- 2. Filtro por Año de Carrera -->
            <div id="dropdown-tab2-anio-mount"></div>

            <!-- 3. Materia con opción "Todas las Materias" -->
            <div id="dropdown-tab2-materia-mount"></div>

            <!-- 4. Botón Buscar -->
            <div class="gestion-horarios-actions">
              <button
                type="button"
                id="tab2-btn-buscar"
                class="btn-search"
                style="height: 42px; padding: 0 1.5rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap;"
                ${loadingTab2 ? 'disabled' : ''}
              >
                ${loadingTab2 ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        <!-- Ficha de Horarios según selección confirmada -->
        <div id="tab2-cronograma-container">
          ${materiaHorarioConfirmada !== 'todas' ? `
            <!-- VISTA 1: Materia Individual Seleccionada -->
            ${materiaIndividualActual ? `
              <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.75rem;">
                  <div>
                    <span class="badge badge-info" style="margin-right: 0.5rem;">Año ${materiaIndividualActual.anio_cursada}º</span>
                    <span class="badge" style="background: #f1f5f9; color: #334155; font-weight: 600;">Carga: ${materiaIndividualActual.horas || 4} hs semanales</span>
                    <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--primary); margin-top: 0.4rem; margin-bottom: 0;">
                      ${materiaIndividualActual.nombre_materia}
                    </h3>
                  </div>
                  <div style="text-align: right; font-size: 0.85rem; color: var(--text-muted);">
                    <div>Carrera: <strong>${carreraActualHorario.nombre_carrera || 'Carrera'}</strong></div>
                    <div>Resolución: <strong>${carreraActualHorario.nro_resolucion || '—'}</strong></div>
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                  <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">
                    Cronograma Semanal de Cursada (${materiaIndividualActual.horarios?.length || 0} franjas registradas):
                  </div>
                  <button
                    type="button"
                    class="btn-primary tab2-btn-asignar-materia-individual"
                    style="font-size: 0.82rem; padding: 0.35rem 0.85rem; height: 34px; display: inline-flex; align-items: center;"
                  >
                    + Asignar Franja a esta Materia
                  </button>
                </div>

                ${(!materiaIndividualActual.horarios || materiaIndividualActual.horarios.length === 0) ? `
                  <div class="empty-state" style="padding: 2.5rem; text-align: center; background: #f8fafc; border-radius: 8px;">
                    <p style="margin-top: 0.5rem; color: var(--text-muted); font-size: 0.95rem;">
                      Esta materia aún no tiene horarios asignados por preceptoría.
                    </p>
                    <button
                      type="button"
                      class="btn-secondary tab2-btn-asignar-primer-horario"
                      style="margin-top: 1rem;"
                    >
                      + Asignar Primer Horario
                    </button>
                  </div>
                ` : `
                  <div class="table-responsive">
                    <table class="custom-table" style="width: 100%; border-collapse: collapse;">
                      <thead>
                        <tr style="background: var(--bg-hover); border-bottom: 2px solid var(--border); text-align: left;">
                          <th style="padding: 0.75rem 1rem;">Día de la Semana</th>
                          <th style="padding: 0.75rem 1rem;">Franja Horaria</th>
                          <th style="padding: 0.75rem 1rem;">Aula / Laboratorio</th>
                          <th style="padding: 0.75rem 1rem;">Comisión</th>
                          <th style="padding: 0.75rem 1rem; text-align: center;">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${materiaIndividualActual.horarios.map((h) => `
                          <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 0.85rem 1rem; font-weight: 700; color: var(--primary);">
                              ${h.dia_semana}
                            </td>
                            <td style="padding: 0.85rem 1rem; font-weight: 600;">
                              ${h.hora_inicio} a ${h.hora_fin} hs
                            </td>
                            <td style="padding: 0.85rem 1rem;">
                              <span class="badge badge-info">${h.aula || 'Aula a designar'}</span>
                            </td>
                            <td style="padding: 0.85rem 1rem; color: var(--text-muted);">
                              ${h.comision || 'Comisión Única'}
                            </td>
                            <td style="padding: 0.85rem 1rem; text-align: center;">
                              <button
                                type="button"
                                class="btn-icon tab2-btn-editar-hor"
                                data-mat-id="${materiaIndividualActual.id_materia}"
                                data-hor-id="${h.id_horario}"
                                title="Editar horario"
                                style="margin-right: 0.5rem; background: #e0f2fe; color: #0369a1; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer;"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                class="btn-icon tab2-btn-borrar-hor"
                                data-mat-id="${materiaIndividualActual.id_materia}"
                                data-hor-id="${h.id_horario}"
                                title="Eliminar horario"
                                style="background: #fee2e2; color: #b91c1c; border: none; padding: 0.4rem 0.6rem; border-radius: 4px; cursor: pointer;"
                              >
                                Borrar
                              </button>
                            </td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            ` : `
              <div class="card empty-state" style="text-align: center; padding: 3rem;">
                <p>No se encontró la materia seleccionada. Por favor presione 'Buscar' para consultar.</p>
              </div>
            `}
          ` : `
            <!-- VISTA 2: "Todas las Materias" de la Carrera / Año -->
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin: 0;">
                  Cronograma General de Horarios · ${carreraActualHorario.nombre_carrera || 'Carrera'}
                </h3>
                <span class="badge" style="background: #e0f2fe; color: #0369a1; font-weight: 700; padding: 0.4rem 0.75rem; border-radius: 9999px;">
                  ${materiasAMostrarHorarios.length} materias listadas
                </span>
              </div>

              ${materiasAMostrarHorarios.length === 0 ? `
                <div class="card empty-state" style="text-align: center; padding: 3rem;">
                  <p>No se encontraron materias para los filtros seleccionados.</p>
                </div>
              ` : `
                ${materiasAMostrarHorarios.map((m) => `
                  <div class="card" style="margin-bottom: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid var(--border); padding-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                      <div>
                        <span class="badge badge-info" style="margin-right: 0.4rem; font-size: 0.75rem;">Año ${m.anio_cursada}º</span>
                        <span class="badge" style="background: #f1f5f9; color: #334155; font-weight: 600; font-size: 0.75rem;">Carga: ${m.horas || 4} hs/sem</span>
                        <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--primary); margin-top: 0.3rem; margin-bottom: 0;">
                          ${m.nombre_materia}
                        </h4>
                      </div>

                      <button
                        type="button"
                        class="btn-primary tab2-btn-asignar-a-materia"
                        data-mat-id="${m.id_materia}"
                        style="font-size: 0.8rem; padding: 0.35rem 0.8rem; height: 34px; display: inline-flex; align-items: center; gap: 0.3rem;"
                      >
                        + Asignar Horario
                      </button>
                    </div>

                    ${(!m.horarios || m.horarios.length === 0) ? `
                      <div style="padding: 1rem; background: #f8fafc; border-radius: 6px; color: #b45309; font-size: 0.88rem; font-style: italic;">
                        Esta materia aún no tiene horarios asignados por preceptoría.
                      </div>
                    ` : `
                      <div class="table-responsive">
                        <table class="custom-table" style="width: 100%; border-collapse: collapse;">
                          <thead>
                            <tr style="background: var(--bg-hover); border-bottom: 1px solid var(--border); text-align: left; font-size: 0.82rem;">
                              <th style="padding: 0.55rem 0.85rem;">Día de la Semana</th>
                              <th style="padding: 0.55rem 0.85rem;">Franja Horaria</th>
                              <th style="padding: 0.55rem 0.85rem;">Aula / Laboratorio</th>
                              <th style="padding: 0.55rem 0.85rem;">Comisión</th>
                              <th style="padding: 0.55rem 0.85rem; text-align: center;">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${m.horarios.map((h) => `
                              <tr style="border-bottom: 1px solid var(--border);">
                                <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: var(--primary);">
                                  ${h.dia_semana}
                                </td>
                                <td style="padding: 0.65rem 0.85rem; font-weight: 600;">
                                  ${h.hora_inicio} a ${h.hora_fin} hs
                                </td>
                                <td style="padding: 0.65rem 0.85rem;">
                                  <span class="badge badge-info">${h.aula || 'Aula a designar'}</span>
                                </td>
                                <td style="padding: 0.65rem 0.85rem; color: var(--text-muted);">
                                  ${h.comision || 'Comisión Única'}
                                </td>
                                <td style="padding: 0.65rem 0.85rem; text-align: center;">
                                  <button
                                    type="button"
                                    class="btn-icon tab2-btn-editar-hor"
                                    data-mat-id="${m.id_materia}"
                                    data-hor-id="${h.id_horario}"
                                    title="Editar horario"
                                    style="margin-right: 0.4rem; background: #e0f2fe; color: #0369a1; border: none; padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    class="btn-icon tab2-btn-borrar-hor"
                                    data-mat-id="${m.id_materia}"
                                    data-hor-id="${h.id_horario}"
                                    title="Eliminar horario"
                                    style="background: #fee2e2; color: #b91c1c; border: none; padding: 0.3rem 0.55rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;"
                                  >
                                    Borrar
                                  </button>
                                </td>
                              </tr>
                            `).join('')}
                          </tbody>
                        </table>
                      </div>
                    `}
                  </div>
                `).join('')}
              `}
            </div>
          `}
        </div>
      </div>
    `;

    // 1. Dropdown Carrera Horarios
    dropdownTab2Carrera = createCustomDropdown({
      label: '1. Seleccionar Carrera:',
      value: carreraHorarioCombo,
      options: carreras.map((c) => ({
        value: c.id_carrera,
        label: `${c.nombre_carrera} (${c.nro_resolucion})`
      })),
      onChange: async (val) => {
        carreraHorarioCombo = Number(val);
        await actualizarOpcionesMateriasHorario();
      }
    });
    root.querySelector('#dropdown-tab2-carrera-mount').appendChild(dropdownTab2Carrera.element);

    // 2. Dropdown Año Horarios
    dropdownTab2Anio = createCustomDropdown({
      label: '2. Seleccionar Año:',
      value: anioHorarioCombo,
      options: [
        { value: 'todos', label: 'Todos los Años' },
        { value: 1, label: '1º Año' },
        { value: 2, label: '2º Año' },
        { value: 3, label: '3º Año' }
      ],
      onChange: (val) => {
        anioHorarioCombo = val === 'todos' ? 'todos' : Number(val);
        actualizarDropdownMateriaHorario();
      }
    });
    root.querySelector('#dropdown-tab2-anio-mount').appendChild(dropdownTab2Anio.element);

    // 3. Dropdown Materia Horarios
    const filtradasIniciales = getMateriasComboFiltradasPorAnio();
    dropdownTab2Materia = createCustomDropdown({
      label: '3. Seleccionar Materia:',
      value: materiaHorarioCombo,
      placeholder: filtradasIniciales.length === 0 ? 'No hay materias' : 'Seleccionar materia...',
      options: [
        { value: 'todas', label: 'Todas las Materias' },
        ...filtradasIniciales.map((m) => ({
          value: String(m.id_materia),
          label: `Año ${m.anio_cursada}º · ${m.nombre_materia} (${m.horas} hs/sem)`
        }))
      ],
      onChange: (val) => {
        materiaHorarioCombo = val;
      }
    });
    root.querySelector('#dropdown-tab2-materia-mount').appendChild(dropdownTab2Materia.element);

    // 4. Botón Buscar
    root.querySelector('#tab2-btn-buscar').addEventListener('click', handleBuscarHorariosTab2);

    const btnIndividual = root.querySelector('.tab2-btn-asignar-materia-individual');
    if (btnIndividual) {
      btnIndividual.addEventListener('click', () => {
        handleAbrirModalNuevoHorario(materiaIndividualActual);
      });
    }

    const btnPrimerHorario = root.querySelector('.tab2-btn-asignar-primer-horario');
    if (btnPrimerHorario) {
      btnPrimerHorario.addEventListener('click', () => {
        handleAbrirModalNuevoHorario(materiaIndividualActual);
      });
    }

    root.querySelectorAll('.tab2-btn-asignar-a-materia').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idM = Number(btn.getAttribute('data-mat-id'));
        const mat = materiasHorarioList.find((m) => m.id_materia === idM);
        handleAbrirModalNuevoHorario(mat);
      });
    });

    root.querySelectorAll('.tab2-btn-editar-hor').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idM = Number(btn.getAttribute('data-mat-id'));
        const idH = Number(btn.getAttribute('data-hor-id'));
        const mat = materiasHorarioList.find((m) => m.id_materia === idM);
        if (mat) {
          const hor = mat.horarios?.find((h) => h.id_horario === idH);
          if (hor) {
            handleEditarHorario(mat, hor);
          }
        }
      });
    });

    root.querySelectorAll('.tab2-btn-borrar-hor').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idM = Number(btn.getAttribute('data-mat-id'));
        const idH = Number(btn.getAttribute('data-hor-id'));
        handleEliminarHorario(idM, idH);
      });
    });
  };

  // =========================================================================
  // PESTAÑA 3: CARRERAS INSTITUCIONALES
  // =========================================================================
  const renderTabCarreras = (root) => {
    root.innerHTML = `
      <div>
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1.25rem;">
          <button
            type="button"
            id="tab3-btn-nueva-carrera"
            class="btn-primary"
          >
            + Nueva Carrera
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1.35rem;">
          ${carreras.map((c) => {
      const tInfo = getTemplateInfo(c.id_carrera);
      return `
              <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 4px solid var(--primary); box-shadow: var(--shadow-sm);">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                    <span class="badge badge-info">${c.nombre_carrera_corto || 'CARRERA'}</span>
                    <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Res: ${c.nro_resolucion || 'S/N'}</span>
                  </div>
                  <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--primary); margin-bottom: 0.4rem; margin-top: 0; line-height: 1.3;">
                    ${c.nombre_carrera}
                  </h3>
                  <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem;">
                    Título oficial: <strong>${c.titulo || 'Técnico Superior'}</strong>
                  </p>

                  <!-- Sector de Gestión de Plantilla PDF Oficial A5a -->
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.45rem; flex-wrap: wrap; gap: 0.35rem;">
                      <span style="font-size: 0.78rem; font-weight: 800; text-transform: uppercase; color: var(--text-main); letter-spacing: 0.4px;">
                        Plantilla Formulario A5a
                      </span>
                      ${tInfo.isCustom
          ? '<span class="badge badge-success" style="font-size: 0.68rem; padding: 0.15rem 0.5rem;">Personalizada</span>'
          : '<span class="badge badge-info" style="font-size: 0.68rem; padding: 0.15rem 0.5rem;">Oficial ISFT 182</span>'
        }
                    </div>

                    <div style="font-size: 0.82rem; color: #334155; word-break: break-all; margin-bottom: 0.65rem; font-weight: 600;">
                      ${tInfo.fileName}
                    </div>

                    <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;">
                      <input 
                        type="file" 
                        class="input-file-plantilla" 
                        data-id="${c.id_carrera}" 
                        accept=".pdf" 
                        style="display: none;" 
                      />
                      <button
                        type="button"
                        class="btn-secondary btn-cargar-pdf-carrera"
                        data-id="${c.id_carrera}"
                        style="font-size: 0.78rem; padding: 0.35rem 0.7rem; font-weight: 700;"
                        title="Cargar o cambiar el archivo PDF oficial para esta carrera"
                      >
                        Cargar PDF
                      </button>
                      <button
                        type="button"
                        class="btn-secondary btn-ver-pdf-carrera"
                        data-id="${c.id_carrera}"
                        style="font-size: 0.78rem; padding: 0.35rem 0.7rem;"
                        title="Ver la plantilla oficial en blanco en una nueva pestaña"
                      >
                        Ver Plantilla
                      </button>
                      ${tInfo.isCustom ? `
                        <button
                          type="button"
                          class="btn-secondary btn-restablecer-pdf-carrera"
                          data-id="${c.id_carrera}"
                          style="font-size: 0.78rem; padding: 0.35rem 0.7rem; color: var(--danger);"
                          title="Restablecer a la plantilla oficial de fábrica"
                        >
                          Restablecer
                        </button>
                      ` : ''}
                    </div>
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                  <button
                    type="button"
                    class="btn-secondary tab3-btn-editar-carrera"
                    data-id="${c.id_carrera}"
                    style="font-size: 0.85rem; padding: 0.4rem 0.8rem;"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="btn-secondary tab3-btn-eliminar-carrera"
                    data-id="${c.id_carrera}"
                    style="font-size: 0.85rem; padding: 0.4rem 0.8rem; color: #b91c1c;"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;

    root.querySelector('#tab3-btn-nueva-carrera').addEventListener('click', () => {
      carreraForm = {
        id_carrera: null,
        nombre_carrera: '',
        nombre_carrera_corto: '',
        nro_resolucion: '',
        titulo: ''
      };
      showCarreraModal = true;
      renderModales();
    });

    root.querySelectorAll('.tab3-btn-editar-carrera').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idC = Number(btn.getAttribute('data-id'));
        const c = carreras.find((item) => item.id_carrera === idC);
        if (c) {
          carreraForm = { ...c };
          showCarreraModal = true;
          renderModales();
        }
      });
    });

    root.querySelectorAll('.tab3-btn-eliminar-carrera').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idC = Number(btn.getAttribute('data-id'));
        handleEliminarCarrera(idC);
      });
    });

    // Eventos de Gestión de Plantillas PDF en las Tarjetas de Carreras
    root.querySelectorAll('.btn-cargar-pdf-carrera').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idC = btn.getAttribute('data-id');
        const input = root.querySelector(`.input-file-plantilla[data-id="${idC}"]`);
        if (input) input.click();
      });
    });

    root.querySelectorAll('.input-file-plantilla').forEach((input) => {
      input.addEventListener('change', async (e) => {
        const idC = Number(input.getAttribute('data-id'));
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.pdf')) {
          if (onNotify) onNotify('El archivo seleccionado debe ser un documento PDF (.pdf)', 'error');
          return;
        }

        try {
          const buffer = await file.arrayBuffer();
          setCustomTemplate(idC, buffer, file.name);
          const c = carreras.find((item) => item.id_carrera === idC);
          if (onNotify) onNotify(`Plantilla PDF "${file.name}" cargada y vinculada a ${c?.nombre_carrera || 'la carrera'}.`, 'success');
          render();
        } catch (err) {
          console.error('Error al cargar plantilla PDF:', err);
          if (onNotify) onNotify('Error al procesar el archivo PDF: ' + err.message, 'error');
        }
      });
    });

    root.querySelectorAll('.btn-ver-pdf-carrera').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idC = Number(btn.getAttribute('data-id'));
        try {
          await abrirPlantillaEnBlanco(idC);
        } catch (err) {
          if (onNotify) onNotify('Error al abrir la plantilla PDF: ' + err.message, 'error');
        }
      });
    });

    root.querySelectorAll('.btn-restablecer-pdf-carrera').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idC = Number(btn.getAttribute('data-id'));
        resetCustomTemplate(idC);
        if (onNotify) onNotify('Se restableció la plantilla oficial por defecto del Instituto para esta carrera.', 'info');
        render();
      });
    });
  };

  // =========================================================================
  // MODALES DINÁMICOS (Montados en document.body para centrado real en viewport)
  // =========================================================================
  const getGlobalModalRoot = () => {
    let root = document.getElementById('gestion-modales-portal');
    if (!root) {
      root = document.createElement('div');
      root.id = 'gestion-modales-portal';
      document.body.appendChild(root);
    }
    return root;
  };

  const renderModales = () => {
    const legacyRoot = container.querySelector('#gestion-modales-root');
    if (legacyRoot) legacyRoot.innerHTML = '';

    const modalRoot = getGlobalModalRoot();
    if (!modalRoot) return;

    if (!showCarreraModal && !showMateriaModal && !showHorarioModal) {
      modalRoot.innerHTML = '';
      return;
    }

    // 1. MODAL CARRERA
    if (showCarreraModal) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-card" style="max-width: 520px;">
            <h3 style="margin-bottom: 1.25rem; font-size: 1.2rem; font-weight: 800; color: var(--primary);">
              ${carreraForm.id_carrera ? 'Modificar Carrera' : 'Alta de Nueva Carrera'}
            </h3>
            <form id="form-modal-carrera">
              <div class="form-group">
                <label class="form-label">Nombre de la Carrera:</label>
                <input
                  type="text"
                  id="modal-carrera-nombre"
                  class="form-control"
                  placeholder="Ej: Tecnicatura Superior en Ciencia de Datos"
                  value="${carreraForm.nombre_carrera || ''}"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Nro. de Resolución Ministerial:</label>
                <input
                  type="text"
                  id="modal-carrera-res"
                  class="form-control"
                  placeholder="Ej: RES-1045/21"
                  value="${carreraForm.nro_resolucion || ''}"
                  required
                />
              </div>

              <div class="form-group">
                <label class="form-label">Sigla o Nombre Corto:</label>
                <input
                  type="text"
                  id="modal-carrera-corto"
                  class="form-control"
                  placeholder="Ej: TSCD"
                  value="${carreraForm.nombre_carrera_corto || ''}"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Título que Otorga:</label>
                <input
                  type="text"
                  id="modal-carrera-titulo"
                  class="form-control"
                  placeholder="Ej: Técnico Superior en Ciencia de Datos"
                  value="${carreraForm.titulo || ''}"
                />
              </div>

              ${carreraForm.id_carrera ? `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.65rem 0.85rem; font-size: 0.82rem; margin-top: 0.5rem;">
                  <span style="font-weight: 700; color: var(--primary);">Plantilla PDF Formulario A5a:</span>
                  <span style="font-weight: 600; color: #334155; margin-left: 0.25rem;">${getTemplateInfo(carreraForm.id_carrera).fileName}</span>
                  <p style="margin: 0.35rem 0 0 0; font-size: 0.75rem; color: var(--text-muted);">
                    Podés cargar un nuevo PDF ministerial o previsualizar el actual directamente desde la tarjeta institucional de esta carrera.
                  </p>
                </div>
              ` : ''}

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                <button
                  type="button"
                  id="modal-carrera-cancelar"
                  class="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn-primary">
                  Guardar Carrera
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      modalRoot.querySelector('#modal-carrera-cancelar').addEventListener('click', () => {
        showCarreraModal = false;
        renderModales();
      });

      modalRoot.querySelector('#form-modal-carrera').addEventListener('submit', (e) => {
        e.preventDefault();
        carreraForm.nombre_carrera = modalRoot.querySelector('#modal-carrera-nombre').value.trim();
        carreraForm.nro_resolucion = modalRoot.querySelector('#modal-carrera-res').value.trim();
        carreraForm.nombre_carrera_corto = modalRoot.querySelector('#modal-carrera-corto').value.trim();
        carreraForm.titulo = modalRoot.querySelector('#modal-carrera-titulo').value.trim();
        handleGuardarCarrera(e);
      });
      return;
    }

    // 2. MODAL MATERIA
    if (showMateriaModal) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-card" style="max-width: 500px;">
            <h3 style="margin-bottom: 1.25rem; font-size: 1.2rem; font-weight: 800; color: var(--primary);">
              ${materiaForm.id_materia ? 'Editar Materia' : 'Agregar Materia a la Carrera'}
            </h3>
            <form id="form-modal-materia">
              <div class="form-group">
                <label class="form-label">Nombre de la Materia:</label>
                <input
                  type="text"
                  id="modal-materia-nombre"
                  class="form-control"
                  placeholder="Ej: Inteligencia Artificial I"
                  value="${materiaForm.nombre_materia || ''}"
                  required
                />
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Año de Cursada:</label>
                  <select
                    id="modal-materia-anio"
                    class="form-select"
                  >
                    <option value="1" ${Number(materiaForm.anio_cursada) === 1 ? 'selected' : ''}>1º Año</option>
                    <option value="2" ${Number(materiaForm.anio_cursada) === 2 ? 'selected' : ''}>2º Año</option>
                    <option value="3" ${Number(materiaForm.anio_cursada) === 3 ? 'selected' : ''}>3º Año</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Carga Horaria Semanal:</label>
                  <input
                    type="number"
                    id="modal-materia-horas"
                    min="1"
                    max="16"
                    class="form-control"
                    value="${materiaForm.horas || 4}"
                    required
                  />
                  <small style="color: var(--text-muted);">Horas reloj o cátedra</small>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                <button
                  type="button"
                  id="modal-materia-cancelar"
                  class="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn-primary">
                  Guardar Materia
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      modalRoot.querySelector('#modal-materia-cancelar').addEventListener('click', () => {
        showMateriaModal = false;
        renderModales();
      });

      modalRoot.querySelector('#form-modal-materia').addEventListener('submit', (e) => {
        e.preventDefault();
        materiaForm.nombre_materia = modalRoot.querySelector('#modal-materia-nombre').value.trim();
        materiaForm.anio_cursada = Number(modalRoot.querySelector('#modal-materia-anio').value);
        materiaForm.horas = Number(modalRoot.querySelector('#modal-materia-horas').value);
        handleGuardarMateria(e);
      });
      return;
    }

    // 3. MODAL HORARIO
    if (showHorarioModal) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <div class="modal-card" style="max-width: 520px;">
            <h3 style="margin-bottom: 1.25rem; font-size: 1.2rem; font-weight: 800; color: var(--primary);">
              ${horarioForm.id_horario ? 'Modificar Horario de Cursada' : 'Asignar Horario de Cursada'}
            </h3>

            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label class="form-label" style="font-weight: 700;">Materia Asignada:</label>
              <div style="font-weight: 700; color: var(--primary); padding: 0.6rem 0.85rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 6px; font-size: 0.95rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <span>${materiaParaModalHorario?.nombre_materia || 'Materia'}</span>
                <span class="badge badge-info" style="font-size: 0.8rem;">
                  Año ${materiaParaModalHorario?.anio_cursada || 1}º · ${materiaParaModalHorario?.horas || 4} hs/sem
                </span>
              </div>
            </div>

            <form id="form-modal-horario">
              <div class="form-group">
                <label class="form-label">Día de la Semana:</label>
                <select
                  id="modal-horario-dia"
                  class="form-select"
                >
                  ${['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((d) => `
                    <option value="${d}" ${horarioForm.dia_semana === d ? 'selected' : ''}>${d}</option>
                  `).join('')}
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Hora Desde:</label>
                  <input
                    type="time"
                    id="modal-horario-inicio"
                    class="form-control"
                    value="${horarioForm.hora_inicio || '18:00'}"
                    required
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Hora Hasta:</label>
                  <input
                    type="time"
                    id="modal-horario-fin"
                    class="form-control"
                    value="${horarioForm.hora_fin || '22:00'}"
                    required
                  />
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem;">
                <div class="form-group">
                  <label class="form-label">Aula / Laboratorio / Sede:</label>
                  <input
                    type="text"
                    id="modal-horario-aula"
                    class="form-control"
                    placeholder="Ej: Lab 2 / Aula 14"
                    value="${horarioForm.aula || 'Aula 1'}"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Comisión:</label>
                  <input
                    type="text"
                    id="modal-horario-comision"
                    class="form-control"
                    placeholder="Ej: Comisión Única"
                    value="${horarioForm.comision || 'Comisión Única'}"
                  />
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                <button
                  type="button"
                  id="modal-horario-cancelar"
                  class="btn-secondary"
                >
                  Cancelar
                </button>
                <button type="submit" class="btn-primary">
                  Guardar Horario
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      modalRoot.querySelector('#modal-horario-cancelar').addEventListener('click', () => {
        showHorarioModal = false;
        renderModales();
      });

      modalRoot.querySelector('#form-modal-horario').addEventListener('submit', (e) => {
        e.preventDefault();
        horarioForm.dia_semana = modalRoot.querySelector('#modal-horario-dia').value;
        horarioForm.hora_inicio = modalRoot.querySelector('#modal-horario-inicio').value;
        horarioForm.hora_fin = modalRoot.querySelector('#modal-horario-fin').value;
        horarioForm.aula = modalRoot.querySelector('#modal-horario-aula').value.trim();
        horarioForm.comision = modalRoot.querySelector('#modal-horario-comision').value.trim();
        handleGuardarHorario(e);
      });
    }
  };

  // Inicialización inmediata y carga en segundo plano
  render();
  cargarCarreras().then(() => {
    render();
  });
}
