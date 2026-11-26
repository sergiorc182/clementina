const { initDb } = require('./initDb');

/**
 * Inicializador limpio sobre la base de datos única MySQL (clementina).
 * Ya no genera estudiantes, carreras ni calificaciones ficticias.
 */
async function seed() {
  console.log('Verificando estructura RBAC y tablas del módulo Usuarios y Validación en MySQL (clementina)...');
  await initDb();
  console.log('Estructura RBAC verificada en MySQL (clementina).');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error al inicializar RBAC en MySQL:', err.message);
      process.exit(1);
    });
}

module.exports = { seed };
