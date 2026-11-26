import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import alumnoRoutes from './routes/alumnoRoutes.js';
import finalRoutes from './routes/finalRoutes.js';
import { pool, testConnection } from './config/db.js';

dotenv.config();

const require = createRequire(import.meta.url);
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost',
  'http://127.0.0.1:5173',
  'http://127.0.0.1'
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origen no permitido por CORS.'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
// express.json() permite procesar cuerpos JSON para POST, PUT e incluso GET con body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de comprobación de salud compartido (usado por proyectoMarta y Módulo E)
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 + 1 AS check_db');
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      database: 'conectado',
      check: result[0].check_db === 2
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'desconectado',
      mensaje: error.message
    });
  }
});

// Ruta base informativa
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API de Gestión de Carreras, Alumnos, Exámenes Finales, Módulo E y Certificados (ISFT 182 - Clementina)',
    base_de_datos: process.env.DB_NAME || 'clementina',
    rutas_principales: {
      crud_alumnos: '/api/alumnos',
      catalogo_carreras: '/api/alumnos/catalogo/carreras',
      get_por_parametro: '/api/alumnos/:id',
      get_por_query: '/api/alumnos/busqueda/query?carrera=Sistemas',
      get_por_body: '/api/alumnos/busqueda/body',
      finales_listado: 'GET /api/finales/listado',
      finales_validar: 'POST /api/finales/validar',
      finales_inscribir: 'POST /api/finales/inscribir',
      finales_historial: 'GET /api/finales/alumno/:id_alumno',
      finales_calificar: 'PUT /api/finales/calificar/:id_rendicion',
      modulo_e_catalogos: 'GET /api/catalogos/carreras',
      modulo_e_inscripciones: 'POST /api/inscripciones-materias',
      modulo_e_reportes: 'GET /api/reportes/inscripciones',
      certificados_porcentaje: 'GET /api/certificados/porcentaje/:alumnoId/:carreraId',
      certificados_constancia: 'GET /api/certificados/constancia/:alumnoId/:carreraId'
    }
  });
});

// Montaje de rutas principales
app.use('/api/alumnos', alumnoRoutes);
app.use('/api/finales', finalRoutes);

// Integración de rutas del Módulo E (Inscripción a Cursada y Gestión Académica)
try {
  const moduloERoutes = require('./modulo-e/routes/index.js');
  app.use('/api', moduloERoutes);
  console.log(' Rutas del Módulo E (Inscripción a Cursada y Gestión Académica) integradas bajo /api');
} catch (err) {
  console.warn(' Aviso al cargar rutas de Módulo E:', err.message);
}

// Integración de rutas de Certificados (Avance Académico y Certificados Oficiales)
try {
  const martaAlumnoRoutes = require('./certificados/routes/alumnoRoutes.js');
  const martaCarreraRoutes = require('./certificados/routes/carreraRoutes.js');
  const martaCertificadoRoutes = require('./certificados/routes/certificadoRoutes.js');
  const martaPersonalRoutes = require('./certificados/routes/personalRoutes.js');

  app.use('/api/marta/alumnos', martaAlumnoRoutes);
  app.use('/api/carreras', martaCarreraRoutes);
  app.use('/api/certificados', martaCertificadoRoutes);
  app.use('/api/personal', martaPersonalRoutes);
  console.log(' Rutas de Avance Académico y Certificados integradas bajo /api');
} catch (err) {
  console.warn(' Aviso al cargar rutas de Certificados:', err.message);
}

// Integración de rutas de Usuarios y Validación de Notas (/api/v1) sobre MySQL clementina
let initUsuariosNotasDb = null;
try {
  const { initDb } = require('./usuarios-notas/database/initDb.js');
  const usuariosNotasRoutes = require('./usuarios-notas/routes/index.js');
  const usuariosNotasErrorHandler = require('./usuarios-notas/middlewares/errorHandler.js');

  initUsuariosNotasDb = initDb;
  app.use('/api/v1', usuariosNotasRoutes);
  app.use('/api/v1', usuariosNotasErrorHandler);
  console.log(' Rutas de Usuarios y Validación de Notas integradas bajo /api/v1 (MySQL)');
} catch (err) {
  console.warn(' Aviso al cargar rutas de Usuarios y Validación de Notas:', err.message);
}

// Iniciar servidor y verificar conexión a MySQL XAMPP
app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(` Servidor Backend corriendo en: http://localhost:${PORT}`);
  console.log(` Base de datos conectada: ${process.env.DB_NAME || 'clementina'}`);
  console.log(`===============================================`);
  await testConnection();
  if (initUsuariosNotasDb) {
    try {
      await initUsuariosNotasDb();
      console.log(' Tablas RBAC y Validación de Notas sincronizadas en MySQL (clementina)');
    } catch (dbErr) {
      console.warn(' Aviso al inicializar tablas de Usuarios y Validación en MySQL:', dbErr.message);
    }
  }
});

export default app;
