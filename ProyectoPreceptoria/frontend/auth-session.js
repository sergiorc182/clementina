/**
 * Autenticación y Sesión Compartida del Portal ISFT Nº 182 (Clementina)
 * Sincroniza JWT real (/api/v1/auth) con localStorage, sessionStorage y cookies compartidas
 * para los 4 módulos del sistema sin permitir suplantación de roles.
 */
(function (global) {
  'use strict';

  const API_AUTH = 'http://localhost:3000/api/v1/auth';
  const PORTAL_SESSION_PATH = '/controlador/portal_sesion.php';
  const LEGACY_LOGIN_PATH = '/vista/login.html';
  const LEGACY_LOGOUT_PATH = '/controlador/cerrar_sesion.php';
  const TOKEN_KEY = 'institucion_token';
  const USER_KEY = 'institucion_user';

  let sessionError = '';

  function legacyBaseUrl() {
    const configurada = global.ISFT182_CONFIG && global.ISFT182_CONFIG.legacyBaseUrl;
    if (configurada) return String(configurada).replace(/\/+$/, '');
    if (global.location.hostname === 'localhost' || global.location.hostname === '127.0.0.1') {
      return 'http://localhost/clementina';
    }
    const partes = global.location.pathname.split('/').filter(Boolean);
    const indice = partes.indexOf('clementina');
    if (indice >= 0) {
      return `${global.location.origin}/${partes.slice(0, indice + 1).join('/')}`;
    }
    return global.location.origin;
  }

  function portalSessionUrl() {
    return `${legacyBaseUrl()}${PORTAL_SESSION_PATH}`;
  }

  function legacyLoginUrl() {
    return `${legacyBaseUrl()}${LEGACY_LOGIN_PATH}?redirect=${encodeURIComponent(global.location.href)}`;
  }

  function getSessionError() {
    return sessionError;
  }

  function setCookie(name, value, days = 7) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  function clearCookie(name) {
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }

  function syncLegacyCookiesFromUser(user) {
    if (!user) return;
    const roleUpper = String(user.role || '').toUpperCase();
    const isAlumno = roleUpper === 'ALUMNO';
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.replace(' (Estudiante)', '').trim();

    setCookie('tipo_usuario', isAlumno ? 'alumno' : 'preceptor');
    setCookie('rol_sistema', roleUpper);
    setCookie('nombre_usuario', fullName);

    if (isAlumno) {
      const idAl = user.idAlumno ? String(user.idAlumno) : '';
      if (idAl) setCookie('id_alumno', idAl);
      else clearCookie('id_alumno');
      setCookie('nombre_alumno', fullName);
    } else {
      clearCookie('id_alumno');
      clearCookie('nombre_alumno');
    }

    try {
      const legacyObj = isAlumno
        ? {
            rol: 'alumno',
            id_usuario: user.id,
            id_alumno: user.idAlumno || null,
            nombre: fullName
          }
        : {
            rol: 'preceptor',
            rol_sistema: roleUpper,
            id_usuario: user.id,
            nombre: fullName
          };
      sessionStorage.setItem('isft182_user', JSON.stringify(legacyObj));
    } catch (_) {}
  }

  function clearLocalSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem('isft182_user');
      localStorage.removeItem('isft182_user');
    } catch (_) {}
    ['tipo_usuario', 'rol_sistema', 'id_alumno', 'nombre_alumno', 'nombre_usuario'].forEach(clearCookie);
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (_) {
      return '';
    }
  }

  function getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  async function verifySession() {
    let phpResponded = false;
    try {
      const res = await fetch(portalSessionUrl(), {
        credentials: 'include',
        cache: 'no-store'
      });
      phpResponded = true;

      if (!res.ok) {
        let message = 'No hay una sesión activa de Clementina.';
        try {
          const errData = await res.json();
          message = errData.error?.message || errData.message || message;
        } catch (_) {}
        sessionError = message;
        clearLocalSession();
        return null;
      }

      const data = await res.json();
      const user = data.data?.user;
      if (!user) {
        sessionError = 'La sesión de Clementina no pudo ser validada.';
        clearLocalSession();
        return null;
      }

      sessionError = '';
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      syncLegacyCookiesFromUser(user);
      return user;
    } catch (err) {
      if (!phpResponded) {
        sessionError = 'No se pudo contactar con el servidor PHP de Clementina.';
      }
    }

    try {
      const res = await fetch(`${API_AUTH}/legacy-session`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        let message = 'No hay una sesión activa de Clementina.';
        try {
          const errData = await res.json();
          message = errData.error?.message || errData.message || message;
        } catch (_) {}
        sessionError = message;
        clearLocalSession();
        return null;
      }

      const data = await res.json();
      const token = data.data?.token;
      const user = data.data?.user;
      if (!token || !user) {
        sessionError = 'La sesión de Clementina no pudo ser validada.';
        clearLocalSession();
        return null;
      }

      sessionError = '';
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      syncLegacyCookiesFromUser(user);
      return user;
    } catch (err) {
      sessionError = sessionError || 'No se pudo validar la sesión de Clementina.';
      return getToken() ? getUser() : null;
    }
  }

  async function requireAuth(loginPath = '../index.html') {
    const user = await verifySession();
    if (!user) {
      global.location.replace(loginPath);
      return null;
    }
    return user;
  }

  async function logout() {
    try {
      await fetch(`${legacyBaseUrl()}${LEGACY_LOGOUT_PATH}`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}
    clearLocalSession();
    global.location.replace(legacyLoginUrl());
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Notificación toast flotante unificada (inferior derecha, idéntica al módulo Inscripción a Materias)
   */
  function notify(message, type = 'success') {
    if (!message || typeof document === 'undefined') return;
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container no-print';
      document.body.appendChild(container);
    }

    const normalizedType = ['success', 'error', 'warning', 'info'].includes(type) ? type : 'success';
    const toast = document.createElement('div');
    toast.className = `toast toast-${normalizedType}`;
    toast.innerHTML = `
      <span style="font-weight: 700; font-size: 0.85rem;">${normalizedType === 'success' ? '[OK]' : '[AVISO]'}</span>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

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

  global.ISFTNotify = notify;

  global.ISFTAuth = {
    legacyBaseUrl,
    legacyLoginUrl,
    getSessionError,
    verifySession,
    requireAuth,
    logout,
    getUser,
    getToken,
    syncLegacyCookiesFromUser,
    clearLocalSession,
    notify
  };
})(window);
