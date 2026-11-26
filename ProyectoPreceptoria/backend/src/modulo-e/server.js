const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 4000;

async function startServer() {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Modulo E: Sistema activo en http://localhost:${PORT}`);
    console.log(`Interfaz Web (Vanilla JS): http://localhost:${PORT}`);
    console.log(`Documentacion Swagger UI en: http://localhost:${PORT}/api-docs`);
    console.log(`====================================================`);
  });
}

startServer();
