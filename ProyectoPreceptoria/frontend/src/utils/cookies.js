/**
 * Utilidades para leer y escribir la información del tipo de usuario y sesión desde cookies.
 * Soporta cookies individuales (ej: tipo_usuario=alumno; id_alumno=1; nombre_alumno=...)
 * o una cookie JSON (ej: usuario={"tipo_usuario":"alumno","id_alumno":1}).
 */

export const parsearCookies = () => {
  if (typeof document === 'undefined') return {};
  const resultado = {};
  const raw = document.cookie || '';

  raw.split(';').forEach((par) => {
    const limpio = par.trim();
    if (!limpio) return;
    const idx = limpio.indexOf('=');
    if (idx === -1) return;
    const clave = limpio.substring(0, idx).trim();
    const valor = limpio.substring(idx + 1).trim();
    try {
      resultado[clave] = decodeURIComponent(valor);
    } catch {
      resultado[clave] = valor;
    }
  });

  return resultado;
};

export const leerUsuarioDesdeCookies = () => {
  const cookies = parsearCookies();

  // Intentar leer si existe un JSON en cookie 'usuario' o 'sesion'
  let datosJson = {};
  const jsonCandidate = cookies.usuario || cookies.sesion || cookies.user;
  if (jsonCandidate && (jsonCandidate.startsWith('{') || jsonCandidate.startsWith('%7B'))) {
    try {
      datosJson = JSON.parse(jsonCandidate);
    } catch {
      datosJson = {};
    }
  }

  const rawTipo = (
    cookies.tipo_usuario ||
    cookies.tipoUsuario ||
    cookies.rol ||
    cookies.role ||
    cookies.tipo ||
    datosJson.tipo_usuario ||
    datosJson.tipoUsuario ||
    datosJson.rol ||
    datosJson.tipo ||
    'preceptor'
  )
    .toString()
    .trim()
    .toLowerCase();

  const tipoUsuario = rawTipo === 'alumno' || rawTipo === 'estudiante' ? 'alumno' : 'preceptor';

  const rawIdAlumno =
    cookies.id_alumno ||
    cookies.idAlumno ||
    cookies.alumno_id ||
    cookies.id_usuario ||
    datosJson.id_alumno ||
    datosJson.idAlumno ||
    datosJson.id ||
    null;

  const nombreAlumno =
    cookies.nombre_alumno ||
    cookies.nombreAlumno ||
    cookies.nombre_usuario ||
    datosJson.nombre_alumno ||
    datosJson.nombre_completo ||
    datosJson.nombre ||
    '';

  return {
    tipoUsuario,
    esAlumno: tipoUsuario === 'alumno',
    esPreceptor: tipoUsuario === 'preceptor',
    idAlumno: rawIdAlumno ? Number(rawIdAlumno) : null,
    nombreAlumno
  };
};

export const guardarUsuarioEnCookies = ({ tipoUsuario, idAlumno, nombreAlumno }) => {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7; // 7 días

  if (tipoUsuario) {
    document.cookie = `tipo_usuario=${encodeURIComponent(tipoUsuario)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (idAlumno !== undefined && idAlumno !== null && idAlumno !== '') {
    document.cookie = `id_alumno=${encodeURIComponent(idAlumno)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (nombreAlumno !== undefined && nombreAlumno !== null) {
    document.cookie = `nombre_alumno=${encodeURIComponent(nombreAlumno)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  // Sincronizar sesión con sessionStorage ('isft182_user') según contrato de integración del Módulo E
  try {
    const rolNorm = String(tipoUsuario || 'preceptor').toLowerCase() === 'alumno' ? 'alumno' : 'preceptor';
    const userObj =
      rolNorm === 'alumno'
        ? {
            rol: 'alumno',
            id_usuario: Number(idAlumno || 1),
            nombre: nombreAlumno || 'Alumno ISFT 182',
            id_alumno: Number(idAlumno || 1)
          }
        : {
            rol: 'preceptor',
            id_usuario: 1,
            nombre: 'Preceptoría ISFT 182'
          };
    sessionStorage.setItem('isft182_user', JSON.stringify(userObj));
  } catch (_) {}

  window.dispatchEvent(new Event('cookie-usuario-actualizada'));
};

export const inicializarCookiePorDefecto = () => {
  if (typeof document === 'undefined') return;
  const cookies = parsearCookies();
  const tieneRol =
    cookies.tipo_usuario ||
    cookies.tipoUsuario ||
    cookies.rol ||
    cookies.role ||
    cookies.tipo ||
    cookies.usuario;

  if (!tieneRol) {
    guardarUsuarioEnCookies({
      tipoUsuario: 'preceptor',
      idAlumno: 1,
      nombreAlumno: 'Pérez García, Juan Carlos'
    });
  }
};

