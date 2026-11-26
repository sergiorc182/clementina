const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const AuthService = require('./authService');

const LEGACY_AUTH_COOKIE = 'clementina_auth';
const LEGACY_TOKEN_LIFETIME = 12 * 3600;

function clementinaRoot() {
  return process.env.CLEMENTINA_ROOT || path.resolve(__dirname, '../../../../..');
}

function configFile(name) {
  return path.join(clementinaRoot(), 'config', name);
}

function readSecret() {
  if (process.env.CLEMENTINA_HMAC_SECRET) {
    return process.env.CLEMENTINA_HMAC_SECRET;
  }
  const value = fs.readFileSync(configFile('.hmac_secret'), 'utf8').trim();
  if (!value) {
    const err = new Error('El secreto HMAC de Clementina no está configurado.');
    err.statusCode = 500;
    throw err;
  }
  return value;
}

function isRevoked(jti) {
  try {
    const data = JSON.parse(fs.readFileSync(configFile('.token_revocations.json'), 'utf8'));
    return Number(data[jti] || 0) > Math.floor(Date.now() / 1000);
  } catch (_) {
    return false;
  }
}

function verifyLegacyToken(token) {
  if (!token || typeof token !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(token)) {
    return null;
  }

  const raw = Buffer.from(token, 'base64').toString('utf8');
  if (Buffer.from(raw, 'utf8').toString('base64') !== token) {
    return null;
  }

  const separator = raw.indexOf('::');
  if (separator < 0) {
    return null;
  }

  const payload = raw.slice(0, separator);
  const signature = raw.slice(separator + 2);
  const expected = crypto.createHmac('sha256', readSecret()).update(payload).digest('hex');
  const received = Buffer.from(signature, 'utf8');
  const calculated = Buffer.from(expected, 'utf8');
  if (received.length !== calculated.length || !crypto.timingSafeEqual(received, calculated)) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(payload);
  } catch (_) {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const iat = Number(data.iat || 0);
  const exp = Number(data.exp || 0);
  if (iat <= 0 || exp <= now || iat > now + 60 || exp - iat > LEGACY_TOKEN_LIFETIME) {
    return null;
  }

  const jti = String(data.jti || '');
  const id = Number(data.id || 0);
  const tipo = String(data.tipo || '');
  if (!jti || isRevoked(jti) || id <= 0 || !['alumno', 'personal'].includes(tipo)) {
    return null;
  }

  return { id, tipo, jti, exp };
}

function parseCookies(header) {
  const cookies = {};
  for (const part of String(header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !(name in cookies)) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch (_) {
        cookies[name] = value;
      }
    }
  }
  return cookies;
}

function unauthenticated() {
  const err = new Error('No hay una sesión válida de Clementina. Ingrese en el sistema principal.');
  err.statusCode = 401;
  return err;
}

function placeholderHash(tipo, id) {
  return `!${crypto.createHash('sha256').update(`${tipo}-sin-password-${id}`).digest('hex')}`;
}

class LegacySessionService {
  static async resolveAlumno(id) {
    const alumno = await AuthService.findAlumnoById(id);
    if (!alumno) throw unauthenticated();
    return AuthService.ensurePortalUserFromAlumno({
      ...alumno,
      password_hash: alumno.password_hash || placeholderHash('alumno', id)
    });
  }

  static async resolvePersonal(id) {
    const personal = await AuthService.findPersonalById(id);
    if (!personal) throw unauthenticated();
    return AuthService.ensurePortalUserFromPersonal({
      ...personal,
      password_hash: personal.password_hash || placeholderHash('personal', id)
    });
  }

  static async establish(req, ipAddress = '127.0.0.1') {
    const cookies = parseCookies(req.headers?.cookie);
    const session = verifyLegacyToken(cookies[LEGACY_AUTH_COOKIE]);
    if (!session) throw unauthenticated();

    const user = session.tipo === 'alumno'
      ? await this.resolveAlumno(session.id)
      : await this.resolvePersonal(session.id);

    return AuthService.buildLoginResult(user, ipAddress, 'AUTH_COOKIE_LOGIN');
  }
}

module.exports = LegacySessionService;
