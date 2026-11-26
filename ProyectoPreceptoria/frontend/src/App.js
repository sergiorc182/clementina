/**
 * App (Vanilla JS):
 * Contenedor principal con navegación global entre páginas y pestañas del módulo:
 * - Vista 1: Control de Exámenes Finales (Rendiciones & Reglas)
 * - Vista 2: Gestión de Alumnos (CRUD & Consultas GET - Exclusivo Preceptor)
 */

import { crearFormularioAlumno } from './components/FormularioAlumno.js';
import { crearListaAlumnos } from './components/ListaAlumnos.js';
import { crearBuscadorAlumnos } from './components/BuscadorAlumnos.js';
import { crearControlFinales } from './components/ControlFinales.js';
import {
  leerUsuarioDesdeCookies,
  inicializarCookiePorDefecto
} from './utils/cookies.js';

const API_URL = 'http://localhost:3000/api/alumnos';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function crearApp(rootElement) {
  inicializarCookiePorDefecto();
  let sesionCookie = leerUsuarioDesdeCookies();
  let authUser = window.ISFTAuth ? window.ISFTAuth.getUser() : null;

  let vistaActiva = 'finales';
  let alumnos = [];
  let alumnoSeleccionado = null;
  let cargando = false;
  let mensaje = null;
  let mensajeTimeout = null;

  rootElement.innerHTML = `
    <header class="navbar">
      <div class="nav-brand">
        <div class="nav-logo-badge" title="ISFT Nº 182">
          <img src="./isft182.jpg" alt="ISFT 182" />
        </div>
        <div class="nav-title-group">
          <h1>Sistema Académico y de Preceptoría</h1>
          <span>ISFT 182 · Exámenes Finales y Alumnos</span>
        </div>
      </div>

      <nav class="nav-links" id="moduleNavTabs">
        <a href="./index.html" class="nav-button" title="Volver al Home del Portal">
          Home
        </a>
        <span style="color: #cbd5e1; user-select: none;">|</span>
        <button
          type="button"
          id="tabBtnFinales"
          class="nav-button active"
        >
          Control de Exámenes Finales
        </button>
        <button
          type="button"
          id="tabBtnAlumnos"
          class="nav-button"
        >
          Gestión de Alumnos
        </button>
      </nav>

      <div id="navUserBadgeSlot"></div>
    </header>

    <div class="container">
      <header class="main-header">
        <h1>Sistema Académico y de Preceptoría (ISFT 182)</h1>
      </header>

      <div id="vistaFinalesSlot"></div>

      <div id="vistaAlumnosSlot" style="display: none;">
        <div class="layout-grid">
          <div id="formularioAlumnoSlot"></div>
          <div id="buscadorAlumnosSlot"></div>
        </div>
        <div id="listaAlumnosSlot" class="mt-4"></div>
      </div>
    </div>
  `;

  const navUserBadgeSlot = rootElement.querySelector('#navUserBadgeSlot');
  const tabBtnFinales = rootElement.querySelector('#tabBtnFinales');
  const tabBtnAlumnos = rootElement.querySelector('#tabBtnAlumnos');
  const vistaFinalesSlot = rootElement.querySelector('#vistaFinalesSlot');
  const vistaAlumnosSlot = rootElement.querySelector('#vistaAlumnosSlot');
  const formularioAlumnoSlot = rootElement.querySelector('#formularioAlumnoSlot');
  const buscadorAlumnosSlot = rootElement.querySelector('#buscadorAlumnosSlot');
  const listaAlumnosSlot = rootElement.querySelector('#listaAlumnosSlot');

  const renderUserBadgeAndRoleTabs = () => {
    sesionCookie = leerUsuarioDesdeCookies();
    const isAlumno = sesionCookie.esAlumno;

    // Si es alumno, no puede entrar a la pestaña de ABM general de alumnos (exclusiva de Preceptoría)
    if (isAlumno) {
      tabBtnAlumnos.style.display = 'none';
      if (vistaActiva !== 'finales') {
        vistaActiva = 'finales';
      }
    } else {
      tabBtnAlumnos.style.display = '';
    }

    let nombreMostrar = authUser
      ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim()
      : 'Preceptoría ISFT 182';
    let subtitulo = authUser?.role || 'Personal de Gestión';
    let inicial = (authUser?.firstName?.[0] || 'P').toUpperCase();

    if (isAlumno) {
      const alObj =
        alumnos.find((a) => Number(a.id || a.id_alumno) === Number(sesionCookie.idAlumno)) ||
        alumnos[0];
      if (alObj) {
        nombreMostrar = `${alObj.apellido || alObj.primer_apellido || ''}, ${alObj.nombre || alObj.primer_nombre || ''}`.trim();
        subtitulo = `Estudiante · Leg. ${alObj.legajo || '—'}`;
        inicial = (
          (alObj.apellido || alObj.primer_apellido || 'E').charAt(0)
        ).toUpperCase();
      } else {
        nombreMostrar = sesionCookie.nombreAlumno || nombreMostrar || 'Estudiante';
        subtitulo = 'Estudiante Registrado';
        inicial = 'ES';
      }
    }

    navUserBadgeSlot.innerHTML = `
      <div class="nav-user-actions">
        <div class="nav-user-badge" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.35rem 0.75rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; flex-shrink: 0;">
            ${escapeHtml(inicial)}
          </div>
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap;">
              ${escapeHtml(nombreMostrar)}
            </span>
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;">
              ${escapeHtml(subtitulo)}
            </span>
          </div>
        </div>
        <button type="button" id="btnSistemaLogout" class="btn-nav-logout" title="Cerrar sesión institucional">
          Salir
        </button>
      </div>
    `;

    navUserBadgeSlot.querySelector('#btnSistemaLogout')?.addEventListener('click', () => {
      if (window.ISFTAuth) window.ISFTAuth.logout('./index.html');
    });

    renderTabs();
  };

  if (window.ISFTAuth) {
    window.ISFTAuth.requireAuth('./index.html').then((verified) => {
      if (verified) {
        authUser = verified;
        renderUserBadgeAndRoleTabs();
      }
    });
  }

  const mostrarMensaje = (texto, tipo = 'success') => {
    if (window.ISFTNotify) {
      window.ISFTNotify(texto, tipo);
    }
  };

  const renderTabs = () => {
    if (vistaActiva === 'finales') {
      tabBtnFinales.classList.add('active');
      tabBtnAlumnos.classList.remove('active');
      vistaFinalesSlot.style.display = '';
      vistaAlumnosSlot.style.display = 'none';
    } else {
      tabBtnFinales.classList.remove('active');
      tabBtnAlumnos.classList.add('active');
      vistaFinalesSlot.style.display = 'none';
      vistaAlumnosSlot.style.display = '';
    }
  };

  tabBtnFinales.addEventListener('click', () => {
    vistaActiva = 'finales';
    renderTabs();
  });

  tabBtnAlumnos.addEventListener('click', () => {
    if (sesionCookie.esAlumno) return;
    vistaActiva = 'alumnos';
    renderTabs();
  });

  // Inicializar subcomponentes
  const controlFinalesComp = crearControlFinales(vistaFinalesSlot, { alumnos });

  const handleGuardar = async (formData) => {
    try {
      if (alumnoSeleccionado) {
        const res = await fetch(
          `${API_URL}/${alumnoSeleccionado.id || alumnoSeleccionado.id_alumno}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          }
        );
        const data = await res.json();

        if (data.success) {
          mostrarMensaje('Alumno actualizado correctamente');
          alumnoSeleccionado = null;
          formularioComp.update({ alumnoSeleccionado });
          cargarAlumnos();
        } else {
          mostrarMensaje(data.message || 'Error al actualizar', 'error');
        }
      } else {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const data = await res.json();

        if (data.success) {
          const usrInfo = data.usuario_creado || data.data?.usuario_creado;
          if (usrInfo?.creado) {
            mostrarMensaje(
              `Alumno registrado con éxito. Cuenta creada: ${usrInfo.email} (contraseña inicial: ${usrInfo.password_inicial})`,
              'success'
            );
          } else if (usrInfo && !usrInfo.creado) {
            mostrarMensaje(`Alumno registrado con éxito. ${usrInfo.motivo || ''}`.trim(), 'warning');
          } else {
            mostrarMensaje('Alumno registrado con éxito.');
          }
          cargarAlumnos();
        } else {
          mostrarMensaje(data.message || 'Error al crear', 'error');
        }
      }
    } catch (error) {
      mostrarMensaje('Error de conexión al guardar alumno', 'error');
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm(`¿Está seguro de eliminar al alumno #${id}?`)) return;

    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (data.success) {
        mostrarMensaje('Alumno eliminado correctamente');
        if (
          alumnoSeleccionado &&
          (alumnoSeleccionado.id === id || alumnoSeleccionado.id_alumno === id)
        ) {
          alumnoSeleccionado = null;
          formularioComp.update({ alumnoSeleccionado });
        }
        cargarAlumnos();
      } else {
        mostrarMensaje(data.message || 'Error al eliminar', 'error');
      }
    } catch (error) {
      mostrarMensaje('Error al conectar con el servidor', 'error');
    }
  };

  const formularioComp = crearFormularioAlumno(formularioAlumnoSlot, {
    alumnoSeleccionado,
    onGuardar: handleGuardar,
    onCancelar: () => {
      alumnoSeleccionado = null;
      formularioComp.update({ alumnoSeleccionado });
    }
  });

  const buscadorAlumnosComp = crearBuscadorAlumnos(buscadorAlumnosSlot, {
    alumnos,
    onEditar: (alumno) => {
      alumnoSeleccionado = alumno;
      formularioComp.update({ alumnoSeleccionado });
    }
  });

  const listaAlumnosComp = crearListaAlumnos(listaAlumnosSlot, {
    alumnos,
    cargando,
    onEditar: (alumno) => {
      alumnoSeleccionado = alumno;
      formularioComp.update({ alumnoSeleccionado });
    },
    onEliminar: handleEliminar
  });

  const cargarAlumnos = async () => {
    cargando = true;
    listaAlumnosComp.update({ alumnos, cargando });
    try {
      const res = await fetch(API_URL);
      const data = await res.json();
      if (data.success) {
        alumnos = data.data;
        controlFinalesComp.update({ alumnos });
        buscadorAlumnosComp.update({ alumnos });
        renderUserBadgeAndRoleTabs();
      } else {
        mostrarMensaje(data.message || 'Error al cargar alumnos', 'error');
      }
    } catch (error) {
      mostrarMensaje('No se pudo conectar con el servidor.', 'error');
    } finally {
      cargando = false;
      listaAlumnosComp.update({ alumnos, cargando });
    }
  };

  window.addEventListener('cookie-usuario-actualizada', renderUserBadgeAndRoleTabs);
  window.addEventListener('focus', renderUserBadgeAndRoleTabs);
  setInterval(renderUserBadgeAndRoleTabs, 1000);

  renderUserBadgeAndRoleTabs();
  cargarAlumnos();
}
