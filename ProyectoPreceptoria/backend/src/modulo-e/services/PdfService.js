const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { PDFDocument: PDFLibDoc, rgb, StandardFonts } = require('pdf-lib');
const AlumnoModel = require('../models/AlumnoModel');
const CarreraModel = require('../models/CarreraModel');
const MatriculacionModel = require('../models/MatriculacionModel');
const ParametrosModel = require('../models/ParametrosModel');

const TEMPLATE_FILES = {
  3: 'PLANILLA MATRICULACION ENFERMERIA.pdf',
  4: 'PLANILLA MATRICULACION HIGIENE Y SEGURIDAD.pdf',
  5: 'PLANILLA MATRICULACION INSTRUMENTACION QUIRURGICA.pdf',
  6: 'PLANILLA MATRICULACION RECURSOS HUMANOS -Plan nuevo.pdf'
};

const TEMPLATE_CONFIGS = {
  3: {
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

class PdfService {
  /**
   * Genera el Formulario de Matriculación Imprimible en PDF
   * (Utiliza estampado sobre plantilla oficial en formato A5a si existe, o PDFKit como respaldo)
   * @param {number} idAlumno
   * @param {number} idCarrera
   * @param {number} [cicloLectivo]
   * @returns {Promise<Buffer>}
   */
  static async generarFormularioMatriculacion(idAlumno, idCarrera, cicloLectivo = null) {
    const alumno = await AlumnoModel.findById(idAlumno);
    if (!alumno) throw new Error('Alumno no encontrado');

    const domicilio = await AlumnoModel.getDomicilio(idAlumno);
    const carrera = await CarreraModel.findById(idCarrera);
    if (!carrera) throw new Error('Carrera no encontrada');

    const parametros = await ParametrosModel.getGenerales();
    const ciclo = cicloLectivo || parametros.ciclo_lectivo || new Date().getFullYear();

    const matricula = await MatriculacionModel.findByAlumnoYCarrera(idAlumno, idCarrera);
    const materias = await MatriculacionModel.getDetalle(idAlumno, idCarrera, ciclo);

    // Intentar estampar sobre la plantilla oficial PDF (Opción 2)
    try {
      const stampedBuffer = await PdfService.estamparPlantillaOficial(alumno, domicilio, carrera, materias, ciclo);
      if (stampedBuffer) {
        return stampedBuffer;
      }
    } catch (err) {
      console.warn('Fallo al estampar sobre plantilla oficial PDF, usando generador PDFKit de respaldo:', err.message);
    }

    // Fallback: Generador PDFKit estándar
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Encabezado institucional
        doc.rect(40, 40, doc.page.width - 80, 50).fill('#1E293B');
        doc.fillColor('#FFFFFF')
           .fontSize(14).font('Helvetica-Bold')
           .text(parametros.nombre_instituto || 'ISFT 182', 50, 48, { align: 'center' });
        doc.fontSize(10).font('Helvetica')
           .text('FORMULARIO OFICIAL DE MATRICULACIÓN E INSCRIPCIÓN A CURSADA', 50, 68, { align: 'center' });

        doc.moveDown(3);
        doc.fillColor('#0F172A');

        // Ciclo y fecha
        doc.fontSize(9).font('Helvetica-Bold')
           .text(`Ciclo Lectivo: ${ciclo}`, 40, 105)
           .text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-AR')}`, 400, 105, { align: 'right' });

        doc.moveDown(1);
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, 120).lineTo(doc.page.width - 40, 120).stroke();

        // 1. Datos del Estudiante
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0284C7').text('1. DATOS DEL ESTUDIANTE', 40, 130);
        doc.fontSize(9).font('Helvetica').fillColor('#1E293B');

        const yDatos = 150;
        doc.text(`Apellido y Nombre: ${alumno.apellidos}, ${alumno.nombres}`, 40, yDatos);
        doc.text(`DNI: ${alumno.numero_documento}`, 320, yDatos);
        doc.text(`Legajo: ${alumno.legajo || 'Sin asignar'}`, 450, yDatos);

        doc.text(`Email: ${alumno.email}`, 40, yDatos + 16);
        doc.text(`Teléfono: ${domicilio ? domicilio.telefono_principal || 'N/D' : 'N/D'}`, 320, yDatos + 16);

        const dirTexto = domicilio ? `${domicilio.calle || ''} ${domicilio.numero || ''}, ${domicilio.localidad || ''}` : 'No informado';
        doc.text(`Domicilio: ${dirTexto}`, 40, yDatos + 32);

        // 2. Datos de la Carrera y Sede
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, yDatos + 52).lineTo(doc.page.width - 40, yDatos + 52).stroke();
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0284C7').text('2. CARRERA Y CURSADA', 40, yDatos + 60);

        const yCarrera = yDatos + 80;
        doc.fontSize(9).font('Helvetica').fillColor('#1E293B');
        doc.text(`Carrera: ${carrera.nombre_carrera}`, 40, yCarrera);
        doc.text(`Resolución: ${carrera.nro_resolucion}`, 380, yCarrera);
        doc.text(`Turno: ${matricula ? matricula.turno : 'Asignado'}`, 40, yCarrera + 16);
        doc.text(`Sede: ${matricula ? matricula.nombre_sede : 'Principal'}`, 200, yCarrera + 16);

        // 3. Materias Inscriptas
        doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(40, yCarrera + 36).lineTo(doc.page.width - 40, yCarrera + 36).stroke();
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#0284C7').text('3. MATERIAS INSCRIPTAS PARA EL CICLO', 40, yCarrera + 44);

        let tableTop = yCarrera + 65;
        // Encabezado tabla
        doc.rect(40, tableTop, doc.page.width - 80, 20).fill('#F1F5F9');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8.5);
        doc.text('CÓD.', 45, tableTop + 5, { width: 40 });
        doc.text('ASIGNATURA / ESPACIO CURRICULAR', 90, tableTop + 5, { width: 280 });
        doc.text('AÑO', 380, tableTop + 5, { width: 40, align: 'center' });
        doc.text('CONDICIÓN', 430, tableTop + 5, { width: 80, align: 'center' });

        tableTop += 22;
        doc.font('Helvetica').fontSize(8.5).fillColor('#334155');

        if (materias.length === 0) {
          doc.text('No posee materias inscriptas registradas en este ciclo.', 50, tableTop + 5);
          tableTop += 20;
        } else {
          materias.forEach((m, idx) => {
            const rowColor = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
            doc.rect(40, tableTop - 2, doc.page.width - 80, 18).fill(rowColor);
            doc.fillColor('#1E293B');

            doc.text(String(m.id_materia), 45, tableTop + 3, { width: 40 });
            doc.text(m.nombre_materia, 90, tableTop + 3, { width: 280 });
            doc.text(`${m.anio_cursada}º Año`, 380, tableTop + 3, { width: 40, align: 'center' });
            doc.text(m.descripcion_asistencia, 430, tableTop + 3, { width: 80, align: 'center' });

            tableTop += 18;
          });
        }

        // Firmas
        const yFirmas = Math.max(tableTop + 40, 680);
        doc.strokeColor('#94A3B8').lineWidth(0.8);
        doc.moveTo(60, yFirmas).lineTo(220, yFirmas).stroke();
        doc.moveTo(330, yFirmas).lineTo(490, yFirmas).stroke();

        doc.fontSize(8.5).font('Helvetica').fillColor('#64748B');
        doc.text('Firma del Estudiante', 60, yFirmas + 6, { width: 160, align: 'center' });
        doc.text('Aclaración y DNI', 60, yFirmas + 18, { width: 160, align: 'center' });

        doc.text('Firma y Sello de Preceptoría', 330, yFirmas + 6, { width: 160, align: 'center' });
        doc.text('Recepción y Validación', 330, yFirmas + 18, { width: 160, align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Estampa los datos del alumno y las materias sobre la plantilla oficial PDF (Opción 2)
   */
  static async estamparPlantillaOficial(alumno, domicilio, carrera, materias, ciclo) {
    const idCarrera = Number(carrera.id_carrera);
    const fileName = TEMPLATE_FILES[idCarrera] || 'PLANILLA MATRICULACION ENFERMERIA.pdf';
    const cfg = TEMPLATE_CONFIGS[idCarrera] || TEMPLATE_CONFIGS[3];

    // Buscar en recursos o en public
    const pathsToCheck = [
      path.resolve(__dirname, '../../../recursos/formulario_matriculacion', fileName),
      path.resolve(__dirname, '../../public/formularios_matriculacion', fileName)
    ];

    let templatePath = null;
    for (const p of pathsToCheck) {
      if (fs.existsSync(p)) {
        templatePath = p;
        break;
      }
    }

    if (!templatePath) return null;

    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFLibDoc.load(templateBytes);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const page = pdfDoc.getPages()[0];

    const colorText = rgb(0.08, 0.12, 0.18);
    const colorMark = rgb(0.05, 0.22, 0.55);

    // 1. Año lectivo en cabecera
    if (cfg.anio_lectivo) {
      page.drawText(String(ciclo || '2026'), {
        x: cfg.anio_lectivo.x,
        y: cfg.anio_lectivo.y,
        size: 9.5,
        font: fontBold,
        color: colorMark
      });
    }

    // 2. Datos personales del alumno
    const sb = cfg.student_box;
    const apeNom = `${alumno.apellidos || ''}, ${alumno.nombres || ''}`.trim().toUpperCase();
    if (apeNom) page.drawText(apeNom, { x: sb.row1.apeNomX, y: sb.row1.y, size: 8.5, font: fontBold, color: colorText });
    if (alumno.numero_documento) page.drawText(String(alumno.numero_documento), { x: sb.row1.dniX, y: sb.row1.y, size: 8.5, font: fontBold, color: colorText });

    if (alumno.edad) page.drawText(String(alumno.edad), { x: sb.row2.edadX, y: sb.row2.y, size: 8, font: fontRegular, color: colorText });
    if (alumno.fecha_nacimiento) {
      const fNac = String(alumno.fecha_nacimiento).split('T')[0];
      page.drawText(fNac, { x: sb.row2.fechaNacX, y: sb.row2.y, size: 8, font: fontRegular, color: colorText });
    }
    if (alumno.ciudad_nacimiento) page.drawText(String(alumno.ciudad_nacimiento), { x: sb.row2.ciudadNacX, y: sb.row2.y, size: 8, font: fontRegular, color: colorText });
    if (alumno.provincia_nacimiento) page.drawText(String(alumno.provincia_nacimiento), { x: sb.row2.provNacX, y: sb.row2.y, size: 8, font: fontRegular, color: colorText });

    page.drawText(alumno.nacionalidad || 'Argentina', { x: sb.row3.nacX, y: sb.row3.y, size: 8, font: fontRegular, color: colorText });
    page.drawText(alumno.estado_civil || 'Soltero/a', { x: sb.row3.estadoCivX, y: sb.row3.y, size: 8, font: fontRegular, color: colorText });
    if (alumno.sexo) page.drawText(String(alumno.sexo).toUpperCase(), { x: sb.row3.sexoX, y: sb.row3.y, size: 8, font: fontRegular, color: colorText });
    page.drawText(String(alumno.cantidad_hijos !== undefined ? alumno.cantidad_hijos : '0'), { x: sb.row3.hijosX, y: sb.row3.y, size: 8, font: fontRegular, color: colorText });

    if (domicilio) {
      if (domicilio.calle) page.drawText(String(domicilio.calle), { x: sb.row4.domX, y: sb.row4.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.numero) page.drawText(String(domicilio.numero), { x: sb.row4.numX, y: sb.row4.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.piso) page.drawText(String(domicilio.piso), { x: sb.row4.pisoX, y: sb.row4.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.depto) page.drawText(String(domicilio.depto), { x: sb.row4.deptoX, y: sb.row4.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.localidad) page.drawText(String(domicilio.localidad), { x: sb.row5.locX, y: sb.row5.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.partido) page.drawText(String(domicilio.partido), { x: sb.row5.partX, y: sb.row5.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.codigo_postal) page.drawText(String(domicilio.codigo_postal), { x: sb.row5.cpX, y: sb.row5.y, size: 8, font: fontRegular, color: colorText });
      if (domicilio.telefono_principal) page.drawText(String(domicilio.telefono_principal), { x: sb.row6.celX, y: sb.row6.y, size: 8, font: fontRegular, color: colorText });
    }

    if (alumno.email) page.drawText(String(alumno.email), { x: sb.row6.mailX, y: sb.row6.y, size: 8, font: fontRegular, color: colorText });

    // 3. Estampado de materias
    const tbl = cfg.table;
    materias.forEach((m, idx) => {
      if (idx >= cfg.total_materias) return;
      const rowY = tbl.startY - (idx * tbl.stepY);
      const tipo = (m.tipo_cursada || m.condicion || '').toLowerCase();

      if (tipo.includes('recursa')) {
        page.drawText('X', { x: tbl.recursaX, y: rowY, size: 11, font: fontBold, color: colorMark });
      } else {
        page.drawText('X', { x: tbl.cursaX, y: rowY, size: 11, font: fontBold, color: colorMark });
      }

      if (m.nota_final) {
        page.drawText(String(m.nota_final), { x: tbl.notaNumX, y: rowY, size: 8.5, font: fontBold, color: colorText });
      }
      if (m.fecha_aprobacion) {
        page.drawText(String(m.fecha_aprobacion).split('T')[0], { x: tbl.fechaX, y: rowY, size: 7.2, font: fontRegular, color: colorText });
      }
    });

    const pdfSaved = await pdfDoc.save();
    return Buffer.from(pdfSaved);
  }

  /**
   * Genera la Planilla de Asistencia Editable en PDF para Preceptoría y Docentes
   * @param {number} idCarrera
   * @param {number} idMateria
   * @param {number} [cicloLectivo]
   * @returns {Promise<Buffer>}
   */
  static async generarPlanillaAsistencia(idCarrera, idMateria, cicloLectivo = null) {
    const carrera = await CarreraModel.findById(idCarrera);
    if (!carrera) throw new Error('Carrera no encontrada');

    const parametros = await ParametrosModel.getGenerales();
    const ciclo = cicloLectivo || parametros.ciclo_lectivo || new Date().getFullYear();

    const alumnos = await MatriculacionModel.getReporteInscripciones({
      idCarrera,
      cicloLectivo: ciclo
    });

    const alumnosMateria = alumnos.filter(a => Number(a.id_materia) === Number(idMateria));
    const nombreMateria = alumnosMateria[0] ? alumnosMateria[0].nombre_materia : `Materia #${idMateria}`;
    const anioCursada = alumnosMateria[0] ? alumnosMateria[0].anio_cursada : '';

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Encabezado
        doc.rect(30, 30, doc.page.width - 60, 45).fill('#0F172A');
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold')
           .text(`${parametros.nombre_instituto || 'ISFT 182'} — PLANILLA OFICIAL DE CONTROL DE ASISTENCIA`, 40, 38, { align: 'center' });
        doc.fontSize(9).font('Helvetica')
           .text(`Carrera: ${carrera.nombre_carrera} | Asignatura: ${nombreMateria} (${anioCursada}º Año) | Ciclo: ${ciclo}`, 40, 56, { align: 'center' });

        // Grilla de asistencia
        let tableTop = 85;
        doc.rect(30, tableTop, doc.page.width - 60, 22).fill('#E2E8F0');
        doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(8);

        doc.text('Nº', 35, tableTop + 6, { width: 25 });
        doc.text('LEGAJO', 65, tableTop + 6, { width: 60 });
        doc.text('APELLIDO Y NOMBRE', 130, tableTop + 6, { width: 170 });
        doc.text('CONDICIÓN', 305, tableTop + 6, { width: 65, align: 'center' });

        // 12 Columnas editables para fechas de asistencia
        let colX = 375;
        const colWidth = 32;
        for (let i = 1; i <= 12; i++) {
          doc.text(`F.${i}`, colX, tableTop + 6, { width: colWidth, align: 'center' });
          colX += colWidth;
        }

        tableTop += 24;
        doc.font('Helvetica').fontSize(8).fillColor('#1E293B');

        alumnosMateria.forEach((a, idx) => {
          const rowHeight = 18;
          const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
          doc.rect(30, tableTop - 2, doc.page.width - 60, rowHeight).fill(bg);
          doc.fillColor('#1E293B');

          doc.text(String(idx + 1), 35, tableTop + 4, { width: 25 });
          doc.text(a.legajo || '—', 65, tableTop + 4, { width: 60 });
          doc.text(`${a.apellidos}, ${a.nombres}`, 130, tableTop + 4, { width: 170 });
          doc.text(a.situacion_asistencia, 305, tableTop + 4, { width: 65, align: 'center' });

          // Dibujar líneas verticales para cuadrícula de asistencia
          let cellX = 375;
          for (let i = 1; i <= 12; i++) {
            doc.strokeColor('#CBD5E1').lineWidth(0.5).rect(cellX, tableTop - 2, colWidth, rowHeight).stroke();
            cellX += colWidth;
          }

          tableTop += rowHeight;

          // Si supera la página, agregar página
          if (tableTop > doc.page.height - 60) {
            doc.addPage();
            tableTop = 40;
          }
        });

        // Pie de página de preceptoría
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica-Oblique').fillColor('#64748B')
           .text('Planilla de asistencia para uso de Preceptoría y Cátedra. Permite registro físico o digital editable.', 35, doc.page.height - 35);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = PdfService;
