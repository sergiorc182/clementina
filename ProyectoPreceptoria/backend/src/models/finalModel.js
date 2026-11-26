import { pool } from '../config/db.js';

/**
 * CAPA MODELO (MODEL) - Control de Rendiciones de Exámenes Finales
 * Gestiona la tabla 'rendiciones_finales' y valida las reglas académicas:
 * 1. Regularidad de la materia (en modalidad REGULAR) o Correlatividades regulares/aprobadas (en modalidad LIBRE).
 * 2. Materia no aprobada previamente.
 * 3. Plazo máximo de 8 turnos desde la regularización (en modalidad REGULAR).
 * 4. Límite de fallas: Máximo 3 fallas (la 4ta obliga a recursar). Falla = aplazo (<4). Los ausentes NO cuentan como falla.
 * 5. Inscripción por excepción (exclusivo para preceptor; omite todas las restricciones).
 */

// Nombres legibles para las 3 instancias de turnos de finales por año
export const INSTANCIAS_TURNOS = {
  1: 'Febrero / Marzo',
  2: 'Junio / Julio',
  3: 'Diciembre'
};

let estructuraVerificada = false;

/**
 * Clasifica normativamente si un espacio curricular está exceptuado de condición Libre
 * (Prácticas Profesionalizantes, Prácticas Docentes, Talleres, Laboratorios, Seminarios, Ateneos - Módulo D).
 */
export const detectarExcepcionLibreNormativa = (nombreMateria = '', exceptuadaCol = 0, tipoEspacioCol = null) => {
  const nombre = String(nombreMateria || '');
  if (Number(exceptuadaCol) === 1) {
    return {
      exceptuada: true,
      tipoEspacio: tipoEspacioCol && tipoEspacioCol !== 'Asignatura' ? tipoEspacioCol : 'Espacio Curricular Exceptuado'
    };
  }
  const n = nombre.toLowerCase();
  if (n.includes('práctica') || n.includes('practica')) {
    return { exceptuada: true, tipoEspacio: 'Práctica Profesionalizante / Docente' };
  }
  if (n.includes('taller')) {
    return { exceptuada: true, tipoEspacio: 'Taller' };
  }
  if (n.includes('laboratorio')) {
    return { exceptuada: true, tipoEspacio: 'Laboratorio' };
  }
  if (n.includes('seminario')) {
    return { exceptuada: true, tipoEspacio: 'Seminario' };
  }
  if (n.includes('ateneo')) {
    return { exceptuada: true, tipoEspacio: 'Ateneo' };
  }
  return {
    exceptuada: false,
    tipoEspacio: tipoEspacioCol || 'Asignatura'
  };
};

/**
 * Garantiza que MySQL clementina cuente con las columnas y tabla de auditoría
 * requeridas por Control de Finales + Módulo D (modalidad, estado BAJA, fecha_baja, reasignada,
 * exceptuada_libre, tipo_espacio y auditoria_inscripciones_finales).
 */
const asegurarColumnaModalidad = async () => {
  if (estructuraVerificada) return;
  try {
    await pool.query(
      `ALTER TABLE rendiciones_finales
       ADD COLUMN IF NOT EXISTS modalidad ENUM('REGULAR', 'LIBRE') NOT NULL DEFAULT 'REGULAR' AFTER estado`
    );
    await pool.query(
      `ALTER TABLE rendiciones_finales
       MODIFY COLUMN estado ENUM('INSCRIPTO', 'APROBADO', 'DESAPROBADO', 'AUSENTE', 'BAJA') NOT NULL DEFAULT 'INSCRIPTO'`
    );
    await pool.query(
      `ALTER TABLE rendiciones_finales
       ADD COLUMN IF NOT EXISTS reasignada TINYINT(1) NOT NULL DEFAULT 0 AFTER motivo_excepcion`
    );
    await pool.query(
      `ALTER TABLE rendiciones_finales
       ADD COLUMN IF NOT EXISTS fecha_baja DATETIME DEFAULT NULL AFTER reasignada`
    );
    await pool.query(
      `ALTER TABLE carrera_materias
       ADD COLUMN IF NOT EXISTS exceptuada_libre TINYINT(1) NOT NULL DEFAULT 0`
    );
    await pool.query(
      `ALTER TABLE carrera_materias
       ADD COLUMN IF NOT EXISTS tipo_espacio VARCHAR(45) NOT NULL DEFAULT 'Asignatura'`
    );
    await pool.query(
      `CREATE TABLE IF NOT EXISTS auditoria_inscripciones_finales (
        id               BIGINT NOT NULL AUTO_INCREMENT,
        id_rendicion     BIGINT NOT NULL,
        accion           VARCHAR(40) NOT NULL,
        detalle_anterior VARCHAR(255) DEFAULT NULL,
        detalle_nuevo    VARCHAR(255) DEFAULT NULL,
        fecha_cambio     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        modificado_por   VARCHAR(100) DEFAULT 'Preceptoría',
        PRIMARY KEY (id),
        KEY fk_aud_rendicion (id_rendicion),
        CONSTRAINT fk_aud_rendicion FOREIGN KEY (id_rendicion)
          REFERENCES rendiciones_finales (id_rendicion) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
    );
    // Marcar automáticamente espacios curriculares exceptuados de Libre en carrera_materias
    await pool.query(
      `UPDATE carrera_materias cm
       JOIN materias m ON m.id_materia = cm.id_materia
       SET cm.exceptuada_libre = 1,
           cm.tipo_espacio = CASE
             WHEN LOWER(m.nombre_materia) LIKE '%práctica%' OR LOWER(m.nombre_materia) LIKE '%practica%' THEN 'Práctica Profesionalizante'
             WHEN LOWER(m.nombre_materia) LIKE '%taller%' THEN 'Taller'
             WHEN LOWER(m.nombre_materia) LIKE '%seminario%' THEN 'Seminario'
             WHEN LOWER(m.nombre_materia) LIKE '%laboratorio%' THEN 'Laboratorio'
             WHEN LOWER(m.nombre_materia) LIKE '%ateneo%' THEN 'Ateneo'
             ELSE cm.tipo_espacio
           END
       WHERE LOWER(m.nombre_materia) LIKE '%práctica%'
          OR LOWER(m.nombre_materia) LIKE '%practica%'
          OR LOWER(m.nombre_materia) LIKE '%taller%'
          OR LOWER(m.nombre_materia) LIKE '%seminario%'
          OR LOWER(m.nombre_materia) LIKE '%laboratorio%'
          OR LOWER(m.nombre_materia) LIKE '%ateneo%'`
    );
    estructuraVerificada = true;
  } catch (err) {
    estructuraVerificada = true;
  }
};

/**
 * Determina si una instancia de turno en un año dado corresponde a un momento anterior a la fecha actual (hoy).
 * Instancia 1: Febrero / Marzo (finaliza el 31 de Marzo)
 * Instancia 2: Junio / Julio (finaliza el 31 de Julio)
 * Instancia 3: Diciembre (finaliza el 31 de Diciembre)
 */
export const esInstanciaPasada = (turnoInstancia, anioTurno, fechaReferencia = new Date()) => {
  const anioNum = Number(anioTurno);
  const anioActual = fechaReferencia.getFullYear();

  if (anioNum < anioActual) return true;
  if (anioNum > anioActual) return false;

  const finInstancia = {
    1: new Date(anioNum, 2, 31, 23, 59, 59, 999), // 31 de Marzo
    2: new Date(anioNum, 6, 31, 23, 59, 59, 999), // 31 de Julio
    3: new Date(anioNum, 11, 31, 23, 59, 59, 999) // 31 de Diciembre
  };

  const limite = finInstancia[Number(turnoInstancia)];
  return limite ? fechaReferencia > limite : false;
};

/**
 * Calcula el número correlativo de turno a partir del año de regularización
 * Regla: El primer turno es Diciembre del año de regularización (Turno 1).
 * Luego hay 3 turnos por año: 1=Feb/Mar, 2=Jun/Jul, 3=Dic.
 */
export const calcularTurnosTranscurridos = (anioRegular, anioTurno, turnoInstancia) => {
  const instanciaNum = Number(turnoInstancia);
  const anioTurnoNum = Number(anioTurno);
  const anioRegularNum = Number(anioRegular);

  // Verificación de fecha cronológicamente válida
  if (anioTurnoNum < anioRegularNum || (anioTurnoNum === anioRegularNum && instanciaNum < 3)) {
    return {
      turnoNumero: 0,
      dentroDelPlazo: false,
      esValido: false,
      mensaje: `El turno seleccionado (${INSTANCIAS_TURNOS[instanciaNum]} ${anioTurnoNum}) es anterior a la fecha de regularización (Diciembre ${anioRegularNum}).`
    };
  }

  let turnoNumero = 0;
  if (anioTurnoNum === anioRegularNum && instanciaNum === 3) {
    turnoNumero = 1;
  } else {
    // Para años posteriores: 1 (turno de Dic anioRegular) + 3 por cada año intermedio + instancia actual
    turnoNumero = 1 + (anioTurnoNum - (anioRegularNum + 1)) * 3 + instanciaNum;
  }

  const dentroDelPlazo = turnoNumero <= 8;
  const limiteVenceEn = `Febrero/Marzo ${anioRegularNum + 3} (Turno #8)`;

  return {
    turnoNumero,
    dentroDelPlazo,
    esValido: true,
    limiteVenceEn,
    mensaje: dentroDelPlazo
      ? `Turno #${turnoNumero} de 8 permitidos. Regularidad vigente hasta ${limiteVenceEn}.`
      : `Plazo vencido: El turno solicitado corresponde al turno #${turnoNumero} desde que regularizó en ${anioRegularNum}. El límite reglamentario es de 8 turnos (venció en ${limiteVenceEn}). El estudiante debe recursar.`
  };
};

/**
 * Verifica las correlatividades de un espacio curricular consultando la tabla 'correlatividades'.
 * Para la inscripción en modalidad LIBRE (y control de correlativas), cada espacio curricular
 * anterior (correlativo) debe figurar como REGULAR o con su FINAL APROBADO.
 */
export const evaluarCorrelatividades = async ({ id_alumno, id_carrera, id_materia }) => {
  try {
    const [rows] = await pool.query(
      `SELECT 
         corr.id_materia_correlativa,
         m.nombre_materia,
         cm.anio_cursada,
         ha.anio_regular,
         ha.validado_regular,
         ha.nota AS nota_historial,
         ha.validado_examen,
         (
           SELECT MAX(rf.nota)
           FROM rendiciones_finales rf
           WHERE rf.id_alumno = ?
             AND rf.id_carrera = corr.id_carrera
             AND rf.id_materia = corr.id_materia_correlativa
             AND (rf.estado = 'APROBADO' OR (rf.nota IS NOT NULL AND rf.nota >= 4))
         ) AS nota_rendicion_aprobada
       FROM correlatividades corr
       JOIN materias m ON m.id_materia = corr.id_materia_correlativa
       LEFT JOIN carrera_materias cm ON cm.id_carrera = corr.id_carrera 
                                    AND cm.id_materia = corr.id_materia_correlativa
       LEFT JOIN historial_academico ha ON ha.id_alumno = ?
                                       AND ha.id_carrera = corr.id_carrera
                                       AND ha.id_materia = corr.id_materia_correlativa
       WHERE corr.id_carrera = ?
         AND corr.id_materia = ?
         AND corr.id_materia_correlativa IS NOT NULL
         AND corr.id_materia_correlativa > 0
         AND corr.id_materia_correlativa != corr.id_materia
         AND LOWER(TRIM(m.nombre_materia)) NOT IN ('', '-', 'ninguna', 'sin correlativa', 'sin correlativas', 'no tiene')
       ORDER BY cm.anio_cursada ASC, m.id_materia ASC`,
      [id_alumno, id_alumno, id_carrera, id_materia]
    );

    if (rows.length === 0) {
      return {
        cumple: true,
        tieneCorrelativas: false,
        correlativas: [],
        detalle: 'Cumplida: La materia no posee espacios curriculares anteriores requeridos como correlativos.'
      };
    }

    const correlativasEvaluadas = rows.map(c => {
      const notaMaxAprobada = Number(c.nota_historial) >= 4
        ? Number(c.nota_historial)
        : Number(c.nota_rendicion_aprobada) >= 4
          ? Number(c.nota_rendicion_aprobada)
          : null;

      const finalAprobado = c.validado_examen === 'T' || notaMaxAprobada !== null;
      const esRegular = c.validado_regular === 'T' && Number(c.anio_regular) > 0;
      const cumple = finalAprobado || esRegular;

      let estadoTexto = 'Sin cursada regular ni final aprobado';
      if (finalAprobado) {
        estadoTexto = `Final Aprobado${notaMaxAprobada ? ` (Nota: ${notaMaxAprobada})` : ''}`;
      } else if (esRegular) {
        estadoTexto = `Regular (${c.anio_regular})`;
      }

      return {
        id_materia: c.id_materia_correlativa,
        nombre_materia: c.nombre_materia,
        anio_cursada: c.anio_cursada,
        esRegular,
        anioRegular: esRegular ? Number(c.anio_regular) : 0,
        finalAprobado,
        notaFinal: notaMaxAprobada,
        cumple,
        estadoTexto
      };
    });

    const cumpleTodas = correlativasEvaluadas.every(c => c.cumple);
    const faltantes = correlativasEvaluadas.filter(c => !c.cumple);

    const detalle = cumpleTodas
      ? `Cumple correlatividades previas: ${correlativasEvaluadas.map(c => `${c.nombre_materia} [${c.estadoTexto}]`).join('; ')}.`
      : `No cumple correlatividades: El espacio curricular anterior debe figurar como regular o con su final aprobado. Pendiente: ${faltantes.map(c => `${c.nombre_materia} (${c.estadoTexto})`).join('; ')}.`;

    return {
      cumple: cumpleTodas,
      tieneCorrelativas: true,
      correlativas: correlativasEvaluadas,
      detalle
    };
  } catch (err) {
    return {
      cumple: true,
      tieneCorrelativas: false,
      correlativas: [],
      detalle: 'Sin restricciones de correlatividades registradas para este espacio curricular.'
    };
  }
};

/**
 * Evalúa exhaustivamente todas las condiciones académicas para inscribir a un alumno a final
 */
export const evaluarCondicionesInscripcion = async ({
  id_alumno,
  id_carrera,
  id_materia,
  anio_turno,
  turno_instancia,
  modalidad = 'REGULAR',
  es_excepcion = false
}) => {
  await asegurarColumnaModalidad();

  const modalidadNorm = String(modalidad || 'REGULAR').toUpperCase() === 'LIBRE' ? 'LIBRE' : 'REGULAR';
  const esModalidadLibre = modalidadNorm === 'LIBRE';

  // 1. Obtener datos de alumno, materia, carrera y excepción normativa Libre (Módulo D)
  const [alumnos] = await pool.query(
    `SELECT a.id_alumno, a.primer_nombre, a.primer_apellido, a.numero_documento, a.email,
            c.id_carrera, c.nombre_carrera, m.id_materia, m.nombre_materia,
            cm.exceptuada_libre, cm.tipo_espacio
     FROM alumnos a
     CROSS JOIN carrera_materias cm ON cm.id_carrera = ? AND cm.id_materia = ?
     JOIN carreras c ON c.id_carrera = cm.id_carrera
     JOIN materias m ON m.id_materia = cm.id_materia
     WHERE a.id_alumno = ?`,
    [id_carrera, id_materia, id_alumno]
  );

  if (alumnos.length === 0) {
    throw new Error('Alumno, carrera o materia no encontrados en la base de datos');
  }

  const datosBase = alumnos[0];
  const infoExcepcionLibre = detectarExcepcionLibreNormativa(
    datosBase.nombre_materia,
    datosBase.exceptuada_libre,
    datosBase.tipo_espacio
  );

  // 2. Consultar historial académico (Regularidad y notas finales aprobadas previas)
  const [historial] = await pool.query(
    `SELECT anio_regular, validado_regular, nota, validado_examen, fecha_aprobacion
     FROM historial_academico
     WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?`,
    [id_alumno, id_carrera, id_materia]
  );

  const registroHistorial = historial[0] || null;

  // Evaluar correlatividades desde la tabla 'correlatividades'
  const condCorrelatividades = await evaluarCorrelatividades({
    id_alumno,
    id_carrera,
    id_materia
  });

  // REGLA 1: Regularidad (o Condición Libre + Excepción Normativa del Módulo D)
  const esRegular = registroHistorial !== null && 
                    registroHistorial.validado_regular === 'T' && 
                    Number(registroHistorial.anio_regular) > 0;
  const anioRegular = esRegular ? Number(registroHistorial.anio_regular) : 0;

  const condRegularidad = esModalidadLibre
    ? {
        cumple: !infoExcepcionLibre.exceptuada,
        esModalidadLibre: true,
        exceptuadaLibre: infoExcepcionLibre.exceptuada,
        tipoEspacio: infoExcepcionLibre.tipoEspacio,
        anioRegular,
        detalle: infoExcepcionLibre.exceptuada
          ? `No se puede inscribir como libre: el espacio curricular "${datosBase.nombre_materia}" (${infoExcepcionLibre.tipoEspacio}) no admite condición Libre por excepción normativa institucional.`
          : 'Modalidad LIBRE habilitada: El espacio curricular admite examen libre (se validan correlatividades previas).'
      }
    : {
        cumple: esRegular,
        esModalidadLibre: false,
        exceptuadaLibre: infoExcepcionLibre.exceptuada,
        tipoEspacio: infoExcepcionLibre.tipoEspacio,
        anioRegular,
        detalle: esRegular
          ? `Materia regularizada en el ciclo lectivo ${anioRegular}.`
          : infoExcepcionLibre.exceptuada
            ? `El estudiante no registra cursada regularizada y "${datosBase.nombre_materia}" (${infoExcepcionLibre.tipoEspacio}) no admite condición Libre.`
            : condCorrelatividades.cumple
              ? 'El estudiante no registra la cursada regularizada en su historial académico. (Cumple correlatividades si desea inscribirse en Modalidad LIBRE).'
              : 'El estudiante no registra la cursada regularizada en su historial académico.'
      };

  // REGLA 2: No debe tener nota de final aprobada (>= 4)
  const tieneAprobadoEnHistorial = registroHistorial !== null && 
                                  (registroHistorial.validado_examen === 'T' || Number(registroHistorial.nota) >= 4);

  // Verificar también si tiene una rendición aprobada en rendiciones_finales (excluyendo bajas lógicas)
  const [aprobadosRendiciones] = await pool.query(
    `SELECT id_rendicion, nota, fecha_examen, anio_turno, turno_instancia
     FROM rendiciones_finales
     WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ? 
       AND estado != 'BAJA'
       AND (estado = 'APROBADO' OR (nota IS NOT NULL AND nota >= 4))
     LIMIT 1`,
    [id_alumno, id_carrera, id_materia]
  );

  const yaAprobada = tieneAprobadoEnHistorial || aprobadosRendiciones.length > 0;
  const notaAprobada = tieneAprobadoEnHistorial 
    ? registroHistorial.nota 
    : (aprobadosRendiciones[0]?.nota || 4);

  const condNoAprobada = {
    cumple: !yaAprobada,
    notaPrevia: yaAprobada ? notaAprobada : null,
    detalle: yaAprobada
      ? `La materia ya se encuentra aprobada con calificación ${notaAprobada}. No se permite nueva inscripción.`
      : 'La materia aún no ha sido aprobada. Habilitado para rendir.'
  };

  // REGLA 3: Plazo de 8 turnos a partir de la regularización (aplica en modalidad REGULAR)
  const instanciaRef = turno_instancia ? Number(turno_instancia) : 3;
  const anioRef = anio_turno ? Number(anio_turno) : new Date().getFullYear();

  let condPlazoTurnos = {
    cumple: esModalidadLibre,
    esModalidadLibre,
    turnoNumero: 0,
    limiteVenceEn: esModalidadLibre ? 'No aplica (Libre)' : 'No regularizada',
    detalle: esModalidadLibre
      ? 'En Modalidad LIBRE no aplica el cálculo de vencimiento de 8 turnos de regularidad.'
      : 'No se puede calcular el plazo de turnos porque la materia no está regularizada.'
  };

  if (!esModalidadLibre && esRegular) {
    const calc = calcularTurnosTranscurridos(anioRegular, anioRef, instanciaRef);
    condPlazoTurnos = {
      cumple: calc.dentroDelPlazo,
      esModalidadLibre: false,
      turnoNumero: calc.turnoNumero,
      limiteVenceEn: calc.limiteVenceEn,
      detalle: calc.mensaje
    };
  }

  // REGLA 4: Control de fallas (Máximo 3 fallas; la 4ta obliga a recursar)
  // IMPORTANTE: Los ausentes en una fecha de final en que el alumno se inscribió NO cuentan como falla.
  // Únicamente computan como falla los aplazos (nota < 4 o estado = 'DESAPROBADO' sin ser ausente).
  const [fallasRows] = await pool.query(
    `SELECT id_rendicion, anio_turno, turno_instancia, id_llamado, fecha_examen, nota, estado, es_ausente, es_excepcion
     FROM rendiciones_finales
     WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
       AND es_ausente = 0
       AND estado NOT IN ('AUSENTE', 'BAJA')
       AND (
         (nota IS NOT NULL AND nota < 4) OR 
         estado = 'DESAPROBADO'
       )
     ORDER BY anio_turno ASC, turno_instancia ASC`,
    [id_alumno, id_carrera, id_materia]
  );

  // Consultar cantidad de ausencias sólo a modo informativo (no suman como falla)
  const [ausentesRows] = await pool.query(
    `SELECT COUNT(*) AS total_ausentes
     FROM rendiciones_finales
     WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ?
       AND (es_ausente = 1 OR estado = 'AUSENTE')`,
    [id_alumno, id_carrera, id_materia]
  );
  const cantidadAusentes = Number(ausentesRows[0]?.total_ausentes || 0);

  const cantidadFallas = fallasRows.length;
  // Puede fallar como mucho 3 veces; si acumula 4 o más aplazos ya debe recursar
  const cumpleFallas = esModalidadLibre ? true : cantidadFallas <= 3;

  const notaAusentesTexto = cantidadAusentes > 0
    ? ` (Registra ${cantidadAusentes} ausencia${cantidadAusentes !== 1 ? 's' : ''} que no computa${cantidadAusentes !== 1 ? 'n' : ''} como falla).`
    : ' (Las ausencias no computan como falla).';

  const condFallas = {
    cumple: cumpleFallas,
    cantidadFallas,
    cantidadAusentes,
    limitePermitido: 3,
    detalle: cantidadFallas === 0
      ? `No registra aplazos en exámenes finales de esta materia.${notaAusentesTexto}`
      : cantidadFallas < 3
        ? `Registra ${cantidadFallas} falla(s) (aplazos) de 3 permitidas.${notaAusentesTexto}`
        : cantidadFallas === 3
          ? `Registra 3 aplazos previos (Límite alcanzado). Éste es su último intento permitido; un nuevo aplazo obligará a recursar.${notaAusentesTexto}`
          : esModalidadLibre
            ? `Registra ${cantidadFallas} aplazos previos en condición regular, pero se inscribe en Modalidad LIBRE.`
            : `Límite de fallas superado: Registra ${cantidadFallas} aplazos (más de 3). La normativa estipula recursar la materia.${notaAusentesTexto}`,
    historialFallas: fallasRows.map(f => ({
      id_rendicion: f.id_rendicion,
      turno: `${INSTANCIAS_TURNOS[f.turno_instancia]} ${f.anio_turno}`,
      tipoFalla: `APLAZO (Nota: ${f.nota})`,
      fecha: f.fecha_examen
    }))
  };

  // REGLA 5: Período vigente (no anterior a hoy)
  const tieneTurnoElegido = Boolean(turno_instancia);
  const esTurnoPasado = tieneTurnoElegido ? esInstanciaPasada(turno_instancia, anioRef) : false;
  const condPeriodoVigente = !tieneTurnoElegido
    ? {
        cumple: false,
        pendiente: true,
        esPasado: false,
        detalle: 'Pendiente: Seleccione una Instancia de Turno en el menú desplegable.'
      }
    : {
        cumple: Boolean(es_excepcion || !esTurnoPasado),
        pendiente: false,
        esPasado: esTurnoPasado,
        detalle: esTurnoPasado
          ? `El turno seleccionado (${INSTANCIAS_TURNOS[turno_instancia]} ${anioRef}) corresponde a un período anterior a hoy (ya finalizado). No admite nuevas inscripciones ordinarias.`
          : `El turno seleccionado (${INSTANCIAS_TURNOS[turno_instancia]} ${anioRef}) se encuentra vigente para inscripción.`
      };

  // Verificación global según la modalidad elegida (REGULAR vs LIBRE)
  const cumpleCondicionesAcademicas = esModalidadLibre
    ? (condRegularidad.cumple && condCorrelatividades.cumple && condNoAprobada.cumple)
    : (condRegularidad.cumple && condNoAprobada.cumple && condPlazoTurnos.cumple && condFallas.cumple);

  const cumpleTodasLasReglas = cumpleCondicionesAcademicas && condPeriodoVigente.cumple;

  const aptoParaInscribirse = Boolean(es_excepcion || cumpleTodasLasReglas);

  const motivosRechazo = [];
  if (esModalidadLibre) {
    if (!condRegularidad.cumple) motivosRechazo.push(condRegularidad.detalle);
    if (!condCorrelatividades.cumple) motivosRechazo.push(condCorrelatividades.detalle);
    if (!condNoAprobada.cumple) motivosRechazo.push(condNoAprobada.detalle);
    if (!condPeriodoVigente.cumple) motivosRechazo.push(condPeriodoVigente.detalle);
  } else {
    if (!condRegularidad.cumple) motivosRechazo.push(condRegularidad.detalle);
    if (!condNoAprobada.cumple) motivosRechazo.push(condNoAprobada.detalle);
    if (!condPlazoTurnos.cumple) motivosRechazo.push(condPlazoTurnos.detalle);
    if (!condFallas.cumple) motivosRechazo.push(condFallas.detalle);
    if (!condPeriodoVigente.cumple) motivosRechazo.push(condPeriodoVigente.detalle);
  }

  return {
    aptoParaInscribirse,
    cumpleCondicionesAcademicas,
    modalidad: modalidadNorm,
    esExcepcion: Boolean(es_excepcion),
    cumpleTodasLasReglas,
    motivosRechazo,
    alumno: {
      id_alumno: datosBase.id_alumno,
      nombre_completo: `${datosBase.primer_apellido}, ${datosBase.primer_nombre}`,
      dni: datosBase.numero_documento,
      email: datosBase.email
    },
    materia: {
      id_materia: datosBase.id_materia,
      nombre_materia: datosBase.nombre_materia,
      id_carrera: datosBase.id_carrera,
      nombre_carrera: datosBase.nombre_carrera
    },
    turnoSeleccionado: {
      anio: anioRef,
      instancia: tieneTurnoElegido ? Number(turno_instancia) : null,
      nombre_instancia: tieneTurnoElegido ? INSTANCIAS_TURNOS[Number(turno_instancia)] : 'Sin seleccionar'
    },
    condiciones: {
      regularidad: condRegularidad,
      noAprobada: condNoAprobada,
      plazoTurnos: condPlazoTurnos,
      limiteFallas: condFallas,
      correlatividades: condCorrelatividades,
      vigenciaTurno: condPeriodoVigente
    }
  };
};

/**
 * Inscribe a un estudiante a rendir examen final
 */
export const inscribirAFinal = async ({
  id_alumno,
  id_carrera,
  id_materia,
  anio_turno,
  turno_instancia,
  id_llamado = 1,
  modalidad = 'REGULAR',
  fecha_examen = null,
  es_excepcion = false,
  motivo_excepcion = null
}) => {
  await asegurarColumnaModalidad();
  const modalidadNorm = String(modalidad || 'REGULAR').toUpperCase() === 'LIBRE' ? 'LIBRE' : 'REGULAR';

  // 1. Ejecutar validación académica
  const evaluacion = await evaluarCondicionesInscripcion({
    id_alumno,
    id_carrera,
    id_materia,
    anio_turno,
    turno_instancia,
    modalidad: modalidadNorm,
    es_excepcion
  });

  if (!evaluacion.aptoParaInscribirse) {
    const errorMsg = evaluacion.motivosRechazo.join(' | ');
    const err = new Error(`Inscripción rechazada: ${errorMsg}`);
    err.evaluacion = evaluacion;
    throw err;
  }

  // 2. Verificar que no esté ya inscripto activamente en el mismo turno y llamado (ignorar BAJA)
  const [existente] = await pool.query(
    `SELECT id_rendicion, estado FROM rendiciones_finales
     WHERE id_alumno = ? AND id_carrera = ? AND id_materia = ? 
       AND anio_turno = ? AND turno_instancia = ? AND id_llamado = ?
       AND estado != 'BAJA'`,
    [id_alumno, id_carrera, id_materia, anio_turno, turno_instancia, id_llamado]
  );

  if (existente.length > 0) {
    throw new Error(`El estudiante ya registra una inscripción en este turno (${INSTANCIAS_TURNOS[turno_instancia]} ${anio_turno}, Llamado ${id_llamado})`);
  }

  // 3. Insertar registro de inscripción en 'rendiciones_finales'
  let insertResult;
  try {
    [insertResult] = await pool.query(
      `INSERT INTO rendiciones_finales 
        (id_alumno, id_carrera, id_materia, anio_turno, turno_instancia, id_llamado, fecha_examen, estado, modalidad, es_excepcion, motivo_excepcion, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'INSCRIPTO', ?, ?, ?, NOW())`,
      [
        id_alumno,
        id_carrera,
        id_materia,
        anio_turno,
        turno_instancia,
        id_llamado,
        fecha_examen,
        modalidadNorm,
        es_excepcion ? 1 : 0,
        es_excepcion ? (motivo_excepcion || 'Inscripción autorizada por excepción') : null
      ]
    );
  } catch (err) {
    [insertResult] = await pool.query(
      `INSERT INTO rendiciones_finales 
        (id_alumno, id_carrera, id_materia, anio_turno, turno_instancia, id_llamado, fecha_examen, estado, es_excepcion, motivo_excepcion, fecha_registro)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'INSCRIPTO', ?, ?, NOW())`,
      [
        id_alumno,
        id_carrera,
        id_materia,
        anio_turno,
        turno_instancia,
        id_llamado,
        fecha_examen,
        es_excepcion ? 1 : 0,
        es_excepcion ? (motivo_excepcion || 'Inscripción autorizada por excepción') : null
      ]
    );
  }

  // Registrar ALTA en la auditoría de inscripciones a finales (Módulo D)
  try {
    await pool.query(
      `INSERT INTO auditoria_inscripciones_finales (id_rendicion, accion, detalle_anterior, detalle_nuevo, modificado_por)
       VALUES (?, 'ALTA', NULL, ?, ?)`,
      [
        insertResult.insertId,
        `Año ${anio_turno} - ${INSTANCIAS_TURNOS[turno_instancia] || `Turno ${turno_instancia}`} - ${id_llamado}° Llamado - Modalidad: ${modalidadNorm}${es_excepcion ? ' (Excepción)' : ''}`,
        es_excepcion ? 'Preceptoría (Excepción)' : 'Sistema'
      ]
    );
  } catch (_) {}

  return {
    id_rendicion: insertResult.insertId,
    modalidad: modalidadNorm,
    mensaje: es_excepcion 
      ? 'Inscripción registrada con éxito a modo de EXCEPCIÓN' 
      : modalidadNorm === 'LIBRE'
        ? 'Inscripción en modalidad LIBRE registrada correctamente (correlatividades verificadas)'
        : 'Inscripción registrada correctamente cumpliendo todos los requisitos reglamentarios',
    evaluacion
  };
};

/**
 * Obtiene todas las rendiciones e inscripciones de finales de un alumno (o por materia)
 */
export const obtenerRendicionesAlumno = async (id_alumno, id_materia = null) => {
  await asegurarColumnaModalidad();

  let query = `
    SELECT 
      rf.*,
      a.primer_apellido,
      a.primer_nombre,
      a.numero_documento,
      c.nombre_carrera,
      m.nombre_materia,
      ha.anio_regular,
      ha.validado_regular
    FROM rendiciones_finales rf
    JOIN alumnos a ON a.id_alumno = rf.id_alumno
    JOIN carreras c ON c.id_carrera = rf.id_carrera
    JOIN materias m ON m.id_materia = rf.id_materia
    LEFT JOIN historial_academico ha ON ha.id_alumno = rf.id_alumno 
                                   AND ha.id_carrera = rf.id_carrera 
                                   AND ha.id_materia = rf.id_materia
    WHERE rf.id_alumno = ?
  `;

  const params = [id_alumno];
  if (id_materia) {
    query += ' AND rf.id_materia = ?';
    params.push(id_materia);
  }

  query += ' ORDER BY rf.anio_turno DESC, rf.turno_instancia DESC, rf.id_rendicion DESC';

  const [rows] = await pool.query(query, params);

  return rows.map(r => ({
    ...r,
    modalidad: r.modalidad || 'REGULAR',
    nombre_instancia: INSTANCIAS_TURNOS[r.turno_instancia] || `Turno ${r.turno_instancia}`,
    // Los ausentes NO cuentan como falla; sólo los aplazos (nota < 4 o estado DESAPROBADO sin ser ausente)
    es_falla: Boolean(!r.es_ausente && r.estado !== 'AUSENTE' && ((r.nota !== null && r.nota < 4) || r.estado === 'DESAPROBADO'))
  }));
};

/**
 * Carga o modifica la nota final o ausencia de un examen rendido
 */
export const registrarCalificacionFinal = async (id_rendicion, { nota, es_ausente, fecha_examen }) => {
  // Obtener rendición
  const [rendRows] = await pool.query(
    'SELECT * FROM rendiciones_finales WHERE id_rendicion = ?',
    [id_rendicion]
  );

  if (rendRows.length === 0) {
    throw new Error(`Rendición con ID ${id_rendicion} no encontrada`);
  }

  const rend = rendRows[0];
  let nuevoEstado = 'INSCRIPTO';
  let notaFinal = null;
  let ausenteFlag = 0;

  if (es_ausente) {
    nuevoEstado = 'AUSENTE';
    ausenteFlag = 1;
    notaFinal = null;
  } else if (nota !== undefined && nota !== null && nota !== '') {
    notaFinal = Number(nota);
    if (notaFinal >= 4) {
      nuevoEstado = 'APROBADO';
    } else {
      nuevoEstado = 'DESAPROBADO';
    }
  }

  await pool.query(
    `UPDATE rendiciones_finales 
     SET nota = ?, estado = ?, es_ausente = ?, fecha_examen = COALESCE(?, fecha_examen)
     WHERE id_rendicion = ?`,
    [notaFinal, nuevoEstado, ausenteFlag, fecha_examen || null, id_rendicion]
  );

  // Si aprobó (nota >= 4), reflejar en historial_academico
  if (nuevoEstado === 'APROBADO') {
    await pool.query(
      `INSERT INTO historial_academico 
        (id_alumno, id_carrera, id_materia, nota, validado_examen, fecha_aprobacion, fecha_alta)
       VALUES (?, ?, ?, ?, 'T', COALESCE(?, CURDATE()), NOW())
       ON DUPLICATE KEY UPDATE 
        nota = VALUES(nota), 
        validado_examen = 'T', 
        fecha_aprobacion = VALUES(fecha_aprobacion),
        fecha_mod = NOW()`,
      [rend.id_alumno, rend.id_carrera, rend.id_materia, notaFinal, fecha_examen]
    );
  }

  return {
    success: true,
    id_rendicion,
    nuevoEstado,
    nota: notaFinal,
    es_ausente: Boolean(ausenteFlag)
  };
};

/**
 * Obtener listado de materias por carrera
 */
export const obtenerMateriasPorCarrera = async (id_carrera) => {
  const [rows] = await pool.query(
    `SELECT m.id_materia, m.nombre_materia, cm.anio_cursada, cm.id_carrera, c.nombre_carrera
     FROM carrera_materias cm
     JOIN materias m ON m.id_materia = cm.id_materia
     JOIN carreras c ON c.id_carrera = cm.id_carrera
     WHERE cm.id_carrera = ?
     ORDER BY cm.anio_cursada ASC, m.nombre_materia ASC`,
    [id_carrera]
  );
  return rows;
};

/**
 * Obtiene el listado completo de todos los finales e inscripciones registrados de todos los alumnos,
 * con soporte de filtrado opcional por año, turno, llamado, carrera y materia.
 */
export const obtenerTodasLasRendiciones = async ({
  anio = null,
  turno = null,
  llamado = null,
  id_carrera = null,
  id_materia = null
} = {}) => {
  await asegurarColumnaModalidad();

  let query = `
    SELECT 
      rf.*,
      a.primer_apellido,
      a.otros_apellidos,
      a.primer_nombre,
      a.otros_nombres,
      a.numero_documento,
      a.legajo,
      a.email,
      c.nombre_carrera,
      c.nombre_carrera_corto,
      m.nombre_materia,
      cm.anio_cursada,
      ha.anio_regular,
      ha.validado_regular
    FROM rendiciones_finales rf
    JOIN alumnos a ON a.id_alumno = rf.id_alumno
    JOIN carreras c ON c.id_carrera = rf.id_carrera
    JOIN materias m ON m.id_materia = rf.id_materia
    LEFT JOIN carrera_materias cm ON cm.id_carrera = rf.id_carrera
                                 AND cm.id_materia = rf.id_materia
    LEFT JOIN historial_academico ha ON ha.id_alumno = rf.id_alumno 
                                   AND ha.id_carrera = rf.id_carrera 
                                   AND ha.id_materia = rf.id_materia
    WHERE 1=1
  `;

  const params = [];

  if (anio) {
    query += ' AND rf.anio_turno = ?';
    params.push(Number(anio));
  }
  if (turno) {
    query += ' AND rf.turno_instancia = ?';
    params.push(Number(turno));
  }
  if (llamado) {
    query += ' AND rf.id_llamado = ?';
    params.push(Number(llamado));
  }
  if (id_carrera) {
    query += ' AND rf.id_carrera = ?';
    params.push(Number(id_carrera));
  }
  if (id_materia) {
    query += ' AND rf.id_materia = ?';
    params.push(Number(id_materia));
  }

  query += ' ORDER BY rf.anio_turno DESC, rf.turno_instancia DESC, rf.id_llamado ASC, c.nombre_carrera ASC, m.nombre_materia ASC, a.primer_apellido ASC, a.primer_nombre ASC';

  const [rows] = await pool.query(query, params);

  return rows.map(r => ({
    ...r,
    modalidad: r.modalidad || 'REGULAR',
    nombre_instancia: INSTANCIAS_TURNOS[r.turno_instancia] || `Turno ${r.turno_instancia}`,
    es_falla: Boolean(!r.es_ausente && r.estado !== 'AUSENTE' && r.estado !== 'BAJA' && ((r.nota !== null && r.nota < 4) || r.estado === 'DESAPROBADO'))
  }));
};

/**
 * BAJA LÓGICA de una inscripción a examen final (Módulo D).
 * Nunca borra físicamente el registro: cambia estado a 'BAJA', sella fecha_baja y registra auditoría.
 */
export const darDeBajaInscripcion = async (id_rendicion, modificado_por = 'Preceptoría') => {
  await asegurarColumnaModalidad();

  const [rows] = await pool.query('SELECT * FROM rendiciones_finales WHERE id_rendicion = ?', [id_rendicion]);
  if (rows.length === 0) {
    const err = new Error(`Inscripción #${id_rendicion} no encontrada.`);
    err.statusCode = 404;
    throw err;
  }

  const rend = rows[0];
  if (rend.estado === 'BAJA') {
    const err = new Error('Esta inscripción ya se encontraba dada de baja.');
    err.statusCode = 400;
    throw err;
  }
  if (rend.estado === 'APROBADO' || rend.estado === 'DESAPROBADO') {
    const err = new Error(`No se puede dar de baja un examen que ya fue calificado (${rend.estado}, Nota: ${rend.nota}).`);
    err.statusCode = 400;
    throw err;
  }

  const detalleAnterior = `Estado: ${rend.estado} | Año ${rend.anio_turno} - ${INSTANCIAS_TURNOS[rend.turno_instancia] || rend.turno_instancia} - ${rend.id_llamado}° Llamado - Modalidad: ${rend.modalidad || 'REGULAR'}`;

  await pool.query(
    `UPDATE rendiciones_finales SET estado = 'BAJA', fecha_baja = NOW() WHERE id_rendicion = ?`,
    [id_rendicion]
  );

  await pool.query(
    `INSERT INTO auditoria_inscripciones_finales (id_rendicion, accion, detalle_anterior, detalle_nuevo, modificado_por)
     VALUES (?, 'BAJA_LOGICA', ?, 'Estado: BAJA (Baja lógica registrada sin borrado físico)', ?)`,
    [id_rendicion, detalleAnterior, modificado_por]
  );

  return {
    id_rendicion,
    estado: 'BAJA',
    fecha_baja: new Date().toISOString()
  };
};

/**
 * REASIGNACIÓN de turno / año / llamado / modalidad de una inscripción (Módulo D).
 * Mantiene trazabilidad completa en auditoria_inscripciones_finales.
 */
export const reasignarInscripcion = async (
  id_rendicion,
  { anio_turno, turno_instancia, id_llamado, modalidad },
  modificado_por = 'Preceptoría'
) => {
  await asegurarColumnaModalidad();

  const [rows] = await pool.query(
    `SELECT rf.*, m.nombre_materia, cm.exceptuada_libre, cm.tipo_espacio
     FROM rendiciones_finales rf
     JOIN materias m ON m.id_materia = rf.id_materia
     LEFT JOIN carrera_materias cm ON cm.id_carrera = rf.id_carrera AND cm.id_materia = rf.id_materia
     WHERE rf.id_rendicion = ?`,
    [id_rendicion]
  );

  if (rows.length === 0) {
    const err = new Error(`Inscripción #${id_rendicion} no encontrada.`);
    err.statusCode = 404;
    throw err;
  }

  const actual = rows[0];
  if (actual.estado === 'BAJA') {
    const err = new Error('No se puede reasignar una inscripción que fue dada de baja.');
    err.statusCode = 400;
    throw err;
  }
  if (actual.estado === 'APROBADO' || actual.estado === 'DESAPROBADO') {
    const err = new Error(`No se puede reasignar un examen que ya tiene calificación final asentada (${actual.estado}).`);
    err.statusCode = 400;
    throw err;
  }

  const nuevoAnio = anio_turno ? Number(anio_turno) : Number(actual.anio_turno);
  const nuevoTurno = turno_instancia ? Number(turno_instancia) : Number(actual.turno_instancia);
  const nuevoLlamado = id_llamado ? Number(id_llamado) : Number(actual.id_llamado || 1);
  const nuevaModalidad = modalidad
    ? (String(modalidad).toUpperCase() === 'LIBRE' ? 'LIBRE' : 'REGULAR')
    : (actual.modalidad || 'REGULAR');

  // Validar choque con otra inscripción activa en la mesa destino
  const [choque] = await pool.query(
    `SELECT id_rendicion FROM rendiciones_finales
     WHERE id_rendicion != ?
       AND id_alumno = ? AND id_carrera = ? AND id_materia = ?
       AND anio_turno = ? AND turno_instancia = ? AND id_llamado = ?
       AND estado != 'BAJA'`,
    [id_rendicion, actual.id_alumno, actual.id_carrera, actual.id_materia, nuevoAnio, nuevoTurno, nuevoLlamado]
  );

  if (choque.length > 0) {
    const err = new Error(
      `El estudiante ya tiene otra inscripción activa (#${choque[0].id_rendicion}) en ${INSTANCIAS_TURNOS[nuevoTurno]} ${nuevoAnio} (${nuevoLlamado}° Llamado).`
    );
    err.statusCode = 409;
    throw err;
  }

  // Si pasa a modalidad LIBRE, validar excepción normativa del Módulo D
  if (nuevaModalidad === 'LIBRE') {
    const infoLibre = detectarExcepcionLibreNormativa(
      actual.nombre_materia,
      actual.exceptuada_libre,
      actual.tipo_espacio
    );
    if (infoLibre.exceptuada) {
      const err = new Error(
        `No se puede cambiar a modalidad LIBRE: el espacio curricular "${actual.nombre_materia}" (${infoLibre.tipoEspacio}) está exceptuado por normativa institucional.`
      );
      err.statusCode = 400;
      throw err;
    }
  }

  const detalleAnterior = `Año ${actual.anio_turno} - ${INSTANCIAS_TURNOS[actual.turno_instancia] || actual.turno_instancia} - ${actual.id_llamado || 1}° Llamado - Modalidad: ${actual.modalidad || 'REGULAR'}`;
  const detalleNuevo = `Año ${nuevoAnio} - ${INSTANCIAS_TURNOS[nuevoTurno] || nuevoTurno} - ${nuevoLlamado}° Llamado - Modalidad: ${nuevaModalidad}`;

  await pool.query(
    `UPDATE rendiciones_finales
     SET anio_turno = ?, turno_instancia = ?, id_llamado = ?, modalidad = ?, reasignada = 1
     WHERE id_rendicion = ?`,
    [nuevoAnio, nuevoTurno, nuevoLlamado, nuevaModalidad, id_rendicion]
  );

  await pool.query(
    `INSERT INTO auditoria_inscripciones_finales (id_rendicion, accion, detalle_anterior, detalle_nuevo, modificado_por)
     VALUES (?, 'REASIGNACION', ?, ?, ?)`,
    [id_rendicion, detalleAnterior, detalleNuevo, modificado_por]
  );

  return {
    id_rendicion,
    anio_turno: nuevoAnio,
    turno_instancia: nuevoTurno,
    id_llamado: nuevoLlamado,
    modalidad: nuevaModalidad,
    reasignada: true,
    detalle_anterior: detalleAnterior,
    detalle_nuevo: detalleNuevo
  };
};

/**
 * Obtiene el historial completo de auditoría de una inscripción (Módulo D).
 */
export const obtenerAuditoriaInscripcion = async (id_rendicion) => {
  await asegurarColumnaModalidad();
  const [rows] = await pool.query(
    `SELECT id, id_rendicion, accion, detalle_anterior, detalle_nuevo, fecha_cambio, modificado_por
     FROM auditoria_inscripciones_finales
     WHERE id_rendicion = ?
     ORDER BY fecha_cambio DESC, id DESC`,
    [id_rendicion]
  );
  return rows;
};
