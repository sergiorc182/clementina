/**
 * Batería de Tests Integrales End-to-End (API + Reglas de Negocio + Seguridad RBAC + MySQL clementina)
 * Ejecutar con: npm test (desde c:\MyProjects\ProyectoPreceptoria\backend)
 *
 * Monta los 4 módulos en un servidor Express efímero (puerto 0) para no colisionar con el puerto 3000,
 * ejecuta pruebas reales contra MySQL `clementina` y restaura/limpia todos los registros de prueba al finalizar.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import alumnoRoutes from '../src/routes/alumnoRoutes.js';
import finalRoutes from '../src/routes/finalRoutes.js';
import { pool as mainPool } from '../src/config/db.js';

dotenv.config();
const require = createRequire(import.meta.url);

const moduloERoutes = require('../src/modulo-e/routes/index.js');
const martaAlumnoRoutes = require('../src/certificados/routes/alumnoRoutes.js');
const martaCarreraRoutes = require('../src/certificados/routes/carreraRoutes.js');
const martaCertificadoRoutes = require('../src/certificados/routes/certificadoRoutes.js');
const martaPersonalRoutes = require('../src/certificados/routes/personalRoutes.js');
const usuariosNotasRoutes = require('../src/usuarios-notas/routes/index.js');
const usuariosNotasErrorHandler = require('../src/usuarios-notas/middlewares/errorHandler.js');
const { initDb: initUsuariosNotasDb } = require('../src/usuarios-notas/database/initDb.js');
const { pool: v1Pool } = require('../src/usuarios-notas/database/db.js');

// Construir app Express idéntica a src/app.js pero sin app.listen(3000) fijo
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', async (req, res) => {
  try {
    const [result] = await mainPool.query('SELECT 1 + 1 AS check_db');
    res.json({ status: 'ok', database: 'conectado', check: result[0].check_db === 2 });
  } catch (error) {
    res.status(503).json({ status: 'error', mensaje: error.message });
  }
});

app.use('/api/alumnos', alumnoRoutes);
app.use('/api/finales', finalRoutes);
app.use('/api', moduloERoutes);
app.use('/api/marta/alumnos', martaAlumnoRoutes);
app.use('/api/carreras', martaCarreraRoutes);
app.use('/api/certificados', martaCertificadoRoutes);
app.use('/api/personal', martaPersonalRoutes);
app.use('/api/v1', usuariosNotasRoutes);
app.use('/api/v1', usuariosNotasErrorHandler);

let server;
let port;
let maxAuditIdBefore = 0;

function api(method, urlPath, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body !== null ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

before(async () => {
  await initUsuariosNotasDb();
  const [rows] = await mainPool.query('SELECT COALESCE(MAX(id), 0) AS maxId FROM audit_logs');
  maxAuditIdBefore = Number(rows[0]?.maxId || 0);

  server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  port = server.address().port;
});

after(async () => {
  try {
    // Limpiar logs de auditoría generados únicamente por esta ejecución de tests
    await mainPool.query('DELETE FROM audit_logs WHERE id > ?', [maxAuditIdBefore]);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await v1Pool.end().catch(() => {});
    await mainPool.end().catch(() => {});
    // Cerrar pools auxiliares de módulos CommonJS si existen
    try {
      const modEDb = require('../src/modulo-e/config/db.js');
      if (modEDb?.pool?.end) await modEDb.pool.end();
      else if (modEDb?.end) await modEDb.end();
    } catch {}
    try {
      const certDb = require('../src/certificados/config/db.js');
      if (certDb?.pool?.end) await certDb.pool.end();
      else if (certDb?.end) await certDb.end();
    } catch {}
  }
});

// =========================================================================
// 1. SALUD DEL SISTEMA E INTEGRIDAD DE BASE DE DATOS (clementina)
// =========================================================================
describe('1. Salud del Sistema e Integridad de MySQL (clementina)', () => {
  it('GET /api/health y /api/v1/health responden 200 con BD conectada', async () => {
    const [h1, h2] = await Promise.all([
      api('GET', '/api/health'),
      api('GET', '/api/v1/health')
    ]);
    assert.equal(h1.status, 200);
    assert.equal(h1.body.status, 'ok');
    assert.equal(h1.body.check, true);
    assert.equal(h2.status, 200);
    assert.equal(h2.body.status, 'healthy');
  });

  it('La BD clementina conserva las 28 tablas originales + 11 agregadas (39) y 4 columnas agregadas', async () => {
    const [tables] = await mainPool.query(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [process.env.DB_NAME || 'clementina']
    );
    assert.ok(tables.length >= 39, `Se esperaban al menos 39 tablas, hay ${tables.length}`);

    const [cols] = await mainPool.query(
      `SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND ((TABLE_NAME = 'carrera_materias' AND COLUMN_NAME IN ('carga_horaria_semanal','exceptuada_libre','tipo_espacio'))
           OR (TABLE_NAME = 'historial_academico' AND COLUMN_NAME = 'observaciones'))`,
      [process.env.DB_NAME || 'clementina']
    );
    assert.equal(cols.length, 4, 'Deben existir exactamente las 4 columnas agregadas');
  });
});

// =========================================================================
// 2. SISTEMA ACADÉMICO Y DE PRECEPTORÍA (Alumnos y Exámenes Finales)
// =========================================================================
describe('2. Sistema Académico y de Preceptoría (Alumnos y Finales)', () => {
  it('GET /api/alumnos y catálogos devuelven registros reales de MySQL', async () => {
    const [allRes, carRes] = await Promise.all([
      api('GET', '/api/alumnos'),
      api('GET', '/api/alumnos/catalogo/carreras')
    ]);
    assert.equal(allRes.status, 200);
    const alumnos = allRes.body.data || allRes.body;
    assert.ok(Array.isArray(alumnos) && alumnos.length > 0, 'Debe devolver alumnos reales');
    assert.equal(carRes.status, 200);
    const carreras = carRes.body.data || carRes.body;
    assert.ok(Array.isArray(carreras) && carreras.length > 0, 'Debe devolver carreras reales');

    const firstId = alumnos[0].id || alumnos[0].id_alumno;
    const oneRes = await api('GET', `/api/alumnos/${firstId}`);
    assert.equal(oneRes.status, 200);
  });

  it('Ciclo completo de Finales: listado, validación, inscripción, reasignación, auditoría y baja lógica (con limpieza)', async () => {
    const listRes = await api('GET', '/api/finales/listado');
    assert.equal(listRes.status, 200);

    // Buscar un alumno y una materia de su carrera en MySQL para probar el flujo real
    const [sampleRows] = await mainPool.query(`
      SELECT h.id_alumno, h.id_carrera, h.id_materia
      FROM historial_academico h
      LIMIT 1
    `);
    assert.ok(sampleRows.length === 1, 'Se requiere al menos un registro en historial_academico');
    const { id_alumno, id_carrera, id_materia } = sampleRows[0];

    // 1. Validar inscripción
    const valRes = await api('POST', '/api/finales/validar', {
      id_alumno,
      id_carrera,
      id_materia,
      anio_turno: 2099,
      turno_instancia: 3,
      id_llamado: 1,
      modalidad: 'REGULAR'
    });
    assert.equal(valRes.status, 200);
    assert.equal(valRes.body.success, true);
    assert.ok(valRes.body.data && typeof valRes.body.data === 'object', 'Debe devolver objeto de evaluación reglamentaria');

    // 2. Inscribir (usando excepción controlada en año futuro 2099 para no chocar con datos existentes)
    const insRes = await api('POST', '/api/finales/inscribir', {
      id_alumno,
      id_carrera,
      id_materia,
      anio_turno: 2099,
      turno_instancia: 3,
      id_llamado: 1,
      modalidad: 'REGULAR',
      es_excepcion: true,
      motivo_excepcion: 'Prueba automatizada E2E'
    });
    assert.ok([200, 201].includes(insRes.status), `Inscripción falló: ${JSON.stringify(insRes.body)}`);
    const idRendicion = insRes.body.data?.id_rendicion || insRes.body.id_rendicion;
    assert.ok(idRendicion, 'Debe devolver id_rendicion');

    try {
      // 3. Reasignar llamado 1 -> 2
      const reasRes = await api('PATCH', `/api/finales/${idRendicion}/reasignar`, {
        anio_turno: 2099,
        turno_instancia: 3,
        id_llamado: 2,
        modalidad: 'REGULAR',
        modificado_por: 'Test Automatizado'
      });
      assert.equal(reasRes.status, 200, `Reasignación falló: ${JSON.stringify(reasRes.body)}`);

      // 4. Baja lógica (no borra físicamente, marca estado = BAJA y fecha_baja)
      const bajaRes = await api('DELETE', `/api/finales/${idRendicion}`, {
        modificado_por: 'Test Automatizado'
      });
      assert.equal(bajaRes.status, 200, `Baja lógica falló: ${JSON.stringify(bajaRes.body)}`);

      const [rendCheck] = await mainPool.query(
        'SELECT estado, reasignada, fecha_baja FROM rendiciones_finales WHERE id_rendicion = ?',
        [idRendicion]
      );
      assert.equal(rendCheck[0].estado, 'BAJA');
      assert.equal(Number(rendCheck[0].reasignada), 1);
      assert.ok(rendCheck[0].fecha_baja !== null);

      // 5. Verificar auditoría histórica (debe contener REASIGNACION y BAJA_LOGICA)
      const audRes = await api('GET', `/api/finales/${idRendicion}/auditoria`);
      assert.equal(audRes.status, 200);
      const acciones = (audRes.body.data || audRes.body || []).map((a) => a.accion);
      assert.ok(acciones.includes('REASIGNACION'), `Falta REASIGNACION en auditoría: ${JSON.stringify(acciones)}`);
      assert.ok(acciones.includes('BAJA_LOGICA'), `Falta BAJA_LOGICA en auditoría: ${JSON.stringify(acciones)}`);
    } finally {
      // Limpieza total del registro sintético de prueba (ON DELETE CASCADE borra su auditoría)
      await mainPool.query('DELETE FROM rendiciones_finales WHERE id_rendicion = ?', [idRendicion]);
    }
  });
});

// =========================================================================
// 3. INSCRIPCIÓN A MATERIAS Y GESTIÓN ACADÉMICA
// =========================================================================
describe('3. Inscripción a Materias y Gestión Académica', () => {
  it('Catálogos (carreras, alumnos, materias con carga horaria) y reportes responden desde MySQL', async () => {
    const [carRes, alRes, repRes] = await Promise.all([
      api('GET', '/api/catalogos/carreras'),
      api('GET', '/api/catalogos/alumnos'),
      api('GET', '/api/reportes/inscripciones')
    ]);
    assert.equal(carRes.status, 200);
    assert.equal(alRes.status, 200);
    assert.equal(repRes.status, 200);

    const carreras = carRes.body.data || carRes.body;
    const alumnos = alRes.body.data || alRes.body;
    assert.ok(carreras.length > 0 && alumnos.length > 0);

    const idCarrera = carreras[0].id_carrera;
    const matRes = await api('GET', `/api/catalogos/carreras/${idCarrera}/materias`);
    assert.equal(matRes.status, 200);
    const materias = matRes.body.data?.materias || matRes.body.materias || matRes.body.data || [];
    assert.ok(Array.isArray(materias) && materias.length > 0, `La carrera debe tener materias registradas: ${JSON.stringify(matRes.body).slice(0, 200)}`);
  });

  it('CRUD de Horarios en Gestión Académica (alta y eliminación limpia en materia_horarios)', async () => {
    const [cmRows] = await mainPool.query('SELECT id_carrera, id_materia FROM carrera_materias LIMIT 1');
    const { id_carrera, id_materia } = cmRows[0];

    const createRes = await api('POST', '/api/catalogos/horarios', {
      id_carrera,
      id_materia,
      dia_semana: 'Sábado',
      hora_inicio: '08:00',
      hora_fin: '09:00',
      aula: 'Aula Test E2E',
      comision: 'Test'
    });
    assert.ok([200, 201].includes(createRes.status), `Alta de horario falló: ${JSON.stringify(createRes.body)}`);

    const [inserted] = await mainPool.query(
      "SELECT id_horario FROM materia_horarios WHERE id_carrera = ? AND id_materia = ? AND aula = 'Aula Test E2E' ORDER BY id_horario DESC LIMIT 1",
      [id_carrera, id_materia]
    );
    assert.ok(inserted.length === 1, 'El horario debe haberse persistido en MySQL');

    const delRes = await api('DELETE', `/api/catalogos/horarios/${inserted[0].id_horario}`);
    assert.equal(delRes.status, 200, 'Debe permitir eliminar el horario de prueba');
  });
});

// =========================================================================
// 4. AVANCE ACADÉMICO Y CERTIFICADOS OFICIALES
// =========================================================================
describe('4. Avance Académico y Certificados Oficiales', () => {
  it('Porcentaje de materias aprobadas y constancia oficial coinciden matemáticamente con MySQL', async () => {
    const [alRes, perRes] = await Promise.all([
      api('GET', '/api/marta/alumnos'),
      api('GET', '/api/personal')
    ]);
    assert.equal(alRes.status, 200);
    assert.equal(perRes.status, 200);

    const [matRow] = await mainPool.query('SELECT id_alumno, id_carrera FROM matriculacion LIMIT 1');
    assert.ok(matRow.length === 1);
    const { id_alumno, id_carrera } = matRow[0];

    const [pctRes, constRes] = await Promise.all([
      api('GET', `/api/certificados/porcentaje/${id_alumno}/${id_carrera}`),
      api('GET', `/api/certificados/constancia/${id_alumno}/${id_carrera}`)
    ]);
    assert.equal(pctRes.status, 200);
    assert.equal(constRes.status, 200);

    const est = pctRes.body.estadisticas || pctRes.body.resumen || pctRes.body;
    const aprobadas = Number(est.cantidadAprobadas ?? est.materias_aprobadas ?? 0);
    const pendientes = Number(est.cantidadPendientes ?? est.materias_pendientes ?? 0);
    const total = Number(est.totalMateriasPlan ?? est.total_materias_plan ?? 0);
    assert.ok(total > 0, `El plan de estudios debe tener materias: ${JSON.stringify(est)}`);
    assert.equal(aprobadas + pendientes, total, 'Aprobadas + Pendientes debe ser igual al total del plan');
    assert.equal(est.porcentajeAprobadas, Number(((aprobadas / total) * 100).toFixed(2)), 'El porcentaje debe coincidir exactamente');

    const textoConstancia = JSON.stringify(constRes.body);
    assert.ok(textoConstancia.length > 50, 'Debe generar el contenido de la constancia oficial');
  });
});

// =========================================================================
// 5. USUARIOS, SEMÁFORO OFICIAL, PROMOCIÓN, AUDITORÍA Y COHERENCIA CRUZADA
// =========================================================================
describe('5. Usuarios, Semáforo Oficial (Verde/Naranja/Rojo), Promoción y Auditoría', () => {
  it('Login multi-rol, validación de semáforo, corrección Promoción y coherencia con Certificados', async () => {
    const [adminRes, precRes] = await Promise.all([
      api('POST', '/api/v1/auth/login', { email: 'admin@institucion.edu', password: 'Admin123!' }),
      api('POST', '/api/v1/auth/login', { email: 'preceptor@institucion.edu', password: 'Preceptor123!' })
    ]);
    assert.equal(adminRes.status, 200);
    assert.equal(precRes.status, 200);

    const adminToken = adminRes.body.data.token;
    const precToken = precRes.body.data.token;
    assert.ok(precRes.body.data.user.permissions.includes('GRADES_RECALCULATE'));
    assert.ok(precRes.body.data.user.permissions.includes('AUDIT_VIEW'));

    // Consultar registros y confirmar semáforo estricto de 3 colores
    const recRes = await api('GET', '/api/v1/academic/records', null, adminToken);
    assert.equal(recRes.status, 200);
    const records = recRes.body.data.data;
    assert.ok(records.length > 0);
    for (const r of records) {
      assert.ok(['GREEN', 'ORANGE', 'RED'].includes(r.traffic_light_color), `Color inválido: ${r.traffic_light_color}`);
    }

    // Buscar un registro actualmente NO verde para probar transición a GREEN + Promoción y su impacto en Certificados
    const target = records.find((r) => r.traffic_light_color !== 'GREEN') || records[0];
    const [origHistRows] = await mainPool.query(
      'SELECT * FROM historial_academico WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?',
      [target.id_alumno, target.id_carrera, target.id_materia]
    );
    const orig = origHistRows[0];

    const pctBeforeRes = await api('GET', `/api/certificados/porcentaje/${target.id_alumno}/${target.id_carrera}`);
    const aprobBefore = Number(pctBeforeRes.body.estadisticas?.cantidadAprobadas ?? 0);

    try {
      const patchRes = await api('PATCH', `/api/v1/resultados/${target.id}/validacion`, {
        estado_semaforo: 'GREEN',
        tipo_examen: 'P',
        nota: 9,
        tomo_acta: 15,
        folio_acta: 30,
        observaciones: 'Verificación E2E Promoción'
      }, precToken);

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.body.data.traffic_light_color, 'GREEN');
      assert.equal(patchRes.body.data.tipo_examen_codigo, 'P');
      assert.equal(patchRes.body.data.tipo_examen_label, 'Promoción');

      // Coherencia entre módulos: Certificados debe reflejar la nueva materia aprobada (si antes no estaba aprobada)
      const pctAfterRes = await api('GET', `/api/certificados/porcentaje/${target.id_alumno}/${target.id_carrera}`);
      const aprobAfter = Number(pctAfterRes.body.estadisticas?.cantidadAprobadas ?? 0);
      if (target.traffic_light_color !== 'GREEN') {
        assert.ok(aprobAfter > aprobBefore, `Certificados debe aumentar aprobadas (${aprobBefore} -> ${aprobAfter}) al validar en GREEN`);
      }

      // Auditoría: debe haberse registrado el cambio con el usuario preceptor
      const audRes = await api('GET', '/api/v1/audit-logs?limit=5', null, precToken);
      assert.equal(audRes.status, 200);
      const logs = audRes.body.data.data || [];
      const found = logs.find((l) => l.entity_id === target.id && l.user_email === 'preceptor@institucion.edu');
      assert.ok(found, 'La validación debe quedar registrada en audit_logs con el usuario actor');
    } finally {
      // Restaurar exactamente el registro original
      await mainPool.query(
        `UPDATE historial_academico
         SET tipo_alumno = ?, validado_regular = ?, anio_regular = ?, validado_examen = ?,
             fecha_aprobacion = ?, nota = ?, tomo_acta = ?, folio_acta = ?, observaciones = ?
         WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?`,
        [
          orig.tipo_alumno,
          orig.validado_regular,
          orig.anio_regular,
          orig.validado_examen,
          orig.fecha_aprobacion,
          orig.nota,
          orig.tomo_acta,
          orig.folio_acta,
          orig.observaciones,
          orig.id_alumno,
          orig.id_carrera,
          orig.id_materia
        ]
      );
    }
  });
});

// =========================================================================
// 6. SEGURIDAD Y AISLAMIENTO ESTRICTO DEL ROL ALUMNO
// =========================================================================
describe('6. Seguridad RBAC y Aislamiento Estricto del Rol ALUMNO', () => {
  it('Rechaza accesos sin token con 401', async () => {
    const res = await api('GET', '/api/v1/academic/records');
    assert.equal(res.status, 401);
  });

  it('ALUMNO solo ve sus propias notas, no puede buscar otros alumnos ni acceder a rutas admin', async () => {
    const loginRes = await api('POST', '/api/v1/auth/login', {
      email: 'alumno@institucion.edu',
      password: 'Alumno123!'
    });
    assert.equal(loginRes.status, 200);
    const alToken = loginRes.body.data.token;
    const alId = Number(loginRes.body.data.user.idAlumno);
    assert.ok(alId > 0, 'El usuario alumno debe estar vinculado a un id_alumno');

    // 1. Solo sus propios registros y KPIs
    const recRes = await api('GET', '/api/v1/academic/records', null, alToken);
    assert.equal(recRes.status, 200);
    const records = recRes.body.data.data;
    const foreign = records.filter((r) => Number(r.id_alumno) !== alId);
    assert.equal(foreign.length, 0, 'ALUMNO no puede ver registros de otros alumnos');
    assert.equal(recRes.body.data.summary.total, records.length, 'Los KPIs no pueden filtrar totales de otros alumnos');

    // 2. Búsqueda de apellido ajeno devuelve 0 registros
    const searchOther = await api('GET', '/api/v1/academic/records?search=Herrera', null, alToken);
    assert.equal(searchOther.status, 200);
    assert.equal(searchOther.body.data.data.length, 0);

    // 3. /students solo devuelve su propio registro
    const stuRes = await api('GET', '/api/v1/academic/students', null, alToken);
    assert.equal(stuRes.status, 200);
    assert.ok(stuRes.body.data.every((s) => Number(s.id) === alId));

    // 4. Rutas de modificación y administración bloqueadas con 403
    const [patchRes, usersRes, auditRes] = await Promise.all([
      api('PATCH', `/api/v1/resultados/${records[0]?.id || '1-1-1'}/validacion`, { estado_semaforo: 'GREEN' }, alToken),
      api('GET', '/api/v1/usuarios', null, alToken),
      api('GET', '/api/v1/audit-logs', null, alToken)
    ]);
    assert.equal(patchRes.status, 403);
    assert.equal(usersRes.status, 403);
    assert.equal(auditRes.status, 403);
  });
});
