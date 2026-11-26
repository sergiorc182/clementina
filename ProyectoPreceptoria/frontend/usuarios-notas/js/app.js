/**
 * Módulo C: Usuarios, Autenticación Compartida, Auditoría y Validación de Notas (ISFT 182)
 * Conectado 100% a la base de datos única MySQL (clementina: historial_academico, users, roles, audit_logs).
 *
 * Semáforo Oficial de Validación (Requerimiento Cliente):
 * - GREEN  (Verde):   Verificado con final aprobado (validado_examen = 'T').
 * - ORANGE (Naranja): Regularizada y verificada con preceptoría (validado_regular = 'T').
 * - RED    (Rojo):    Sin verificar (validado_regular = 'F' y validado_examen = 'F').
 */
(function () {
  'use strict';

  const API_BASE = 'http://localhost:3000/api/v1';

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function notify(message, type = 'success') {
    if (window.ISFTNotify) {
      window.ISFTNotify(message, type);
      return;
    }
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-weight: 700; font-size: 0.85rem;">${type === 'success' ? '[OK]' : '[AVISO]'}</span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 4500);
  }

  function parseCookies() {
    const cookies = {};
    if (!document.cookie) return cookies;
    document.cookie.split(';').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx !== -1) {
        const k = pair.substring(0, idx).trim();
        const v = pair.substring(idx + 1).trim();
        try { cookies[k] = decodeURIComponent(v); } catch { cookies[k] = v; }
      }
    });
    return cookies;
  }

  function setCookie(name, value, days = 7) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function syncCookiesWithProfile(profile) {
    if (!profile) return;
    const isAlumno = profile.role === 'ALUMNO';
    setCookie('tipo_usuario', isAlumno ? 'alumno' : 'preceptor');
    setCookie('rol_sistema', profile.role);
    if (isAlumno) {
      setCookie('id_alumno', String(profile.idAlumno || 1));
      setCookie('nombre_alumno', `${profile.firstName || ''} ${profile.lastName || ''}`.replace(' (Estudiante)', '').trim());
    }
  }

  const state = {
    user: null,
    token: localStorage.getItem('institucion_token') || '',
    showLoginScreen: false,
    activeTab: 'grades', // 'grades' | 'users' | 'roles' | 'audit'
    // Validación de Notas (MySQL historial_academico)
    records: [],
    summary: { total: 0, green: 0, orange: 0, red: 0, sinDefinir: 0 },
    careers: [],
    subjects: [],
    gradeFilters: {
      career: '',
      subject: '',
      search: '',
      color: '',
      tipoExamen: ''
    },
    gradesFeedback: '',
    gradesError: '',
    // Usuarios y Roles (MySQL users, roles)
    users: [],
    roles: [],
    studentsCatalog: [],
    allPermissions: [],
    userFilters: { search: '', roleId: '' },
    usersFeedback: '',
    usersError: '',
    rolePermissionsMap: {},
    rolesFeedback: '',
    rolesError: '',
    // Historial de Modificaciones (MySQL audit_logs)
    auditLogs: [],
    auditTotal: 0,
    auditFilters: { userId: '', actionType: '', entity: '' }
  };

  function hasPermission(permCode) {
    if (!state.user) return false;
    if (state.user.role === 'ADMINISTRADOR') return true;
    return Array.isArray(state.user.permissions) && state.user.permissions.includes(permCode);
  }

  function canValidateGrades() {
    if (!state.user) return false;
    return ['ADMINISTRADOR', 'PRECEPTOR', 'ADMINISTRATIVO'].includes(state.user.role) || hasPermission('GRADES_RECALCULATE');
  }

  async function apiRequest(endpoint, { method = 'GET', body = null } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || data.message || 'Error en la solicitud al servidor.');
    }
    return data;
  }

  async function initAuthenticatedSession() {
    if (window.ISFTAuth) {
      const verifiedUser = await window.ISFTAuth.requireAuth('../index.html');
      if (!verifiedUser) return false;
      state.token = window.ISFTAuth.getToken();
      state.user = verifiedUser;
    } else {
      window.location.replace('../index.html');
      return false;
    }

    if (state.user?.role === 'ALUMNO') {
      state.activeTab = 'grades';
    }
    state.gradeFilters = { career: '', subject: '', search: '', color: '', tipoExamen: '' };
    return true;
  }

  // =========================================================================
  // BARRA DE NAVEGACIÓN SUPERIOR UNIFICADA
  // =========================================================================

  function getVisibleNavItems() {
    const user = state.user || { role: 'INVITADO' };
    const isAlumno = user.role === 'ALUMNO';
    return [
      { id: 'grades', label: isAlumno ? 'Mis Notas y Validación' : 'Validación de Notas', visible: !state.user || hasPermission('GRADES_VIEW') },
      { id: 'users', label: 'Usuarios', visible: !isAlumno && hasPermission('USERS_VIEW') },
      { id: 'roles', label: 'Roles y Permisos', visible: !isAlumno && hasPermission('ROLES_VIEW') },
      { id: 'audit', label: 'Historial', visible: !isAlumno && hasPermission('AUDIT_VIEW') }
    ].filter(item => item.visible);
  }

  function renderNavbar() {
    const navContainer = document.getElementById('navbar-container');
    if (!navContainer) return;

    const navItems = getVisibleNavItems();
    if (navItems.length > 0 && !navItems.some(i => i.id === state.activeTab)) {
      state.activeTab = navItems[0].id;
    }

    const activeRole = state.user?.role || 'INVITADO';
    const isAlumno = activeRole === 'ALUMNO';
    const nombreMostrar = state.user
      ? `${state.user.firstName || ''} ${state.user.lastName || ''}`.trim()
      : 'Sin sesión';
    const subtituloUsuario = isAlumno
      ? `Estudiante${state.user?.alumnoLegajo ? ` · Leg. ${state.user.alumnoLegajo}` : ''}`
      : activeRole;
    const inicial = (state.user?.firstName?.[0] || 'U').toUpperCase();

    navContainer.innerHTML = `
      <div class="nav-brand">
        <div class="nav-logo-badge" title="ISFT Nº 182">
          <img src="./isft182.jpg" alt="ISFT 182" />
        </div>
        <div class="nav-title-group">
          <h1>Usuarios y Validación de Notas</h1>
          <span>ISFT 182 · Semáforo y Auditoría</span>
        </div>
      </div>

      <nav class="nav-links" role="tablist" aria-label="Secciones de Usuarios y Validación de Notas">
        <a href="../index.html" class="nav-button" title="Volver al Home del Portal">
          Home
        </a>
        <span class="nav-divider">|</span>
        ${navItems.map(item => `
          <button type="button" role="tab" aria-selected="${state.activeTab === item.id}" class="nav-button ${state.activeTab === item.id ? 'active' : ''}" data-tab="${item.id}">
            ${escapeHtml(item.label)}
          </button>
        `).join('')}
      </nav>

      <div class="nav-user-actions">
        <div class="nav-user-badge" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.35rem 0.75rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; flex-shrink: 0;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; flex-shrink: 0;">
            ${escapeHtml(inicial)}
          </div>
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap;">
              ${escapeHtml(nombreMostrar)}
            </span>
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;">
              ${escapeHtml(subtituloUsuario)}
            </span>
          </div>
        </div>
        <button type="button" id="btnNotasLogout" class="btn-nav-logout" title="Cerrar sesión institucional">
          Salir
        </button>
      </div>
    `;

    navContainer.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const nextTab = btn.getAttribute('data-tab');
        if (state.activeTab === nextTab) return;
        state.activeTab = nextTab;
        renderApp();
        loadActiveTabData();
      });
    });

    document.getElementById('btnNotasLogout')?.addEventListener('click', () => {
      window.ISFTAuth?.logout('../index.html');
    });
  }

  // =========================================================================
  // CARGA DE DATOS REALES DESDE MYSQL (CLEMENTINA)
  // =========================================================================

  async function loadGradesData() {
    state.gradesError = '';
    try {
      const [careersRes, subjectsRes] = await Promise.all([
        apiRequest('/academic/careers'),
        apiRequest('/academic/subjects')
      ]);
      state.careers = Array.isArray(careersRes.data) ? careersRes.data : [];
      state.subjects = Array.isArray(subjectsRes.data) ? subjectsRes.data : [];
    } catch (e) {
      state.gradesError = `Error al cargar catálogos: ${e.message}`;
    }
    await fetchAcademicRecords();
  }

  async function fetchAcademicRecords() {
    const q = new URLSearchParams();
    if (state.gradeFilters.career) q.append('career', state.gradeFilters.career);
    if (state.gradeFilters.subject) q.append('subjectId', state.gradeFilters.subject);
    if (state.gradeFilters.search) q.append('search', state.gradeFilters.search);
    if (state.gradeFilters.color) q.append('color', state.gradeFilters.color);
    if (state.gradeFilters.tipoExamen) q.append('tipoExamen', state.gradeFilters.tipoExamen);

    try {
      const res = await apiRequest(`/academic/records?${q.toString()}`);
      state.records = res.data?.data || [];
      if (res.data?.summary) state.summary = res.data.summary;
      state.gradesError = '';
    } catch (e) {
      state.records = [];
      state.gradesError = `No se pudieron cargar las notas: ${e.message}`;
    }
    renderMainContent();
  }

  async function fetchUsersData() {
    const q = new URLSearchParams();
    if (state.userFilters.search) q.append('search', state.userFilters.search);
    if (state.userFilters.roleId) q.append('roleId', state.userFilters.roleId);

    try {
      const [usersRes, rolesRes, studentsRes] = await Promise.all([
        apiRequest(`/users?${q.toString()}`),
        apiRequest('/roles'),
        apiRequest('/academic/students').catch(() => ({ data: [] }))
      ]);
      state.users = usersRes.data?.data || [];
      state.roles = rolesRes.data || [];
      state.studentsCatalog = Array.isArray(studentsRes.data) ? studentsRes.data : [];
      state.usersError = '';
    } catch (e) {
      state.users = [];
      state.usersError = `No se pudieron cargar los usuarios: ${e.message}`;
    }
    renderMainContent();
  }

  async function fetchRolesData() {
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiRequest('/roles'),
        apiRequest('/roles/permissions')
      ]);
      state.roles = rolesRes.data || [];
      state.allPermissions = permsRes.data || [];
      state.rolesError = '';
    } catch (e) {
      state.roles = [];
      state.allPermissions = [];
      state.rolesError = `No se pudieron cargar los roles: ${e.message}`;
    }
    const map = {};
    state.roles.forEach(r => {
      map[r.id] = (r.permissions || []).map(p => p.id);
    });
    state.rolePermissionsMap = map;
    renderMainContent();
  }

  async function fetchAuditData() {
    const q = new URLSearchParams();
    if (state.auditFilters.userId) q.append('userId', state.auditFilters.userId);
    if (state.auditFilters.actionType) q.append('actionType', state.auditFilters.actionType);
    if (state.auditFilters.entity) q.append('entity', state.auditFilters.entity);
    q.append('limit', '100');

    try {
      if (state.users.length === 0 && hasPermission('USERS_VIEW')) {
        const uRes = await apiRequest('/users?limit=100').catch(() => ({ data: { data: [] } }));
        state.users = uRes.data?.data || [];
      }
      const res = await apiRequest(`/audit-logs?${q.toString()}`);
      state.auditLogs = res.data?.data || [];
      state.auditTotal = res.data?.total || state.auditLogs.length;
    } catch (e) {
      state.auditLogs = [];
      state.auditTotal = 0;
    }
    renderMainContent();
  }

  function loadActiveTabData() {
    if (state.showLoginScreen) return;
    if (state.activeTab === 'grades') loadGradesData();
    else if (state.activeTab === 'users') fetchUsersData();
    else if (state.activeTab === 'roles') fetchRolesData();
    else if (state.activeTab === 'audit') fetchAuditData();
  }

  // =========================================================================
  // LAYOUT PRINCIPAL (SIN SIDEBAR NI ESPACIOS MUERTOS — IGUAL A MÓDULO E)
  // =========================================================================

  function renderApp() {
    renderNavbar();
    const root = document.getElementById('app-root');
    if (!root) return;

    root.innerHTML = `<div id="main-content-slot" class="view-stack"></div>`;
    renderMainContent();
  }

  function renderMainContent() {
    const slot = document.getElementById('main-content-slot');
    if (!slot) return;

    if (state.activeTab === 'grades') {
      slot.innerHTML = renderValidationTab();
      bindValidationEvents();
    } else if (state.activeTab === 'users') {
      slot.innerHTML = renderUsersTab();
      bindUsersEvents();
    } else if (state.activeTab === 'roles') {
      slot.innerHTML = renderRolesTab();
      bindRolesEvents();
    } else if (state.activeTab === 'audit') {
      slot.innerHTML = renderAuditTab();
      bindAuditEvents();
    }
  }

  // =========================================================================
  // VISTA 1: VALIDACIÓN DE NOTAS (SEMÁFORO OFICIAL + CORRECCIÓN PROMOCIÓN)
  // =========================================================================

  function renderSemaphoreBadge(color, label, reason) {
    const c = (color || 'RED').toUpperCase();
    const emoji = c === 'GREEN' ? '🟢' : c === 'ORANGE' ? '🟠' : '🔴';
    const cssClass = c === 'GREEN' ? 'green' : c === 'ORANGE' ? 'orange' : 'red';
    return `
      <div class="traffic-badge ${cssClass}" title="${escapeHtml(reason || '')}">
        <span>${emoji}</span>
        <span>${escapeHtml(label)}</span>
      </div>
    `;
  }

  function renderTipoExamenBadge(rec) {
    if (rec.tipo_examen_sin_definir) {
      return `<span class="badge-sin-definir" style="display:inline-block;padding:3px 8px;border-radius:6px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;font-size:0.78rem;font-weight:700;">Sin definir (${escapeHtml(rec.tipo_examen_codigo)})</span>`;
    }
    const styles = {
      P: 'background:#dcfce7;color:#166534;border:1px solid #86efac;',
      R: 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;',
      L: 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;',
      E: 'background:#f3e8ff;color:#6b21a8;border:1px solid #d8b4fe;'
    };
    const st = styles[rec.tipo_examen_codigo] || 'background:#f1f5f9;color:#334155;';
    return `<span style="display:inline-block;padding:3px 9px;border-radius:6px;font-size:0.78rem;font-weight:700;${st}">${escapeHtml(rec.tipo_examen_label)}</span>`;
  }

  function renderValidationTab() {
    const isAlumno = state.user?.role === 'ALUMNO';
    const puedeValidar = canValidateGrades();
    const filteredSubjects = state.gradeFilters.career
      ? state.subjects.filter(s => s.career === state.gradeFilters.career)
      : state.subjects;

    const sum = state.summary;

    return `
      <div class="view-stack">
        <div class="traffic-legend-card">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <h3 style="font-size: 0.94rem; font-weight: 700; color: var(--primary); margin:0;">
              Criterio Oficial del Semáforo de Validación de Notas
            </h3>
          </div>
          <div class="legend-grid">
            <div class="legend-item">
              <div style="font-size:1.1rem;">🟢</div>
              <div>
                <div class="legend-item-title">Verde: Verificado con Final Aprobado</div>
                <div class="legend-item-desc">Final aprobado o Promoción acreditada y verificada.</div>
              </div>
            </div>
            <div class="legend-item">
              <div style="font-size:1.1rem;">🟠</div>
              <div>
                <div class="legend-item-title">Naranja: Regularizada y Verificada</div>
                <div class="legend-item-desc">Cursada regularizada y verificada con Preceptoría.</div>
              </div>
            </div>
            <div class="legend-item">
              <div style="font-size:1.1rem;">🔴</div>
              <div>
                <div class="legend-item-title">Rojo: Sin Verificar</div>
                <div class="legend-item-desc">Pendiente de revisión por Preceptoría o Administración.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="card kpi-card ${!state.gradeFilters.color && !state.gradeFilters.tipoExamen ? 'active-filter-card' : ''}" data-kpi-color="" style="border-left:4px solid #1e3a8a;">
            <div class="kpi-label" style="color:#64748b;">Total Historial</div>
            <div class="kpi-value" style="color:#1e293b;">${sum.total}</div>
          </div>
          <div class="card kpi-card ${state.gradeFilters.color === 'GREEN' ? 'active-filter-card' : ''}" data-kpi-color="GREEN" style="border-left:4px solid #10b981;">
            <div class="kpi-label" style="color:#065f46;">🟢 Verificadas (Final)</div>
            <div class="kpi-value" style="color:#059669;">${sum.green}</div>
          </div>
          <div class="card kpi-card ${state.gradeFilters.color === 'ORANGE' ? 'active-filter-card' : ''}" data-kpi-color="ORANGE" style="border-left:4px solid #f59e0b;">
            <div class="kpi-label" style="color:#92400e;">🟠 Regularizadas Verif.</div>
            <div class="kpi-value" style="color:#d97706;">${sum.orange}</div>
          </div>
          <div class="card kpi-card ${state.gradeFilters.color === 'RED' ? 'active-filter-card' : ''}" data-kpi-color="RED" style="border-left:4px solid #ef4444;">
            <div class="kpi-label" style="color:#991b1b;">🔴 Sin Verificar</div>
            <div class="kpi-value" style="color:#dc2626;">${sum.red}</div>
          </div>
          <div class="card kpi-card ${state.gradeFilters.tipoExamen === 'SIN_DEFINIR' ? 'active-filter-card' : ''}" data-kpi-tipo="SIN_DEFINIR" style="border-left:4px solid #7c3aed;">
            <div class="kpi-label" style="color:#5b21b6;">Tipo Examen a Corregir</div>
            <div class="kpi-value" style="color:#6d28d9;">${sum.sinDefinir}</div>
          </div>
        </div>

        ${isAlumno ? `
          <div class="alert alert-info" style="margin-bottom:0;">
            <strong>Vista privada de Estudiante:</strong> Estás viendo únicamente tus propias materias y estado de validación${state.user?.alumnoLegajo ? ` (Legajo ${escapeHtml(state.user.alumnoLegajo)})` : ''}. El sistema restringe el acceso a registros de otros alumnos.
          </div>
        ` : ''}
        ${state.gradesFeedback ? `<div class="alert alert-success" style="margin-bottom:0;">${escapeHtml(state.gradesFeedback)}</div>` : ''}
        ${state.gradesError ? `<div class="alert alert-danger" style="margin-bottom:0;">${escapeHtml(state.gradesError)}</div>` : ''}

        <div class="card" style="padding:1rem 1.25rem;">
          <div class="filters-grid">
            <div class="form-group">
              <label for="fCareer">1. Carrera</label>
              <select id="fCareer" class="form-control">
                <option value="">Todas las Carreras (${state.careers.length})</option>
                ${state.careers.map(c => `<option value="${escapeHtml(c)}" ${state.gradeFilters.career === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="fSubject">2. Materia</label>
              <select id="fSubject" class="form-control">
                <option value="">Todas las Materias</option>
                ${filteredSubjects.map(s => `<option value="${s.id}" ${String(state.gradeFilters.subject) === String(s.id) ? 'selected' : ''}>${s.year_level}º Año - ${escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label for="fSearch">${isAlumno ? '3. Buscar en mis Materias' : '3. Alumno / DNI / Legajo'}</label>
              <input id="fSearch" type="text" class="form-control" placeholder="${isAlumno ? 'Ej: Programación o Base de Datos...' : 'Ej: Pérez o 40111222...'}" value="${escapeHtml(state.gradeFilters.search)}" />
            </div>
            <div class="form-group">
              <label for="fColor">4. Estado del Semáforo</label>
              <select id="fColor" class="form-control">
                <option value="">Todos los Estados</option>
                <option value="GREEN" ${state.gradeFilters.color === 'GREEN' ? 'selected' : ''}>🟢 Verde - Verificado (Final Aprobado)</option>
                <option value="ORANGE" ${state.gradeFilters.color === 'ORANGE' ? 'selected' : ''}>🟠 Naranja - Regularizada Verificada</option>
                <option value="RED" ${state.gradeFilters.color === 'RED' ? 'selected' : ''}>🔴 Rojo - Sin Verificar</option>
              </select>
            </div>
            <div class="form-group">
              <label for="fTipoExamen">5. Tipo de Examen</label>
              <select id="fTipoExamen" class="form-control">
                <option value="">Todos los Tipos</option>
                <option value="P" ${state.gradeFilters.tipoExamen === 'P' ? 'selected' : ''}>Promoción</option>
                <option value="R" ${state.gradeFilters.tipoExamen === 'R' ? 'selected' : ''}>Regular</option>
                <option value="L" ${state.gradeFilters.tipoExamen === 'L' ? 'selected' : ''}>Libre</option>
                <option value="E" ${state.gradeFilters.tipoExamen === 'E' ? 'selected' : ''}>Equivalencia</option>
                <option value="SIN_DEFINIR" ${state.gradeFilters.tipoExamen === 'SIN_DEFINIR' ? 'selected' : ''}>Sin definir (a corregir)</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:flex-end;gap:8px;">
              <button type="button" id="btnFilterGrades" class="btn btn-primary" style="flex:1;">Filtrar</button>
              <button type="button" id="btnResetFilters" class="btn btn-secondary">Limpiar</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
            <div class="card-title">Registro de Calificaciones y Validación (${state.records.length} visibles)</div>
          </div>

          ${state.records.length === 0 ? `
            <div style="text-align:center;padding:36px;color:#64748b;">
              No se encontraron registros académicos con los filtros seleccionados.
            </div>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Carrera / Año</th>
                    <th>Materia</th>
                    <th>Estudiante</th>
                    <th style="text-align:center;">Tipo de Examen</th>
                    <th style="text-align:center;">Nota / Acta</th>
                    <th style="text-align:center;">Semáforo de Validación</th>
                    ${puedeValidar ? '<th style="text-align:right;min-width:210px;">Validación Rápida / Editar</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${state.records.map(rec => `
                    <tr>
                      <td>
                        <span class="career-badge">${escapeHtml(rec.subject_career)}</span>
                        <div style="font-size:0.75rem;color:#64748b;margin-top:3px;">${rec.subject_year_level}º Año</div>
                      </td>
                      <td>
                        <div style="font-weight:600;">${escapeHtml(rec.subject_name)}</div>
                        <div style="font-size:0.74rem;color:#64748b;">${escapeHtml(rec.subject_code)}</div>
                      </td>
                      <td>
                        <div style="font-weight:700;">${escapeHtml(rec.student_last_name)}, ${escapeHtml(rec.student_first_name)}</div>
                        <div style="font-size:0.74rem;color:#64748b;">Legajo: ${escapeHtml(rec.student_file)} | DNI: ${escapeHtml(rec.student_dni)}</div>
                      </td>
                      <td style="text-align:center;">
                        ${renderTipoExamenBadge(rec)}
                      </td>
                      <td style="text-align:center;">
                        <div style="font-weight:700;font-size:0.95rem;color:${rec.nota >= 4 ? '#059669' : '#475569'};">
                          ${rec.nota !== null ? rec.nota : '—'}
                        </div>
                        <div style="font-size:0.73rem;color:#64748b;">
                          ${rec.academic_year ? `Reg. ${rec.academic_year}` : 'Sin año reg.'}
                          ${rec.tomo_acta || rec.folio_acta ? ` · T${rec.tomo_acta}/F${rec.folio_acta}` : ''}
                        </div>
                      </td>
                      <td style="text-align:center;">
                        ${renderSemaphoreBadge(rec.traffic_light_color, rec.traffic_light_label, rec.traffic_light_reason)}
                      </td>
                      ${puedeValidar ? `
                        <td style="text-align:right;">
                          <div style="display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
                            <button type="button" class="btn btn-sm" data-quick-val="${escapeHtml(rec.id)}" data-color="GREEN" title="Marcar Verde: Verificado con final aprobado" style="background:#dcfce7;border:1px solid #86efac;padding:3px 7px;">🟢</button>
                            <button type="button" class="btn btn-sm" data-quick-val="${escapeHtml(rec.id)}" data-color="ORANGE" title="Marcar Naranja: Regularizada y verificada con preceptoría" style="background:#fef3c7;border:1px solid #fcd34d;padding:3px 7px;">🟠</button>
                            <button type="button" class="btn btn-sm" data-quick-val="${escapeHtml(rec.id)}" data-color="RED" title="Marcar Rojo: Sin verificar" style="background:#fee2e2;border:1px solid #fca5a5;padding:3px 7px;">🔴</button>
                            <button type="button" class="btn btn-primary btn-sm" data-edit-val="${escapeHtml(rec.id)}" style="padding:4px 9px;font-size:0.76rem;">Validar / Corregir</button>
                          </div>
                        </td>
                      ` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  function bindValidationEvents() {
    const fCareer = document.getElementById('fCareer');
    const fSubject = document.getElementById('fSubject');
    const fSearch = document.getElementById('fSearch');
    const fColor = document.getElementById('fColor');
    const fTipo = document.getElementById('fTipoExamen');
    const btnFilter = document.getElementById('btnFilterGrades');
    const btnReset = document.getElementById('btnResetFilters');

    if (fCareer) fCareer.addEventListener('change', (e) => { state.gradeFilters.career = e.target.value; state.gradeFilters.subject = ''; fetchAcademicRecords(); });
    if (fSubject) fSubject.addEventListener('change', (e) => { state.gradeFilters.subject = e.target.value; fetchAcademicRecords(); });
    if (fSearch) fSearch.addEventListener('input', (e) => { state.gradeFilters.search = e.target.value; });
    if (fSearch) fSearch.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchAcademicRecords(); });
    if (fColor) fColor.addEventListener('change', (e) => { state.gradeFilters.color = e.target.value; fetchAcademicRecords(); });
    if (fTipo) fTipo.addEventListener('change', (e) => { state.gradeFilters.tipoExamen = e.target.value; fetchAcademicRecords(); });
    if (btnFilter) btnFilter.addEventListener('click', fetchAcademicRecords);
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        state.gradeFilters = { career: '', subject: '', search: '', color: '', tipoExamen: '' };
        fetchAcademicRecords();
      });
    }

    document.querySelectorAll('[data-kpi-color]').forEach(card => {
      card.addEventListener('click', () => {
        state.gradeFilters.color = card.getAttribute('data-kpi-color');
        state.gradeFilters.tipoExamen = '';
        fetchAcademicRecords();
      });
    });

    document.querySelectorAll('[data-kpi-tipo]').forEach(card => {
      card.addEventListener('click', () => {
        state.gradeFilters.tipoExamen = state.gradeFilters.tipoExamen === 'SIN_DEFINIR' ? '' : 'SIN_DEFINIR';
        fetchAcademicRecords();
      });
    });

    // Validación rápida 1-clic (Semáforo Verde / Naranja / Rojo)
    document.querySelectorAll('[data-quick-val]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const recId = btn.getAttribute('data-quick-val');
        const targetColor = btn.getAttribute('data-color');
        try {
          await apiRequest(`/resultados/${recId}/validacion`, {
            method: 'PATCH',
            body: { estado_semaforo: targetColor }
          });
          const labels = { GREEN: '🟢 Verde (Verificado con final aprobado)', ORANGE: '🟠 Naranja (Regularizada y verificada)', RED: '🔴 Rojo (Sin verificar)' };
          state.gradesFeedback = '';
          state.gradesError = '';
          notify(`Registro actualizado a ${labels[targetColor]}.`, 'success');
          await fetchAcademicRecords();
        } catch (err) {
          notify(err.message || 'No se pudo actualizar la validación.', 'error');
        }
      });
    });

    // Modal completo: Validar Semáforo + Corregir Tipo de Examen (Promoción / Regular / Libre / Equivalencia)
    document.querySelectorAll('[data-edit-val]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rec = state.records.find(r => r.id === btn.getAttribute('data-edit-val'));
        if (rec) openValidateModal(rec);
      });
    });
  }

  function closeModal() {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  }

  function openValidateModal(rec) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    const currentTipo = ['P', 'R', 'L', 'E'].includes(rec.tipo_examen_codigo) ? rec.tipo_examen_codigo : 'R';

    modalRoot.innerHTML = `
      <div class="modal-overlay" id="activeModalOverlay">
        <div class="modal-content" style="max-width: 560px;">
          <div class="modal-header">
            <div class="modal-title">Validar Nota y Corregir Tipo de Examen</div>
            <button type="button" id="btnCloseModal" style="background:none;border:none;font-size:1.3rem;cursor:pointer;">×</button>
          </div>
          <div class="modal-body">
          <p style="font-size:0.85rem;color:#475569;margin-bottom:14px;">
            <strong>${escapeHtml(rec.student_last_name)}, ${escapeHtml(rec.student_first_name)}</strong> (DNI ${escapeHtml(rec.student_dni)})<br />
            ${escapeHtml(rec.subject_career)} — <strong>${escapeHtml(rec.subject_name)}</strong>
          </p>

          <div id="valModalFeedback"></div>

          <form id="validateGradeForm">
            <div class="form-group">
              <label for="valSemaforo">Estado de Validación (Semáforo Oficial) *</label>
              <select id="valSemaforo" class="form-control" required>
                <option value="GREEN" ${rec.traffic_light_color === 'GREEN' ? 'selected' : ''}>🟢 Verde — Verificado con final aprobado / Promoción</option>
                <option value="ORANGE" ${rec.traffic_light_color === 'ORANGE' ? 'selected' : ''}>🟠 Naranja — Regularizada y verificada con preceptoría</option>
                <option value="RED" ${rec.traffic_light_color === 'RED' ? 'selected' : ''}>🔴 Rojo — Sin verificar</option>
              </select>
            </div>

            <div class="form-group">
              <label for="valTipoExamen">Tipo de Examen / Acreditación *</label>
              <select id="valTipoExamen" class="form-control" required>
                <option value="P" ${currentTipo === 'P' ? 'selected' : ''}>Promoción (P)</option>
                <option value="R" ${currentTipo === 'R' ? 'selected' : ''}>Regular (R)</option>
                <option value="L" ${currentTipo === 'L' ? 'selected' : ''}>Libre (L)</option>
                <option value="E" ${currentTipo === 'E' ? 'selected' : ''}>Equivalencia (E)</option>
              </select>
              <small style="color:#64748b;font-size:0.75rem;">Corrige el problema de registros con tipo "No definido" (X) para mostrar Promoción correctamente.</small>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label for="valNota">Nota Final (0 a 10)</label>
                <input id="valNota" type="number" min="0" max="10" class="form-control" value="${rec.nota !== null ? rec.nota : ''}" placeholder="Ej: 8" />
                <small style="color:#64748b;font-size:0.73rem;">Requerida (&ge; 4) si el estado es 🟢 Verde.</small>
              </div>
              <div class="form-group">
                <label for="valAnioReg">Año de Regularidad</label>
                <input id="valAnioReg" type="number" min="2015" max="2035" class="form-control" value="${rec.academic_year || ''}" placeholder="Ej: 2025" />
              </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div class="form-group">
                <label for="valTomo">Tomo Acta</label>
                <input id="valTomo" type="number" min="0" class="form-control" value="${rec.tomo_acta || 0}" />
              </div>
              <div class="form-group">
                <label for="valFolio">Folio Acta</label>
                <input id="valFolio" type="number" min="0" class="form-control" value="${rec.folio_acta || 0}" />
              </div>
            </div>

            <div class="form-group">
              <label for="valObs">Observaciones (opcional)</label>
              <input id="valObs" type="text" class="form-control" value="${escapeHtml(rec.observaciones || '')}" placeholder="Ej: Verificado contra Libro Matriz" />
            </div>

            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" id="btnCancelVal" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">Guardar Validación</button>
            </div>
          </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelVal')?.addEventListener('click', closeModal);
    document.getElementById('activeModalOverlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'activeModalOverlay') closeModal();
    });

    document.getElementById('validateGradeForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fb = document.getElementById('valModalFeedback');
      const payload = {
        estado_semaforo: document.getElementById('valSemaforo').value,
        tipo_examen: document.getElementById('valTipoExamen').value,
        nota: document.getElementById('valNota').value,
        anio_regular: document.getElementById('valAnioReg').value,
        tomo_acta: document.getElementById('valTomo').value,
        folio_acta: document.getElementById('valFolio').value,
        observaciones: document.getElementById('valObs').value
      };

      try {
        await apiRequest(`/resultados/${rec.id}/validacion`, {
          method: 'PATCH',
          body: payload
        });
        closeModal();
        state.gradesFeedback = '';
        state.gradesError = '';
        notify('Validación y tipo de examen guardados correctamente.', 'success');
        await fetchAcademicRecords();
      } catch (err) {
        if (fb) fb.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
        notify(err.message || 'Error al guardar la validación.', 'error');
      }
    });
  }

  // =========================================================================
  // VISTA 2: USUARIOS ADMINISTRADORES Y PERFILES (MYSQL `users`)
  // =========================================================================

  function renderUsersTab() {
    const canCreate = hasPermission('USERS_CREATE');
    const canEdit = hasPermission('USERS_EDIT');
    const canDeactivate = hasPermission('USERS_DEACTIVATE');

    return `
      <div>
        ${state.usersFeedback ? `<div class="alert alert-success">${escapeHtml(state.usersFeedback)}</div>` : ''}
        ${state.usersError ? `<div class="alert alert-danger">${escapeHtml(state.usersError)}</div>` : ''}

        <div class="card">
          <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div class="card-title">Usuarios Registrados (${state.users.length})</div>
            ${canCreate ? '<button type="button" id="btnNewUser" class="btn btn-primary btn-sm">+ Nuevo Usuario Administrador / Perfil</button>' : ''}
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
            <input id="userSearchInput" type="text" class="form-control" style="max-width:280px;" placeholder="Buscar por nombre o email..." value="${escapeHtml(state.userFilters.search)}" />
            <select id="userRoleFilter" class="form-control" style="max-width:220px;">
              <option value="">Todos los Roles</option>
              ${state.roles.map(r => `<option value="${r.id}" ${String(state.userFilters.roleId) === String(r.id) ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
            </select>
            <button type="button" id="btnFilterUsers" class="btn btn-secondary">Buscar</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre y Apellido</th>
                  <th>Email Institucional</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  ${(canEdit || canDeactivate) ? '<th style="text-align:right;">Acciones</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${state.users.map(u => `
                  <tr>
                    <td>#${u.id}</td>
                    <td><strong>${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</strong></td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>
                      <span class="career-badge">${escapeHtml(u.role_name)}</span>
                      ${u.id_alumno ? `<div style="font-size:0.73rem;color:#065f46;margin-top:3px;">Alumno: ${escapeHtml(u.alumno_nombre_completo || `#${u.id_alumno}`)}${u.alumno_legajo ? ` (${escapeHtml(u.alumno_legajo)})` : ''}</div>` : ''}
                    </td>
                    <td>${Number(u.is_active) === 1 ? '<span style="color:#059669;font-weight:700;">Activo</span>' : '<span style="color:#dc2626;font-weight:700;">Inactivo</span>'}</td>
                    ${(canEdit || canDeactivate) ? `
                      <td style="text-align:right;">
                        ${canEdit ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-user="${u.id}">Editar</button>` : ''}
                        ${canDeactivate ? `<button type="button" class="btn btn-secondary btn-sm" data-toggle-user="${u.id}" data-active="${u.is_active}">${Number(u.is_active) === 1 ? 'Desactivar' : 'Activar'}</button>` : ''}
                      </td>
                    ` : ''}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function bindUsersEvents() {
    document.getElementById('btnNewUser')?.addEventListener('click', () => openUserModal(null));
    document.getElementById('userSearchInput')?.addEventListener('input', (e) => { state.userFilters.search = e.target.value; });
    document.getElementById('userRoleFilter')?.addEventListener('change', (e) => { state.userFilters.roleId = e.target.value; fetchUsersData(); });
    document.getElementById('btnFilterUsers')?.addEventListener('click', fetchUsersData);

    document.querySelectorAll('[data-edit-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = state.users.find(x => String(x.id) === String(btn.getAttribute('data-edit-user')));
        if (u) openUserModal(u);
      });
    });

    document.querySelectorAll('[data-toggle-user]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-toggle-user');
        const currentActive = Number(btn.getAttribute('data-active')) === 1;
        try {
          await apiRequest(`/users/${id}/status`, { method: 'PATCH', body: { isActive: !currentActive } });
          state.usersFeedback = '';
          state.usersError = '';
          notify(`Usuario ${!currentActive ? 'activado' : 'desactivado'} correctamente.`, 'success');
          await fetchUsersData();
        } catch (err) {
          notify(err.message || 'No se pudo cambiar el estado del usuario.', 'error');
        }
      });
    });
  }

  function openUserModal(userToEdit) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-overlay" id="activeModalOverlay">
        <div class="modal-content" style="max-width: 480px;">
          <div class="modal-header">
            <div class="modal-title">${userToEdit ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</div>
            <button type="button" id="btnCloseModal" style="background:none;border:none;font-size:1.3rem;cursor:pointer;">×</button>
          </div>
          <div class="modal-body">
          <div id="userModalFeedback"></div>
          <form id="userFormModal">
            <div class="form-group">
              <label for="uFirstName">Nombre *</label>
              <input id="uFirstName" type="text" class="form-control" value="${escapeHtml(userToEdit?.first_name || '')}" required />
            </div>
            <div class="form-group">
              <label for="uLastName">Apellido *</label>
              <input id="uLastName" type="text" class="form-control" value="${escapeHtml(userToEdit?.last_name || '')}" required />
            </div>
            <div class="form-group">
              <label for="uEmail">Email Institucional *</label>
              <input id="uEmail" type="email" class="form-control" value="${escapeHtml(userToEdit?.email || '')}" ${userToEdit ? 'disabled' : 'required'} placeholder="Ej: admin2@institucion.edu" />
            </div>
            <div class="form-group">
              <label for="uRole">Rol *</label>
              <select id="uRole" class="form-control" required>
                ${state.roles.map(r => `<option value="${r.id}" data-role-name="${escapeHtml(r.name)}" ${Number(userToEdit?.role_id) === Number(r.id) ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" id="uAlumnoWrap" style="display:none;">
              <label for="uAlumnoId">Alumno vinculado en la Base (requerido para rol ALUMNO)</label>
              <select id="uAlumnoId" class="form-control">
                <option value="">-- Seleccionar estudiante --</option>
                ${state.studentsCatalog.map(s => `<option value="${s.id}" ${Number(userToEdit?.id_alumno) === Number(s.id) ? 'selected' : ''}>${escapeHtml(s.last_name)}, ${escapeHtml(s.first_name)} — DNI ${escapeHtml(s.document_number)} (${escapeHtml(s.file_number || 'S/L')})</option>`).join('')}
              </select>
              <small style="color:#64748b;font-size:0.74rem;">Vincula esta cuenta al estudiante para que vea exclusivamente sus propias notas y trámites.</small>
            </div>
            <div class="form-group">
              <label for="uPassword">${userToEdit ? 'Nueva Contraseña (dejar vacío para mantener)' : 'Contraseña (mín. 6 caracteres) *'}</label>
              <input id="uPassword" type="password" class="form-control" ${userToEdit ? '' : 'required minlength="6"'} />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
              <button type="button" id="btnCancelUser" class="btn btn-secondary">Cancelar</button>
              <button type="submit" class="btn btn-primary">${userToEdit ? 'Guardar Cambios' : 'Crear Usuario'}</button>
            </div>
          </form>
          </div>
        </div>
      </div>
    `;

    const roleSelectEl = document.getElementById('uRole');
    const alumnoWrapEl = document.getElementById('uAlumnoWrap');
    const syncAlumnoVisibility = () => {
      const opt = roleSelectEl?.options[roleSelectEl.selectedIndex];
      const isAl = opt?.getAttribute('data-role-name') === 'ALUMNO';
      if (alumnoWrapEl) alumnoWrapEl.style.display = isAl ? 'block' : 'none';
    };
    roleSelectEl?.addEventListener('change', syncAlumnoVisibility);
    syncAlumnoVisibility();

    document.getElementById('btnCloseModal')?.addEventListener('click', closeModal);
    document.getElementById('btnCancelUser')?.addEventListener('click', closeModal);
    document.getElementById('userFormModal')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fb = document.getElementById('userModalFeedback');
      const firstName = document.getElementById('uFirstName').value.trim();
      const lastName = document.getElementById('uLastName').value.trim();
      const email = document.getElementById('uEmail').value.trim();
      const roleId = Number(document.getElementById('uRole').value);
      const idAlumnoRaw = document.getElementById('uAlumnoId')?.value || '';
      const idAlumno = idAlumnoRaw ? Number(idAlumnoRaw) : null;
      const password = document.getElementById('uPassword').value;

      try {
        if (userToEdit) {
          await apiRequest(`/users/${userToEdit.id}`, {
            method: 'PUT',
            body: { firstName, lastName, roleId, idAlumno, ...(password ? { password } : {}) }
          });
        } else {
          await apiRequest('/users', {
            method: 'POST',
            body: { email, password, firstName, lastName, roleId, idAlumno }
          });
        }
        closeModal();
        state.usersFeedback = '';
        state.usersError = '';
        notify(userToEdit ? 'Usuario actualizado correctamente.' : 'Usuario creado exitosamente.', 'success');
        await fetchUsersData();
      } catch (err) {
        if (fb) fb.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
        notify(err.message || 'No se pudo guardar el usuario.', 'error');
      }
    });
  }

  // =========================================================================
  // VISTA 3: ROLES Y PERMISOS (RBAC)
  // =========================================================================

  function renderRolesTab() {
    const canManage = hasPermission('ROLES_MANAGE');
    return `
      <div>
        ${state.rolesFeedback ? `<div class="alert alert-success">${escapeHtml(state.rolesFeedback)}</div>` : ''}
        ${state.rolesError ? `<div class="alert alert-danger">${escapeHtml(state.rolesError)}</div>` : ''}

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
          ${state.roles.map(role => {
            const assigned = state.rolePermissionsMap[role.id] || [];
            return `
              <div class="card">
                <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div class="card-title">${escapeHtml(role.name)}</div>
                    <div style="font-size:0.78rem;color:#64748b;">${escapeHtml(role.description || '')}</div>
                  </div>
                  ${canManage ? `<button type="button" class="btn btn-primary btn-sm" data-save-role="${role.id}">Guardar</button>` : ''}
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">
                  ${state.allPermissions.map(p => `
                    <label style="display:flex;align-items:center;gap:8px;font-size:0.82rem;cursor:${canManage ? 'pointer' : 'default'};">
                      <input type="checkbox" data-role-perm="${role.id}" value="${p.id}" ${assigned.includes(p.id) ? 'checked' : ''} ${!canManage ? 'disabled' : ''} />
                      <span>
                        <strong>${escapeHtml(p.name)}</strong> <code style="font-size:0.72rem;color:#64748b;">${escapeHtml(p.code)}</code>
                        ${role.name === 'ALUMNO' && p.code === 'GRADES_VIEW' ? '<span style="display:block;font-size:0.72rem;color:#065f46;font-weight:600;">Restringido en servidor: el alumno solo puede ver sus propias notas.</span>' : ''}
                      </span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function bindRolesEvents() {
    document.querySelectorAll('[data-role-perm]').forEach(chk => {
      chk.addEventListener('change', () => {
        const roleId = Number(chk.getAttribute('data-role-perm'));
        const permId = Number(chk.value);
        const cur = state.rolePermissionsMap[roleId] || [];
        if (chk.checked) {
          if (!cur.includes(permId)) cur.push(permId);
          state.rolePermissionsMap[roleId] = cur;
        } else {
          state.rolePermissionsMap[roleId] = cur.filter(id => id !== permId);
        }
      });
    });

    document.querySelectorAll('[data-save-role]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const roleId = Number(btn.getAttribute('data-save-role'));
        try {
          await apiRequest(`/roles/${roleId}/permissions`, {
            method: 'PUT',
            body: { permissionIds: state.rolePermissionsMap[roleId] || [] }
          });
          state.rolesFeedback = '';
          state.rolesError = '';
          notify('Permisos del rol actualizados correctamente.', 'success');
        } catch (err) {
          notify(err.message || 'No se pudieron actualizar los permisos del rol.', 'error');
        }
        renderMainContent();
      });
    });
  }

  // =========================================================================
  // VISTA 4: HISTORIAL DE MODIFICACIONES POR USUARIO (AUDITORÍA MYSQL)
  // =========================================================================

  function renderAuditTab() {
    return `
      <div>
        <div class="alert alert-info" style="margin-bottom:16px;">
          <strong>Historial de Modificaciones por Usuario:</strong> Registra automáticamente cada validación de nota, corrección de Promoción/Tipo de Examen y cambio de usuarios.
        </div>

        <div class="card">
          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;">
            <select id="auditUserFilter" class="form-control" style="max-width:240px;">
              <option value="">Todos los Usuarios</option>
              ${state.users.map(u => `<option value="${u.id}" ${String(state.auditFilters.userId) === String(u.id) ? 'selected' : ''}>${escapeHtml(u.first_name)} ${escapeHtml(u.last_name)}</option>`).join('')}
            </select>
            <select id="auditActionFilter" class="form-control" style="max-width:230px;">
              <option value="">Todas las Acciones</option>
              <option value="GRADE_VALIDATED" ${state.auditFilters.actionType === 'GRADE_VALIDATED' ? 'selected' : ''}>GRADE_VALIDATED (Semáforo)</option>
              <option value="TIPO_EXAMEN_CORREGIDO" ${state.auditFilters.actionType === 'TIPO_EXAMEN_CORREGIDO' ? 'selected' : ''}>TIPO_EXAMEN_CORREGIDO</option>
              <option value="USER_CREATED" ${state.auditFilters.actionType === 'USER_CREATED' ? 'selected' : ''}>USER_CREATED</option>
              <option value="USER_UPDATED" ${state.auditFilters.actionType === 'USER_UPDATED' ? 'selected' : ''}>USER_UPDATED</option>
              <option value="AUTH_LOGIN" ${state.auditFilters.actionType === 'AUTH_LOGIN' ? 'selected' : ''}>AUTH_LOGIN</option>
            </select>
            <button type="button" id="btnRefreshAudit" class="btn btn-secondary">Actualizar</button>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha / Hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad / Registro</th>
                  <th>Detalle del Cambio</th>
                </tr>
              </thead>
              <tbody>
                ${state.auditLogs.length === 0 ? `
                  <tr><td colspan="5" style="text-align:center;color:#64748b;padding:24px;">No hay registros de auditoría para los filtros seleccionados.</td></tr>
                ` : state.auditLogs.map(log => {
                  const prev = log.previous_values ? JSON.stringify(log.previous_values) : '—';
                  const next = log.new_values ? JSON.stringify(log.new_values) : '—';
                  return `
                    <tr>
                      <td style="font-size:0.78rem;white-space:nowrap;">${escapeHtml(new Date(log.created_at).toLocaleString('es-AR'))}</td>
                      <td>
                        <div style="font-weight:600;">${escapeHtml(log.user_name || 'Sistema')}</div>
                        <div style="font-size:0.73rem;color:#64748b;">${escapeHtml(log.user_email || '')}</div>
                      </td>
                      <td><code>${escapeHtml(log.action_type)}</code></td>
                      <td>${escapeHtml(log.entity)} ${log.entity_id ? `(#${escapeHtml(log.entity_id)})` : ''}</td>
                      <td style="font-size:0.76rem;max-width:360px;">
                        ${log.previous_values ? `<div><strong>Antes:</strong> ${escapeHtml(prev)}</div>` : ''}
                        <div><strong>Después:</strong> ${escapeHtml(next)}</div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function bindAuditEvents() {
    document.getElementById('auditUserFilter')?.addEventListener('change', (e) => { state.auditFilters.userId = e.target.value; fetchAuditData(); });
    document.getElementById('auditActionFilter')?.addEventListener('change', (e) => { state.auditFilters.actionType = e.target.value; fetchAuditData(); });
    document.getElementById('btnRefreshAudit')?.addEventListener('click', fetchAuditData);
  }

  // =========================================================================
  // INICIO
  // =========================================================================

  document.addEventListener('DOMContentLoaded', async () => {
    const ok = await initAuthenticatedSession();
    if (!ok) return;
    renderApp();
    loadActiveTabData();
  });
})();
