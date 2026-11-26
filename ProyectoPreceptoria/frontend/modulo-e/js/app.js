import { api } from './api.js';
import { initInscripcionView } from './views/inscripcion.js';
import { initGestionView } from './views/gestion.js';
import { initReportesView } from './views/reportes.js';

const parseCookies = () => {
  if (typeof document === 'undefined' || !document.cookie) return {};
  const cookies = {};
  document.cookie.split(';').forEach((par) => {
    const idx = par.indexOf('=');
    if (idx !== -1) {
      const k = par.substring(0, idx).trim();
      const v = par.substring(idx + 1).trim();
      try {
        cookies[k] = decodeURIComponent(v);
      } catch {
        cookies[k] = v;
      }
    }
  });
  return cookies;
};

const writeSessionCookies = ({ tipoUsuario, idAlumno, nombreAlumno }) => {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7;
  if (tipoUsuario) {
    document.cookie = `tipo_usuario=${encodeURIComponent(tipoUsuario)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (idAlumno !== undefined && idAlumno !== null) {
    document.cookie = `id_alumno=${encodeURIComponent(idAlumno)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (nombreAlumno !== undefined && nombreAlumno !== null) {
    document.cookie = `nombre_alumno=${encodeURIComponent(nombreAlumno)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
};

class AppController {
  constructor() {
    this.activeView = 'inscripcion'; // 'inscripcion' | 'gestion' | 'reportes'
    this.catalogoAlumnos = [];

    // Detección automática de la perspectiva en base a la cookie / sesión autenticada
    const sesion = this.detectSession();
    this.currentUser = sesion.user;
    this.currentRole = sesion.role; // 'preceptor' | 'alumno'
    this.alumnoLogueado = sesion.alumno;

    this.navElement = document.getElementById('navbar-container');
    this.mainContent = document.getElementById('main-content');
    this.toastContainer = document.getElementById('toast-container');

    this.notify = this.notify.bind(this);

    // Contrato global para integración con el sistema principal de login
    window.isft182 = window.isft182 || {};
    window.isft182.setSession = (user) => this.setSession(user);
    window.isft182.getSession = () => ({
      user: this.currentUser,
      role: this.currentRole,
      alumno: this.alumnoLogueado
    });
    window.isft182.clearSession = () => this.clearSession();
  }

  detectSession() {
    let user = null;
    const listaBase = Array.isArray(this.catalogoAlumnos) ? this.catalogoAlumnos : [];

    // 1. Prioridad: Cookie compartida del Portal (tipo_usuario, id_alumno, nombre_alumno)
    const cookies = parseCookies();
    const rolCookie = (
      cookies.tipo_usuario ||
      cookies.tipoUsuario ||
      cookies.rol ||
      ''
    ).toLowerCase();

    if (rolCookie === 'alumno' || rolCookie === 'estudiante') {
      const idAlumnoCookie = Number(cookies.id_alumno || 1);
      const encontrado =
        listaBase.find((a) => Number(a.id_alumno || a.id) === idAlumnoCookie) ||
        listaBase[0];
      const nombreStr =
        cookies.nombre_alumno ||
        encontrado?.apellido_nombres ||
        `${encontrado?.primer_apellido || ''}, ${encontrado?.primer_nombre || ''}`.trim();

      user = {
        rol: 'alumno',
        id_alumno: encontrado ? encontrado.id_alumno || encontrado.id : idAlumnoCookie,
        nombre: nombreStr,
        legajo: encontrado?.legajo || '—',
        alumno: encontrado
      };
    } else if (rolCookie === 'preceptor') {
      user = {
        rol: 'preceptor',
        nombre: 'Preceptoría ISFT 182'
      };
    }

    // 2. Fallback: sessionStorage / localStorage ('isft182_user')
    if (!user) {
      try {
        const raw =
          sessionStorage.getItem('isft182_user') || localStorage.getItem('isft182_user');
        if (raw) {
          user = JSON.parse(raw);
        }
      } catch (e) {
        console.warn('No se pudo parsear el objeto de usuario en almacenamiento:', e);
      }
    }

    if (!user && window.USUARIO_LOGUEADO) {
      user = window.USUARIO_LOGUEADO;
    }

    // 3. Soporte por URL (?rol=alumno&id=1 o ?rol=preceptor)
    if (!user) {
      try {
        const params = new URLSearchParams(window.location.search);
        const rolParam = params.get('rol');
        if (rolParam === 'alumno' || rolParam === 'estudiante') {
          const idAlumnoParam = Number(params.get('id') || 1);
          const al =
            listaBase.find((a) => Number(a.id_alumno || a.id) === idAlumnoParam) ||
            listaBase[0] || null;
          user = {
            rol: 'alumno',
            id_alumno: al ? (al.id_alumno || al.id) : idAlumnoParam,
            nombre: al ? `${al.primer_nombre || al.nombres || ''} ${al.primer_apellido || al.apellidos || ''}`.trim() : 'Estudiante',
            legajo: al?.legajo || '—',
            alumno: al
          };
        }
      } catch (_) {}
    }

    if (user) {
      const rolNorm = String(user.rol || '').toLowerCase();
      const isAlumno = rolNorm === 'alumno' || rolNorm === 'estudiante';
      let alumnoObj = null;
      if (isAlumno) {
        const idBuscado = Number(
          user.id_alumno || user.alumno?.id_alumno || cookies.id_alumno || 1
        );
        alumnoObj =
          listaBase.find((a) => Number(a.id_alumno || a.id) === idBuscado) ||
          user.alumno ||
          listaBase[0];
      }
      return {
        user,
        role: isAlumno ? 'alumno' : 'preceptor',
        alumno: alumnoObj
      };
    }

    return {
      user: {
        rol: 'preceptor',
        nombre: 'Preceptoría ISFT 182'
      },
      role: 'preceptor',
      alumno: null
    };
  }

  setSession(user) {
    if (user) {
      const rolNorm =
        String(user.rol || 'preceptor').toLowerCase() === 'alumno'
          ? 'alumno'
          : 'preceptor';
      const idAl = user.id_alumno || user.alumno?.id_alumno || 1;
      const nomAl =
        user.nombre ||
        user.alumno?.apellido_nombres ||
        'Pérez García, Juan Carlos';

      writeSessionCookies({
        tipoUsuario: rolNorm,
        idAlumno: idAl,
        nombreAlumno: nomAl
      });

      try {
        sessionStorage.setItem('isft182_user', JSON.stringify(user));
      } catch (_) {}
    } else {
      writeSessionCookies({
        tipoUsuario: 'preceptor',
        idAlumno: 1,
        nombreAlumno: 'Pérez García, Juan Carlos'
      });
      try {
        sessionStorage.removeItem('isft182_user');
      } catch (_) {}
    }

    const sesion = this.detectSession();
    this.currentUser = sesion.user;
    this.currentRole = sesion.role;
    this.alumnoLogueado = sesion.alumno;
    if (this.currentRole === 'alumno') {
      this.activeView = 'inscripcion';
    }
    this.renderNavbar();
    this.renderActiveView();
  }

  clearSession() {
    try {
      sessionStorage.removeItem('isft182_user');
      localStorage.removeItem('isft182_user');
    } catch (_) {}
    this.setSession(null);
  }

  async init() {
    if (window.ISFTAuth) {
      const authUser = await window.ISFTAuth.requireAuth('../index.html');
      if (!authUser) return;
      this.authUser = authUser;
    }

    // Recargar sesión ya sincronizada con el usuario autenticado
    const sesionInicial = this.detectSession();
    this.currentUser = sesionInicial.user;
    this.currentRole = sesionInicial.role;
    this.alumnoLogueado = sesionInicial.alumno;
    if (this.currentRole === 'alumno') {
      this.activeView = 'inscripcion';
    }

    this.renderNavbar();
    this.renderActiveView();

    // Cargar nómina real de alumnos desde clementina para sincronizar los datos completos del estudiante autenticado
    try {
      const lista = await api.getAlumnos();
      if (lista && lista.length > 0) {
        this.catalogoAlumnos = lista;
        const sesion = this.detectSession();
        this.currentUser = sesion.user;
        this.currentRole = sesion.role;
        this.alumnoLogueado = sesion.alumno;
        this.renderNavbar();
        if (this.currentRole === 'alumno') {
          this.renderActiveView();
        }
      }
    } catch (_) {}
  }

  notify(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-weight: 700; font-size: 0.85rem;">${type === 'success' ? '[OK]' : '[AVISO]'}</span>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 4500);
  }

  setActiveView(view) {
    if (this.activeView === view) return;
    const modalPortal = document.getElementById('gestion-modales-portal');
    if (modalPortal) modalPortal.innerHTML = '';
    const conflictoPortal = document.getElementById('inscripcion-conflicto-portal');
    if (conflictoPortal) conflictoPortal.innerHTML = '';
    this.activeView = view;
    this.updateNavbarActiveState();
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.renderActiveView();
  }

  updateNavbarActiveState() {
    const buttons = this.navElement.querySelectorAll('button.nav-button');
    buttons.forEach((btn) => {
      btn.classList.remove('active');
    });
    const activeBtn = this.navElement.querySelector(`#nav-btn-${this.activeView}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }

  renderNavbar() {
    const isAlumno = this.currentRole === 'alumno';

    let nombreMostrar = this.authUser
      ? `${this.authUser.firstName || ''} ${this.authUser.lastName || ''}`.trim()
      : 'Preceptoría ISFT 182';
    let subtitulo = this.authUser?.role || 'Personal de Gestión';
    let inicial = (this.authUser?.firstName?.[0] || 'P').toUpperCase();

    if (isAlumno && this.alumnoLogueado) {
      const al = this.alumnoLogueado;
      nombreMostrar =
        al.apellido_nombres ||
        `${al.primer_apellido || al.apellidos || ''}, ${al.primer_nombre || al.nombres || ''}`.trim() ||
        nombreMostrar;
      subtitulo = `Estudiante · Leg. ${al.legajo || '—'}`;
      inicial = (
        al.primer_apellido?.charAt(0) ||
        al.primer_nombre?.charAt(0) ||
        'E'
      ).toUpperCase();
    } else if (!this.authUser && this.currentUser && this.currentUser.nombre) {
      nombreMostrar = this.currentUser.nombre;
    }

    this.navElement.className = 'navbar no-print';
    this.navElement.innerHTML = `
      <div class="nav-brand">
        <div class="nav-logo-badge" title="ISFT Nº 182">
          <img src="isft182.jpg" alt="ISFT 182" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;" />
        </div>
        <div class="nav-title-group">
          <h1>Inscripción a Materias</h1>
          <span>ISFT 182 · Cursadas y Gestión Académica</span>
        </div>
      </div>

      <nav class="nav-links">
        <a
          href="../../../index.html"
          class="nav-button"
          style="text-decoration: none;"
          title="Volver al Home del Portal"
        >
          Home
        </a>
        <span style="color: #cbd5e1; user-select: none;">|</span>
        ${
          isAlumno
            ? `
          <button
            type="button"
            id="nav-btn-inscripcion"
            class="nav-button ${this.activeView === 'inscripcion' ? 'active' : ''}"
          >
            Mi Inscripción a Cursada
          </button>
        `
            : `
          <button
            type="button"
            id="nav-btn-inscripcion"
            class="nav-button ${this.activeView === 'inscripcion' ? 'active' : ''}"
          >
            Inscripción Online
          </button>
          <button
            type="button"
            id="nav-btn-gestion"
            class="nav-button ${this.activeView === 'gestion' ? 'active' : ''}"
          >
            Gestión Académica
          </button>
          <button
            type="button"
            id="nav-btn-reportes"
            class="nav-button ${this.activeView === 'reportes' ? 'active' : ''}"
          >
            Reportes de Gestión
          </button>
        `
        }
      </nav>

      <!-- Badge de Usuario Institucional + Cerrar Sesión -->
      <div class="nav-user-actions">
        <div class="nav-user-badge" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.35rem 0.75rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; flex-shrink: 0;">
            ${inicial}
          </div>
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap;">
              ${nombreMostrar}
            </span>
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;">
              ${subtitulo}
            </span>
          </div>
        </div>
        <button type="button" id="btnModuloELogout" class="btn-nav-logout" title="Cerrar sesión institucional">
          Salir
        </button>
      </div>
    `;

    const btnInsc = this.navElement.querySelector('#nav-btn-inscripcion');
    if (btnInsc) btnInsc.addEventListener('click', () => this.setActiveView('inscripcion'));

    const btnGest = this.navElement.querySelector('#nav-btn-gestion');
    if (btnGest) btnGest.addEventListener('click', () => this.setActiveView('gestion'));

    const btnRep = this.navElement.querySelector('#nav-btn-reportes');
    if (btnRep) btnRep.addEventListener('click', () => this.setActiveView('reportes'));

    const btnOut = this.navElement.querySelector('#btnModuloELogout');
    if (btnOut) btnOut.addEventListener('click', () => window.ISFTAuth?.logout('../index.html'));
  }

  renderActiveView() {
    this.mainContent.innerHTML = `
      <div id="modulo-e-view-container" style="display: flex; flex-direction: column; gap: 1.5rem;"></div>
    `;
    const viewContainer = document.getElementById('modulo-e-view-container');

    if (this.activeView === 'inscripcion') {
      initInscripcionView(viewContainer, this.notify, this.currentRole, this.alumnoLogueado);
    } else if (this.activeView === 'gestion' && this.currentRole === 'preceptor') {
      initGestionView(viewContainer, this.notify);
    } else if (this.activeView === 'reportes') {
      initReportesView(viewContainer, this.notify);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AppController();
  app.init();
});
