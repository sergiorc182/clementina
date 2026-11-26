// Constantes y Estado de la Aplicación (Unificado en puerto 3000 con BD clementina)
const API_BASE = 'http://localhost:3000/api';

const state = {
  selectedAlumnoId: null,
  selectedCarreraId: null,
  alumnos: [],
  todosAlumnos: [],
  currentData: null,
  currentConstancia: null,
  role: 'preceptor', // 'preceptor' | 'alumno'
  cookieIdAlumno: null,
  cookieNombreAlumno: ''
};

// Utilidades de Cookies compartidas con el resto del portal
function parsearCookies() {
  if (typeof document === 'undefined' || !document.cookie) return {};
  const resultado = {};
  document.cookie.split(';').forEach((par) => {
    const limpio = par.trim();
    if (!limpio) return;
    const idx = limpio.indexOf('=');
    if (idx === -1) return;
    const clave = limpio.substring(0, idx).trim();
    const valor = limpio.substring(idx + 1).trim();
    try {
      resultado[clave] = decodeURIComponent(valor);
    } catch {
      resultado[clave] = valor;
    }
  });
  return resultado;
}

function leerSesionDesdeCookies() {
  const cookies = parsearCookies();
  let datosJson = {};
  const jsonCandidate = cookies.usuario || cookies.sesion || cookies.user;
  if (jsonCandidate && (jsonCandidate.startsWith('{') || jsonCandidate.startsWith('%7B'))) {
    try {
      datosJson = JSON.parse(jsonCandidate);
    } catch {
      datosJson = {};
    }
  }

  const rawTipo = (
    cookies.tipo_usuario ||
    cookies.tipoUsuario ||
    cookies.rol ||
    cookies.role ||
    datosJson.tipo_usuario ||
    datosJson.rol ||
    'preceptor'
  )
    .toString()
    .trim()
    .toLowerCase();

  const tipoUsuario = rawTipo === 'alumno' || rawTipo === 'estudiante' ? 'alumno' : 'preceptor';
  const rawIdAlumno =
    cookies.id_alumno ||
    cookies.idAlumno ||
    cookies.alumno_id ||
    datosJson.id_alumno ||
    datosJson.id ||
    null;

  const nombreAlumno =
    cookies.nombre_alumno ||
    cookies.nombreAlumno ||
    datosJson.nombre_alumno ||
    datosJson.nombre ||
    '';

  return {
    tipoUsuario,
    esAlumno: tipoUsuario === 'alumno',
    idAlumno: rawIdAlumno ? Number(rawIdAlumno) : null,
    nombreAlumno
  };
}

function guardarUsuarioEnCookies({ tipoUsuario, idAlumno, nombreAlumno }) {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 7;

  if (tipoUsuario) {
    document.cookie = `tipo_usuario=${encodeURIComponent(tipoUsuario)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (idAlumno !== undefined && idAlumno !== null && idAlumno !== '') {
    document.cookie = `id_alumno=${encodeURIComponent(idAlumno)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
  if (nombreAlumno !== undefined && nombreAlumno !== null) {
    document.cookie = `nombre_alumno=${encodeURIComponent(nombreAlumno)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  try {
    const rolNorm = String(tipoUsuario || 'preceptor').toLowerCase() === 'alumno' ? 'alumno' : 'preceptor';
    const userObj =
      rolNorm === 'alumno'
        ? {
          rol: 'alumno',
          id_usuario: Number(idAlumno || 1),
          nombre: nombreAlumno || 'Alumno ISFT 182',
          id_alumno: Number(idAlumno || 1)
        }
        : {
          rol: 'preceptor',
          id_usuario: 1,
          nombre: 'Preceptoría ISFT 182'
        };
    sessionStorage.setItem('isft182_user', JSON.stringify(userObj));
  } catch (_) { }

  window.dispatchEvent(new Event('cookie-usuario-actualizada'));
}

// Elementos del DOM
const dom = {
  navUserBadgeSlot: document.getElementById('nav-user-badge-slot'),
  cookieSessionBarSlot: document.getElementById('cookie-session-bar-slot'),
  appMain: document.getElementById('app-main'),
  sidebarPanel: document.getElementById('sidebar-panel'),
  dbStatusDot: document.getElementById('db-status-dot'),
  dbStatusText: document.getElementById('db-status-text'),
  cicloLectivoVal: document.getElementById('ciclo-lectivo-val'),
  searchInput: document.getElementById('search-input'),
  studentList: document.getElementById('student-list'),
  studentCount: document.getElementById('student-count'),
  emptyState: document.getElementById('empty-state'),
  studentDataView: document.getElementById('student-data-view'),

  // Banner Alumno
  studentName: document.getElementById('student-name'),
  studentDni: document.getElementById('student-dni'),
  studentEmail: document.getElementById('student-email'),
  careerSelect: document.getElementById('career-select'),

  // Métricas
  metricPct: document.getElementById('metric-pct'),
  metricProgressFill: document.getElementById('metric-progress-fill'),
  metricAprobadas: document.getElementById('metric-aprobadas'),
  metricAprobadasSub: document.getElementById('metric-aprobadas-sub'),
  metricPendientes: document.getElementById('metric-pendientes'),
  metricPromedio: document.getElementById('metric-promedio'),

  // Pestañas
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  countBadgeAprobadas: document.getElementById('count-badge-aprobadas'),
  countBadgePendientes: document.getElementById('count-badge-pendientes'),

  // Tablas
  tableAprobadasBody: document.getElementById('table-aprobadas-body'),
  tablePendientesBody: document.getElementById('table-pendientes-body'),

  // Certificado
  preceptorSelect: document.getElementById('preceptor-select'),
  btnCopyCert: document.getElementById('btn-copy-cert'),
  btnPrintCert: document.getElementById('btn-print-cert'),
  certPreceptorSign: document.getElementById('cert-preceptor-sign'),
  certInstNombre: document.getElementById('cert-inst-nombre'),
  certConstanciaNro: document.getElementById('cert-constancia-nro'),
  certBodyTexto: document.getElementById('cert-body-texto'),
  certStatTotal: document.getElementById('cert-stat-total'),
  certStatAprobadas: document.getElementById('cert-stat-aprobadas'),
  certStatPorcentaje: document.getElementById('cert-stat-porcentaje'),

  // Modal Acreditar Asignatura
  modalAcreditar: document.getElementById('modal-acreditar'),
  modalMateriaId: document.getElementById('modal-materia-id'),
  modalMateriaNombre: document.getElementById('modal-materia-nombre'),
  modalNota: document.getElementById('modal-nota'),
  modalFecha: document.getElementById('modal-fecha'),
  modalTomo: document.getElementById('modal-tomo'),
  modalFolio: document.getElementById('modal-folio'),
  modalTipoExamen: document.getElementById('modal-tipo-examen'),
  modalEquivWrapper: document.getElementById('modal-equiv-wrapper'),
  modalEquivText: document.getElementById('modal-equiv-text'),
  btnModalClose: document.getElementById('btn-modal-close'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  btnModalSave: document.getElementById('btn-modal-save')
};

// Inicialización con guardia de autenticación real
document.addEventListener('DOMContentLoaded', async () => {
  if (window.ISFTAuth) {
    const authUser = await window.ISFTAuth.requireAuth('../index.html');
    if (!authUser) return;
    state.authUser = authUser;
  }
  sincronizarRolDesdeCookie(false);
  setupEventListeners();
  await checkHealth();
  await loadStudents();
  await loadPreceptores();

  window.addEventListener('cookie-usuario-actualizada', () => sincronizarRolDesdeCookie(true));
});

function sincronizarRolDesdeCookie(reaplicarSeleccion = true) {
  const sesion = leerSesionDesdeCookies();
  const cambio =
    sesion.tipoUsuario !== state.role ||
    sesion.idAlumno !== state.cookieIdAlumno ||
    sesion.nombreAlumno !== state.cookieNombreAlumno;

  state.role = sesion.tipoUsuario;
  state.cookieIdAlumno = sesion.idAlumno;
  state.cookieNombreAlumno = sesion.nombreAlumno;

  if (cambio || !reaplicarSeleccion) {
    aplicarVistaPorRol();
    if (reaplicarSeleccion && state.todosAlumnos.length > 0) {
      if (state.role === 'alumno') {
        const idTarget = state.cookieIdAlumno || state.todosAlumnos[0].id_alumno;
        if (Number(state.selectedAlumnoId) !== Number(idTarget)) {
          selectAlumno(idTarget);
        } else if (state.currentData) {
          renderTablas(state.currentData.materiasAprobadas, state.currentData.materiasPendientes);
        }
      } else if (state.currentData) {
        renderTablas(state.currentData.materiasAprobadas, state.currentData.materiasPendientes);
      }
    }
  }
}

function aplicarVistaPorRol() {
  const isAlumno = state.role === 'alumno';

  // Si es alumno, ocultar el panel lateral de búsqueda de otros alumnos
  if (dom.sidebarPanel && dom.appMain) {
    if (isAlumno) {
      dom.sidebarPanel.style.display = 'none';
      dom.appMain.style.gridTemplateColumns = '1fr';
    } else {
      dom.sidebarPanel.style.display = '';
      dom.appMain.style.gridTemplateColumns = '';
    }
  }

  renderNavbarUserBadge();
}

function renderNavbarUserBadge() {
  if (!dom.navUserBadgeSlot) return;
  const isAlumno = state.role === 'alumno';
  const auth = state.authUser || (window.ISFTAuth ? window.ISFTAuth.getUser() : null);
  let nombreMostrar = auth
    ? `${auth.firstName || ''} ${auth.lastName || ''}`.trim()
    : 'Preceptoría ISFT 182';
  let subtitulo = auth?.role || 'Personal de Gestión';
  let inicial = (auth?.firstName?.[0] || 'P').toUpperCase();

  if (isAlumno) {
    const alObj =
      state.todosAlumnos.find((a) => Number(a.id_alumno) === Number(state.cookieIdAlumno)) ||
      state.todosAlumnos[0];
    if (alObj) {
      nombreMostrar = alObj.nombre_completo;
      subtitulo = `Estudiante · DNI ${alObj.numero_documento || '—'}`;
      inicial = (alObj.nombre_completo || 'E').trim().charAt(0).toUpperCase();
    } else {
      nombreMostrar = state.cookieNombreAlumno || nombreMostrar || 'Estudiante';
      subtitulo = 'Estudiante Registrado';
      inicial = 'ES';
    }
  }

  dom.navUserBadgeSlot.innerHTML = `
    <div class="nav-user-actions">
      <div class="nav-user-badge" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.35rem 0.75rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px;">
        <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; flex-shrink: 0;">
          ${escapeHtml(inicial)}
        </div>
        <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
          <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap;">
            ${escapeHtml(nombreMostrar)}
          </span>
          <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;">
            ${escapeHtml(subtitulo)}
          </span>
        </div>
      </div>
      <button type="button" id="btnCertLogout" class="btn-nav-logout" title="Cerrar sesión institucional">
        Salir
      </button>
    </div>
  `;

  document.getElementById('btnCertLogout')?.addEventListener('click', () => {
    window.ISFTAuth?.logout('../index.html');
  });
}

// Configurar Eventos
function setupEventListeners() {
  let searchTimeout;
  dom.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      loadStudents(e.target.value);
    }, 250);
  });

  dom.careerSelect.addEventListener('change', (e) => {
    state.selectedCarreraId = e.target.value;
    loadAcademicOverview(state.selectedAlumnoId, state.selectedCarreraId);
  });

  if (dom.preceptorSelect) {
    dom.preceptorSelect.addEventListener('change', (e) => {
      const selectedText = e.target.options[e.target.selectedIndex]?.text || 'Preceptor/a';
      if (dom.certPreceptorSign) {
        dom.certPreceptorSign.innerHTML = `<strong>${escapeHtml(selectedText)}</strong><br><small style="color: var(--text-muted);">Preceptoría ISFT 182</small>`;
      }
    });
  }

  if (dom.btnCopyCert) {
    dom.btnCopyCert.addEventListener('click', async () => {
      if (!dom.certBodyTexto || !dom.certBodyTexto.textContent) return;
      try {
        await navigator.clipboard.writeText(dom.certBodyTexto.textContent);
        const originalText = dom.btnCopyCert.innerHTML;
        dom.btnCopyCert.innerHTML = '✓ ¡Copiado!';
        dom.btnCopyCert.style.borderColor = '#10b981';
        dom.btnCopyCert.style.color = '#10b981';
        window.ISFTNotify?.('Texto formal del certificado copiado al portapapeles.', 'success');
        setTimeout(() => {
          dom.btnCopyCert.innerHTML = originalText;
          dom.btnCopyCert.style.borderColor = '';
          dom.btnCopyCert.style.color = '';
        }, 2000);
      } catch (err) {
        console.error('Error al copiar texto:', err);
        window.ISFTNotify?.('No se pudo copiar el texto del certificado.', 'error');
      }
    });
  }

    dom.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        dom.tabBtns.forEach((b) => b.classList.remove('active'));
        dom.tabContents.forEach((c) => c.classList.remove('active'));
        btn.classList.add('active');
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.classList.add('active');
      });
    });

    dom.btnPrintCert.addEventListener('click', () => {
      window.print();
    });

    if (dom.modalTipoExamen) {
      dom.modalTipoExamen.addEventListener('change', (e) => {
        if (e.target.value === 'Equivalencia') {
          dom.modalEquivWrapper.style.display = 'block';
          dom.modalEquivText.focus();
        } else {
          dom.modalEquivWrapper.style.display = 'none';
        }
      });
    }

    if (dom.btnModalClose) {
      dom.btnModalClose.addEventListener('click', cerrarModal);
    }
    if (dom.btnModalCancel) {
      dom.btnModalCancel.addEventListener('click', cerrarModal);
    }
    if (dom.modalAcreditar) {
      dom.modalAcreditar.addEventListener('click', (e) => {
        if (e.target === dom.modalAcreditar) cerrarModal();
      });
    }

    if (dom.btnModalSave) {
      dom.btnModalSave.addEventListener('click', guardarNuevaAcreditacion);
    }
  }

// Cargar lista de preceptores institucionales
async function loadPreceptores() {
      if (!dom.preceptorSelect) return;
      let preceptores = [
        { id_personal: 1, nombre_completo: 'Marta González', rol: 'Preceptor/a' },
        { id_personal: 2, nombre_completo: 'Roberto Silva', rol: 'Preceptor/a' }
      ];

      try {
        const res = await fetch(`${API_BASE}/personal/preceptores`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            preceptores = data;
          }
        }
      } catch (_) { }

      dom.preceptorSelect.innerHTML = '';
      preceptores.forEach((p) => {
        const option = document.createElement('option');
        option.value = p.id_personal;
        option.textContent = `${p.nombre_completo} (${p.rol})`;
        dom.preceptorSelect.appendChild(option);
      });

      if (preceptores.length > 0 && dom.certPreceptorSign) {
        dom.certPreceptorSign.innerHTML = `<strong>${escapeHtml(preceptores[0].nombre_completo)}</strong><br><small style="color: var(--text-muted);">Preceptoría ISFT 182</small>`;
      }
    }

  // Comprobación silenciosa de salud del servidor (sin badge técnico de BD en pantalla)
  async function checkHealth() {
    if (!dom.dbStatusDot || !dom.dbStatusText) return;
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return;
    } catch (_) {}
  }

// Cargar Alumnos desde clementina (compatible con /api/marta/alumnos y /api/alumnos)
async function loadStudents(query = '') {
      try {
        let lista = [];
        const resMarta = await fetch(`${API_BASE}/marta/alumnos?q=${encodeURIComponent(query)}`);
        if (resMarta.ok) {
          const dataMarta = await resMarta.json();
          lista = dataMarta.alumnos || [];
        } else {
          const resMain = await fetch(`${API_BASE}/alumnos`);
          const dataMain = await resMain.json();
          const raw = dataMain.data || dataMain.alumnos || [];
          const term = query.trim().toLowerCase();
          lista = raw
            .map((a) => ({
              ...a,
              id_alumno: a.id_alumno || a.id,
              nombre_completo:
                a.nombre_completo ||
                `${a.apellido || a.primer_apellido || ''}, ${a.nombre || a.primer_nombre || ''}`.trim()
            }))
            .filter((a) => {
              if (!term) return true;
              return (
                a.nombre_completo.toLowerCase().includes(term) ||
                String(a.numero_documento || '').includes(term)
              );
            });
        }

        state.alumnos = lista;
        if (!query) {
          state.todosAlumnos = lista;
        }

        renderStudentList(state.alumnos);
        aplicarVistaPorRol();

          if (state.alumnos.length > 0) {
            if (state.role === 'alumno') {
              const idTarget = state.cookieIdAlumno || state.alumnos[0].id_alumno;
              const existe = state.alumnos.find((a) => Number(a.id_alumno) === Number(idTarget));
              await selectAlumno(existe ? existe.id_alumno : state.alumnos[0].id_alumno);
            } else if (!state.selectedAlumnoId) {
              await selectAlumno(state.alumnos[0].id_alumno);
            }
          }
        } catch (error) {
          console.error('Error al cargar alumnos:', error);
        }
      }

// Renderizar lista lateral de alumnos
function renderStudentList(alumnos) {
        dom.studentList.innerHTML = '';

        if (dom.studentCount) {
          dom.studentCount.textContent = `${alumnos.length} ${alumnos.length === 1 ? 'alumno' : 'alumnos'}`;
        }

        if (alumnos.length === 0) {
          dom.studentList.innerHTML =
            '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 1rem 0.5rem; text-align: center;">No se encontraron alumnos coincidentes.</div>';
          return;
        }

          alumnos.forEach((a) => {
            const card = document.createElement('div');
            card.className = `student-card ${Number(state.selectedAlumnoId) === Number(a.id_alumno) ? 'active' : ''}`;
            card.id = `student-item-${a.id_alumno}`;

            card.innerHTML = `
      <div class="student-name">${escapeHtml(a.nombre_completo)}</div>
      <div class="student-meta">
        <span>DNI: ${a.numero_documento}</span>
      </div>
    `;

            card.addEventListener('click', () => {
              if (state.role === 'alumno') return;
              selectAlumno(a.id_alumno);
            });

            dom.studentList.appendChild(card);
          });
        }

// Seleccionar un alumno
async function selectAlumno(idAlumno) {
            state.selectedAlumnoId = idAlumno;

              document.querySelectorAll('.student-card').forEach((el) => {
                el.classList.remove('active');
              });
              const currentCard = document.getElementById(`student-item-${idAlumno}`);
              if (currentCard) currentCard.classList.add('active');

              renderNavbarUserBadge();

              try {
                let alumno = null;
                let carreras = [];

                const resMarta = await fetch(`${API_BASE}/marta/alumnos/${idAlumno}`);
                if (resMarta.ok) {
                  const data = await resMarta.json();
                  alumno = data.alumno;
                  carreras = data.carreras || [];
                } else {
                  const resMain = await fetch(`${API_BASE}/alumnos/${idAlumno}`);
                  const dataMain = await resMain.json();
                  const rawAl = dataMain.data || dataMain.alumno;
                  if (rawAl) {
                    alumno = {
                      ...rawAl,
                      id_alumno: rawAl.id_alumno || rawAl.id,
                      id_tipo_documento: rawAl.id_tipo_documento || 'DNI',
                      nombre_completo:
                        rawAl.nombre_completo ||
                        `${rawAl.apellido || rawAl.primer_apellido || ''}, ${rawAl.nombre || rawAl.primer_nombre || ''}`.trim()
                    };
                    carreras = [
                      {
                        id_carrera: rawAl.id_carrera || 1,
                        nombre_carrera: rawAl.carrera || 'Tecnicatura Superior',
                        nro_resolucion: rawAl.nro_resolucion || 'RES-182'
                      }
                    ];
                  }
                }

                if (!alumno) return;

                dom.studentName.textContent = alumno.nombre_completo;
                dom.studentDni.textContent = `${alumno.id_tipo_documento || 'DNI'} ${alumno.numero_documento}`;
                dom.studentEmail.textContent = alumno.email || '-';

                dom.careerSelect.innerHTML = '';
                if (carreras && carreras.length > 0) {
                    carreras.forEach((c) => {
                      const option = document.createElement('option');
                      option.value = c.id_carrera;
                      option.textContent = `${c.nombre_carrera} (${c.nro_resolucion || 'Oficial'})`;
                      dom.careerSelect.appendChild(option);
                    });
                    state.selectedCarreraId = carreras[0].id_carrera;
                    await loadAcademicOverview(idAlumno, state.selectedCarreraId, alumno, carreras[0]);
                  } else {
                    dom.careerSelect.innerHTML = '<option value="">Sin carreras matriculadas</option>';
                    clearMetrics();
                  }
  } catch (error) {
                  console.error('Error al cargar datos del alumno:', error);
                }
              }

// Cargar cálculo de avance académico y certificados
                async function loadAcademicOverview(alumnoId, carreraId, alumnoFallback = null, carreraFallback = null) {
                  if (!alumnoId || !carreraId) return;

                  try {
                    let dataPorc = null;
                    let dataConst = null;

                    const [resPorc, resConst] = await Promise.all([
                      fetch(`${API_BASE}/certificados/porcentaje/${alumnoId}/${carreraId}`),
                      fetch(`${API_BASE}/certificados/constancia/${alumnoId}/${carreraId}`)
                    ]);

                    if (resPorc.ok && resConst.ok) {
                      dataPorc = await resPorc.json();
                      dataConst = await resConst.json();
                    } else {
                      // Fallback automático consultando /api/finales/materias/:carreraId y /api/finales/alumno/:alumnoId
                      // en caso de que el backend en el puerto 3000 aún no se haya reiniciado
                      const [resMat, resRend] = await Promise.all([
                        fetch(`${API_BASE}/finales/materias/${carreraId}`),
                        fetch(`${API_BASE}/finales/alumno/${alumnoId}`)
                      ]);
                      const jsonMat = await resMat.json();
                      const jsonRend = await resRend.json();
                      const planMaterias = jsonMat.data || [];
                      const rendiciones = jsonRend.data || [];

                      const aprobadasMap = new Map();
                      rendiciones.forEach((r) => {
                        if (r.estado === 'APROBADO' || (r.nota !== null && Number(r.nota) >= 4)) {
                          if (!aprobadasMap.has(r.id_materia)) {
                            aprobadasMap.set(r.id_materia, r);
                          }
                        }
                      });

                      const materiasAprobadas = [];
                      const materiasPendientes = [];

                      planMaterias.forEach((pm) => {
                        const rendAp = aprobadasMap.get(pm.id_materia);
                        if (rendAp) {
                          materiasAprobadas.push({
                            idMateria: pm.id_materia,
                            codigoEspacio: `MAT-${String(pm.id_materia).padStart(2, '0')}`,
                            anioCursada: pm.anio_cursada,
                            nombreMateria: pm.nombre_materia,
                            nota: rendAp.nota || 4,
                            fechaAprobacion: rendAp.fecha_examen || rendAp.fecha_registro,
                            tomoActa: 1,
                            folioActa: rendAp.id_rendicion || 1,
                            tipoExamen: rendAp.modalidad === 'LIBRE' ? 'Libre' : 'Regular',
                            equivalenciaTexto: ''
                          });
                        } else {
                          materiasPendientes.push({
                            idMateria: pm.id_materia,
                            codigoEspacio: `MAT-${String(pm.id_materia).padStart(2, '0')}`,
                            anioCursada: pm.anio_cursada,
                            nombreMateria: pm.nombre_materia
                          });
                        }
                      });

                      const totalPlan = planMaterias.length || 1;
                      const cantAp = materiasAprobadas.length;
                      const cantPend = materiasPendientes.length;
                      const porc = Number(((cantAp / totalPlan) * 100).toFixed(2));
                      const sumaNotas = materiasAprobadas.reduce((acc, m) => acc + Number(m.nota || 0), 0);
                      const prom = cantAp > 0 ? Number((sumaNotas / cantAp).toFixed(2)) : 0;

                      const nombreAl = alumnoFallback?.nombre_completo || dom.studentName.textContent || 'Estudiante';
                      const dniAl = alumnoFallback?.numero_documento || dom.studentDni.textContent || '-';
                      const nomCarrera = carreraFallback?.nombre_carrera || 'Carrera Técnica Superior';
                      const fechaHoy = new Date().toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      });

                      dataPorc = {
                        instituto: {
                          nombre: 'Instituto Superior de Formación Técnica N° 182',
                          cicloLectivo: new Date().getFullYear()
                        },
                        estadisticas: {
                          totalMateriasPlan: planMaterias.length,
                          cantidadAprobadas: cantAp,
                          cantidadPendientes: cantPend,
                          porcentajeAprobadas: porc,
                          porcentajeTexto: `${porc}%`,
                          promedioCalificaciones: prom
                        },
                        materiasAprobadas,
                        materiasPendientes
                      };

                      dataConst = {
                        instituto: 'Instituto Superior de Formación Técnica N° 182',
                        nroConstancia: `CERT-PORC-${new Date().getFullYear()}-${String(alumnoId).padStart(4, '0')}-${String(carreraId).padStart(2, '0')}`,
                        totalMaterias: planMaterias.length,
                        materiasAprobadas: cantAp,
                        porcentaje: porc,
                        textoCertificado: `El Instituto Superior de Formación Técnica N° 182 certifica que el/la estudiante ${nombreAl}, titular del documento ${dniAl}, se encuentra inscripto/a en la carrera "${nomCarrera}". Habiendo registrado su situación académica al día de la fecha, consta que ha aprobado un total de ${cantAp} espacios curriculares sobre un total de ${planMaterias.length} asignaturas que componen el plan de estudios correspondiente, lo que representa un ${porc}% de la carrera aprobada. Se expide el presente certificado a los ${fechaHoy}.`
                      };
                    }

                    state.currentData = dataPorc;
                    state.currentConstancia = dataConst;

                    if (dataPorc.instituto && dataPorc.instituto.cicloLectivo) {
                      dom.cicloLectivoVal.textContent = dataPorc.instituto.cicloLectivo;
                    }

                    const stats = dataPorc.estadisticas;
                    dom.metricPct.textContent = stats.porcentajeTexto;
                    dom.metricProgressFill.style.width = `${Math.min(stats.porcentajeAprobadas, 100)}%`;
                    dom.metricAprobadas.textContent = stats.cantidadAprobadas;
                    dom.metricAprobadasSub.textContent = `de ${stats.totalMateriasPlan} totales`;
                    dom.metricPendientes.textContent = stats.cantidadPendientes;
                    dom.metricPromedio.textContent =
                      stats.promedioCalificaciones > 0 ? stats.promedioCalificaciones.toFixed(2) : '-';

                    dom.countBadgeAprobadas.textContent = stats.cantidadAprobadas;
                    dom.countBadgePendientes.textContent = stats.cantidadPendientes;

                    renderTablas(dataPorc.materiasAprobadas, dataPorc.materiasPendientes);
                    renderCertificado(dataConst);
                  } catch (error) {
                    console.error('Error al cargar avance académico:', error);
                  }
                }

                function getAnioLabel(anio) {
                  const n = parseInt(anio, 10);
                  if (n === 1) return '1ER AÑO';
                  if (n === 2) return '2DO AÑO';
                  if (n === 3) return '3ER AÑO';
                  return `${anio}° AÑO`;
                }

                // Renderizar tablas de materias (respetando rol: Estudiante en modo lectura vs Preceptor editable)
                function renderTablas(aprobadas = [], pendientes = []) {
                  const isAlumno = state.role === 'alumno';

                  dom.tableAprobadasBody.innerHTML = '';
                  if (aprobadas.length === 0) {
                    dom.tableAprobadasBody.innerHTML =
                      '<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 2rem;">No posee materias acreditadas registradas.</td></tr>';
                  } else {
                    const sortedAprobadas = [...aprobadas].sort(
                      (a, b) => (a.anioCursada || 0) - (b.anioCursada || 0) || (a.ordenPlan || 0) - (b.ordenPlan || 0)
                    );

                    let currentAnio = null;
                      sortedAprobadas.forEach((m) => {
                        if (m.anioCursada && m.anioCursada !== currentAnio) {
                          currentAnio = m.anioCursada;
                          const yearRow = document.createElement('tr');
                          yearRow.innerHTML = `<td colspan="7" class="year-group">${getAnioLabel(currentAnio)}</td>`;
                          dom.tableAprobadasBody.appendChild(yearRow);
                        }

                        const fecha = m.fechaAprobacion ? new Date(m.fechaAprobacion).toLocaleDateString('es-AR') : '-';
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; color: var(--primary);">${m.anioCursada}</td>
        <td style="text-align: center; font-family: monospace; font-weight: 600;">${escapeHtml(m.codigoEspacio || '—')}</td>
        <td><strong>${escapeHtml(m.nombreMateria)}</strong></td>
        <td style="text-align: center;"><span class="badge-nota">${m.nota}</span></td>
        <td style="text-align: center; font-size: 0.85rem;">${fecha}</td>
        <td style="text-align: center;"><span class="badge-acta">Libro ${m.tomoActa || 0} / Folio ${m.folioActa || 0}</span></td>
        <td>
          <div class="examen-control-group">
            <select class="select-tipo-examen" data-materia-id="${m.idMateria}" ${isAlumno ? 'disabled' : ''}>
              <option value="Regular" ${m.tipoExamen === 'Regular' ? 'selected' : ''}>Regular</option>
              <option value="Libre" ${m.tipoExamen === 'Libre' ? 'selected' : ''}>Libre</option>
              <option value="Promoción" ${m.tipoExamen === 'Promoción' ? 'selected' : ''}>Promoción</option>
              <option value="Equivalencia" ${m.tipoExamen === 'Equivalencia' ? 'selected' : ''}>Equivalencia</option>
            </select>
            <div id="wrapper-equiv-${m.idMateria}" style="display: ${m.tipoExamen === 'Equivalencia' ? 'block' : 'none'};">
              <input 
                type="text" 
                class="input-equivalencia" 
                id="input-equiv-${m.idMateria}"
                data-materia-id="${m.idMateria}" 
                placeholder="Resolución / Instituto de origen..."
                value="${escapeHtml(m.equivalenciaTexto || '')}"
                ${isAlumno ? 'disabled readonly' : ''}
              />
            </div>
            <span class="save-status-indicator" id="save-status-${m.idMateria}" style="opacity: 0;">✓ Guardado</span>
          </div>
        </td>
      `;
                        dom.tableAprobadasBody.appendChild(tr);

                        if (!isAlumno) {
                          const selectEl = tr.querySelector('.select-tipo-examen');
                          const inputEquiv = tr.querySelector('.input-equivalencia');
                          const wrapperEquiv = tr.querySelector(`#wrapper-equiv-${m.idMateria}`);
                          const statusIndicator = tr.querySelector(`#save-status-${m.idMateria}`);

                          selectEl.addEventListener('change', async () => {
                            const nuevoTipo = selectEl.value;
                            if (nuevoTipo === 'Equivalencia') {
                              wrapperEquiv.style.display = 'block';
                              inputEquiv.focus();
                            } else {
                              wrapperEquiv.style.display = 'none';
                            }
                            await guardarCambioExamen(m.idMateria, nuevoTipo, inputEquiv.value, statusIndicator);
                          });

                              let equivTimeout;
                              inputEquiv.addEventListener('input', () => {
                                clearTimeout(equivTimeout);
                                equivTimeout = setTimeout(async () => {
                                  await guardarCambioExamen(m.idMateria, selectEl.value, inputEquiv.value, statusIndicator);
                                }, 500);
                              });

                              inputEquiv.addEventListener('blur', async () => {
                                clearTimeout(equivTimeout);
                                await guardarCambioExamen(m.idMateria, selectEl.value, inputEquiv.value, statusIndicator);
                          });
                        }
                      });
                    }

  // Pendientes
  dom.tablePendientesBody.innerHTML = '';
                    if (pendientes.length === 0) {
                      dom.tablePendientesBody.innerHTML =
                        '<tr><td colspan="5" style="text-align:center; color: var(--success); padding: 2rem; font-weight: 600;">¡Plan de estudios 100% completado! No registra asignaturas pendientes.</td></tr>';
                    } else {
                      const sortedPendientes = [...pendientes].sort(
                        (a, b) => (a.anioCursada || 0) - (b.anioCursada || 0) || (a.ordenPlan || 0) - (b.ordenPlan || 0)
                      );

                      let currentAnioPend = null;
                        sortedPendientes.forEach((m) => {
                          if (m.anioCursada && m.anioCursada !== currentAnioPend) {
                            currentAnioPend = m.anioCursada;
                            const yearRow = document.createElement('tr');
                            yearRow.innerHTML = `<td colspan="5" class="year-group">${getAnioLabel(currentAnioPend)}</td>`;
                            dom.tablePendientesBody.appendChild(yearRow);
                          }

                          const tr = document.createElement('tr');
                          tr.innerHTML = `
        <td style="text-align: center; font-weight: 700; color: var(--primary);">${m.anioCursada}°</td>
        <td style="text-align: center; font-family: monospace; font-weight: 600;">${escapeHtml(m.codigoEspacio || '—')}</td>
        <td><strong>${escapeHtml(m.nombreMateria)}</strong></td>
        <td style="text-align: center;"><span class="badge-pendiente">Pendiente</span></td>
        <td style="text-align: center;">
          ${isAlumno
                              ? '<span style="font-size: 0.78rem; color: var(--text-muted);">En curso / A rendir</span>'
                              : `<button class="btn-acreditar" data-materia-id="${m.idMateria}" data-materia-nombre="${escapeHtml(m.nombreMateria)}">+ Acreditar</button>`
                            }
        </td>
      `;
                          dom.tablePendientesBody.appendChild(tr);

                          if (!isAlumno) {
                            const btnAcred = tr.querySelector('.btn-acreditar');
                            if (btnAcred) {
                              btnAcred.addEventListener('click', () => {
                                abrirModalAcreditar(m.idMateria, m.nombreMateria);
                              });
                            }
                          }
                        });
                      }
}

                    async function guardarCambioExamen(materiaId, tipoExamen, equivalenciaTexto, statusIndicator) {
                      if (state.role === 'alumno' || !state.selectedAlumnoId || !state.selectedCarreraId) return;

                      try {
                        const res = await fetch(
                          `${API_BASE}/certificados/historial/${state.selectedAlumnoId}/${state.selectedCarreraId}/${materiaId}`,
                          {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              tipoExamen,
                              equivalenciaTexto: tipoExamen === 'Equivalencia' ? equivalenciaTexto : ''
                            })
                          }
                        );

                        if (res.ok) {
                          if (statusIndicator) {
                            statusIndicator.style.opacity = '1';
                            setTimeout(() => {
                              statusIndicator.style.opacity = '0';
                            }, 1800);
                          }
                          window.ISFTNotify?.('Tipo de examen actualizado correctamente.', 'success');
                          const resConst = await fetch(
                            `${API_BASE}/certificados/constancia/${state.selectedAlumnoId}/${state.selectedCarreraId}`
                          );
                          if (resConst.ok) {
                            const dataConst = await resConst.json();
                            renderCertificado(dataConst);
                          }
                        } else {
                          window.ISFTNotify?.('No se pudo actualizar el tipo de examen.', 'error');
                        }
                      } catch (err) {
                        console.error('Error al guardar cambio de examen:', err);
                        window.ISFTNotify?.('Error de conexión al actualizar el tipo de examen.', 'error');
                      }
                    }

                    function abrirModalAcreditar(materiaId, materiaNombre) {
                      if (state.role === 'alumno') return;
                      dom.modalMateriaId.value = materiaId;
                      dom.modalMateriaNombre.textContent = materiaNombre;
                      dom.modalNota.value = '8';
                      dom.modalFecha.value = new Date().toISOString().slice(0, 10);
                      dom.modalTomo.value = '46';
                      dom.modalFolio.value = '15';
                      dom.modalTipoExamen.value = 'Regular';
                      dom.modalEquivWrapper.style.display = 'none';
                      dom.modalEquivText.value = '';

                      dom.modalAcreditar.style.display = 'flex';
                    }

                    function cerrarModal() {
                      dom.modalAcreditar.style.display = 'none';
                    }

                    async function guardarNuevaAcreditacion() {
                      if (state.role === 'alumno') return;
                      const idMateria = dom.modalMateriaId.value;
                      const nota = dom.modalNota.value;
                      const fechaAprobacion = dom.modalFecha.value;
                      const tomoActa = dom.modalTomo.value;
                      const folioActa = dom.modalFolio.value;
                      const tipoExamen = dom.modalTipoExamen.value;
                      const equivalenciaTexto = dom.modalEquivText.value;

                      if (!state.selectedAlumnoId || !state.selectedCarreraId || !idMateria) return;

                      try {
                        const res = await fetch(`${API_BASE}/certificados/historial`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            idAlumno: state.selectedAlumnoId,
                            idCarrera: state.selectedCarreraId,
                            idMateria,
                            nota,
                            fechaAprobacion,
                            tomoActa,
                            folioActa,
                            tipoExamen,
                            equivalenciaTexto
                          })
                        });

                        if (res.ok) {
                          cerrarModal();
                          window.ISFTNotify?.('Acreditación registrada con éxito.', 'success');
                          await loadAcademicOverview(state.selectedAlumnoId, state.selectedCarreraId);
                        } else {
                          const errData = await res.json();
                          window.ISFTNotify?.(errData.error || 'No se pudo guardar la acreditación.', 'error');
                        }
                      } catch (err) {
                        console.error('Error al acreditar materia:', err);
                        window.ISFTNotify?.('Error al conectar con el servidor.', 'error');
                      }
                    }

                    function renderCertificado(constancia) {
                      if (!constancia) return;

                      dom.certInstNombre.textContent =
                        constancia.instituto || 'Instituto Superior de Formación Técnica N° 182';
                      dom.certConstanciaNro.textContent = `Nro. Expediente / Registro: ${constancia.nroConstancia}`;
                      dom.certBodyTexto.textContent = constancia.textoCertificado;

                      dom.certStatTotal.textContent = constancia.totalMaterias;
                      dom.certStatAprobadas.textContent = constancia.materiasAprobadas;
                      dom.certStatPorcentaje.textContent = `${constancia.porcentaje}%`;
                    }

                    function clearMetrics() {
                      dom.metricPct.textContent = '0%';
                      dom.metricProgressFill.style.width = '0%';
                      dom.metricAprobadas.textContent = '0';
                      dom.metricAprobadasSub.textContent = 'de 0 totales';
                      dom.metricPendientes.textContent = '0';
                      dom.metricPromedio.textContent = '0.00';
                      dom.tableAprobadasBody.innerHTML = '';
                      dom.tablePendientesBody.innerHTML = '';
                      dom.certBodyTexto.textContent = 'No hay información académica disponible para emitir el certificado.';
                    }

                    function escapeHtml(str) {
                      if (!str) return '';
                      return String(str)
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                    }
