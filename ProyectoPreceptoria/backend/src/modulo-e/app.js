const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./docs/swagger.json');

const apiRoutes = require('./routes/index');
const inscripcionRoutes = require('./routes/inscripcionRoutes');
const estudianteRoutes = require('./routes/estudianteRoutes');
const reporteRoutes = require('./routes/reporteRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Documentación interactiva Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
  customSiteTitle: 'Módulo E - API Docs',
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Servir la especificación JSON cruda
app.get('/api-docs.json', (req, res) => {
  res.json(swaggerDoc);
});

// Rutas directas según la especificación exacta del Módulo E
app.use('/inscripciones-materias', inscripcionRoutes);
app.use('/estudiantes', estudianteRoutes);
app.use('/reportes', reporteRoutes);
app.use('/documentos', documentoRoutes);
app.use('/catalogos', catalogoRoutes);

// Rutas con prefijo /api para consumo desde el frontend
app.use('/api', apiRoutes);

// Servir frontend Vanilla JS nativo (HTML5 + CSS3 + JS puro)
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Ruta de comprobación de salud del servicio
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    modulo: 'Módulo E - Inscripción a Materias',
    timestamp: new Date().toISOString()
  });
});

// Fallback para servir index.html en rutas del navegador
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/api-docs') ||
    req.path.startsWith('/health') ||
    req.path.startsWith('/inscripciones-materias') ||
    req.path.startsWith('/estudiantes') ||
    req.path.startsWith('/reportes') ||
    req.path.startsWith('/documentos') ||
    req.path.startsWith('/catalogos')
  ) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Manejo de errores
app.use(errorHandler);

module.exports = app;
