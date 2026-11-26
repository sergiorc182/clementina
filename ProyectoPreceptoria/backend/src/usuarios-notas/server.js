const app = require('./app');
const config = require('./config/env');
const { initDb } = require('./database/initDb');

const server = app.listen(config.PORT, async () => {
  console.log(`=======================================================`);
  console.log(` INSTITUTO EDUCATIVO - MÓDULO USUARIOS Y NOTAS (MySQL)`);
  console.log(` Servidor Backend Express en ejecución`);
  console.log(` Puerto: http://localhost:${config.PORT}`);
  console.log(` Base de datos: ${config.DB_NAME}`);
  console.log(` Endpoint de salud: http://localhost:${config.PORT}/api/v1/health`);
  console.log(` Entorno: ${config.NODE_ENV}`);
  console.log(`=======================================================`);
  try {
    await initDb();
  } catch (err) {
    console.error('[Servidor] Error al inicializar base de datos MySQL:', err.message);
  }
});

module.exports = server;
