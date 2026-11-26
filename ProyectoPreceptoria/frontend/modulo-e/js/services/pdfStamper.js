/**
 * Módulo E - Servicio de Estampado de Formularios Oficiales A5a en PDF (Opción 2)
 * Permite tomar el archivo PDF oficial con su formato institucional estricto
 * y estampar dinámicamente los datos personales del alumno, las cruces "X" de
 * inscripción (CURSA / RECURSA) y las notas de finales y cursadas aprobadas.
 * 
 * Además permite al preceptor cargar una plantilla PDF personalizada por carrera
 * y almacenarla localmente para su uso en matriculaciones.
 */

// Configuraciones geométricas extraídas de las planillas vectoriales oficiales (612 x 1008 pt)
export const TEMPLATES_CONFIG = {
  3: {
    id_carrera: 3,
    nombre_archivo: 'PLANILLA MATRICULACION ENFERMERIA.pdf',
    ruta: 'formularios_matriculacion/PLANILLA MATRICULACION ENFERMERIA.pdf',
    total_materias: 24,
    anio_lectivo: { x: 440, y: 887 },
    student_box: {
      row1: { y: 839.3, apeNomX: 135, dniX: 445 },
      row2: { y: 815.3, edadX: 65, fechaNacX: 175, ciudadNacX: 330, provNacX: 495 },
      row3: { y: 791.3, nacX: 105, estadoCivX: 285, sexoX: 390, hijosX: 525 },
      row4: { y: 767.3, domX: 85, numX: 365, pisoX: 445, deptoX: 530 },
      row5: { y: 743.3, locX: 120, partX: 320, cpX: 495 },
      row6: { y: 719.3, celX: 95, mailX: 295 }
    },
    table: {
      startY: 591.2,
      stepY: 21.38,
      cursaX: 264,
      recursaX: 308,
      notaNumX: 348,
      notaLetraX: 395,
      fechaX: 468,
      cursadaAprobX: 548
    }
  },
  4: {
    id_carrera: 4,
    nombre_archivo: 'PLANILLA MATRICULACION HIGIENE Y SEGURIDAD.pdf',
    ruta: 'formularios_matriculacion/PLANILLA MATRICULACION HIGIENE Y SEGURIDAD.pdf',
    total_materias: 24,
    anio_lectivo: { x: 440, y: 887 },
    student_box: {
      row1: { y: 830.2, apeNomX: 150, dniX: 455 },
      row2: { y: 806.2, edadX: 75, fechaNacX: 185, ciudadNacX: 340, provNacX: 505 },
      row3: { y: 782.2, nacX: 115, estadoCivX: 295, sexoX: 400, hijosX: 535 },
      row4: { y: 758.2, domX: 95, numX: 375, pisoX: 455, deptoX: 540 },
      row5: { y: 734.2, locX: 130, partX: 330, cpX: 505 },
      row6: { y: 710.1, celX: 105, mailX: 305 }
    },
    table: {
      startY: 580.8,
      stepY: 20.70,
      cursaX: 270,
      recursaX: 318,
      notaNumX: 360,
      notaLetraX: 410,
      fechaX: 480,
      cursadaAprobX: 555
    }
  },
  5: {
    id_carrera: 5,
    nombre_archivo: 'PLANILLA MATRICULACION INSTRUMENTACION QUIRURGICA.pdf',
    ruta: 'formularios_matriculacion/PLANILLA MATRICULACION INSTRUMENTACION QUIRURGICA.pdf',
    total_materias: 17,
    anio_lectivo: { x: 440, y: 887 },
    student_box: {
      row1: { y: 819.1, apeNomX: 150, dniX: 455 },
      row2: { y: 795.4, edadX: 75, fechaNacX: 185, ciudadNacX: 340, provNacX: 505 },
      row3: { y: 771.6, nacX: 115, estadoCivX: 295, sexoX: 400, hijosX: 535 },
      row4: { y: 747.9, domX: 95, numX: 375, pisoX: 455, deptoX: 540 },
      row5: { y: 724.1, locX: 130, partX: 330, cpX: 505 },
      row6: { y: 700.3, celX: 105, mailX: 305 }
    },
    table: {
      startY: 565.8,
      stepY: 23.80,
      cursaX: 266,
      recursaX: 312,
      notaNumX: 352,
      notaLetraX: 400,
      fechaX: 472,
      cursadaAprobX: 550
    }
  },
  6: {
    id_carrera: 6,
    nombre_archivo: 'PLANILLA MATRICULACION RECURSOS HUMANOS -Plan nuevo.pdf',
    ruta: 'formularios_matriculacion/PLANILLA MATRICULACION RECURSOS HUMANOS -Plan nuevo.pdf',
    total_materias: 24,
    anio_lectivo: { x: 440, y: 887 },
    student_box: {
      row1: { y: 826.8, apeNomX: 135, dniX: 445 },
      row2: { y: 804.2, edadX: 65, fechaNacX: 175, ciudadNacX: 330, provNacX: 495 },
      row3: { y: 781.6, nacX: 105, estadoCivX: 285, sexoX: 390, hijosX: 525 },
      row4: { y: 759.1, domX: 85, numX: 365, pisoX: 445, deptoX: 530 },
      row5: { y: 736.5, locX: 120, partX: 320, cpX: 495 },
      row6: { y: 714.0, celX: 95, mailX: 295 }
    },
    table: {
      startY: 588.0,
      stepY: 19.70,
      cursaX: 266,
      recursaX: 314,
      notaNumX: 355,
      notaLetraX: 405,
      fechaX: 475,
      cursadaAprobX: 550
    }
  }
};

// Almacén en memoria de plantillas personalizadas subidas por el preceptor
const customTemplatesCache = new Map();

/**
 * Obtiene la configuración de plantilla para una carrera dada
 */
export function getTemplateConfig(idCarrera) {
  const cId = Number(idCarrera);
  if (TEMPLATES_CONFIG[cId]) {
    return TEMPLATES_CONFIG[cId];
  }
  // Plantilla estándar por defecto para carreras adicionales
  return {
    id_carrera: cId,
    nombre_archivo: 'PLANILLA MATRICULACION ENFERMERIA.pdf',
    ruta: 'formularios_matriculacion/PLANILLA MATRICULACION ENFERMERIA.pdf',
    total_materias: 24,
    anio_lectivo: { x: 440, y: 887 },
    student_box: TEMPLATES_CONFIG[3].student_box,
    table: TEMPLATES_CONFIG[3].table
  };
}

/**
 * Indica si el preceptor cargó una plantilla PDF personalizada para la carrera
 */
export function hasCustomTemplate(idCarrera) {
  const cId = Number(idCarrera);
  if (customTemplatesCache.has(cId)) return true;
  try {
    const stored = localStorage.getItem(`isft182_custom_pdf_${cId}`);
    return Boolean(stored);
  } catch (e) {
    return false;
  }
}

/**
 * Retorna información de la plantilla activa para la carrera
 */
export function getTemplateInfo(idCarrera) {
  const cId = Number(idCarrera);
  const cfg = getTemplateConfig(cId);
  const isCustom = hasCustomTemplate(cId);

  let customName = null;
  if (isCustom) {
    if (customTemplatesCache.has(cId)) {
      customName = customTemplatesCache.get(cId).name;
    } else {
      try {
        const meta = localStorage.getItem(`isft182_custom_pdf_meta_${cId}`);
        if (meta) {
          const parsed = JSON.parse(meta);
          customName = parsed.name;
        }
      } catch (e) {}
    }
  }

  return {
    id_carrera: cId,
    isCustom,
    fileName: customName || cfg.nombre_archivo,
    defaultFileName: cfg.nombre_archivo,
    rutaPorDefecto: cfg.ruta
  };
}

/**
 * Guarda una plantilla PDF personalizada ingresada por el preceptor
 */
export function setCustomTemplate(idCarrera, arrayBuffer, fileName) {
  const cId = Number(idCarrera);
  customTemplatesCache.set(cId, {
    buffer: arrayBuffer,
    name: fileName
  });

  try {
    // Almacenar metadatos y buffer codificado en base64 para persistir
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    localStorage.setItem(`isft182_custom_pdf_${cId}`, b64);
    localStorage.setItem(`isft182_custom_pdf_meta_${cId}`, JSON.stringify({
      name: fileName,
      updatedAt: new Date().toISOString(),
      size: len
    }));
  } catch (e) {
    console.warn('No se pudo guardar la plantilla en localStorage (límite de cuota superado)', e);
  }
}

/**
 * Restablece la plantilla de la carrera a la oficial por defecto
 */
export function resetCustomTemplate(idCarrera) {
  const cId = Number(idCarrera);
  customTemplatesCache.delete(cId);
  try {
    localStorage.removeItem(`isft182_custom_pdf_${cId}`);
    localStorage.removeItem(`isft182_custom_pdf_meta_${cId}`);
  } catch (e) {}
}

/**
 * Obtiene los bytes de la plantilla activa (personalizada o por defecto)
 */
export async function getActiveTemplateBytes(idCarrera) {
  const cId = Number(idCarrera);

  // 1. En memoria
  if (customTemplatesCache.has(cId)) {
    return customTemplatesCache.get(cId).buffer;
  }

  // 2. En localStorage
  try {
    const b64 = localStorage.getItem(`isft182_custom_pdf_${cId}`);
    if (b64) {
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      customTemplatesCache.set(cId, {
        buffer: bytes.buffer,
        name: 'Plantilla personalizada guardada'
      });
      return bytes.buffer;
    }
  } catch (e) {}

  // 3. Cargar archivo oficial por defecto mediante fetch
  const cfg = getTemplateConfig(cId);
  const response = await fetch(cfg.ruta);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla PDF oficial (${response.status}): ${cfg.ruta}`);
  }
  return await response.arrayBuffer();
}

/**
 * Abre la plantilla original en blanco en una nueva pestaña
 */
export async function abrirPlantillaEnBlanco(idCarrera) {
  const bytes = await getActiveTemplateBytes(idCarrera);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

/**
 * Formatea una fecha YYYY-MM-DD a DD/MM/AAAA
 */
function formatearFecha(str) {
  if (!str) return '';
  const parts = str.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return str;
}

/**
 * Convierte un número a su equivalente en letras (para la nota en letra del final)
 */
function numeroALetras(numStr) {
  if (!numStr) return '';
  const n = parseInt(numStr, 10);
  if (isNaN(n)) return String(numStr).toUpperCase();
  const nombres = {
    1: 'UNO',
    2: 'DOS',
    3: 'TRES',
    4: 'CUATRO',
    5: 'CINCO',
    6: 'SEIS',
    7: 'SIETE',
    8: 'OCHO',
    9: 'NUEVE',
    10: 'DIEZ'
  };
  return nombres[n] || String(n);
}

/**
 * Genera el Formulario de Matriculación Oficial estampado en el PDF
 * @param {Object} params
 * @param {Object} params.carrera
 * @param {Object} params.formData
 * @param {Array} params.materias
 * @param {Map} params.selecciones Map de id_materia -> 'curso' | 'recursa'
 * @param {Object} params.datosAcademicos Map de id_materia -> { nota_num, nota_letra, fecha, cursada }
 * @returns {Promise<{ blob: Blob, blobUrl: string, fileName: string }>}
 */
export async function generarFormularioMatriculacionPdf({
  carrera,
  formData = {},
  materias = [],
  selecciones = new Map(),
  datosAcademicos = {}
}) {
  const pdfLib = window.PDFLib;
  if (!pdfLib || !pdfLib.PDFDocument) {
    throw new Error('La librería pdf-lib no está disponible en el entorno.');
  }

  const { PDFDocument, rgb, StandardFonts } = pdfLib;
  const idCarrera = Number(carrera?.id_carrera || 3);
  const cfg = getTemplateConfig(idCarrera);

  // Obtener bytes de la plantilla activa
  const templateBytes = await getActiveTemplateBytes(idCarrera);
  const pdfDoc = await PDFDocument.load(templateBytes);

  // Cargar fuentes tipográficas estándar de PDF
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();
  const page = pages[0];

  // Paleta de colores
  const colorText = rgb(0.08, 0.12, 0.18);
  const colorMark = rgb(0.05, 0.22, 0.55); // Azul institucional ISFT 182 para marcas "X"

  // 1. Año Lectivo en Cabecera
  if (cfg.anio_lectivo) {
    page.drawText('2026', {
      x: cfg.anio_lectivo.x,
      y: cfg.anio_lectivo.y,
      size: 9.5,
      font: fontBold,
      color: colorMark
    });
  }

  // 2. Estampado de Datos Personales del Alumno
  const sb = cfg.student_box;
  const f = formData;

  // Fila 1: Apellido y Nombres, DNI
  const apeNom = (f.apellido_nombres || '').toUpperCase();
  if (apeNom) {
    page.drawText(apeNom, {
      x: sb.row1.apeNomX,
      y: sb.row1.y,
      size: 8.5,
      font: fontBold,
      color: colorText
    });
  }
  if (f.dni) {
    page.drawText(String(f.dni), {
      x: sb.row1.dniX,
      y: sb.row1.y,
      size: 8.5,
      font: fontBold,
      color: colorText
    });
  }

  // Fila 2: Edad, Fecha Nac, Ciudad de Nac, Prov Nac
  if (f.edad) {
    page.drawText(String(f.edad), {
      x: sb.row2.edadX,
      y: sb.row2.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  const fNac = formatearFecha(f.fecha_nacimiento);
  if (fNac) {
    page.drawText(fNac, {
      x: sb.row2.fechaNacX,
      y: sb.row2.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.ciudad_nacimiento) {
    page.drawText(f.ciudad_nacimiento, {
      x: sb.row2.ciudadNacX,
      y: sb.row2.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.provincia_nacimiento) {
    page.drawText(f.provincia_nacimiento, {
      x: sb.row2.provNacX,
      y: sb.row2.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }

  // Fila 3: Nacionalidad, Estado Civil, Sexo, Hijos
  page.drawText(f.nacionalidad || 'Argentina', {
    x: sb.row3.nacX,
    y: sb.row3.y,
    size: 8,
    font: fontRegular,
    color: colorText
  });
  page.drawText(f.estado_civil || 'Soltero/a', {
    x: sb.row3.estadoCivX,
    y: sb.row3.y,
    size: 8,
    font: fontRegular,
    color: colorText
  });
  if (f.sexo) {
    page.drawText(f.sexo.toUpperCase(), {
      x: sb.row3.sexoX,
      y: sb.row3.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  page.drawText(String(f.hijos !== undefined && f.hijos !== '' ? f.hijos : '0'), {
    x: sb.row3.hijosX,
    y: sb.row3.y,
    size: 8,
    font: fontRegular,
    color: colorText
  });

  // Fila 4: Domicilio, N°, Piso, Depto
  if (f.domicilio) {
    page.drawText(f.domicilio, {
      x: sb.row4.domX,
      y: sb.row4.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.numero) {
    page.drawText(String(f.numero), {
      x: sb.row4.numX,
      y: sb.row4.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.piso && f.piso !== '—') {
    page.drawText(String(f.piso), {
      x: sb.row4.pisoX,
      y: sb.row4.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.depto && f.depto !== '—') {
    page.drawText(String(f.depto), {
      x: sb.row4.deptoX,
      y: sb.row4.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }

  // Fila 5: Localidad/Barrio, Partido, Cód. Postal
  if (f.localidad_barrio) {
    page.drawText(f.localidad_barrio, {
      x: sb.row5.locX,
      y: sb.row5.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.partido) {
    page.drawText(f.partido, {
      x: sb.row5.partX,
      y: sb.row5.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.codigo_postal) {
    page.drawText(String(f.codigo_postal), {
      x: sb.row5.cpX,
      y: sb.row5.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }

  // Fila 6: N° Celular, Mail
  if (f.celular) {
    page.drawText(f.celular, {
      x: sb.row6.celX,
      y: sb.row6.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }
  if (f.mail) {
    page.drawText(f.mail, {
      x: sb.row6.mailX,
      y: sb.row6.y,
      size: 8,
      font: fontRegular,
      color: colorText
    });
  }

  // 3. Estampado de Asignaturas en la Tabla Oficial
  const tbl = cfg.table;
  materias.forEach((m, idx) => {
    // Si la planilla tiene menos filas que materias, prevenir overflow
    if (idx >= cfg.total_materias) return;

    const rowY = tbl.startY - (idx * tbl.stepY);
    const idMat = m.id_materia;
    const seleccion = selecciones.get(idMat);

    // Marca de CURSA
    if (seleccion === 'curso') {
      page.drawText('X', {
        x: tbl.cursaX,
        y: rowY,
        size: 11,
        font: fontBold,
        color: colorMark
      });
    }

    // Marca de RECURSA
    if (seleccion === 'recursa') {
      page.drawText('X', {
        x: tbl.recursaX,
        y: rowY,
        size: 11,
        font: fontBold,
        color: colorMark
      });
    }

    // Datos académicos acreditados (Finales Aprobados y Cursada Aprobada)
    const acad = datosAcademicos[idMat];
    if (acad) {
      // Nota en número
      if (acad.nota_num) {
        page.drawText(String(acad.nota_num), {
          x: tbl.notaNumX,
          y: rowY,
          size: 8.5,
          font: fontBold,
          color: colorText
        });
      }

      // Nota en letras
      const notaLetra = acad.nota_letra || numeroALetras(acad.nota_num);
      if (notaLetra) {
        page.drawText(notaLetra, {
          x: tbl.notaLetraX,
          y: rowY,
          size: 7.2,
          font: fontRegular,
          color: colorText
        });
      }

      // Fecha del final
      const fechaFinal = formatearFecha(acad.fecha);
      if (fechaFinal) {
        page.drawText(fechaFinal, {
          x: tbl.fechaX,
          y: rowY,
          size: 7.2,
          font: fontRegular,
          color: colorText
        });
      }

      // Cursada aprobada (año)
      if (acad.cursada) {
        page.drawText(String(acad.cursada), {
          x: tbl.cursadaAprobX,
          y: rowY,
          size: 8,
          font: fontRegular,
          color: colorText
        });
      }
    }
  });

  // 4. Guardar documento y crear Blob
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);
  const cleanApe = (f.apellido_nombres || 'ALUMNO').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Formulario_A5a_${cleanApe}_${f.dni || 'DNI'}.pdf`;

  return { blob, blobUrl, fileName };
}

/**
 * Dispara la visualización / impresión nativa del PDF generado
 */
export function imprimirODescargarPdf(pdfResult, accion = 'print') {
  if (!pdfResult || !pdfResult.blobUrl) return;

  if (accion === 'download') {
    const a = document.createElement('a');
    a.href = pdfResult.blobUrl;
    a.download = pdfResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Impresión nativa abriendo en nueva pestaña o ventana emergente
  const win = window.open(pdfResult.blobUrl, '_blank');
  if (win) {
    win.focus();
  } else {
    // Si el bloqueador de popups bloqueó la apertura, descargar como alternativa directa
    const a = document.createElement('a');
    a.href = pdfResult.blobUrl;
    a.download = pdfResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

