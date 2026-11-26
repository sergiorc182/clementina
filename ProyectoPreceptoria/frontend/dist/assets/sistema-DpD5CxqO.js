/* empty css              */(function(){const A=document.createElement("link").relList;if(A&&A.supports&&A.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))d(i);new MutationObserver(i=>{for(const o of i)if(o.type==="childList")for(const h of o.addedNodes)h.tagName==="LINK"&&h.rel==="modulepreload"&&d(h)}).observe(document,{childList:!0,subtree:!0});function a(i){const o={};return i.integrity&&(o.integrity=i.integrity),i.referrerPolicy&&(o.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?o.credentials="include":i.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function d(i){if(i.ep)return;i.ep=!0;const o=a(i);fetch(i.href,o)}})();const oa="http://localhost:3000/api/alumnos/catalogo/carreras",ra=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function ia(e,A={}){let a={alumnoSeleccionado:null,onGuardar:()=>{},onCancelar:()=>{},...A},d=[],i;e.innerHTML=`
    <div class="card">
      <div class="card-header">
        <h3 id="formAlumnoTitulo">Registrar Alumno</h3>
      </div>
      <form id="formAlumnoElement" class="form-grid">
        <div class="form-group">
          <label for="nombre">Nombre(s):</label>
          <input
            id="nombre"
            type="text"
            name="nombre"
            placeholder="Ej: Juan Carlos"
            required
          />
        </div>

        <div class="form-group">
          <label for="apellido">Apellido(s):</label>
          <input
            id="apellido"
            type="text"
            name="apellido"
            placeholder="Ej: Pérez"
            required
          />
        </div>

        <div class="form-group">
          <label for="numero_documento">DNI (N° Documento):</label>
          <input
            id="numero_documento"
            type="number"
            name="numero_documento"
            placeholder="Ej: 40123456"
          />
        </div>

        <div class="form-group">
          <label for="email">Email institucional/personal:</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Ej: juan.perez@isft182.edu.ar"
            required
          />
        </div>

        <div class="form-group">
          <label for="carrera">Carrera:</label>
          <select id="carrera" name="carrera" required>
            <option value="">-- Seleccione una carrera --</option>
          </select>
        </div>

        <div id="crearUsuarioGroup" class="form-group full-width" style="background: #f8fafc; border: 1px solid var(--border); border-radius: 8px; padding: 0.7rem 0.9rem;">
          <label style="display: flex; align-items: center; gap: 0.55rem; cursor: pointer; text-transform: none; letter-spacing: 0; font-size: 0.88rem; margin: 0;">
            <input id="crear_usuario" type="checkbox" name="crear_usuario" checked style="width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer;" />
            <span>Crear cuenta de acceso al portal (rol Alumno)</span>
          </label>
          <small class="help-text" style="margin-top: 0.3rem;">
            El estudiante podrá ingresar con su email y su DNI como contraseña inicial.
          </small>
        </div>

        <div class="form-actions">
          <button type="submit" id="btnSubmitAlumno" class="btn btn-primary">
            Registrar Alumno
          </button>
          <button type="button" id="btnCancelarAlumno" class="btn btn-secondary" style="display: none;">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  `;const o=e.querySelector("#formAlumnoTitulo"),h=e.querySelector("#formAlumnoElement"),$=e.querySelector("#nombre"),C=e.querySelector("#apellido"),u=e.querySelector("#numero_documento"),N=e.querySelector("#email"),b=e.querySelector("#carrera"),k=e.querySelector("#crearUsuarioGroup"),P=e.querySelector("#crear_usuario"),g=e.querySelector("#btnSubmitAlumno"),L=e.querySelector("#btnCancelarAlumno"),q=()=>{const _=b.value;let x='<option value="">-- Seleccione una carrera --</option>';d.forEach(M=>{const G=ra(M.nombre_carrera);x+=`<option value="${G}">${G}</option>`}),b.innerHTML=x,_&&(b.value=_)};fetch(oa).then(_=>_.json()).then(_=>{if(_.success&&_.data.length>0)d=_.data;else throw new Error("Fallback")}).catch(()=>{d=[{id_carrera:1,nombre_carrera:"Tecnicatura Superior en Análisis de Sistemas"},{id_carrera:2,nombre_carrera:"Tecnicatura Superior en Desarrollo de Software"},{id_carrera:3,nombre_carrera:"Tecnicatura Superior en Enfermería"},{id_carrera:4,nombre_carrera:"Tecnicatura Superior en Administración"}]}).finally(()=>{q(),a.alumnoSeleccionado&&(b.value=a.alumnoSeleccionado.carrera||"")}),h.addEventListener("submit",_=>{_.preventDefault();const x=!a.alumnoSeleccionado&&!!(P!=null&&P.checked),M={nombre:$.value,apellido:C.value,numero_documento:u.value,email:N.value,carrera:b.value,crear_usuario:x};if(!M.nombre.trim()||!M.apellido.trim()||!M.email.trim()){window.ISFTNotify&&window.ISFTNotify("Por favor complete todos los campos obligatorios.","error");return}if(x&&String(M.numero_documento||"").trim().length<6){window.ISFTNotify&&window.ISFTNotify("Ingrese el DNI (al menos 6 dígitos) para usarlo como contraseña inicial de la cuenta.","error"),u.focus();return}a.onGuardar(M),a.alumnoSeleccionado||($.value="",C.value="",u.value="",N.value="",b.value="",P&&(P.checked=!0))}),L.addEventListener("click",()=>{a.onCancelar()});const f=(_={})=>{a={...a,..._};const x=a.alumnoSeleccionado,M=x?x.id||x.id_alumno:null;o.textContent=x?"Modificar Alumno":"Registrar Alumno",g.textContent=x?"Guardar Cambios":"Registrar Alumno",L.style.display=x?"":"none",k&&(k.style.display=x?"none":""),M!==i&&(i=M,x?($.value=x.nombre||x.primer_nombre||"",C.value=x.apellido||x.primer_apellido||"",N.value=x.email||"",u.value=x.numero_documento||"",b.value=x.carrera||""):($.value="",C.value="",N.value="",u.value="",b.value=""))};return f(a),{update:f}}const ve=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function na(e,A={}){let a={alumnos:[],onEditar:()=>{},onEliminar:()=>{},cargando:!1,...A};const d=()=>{if(a.cargando){e.innerHTML=`
        <div class="card">
          <p class="loading-text">Cargando listado de alumnos...</p>
        </div>
      `;return}const o=a.alumnos||[];if(o.length===0){e.innerHTML=`
        <div class="card">
          <div class="card-header">
            <h3>Alumnos Registrados (0)</h3>
          </div>
          <p class="empty-text">No hay alumnos registrados aún.</p>
        </div>
      `;return}let h="";o.forEach(($,C)=>{const u=$.id||$.id_alumno,N=$.numero_documento?`<span class="badge-doc">${ve($.id_tipo_documento||"DNI")} ${ve($.numero_documento)}</span>`:'<span class="text-muted">-</span>';h+=`
        <tr>
          <td>
            <span class="badge-id">#${ve(u)}</span>
          </td>
          <td>${N}</td>
          <td>
            <strong>${ve($.apellido)}</strong>, ${ve($.nombre)}
          </td>
          <td>${ve($.email)}</td>
          <td>
            <span class="badge-carrera">${ve($.carrera)}</span>
          </td>
          <td class="actions-cell">
            <button
              type="button"
              data-action="editar"
              data-idx="${C}"
              class="btn btn-warning btn-sm"
              title="Editar alumno"
            >
              Editar
            </button>
            <button
              type="button"
              data-action="eliminar"
              data-id="${ve(u)}"
              class="btn btn-danger btn-sm"
              title="Eliminar alumno"
            >
              Eliminar
            </button>
          </td>
        </tr>
      `}),e.innerHTML=`
      <div class="card">
        <div class="card-header">
          <h3>Alumnos Registrados (${o.length})</h3>
        </div>
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>DNI / Doc</th>
                <th>Nombre Completo</th>
                <th>Email</th>
                <th>Carrera Matriculada</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${h}
            </tbody>
          </table>
        </div>
      </div>
    `,e.querySelectorAll('button[data-action="editar"]').forEach($=>{$.addEventListener("click",()=>{const C=Number($.getAttribute("data-idx"));o[C]&&a.onEditar(o[C])})}),e.querySelectorAll('button[data-action="eliminar"]').forEach($=>{$.addEventListener("click",()=>{const C=Number($.getAttribute("data-id"));a.onEliminar(C)})})},i=(o={})=>{a={...a,...o},d()};return d(),{update:i}}const he=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function sa(e,A={}){let a={alumnos:[],onEditar:()=>{},...A},d="",i="";const o=()=>{const C=new Set;return(a.alumnos||[]).forEach(u=>{u.carrera&&C.add(u.carrera)}),Array.from(C).sort()},h=()=>{const C=d.trim().toLowerCase();return(a.alumnos||[]).filter(u=>i&&u.carrera!==i?!1:C?[u.apellido,u.nombre,u.numero_documento,u.legajo,u.email,u.carrera].filter(Boolean).join(" ").toLowerCase().includes(C):!0)},$=()=>{const C=o(),u=h(),N=d.trim().length>0||i!=="";e.innerHTML=`
      <div class="card">
        <div class="card-header">
          <h3>Buscador de Alumnos</h3>
        </div>

        <div class="search-form" style="display: flex; flex-direction: column; gap: 0.9rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label for="buscadorTextoAlumno">Buscar por Apellido, Nombre, DNI o Legajo</label>
            <input
              id="buscadorTextoAlumno"
              type="text"
              placeholder="Ej: Pérez, 40111222 o LEG-2024..."
              value="${he(d)}"
            />
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label for="buscadorCarreraAlumno">Filtrar por Carrera</label>
            <select id="buscadorCarreraAlumno">
              <option value="">Todas las carreras (${C.length})</option>
              ${C.map(g=>`<option value="${he(g)}" ${i===g?"selected":""}>${he(g)}</option>`).join("")}
            </select>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">
              ${N?`${u.length} alumno(s) encontrado(s)`:`${(a.alumnos||[]).length} alumno(s) disponibles`}
            </span>
            ${N?'<button type="button" id="btnLimpiarBuscadorAlumno" class="btn btn-secondary btn-sm">Limpiar</button>':""}
          </div>

          ${N?u.length===0?'<p class="empty-text" style="margin: 0.5rem 0;">No se encontraron alumnos que coincidan con la búsqueda.</p>':`
                  <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 290px; overflow-y: auto; padding-right: 4px;">
                    ${u.slice(0,20).map(g=>{const L=g.id||g.id_alumno;return`
                          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.65rem 0.85rem; background: #f8fafc; border: 1px solid var(--border); border-radius: 8px;">
                            <div style="min-width: 0;">
                              <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem;">
                                ${he(g.apellido)}, ${he(g.nombre)}
                              </div>
                              <div style="font-size: 0.78rem; color: var(--text-muted);">
                                DNI ${he(g.numero_documento||"-")} · ${he(g.carrera||"Sin carrera")}
                              </div>
                            </div>
                            <button
                              type="button"
                              class="btn btn-warning btn-sm"
                              data-buscador-editar="${he(L)}"
                              style="flex-shrink: 0;"
                            >
                              Editar
                            </button>
                          </div>
                        `}).join("")}
                  </div>
                `:'<p style="font-size: 0.84rem; color: var(--text-muted); margin: 0;">Escribí un apellido, DNI o elegí una carrera para localizar rápidamente a un estudiante y editar su ficha.</p>'}
        </div>
      </div>
    `;const b=e.querySelector("#buscadorTextoAlumno");b&&b.addEventListener("input",g=>{const L=g.target.selectionStart;d=g.target.value,$();const q=e.querySelector("#buscadorTextoAlumno");q&&(q.focus(),q.setSelectionRange(L,L))});const k=e.querySelector("#buscadorCarreraAlumno");k&&k.addEventListener("change",g=>{i=g.target.value,$()});const P=e.querySelector("#btnLimpiarBuscadorAlumno");P&&P.addEventListener("click",()=>{d="",i="",$()}),e.querySelectorAll("[data-buscador-editar]").forEach(g=>{g.addEventListener("click",()=>{const L=g.getAttribute("data-buscador-editar"),q=(a.alumnos||[]).find(f=>String(f.id||f.id_alumno)===String(L));q&&a.onEditar&&a.onEditar(q)})})};return $(),{update(C={}){a={...a,...C},$()}}}const Ve=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function Ye(e,A={}){let a={label:"",id:"",placeholder:"Escriba para filtrar...",items:[],selectedId:"",onSelect:()=>{},getItemKey:_=>_.id,getItemLabel:_=>String(_),getItemSubLabel:null,filterFn:null,disabled:!1,...A},d="",i=!1,o,h=-1;e.innerHTML=`
    <div class="filtro-buscador-group">
      <label class="filtro-label"></label>
      <div class="filtro-input-wrapper">
        <span class="filtro-icon"></span>
        <input type="text" class="filtro-input" autocomplete="off" />
        <button type="button" class="filtro-btn-clear" title="Borrar búsqueda" style="display: none;">✕</button>
        <button type="button" class="filtro-btn-toggle" tabindex="-1">▼</button>
      </div>
      <div class="filtro-dropdown" style="display: none;"></div>
    </div>
  `;const $=e.querySelector(".filtro-buscador-group"),C=e.querySelector(".filtro-label"),u=e.querySelector(".filtro-input"),N=e.querySelector(".filtro-btn-clear"),b=e.querySelector(".filtro-btn-toggle"),k=e.querySelector(".filtro-dropdown"),P=()=>{if(a.selectedId&&a.items&&a.items.length>0){const _=a.items.find(x=>String(a.getItemKey(x))===String(a.selectedId));_?d=a.getItemLabel(_):d=""}else a.selectedId||(d="");u.value=d},g=()=>{const _=d.trim().toLowerCase();return(a.items||[]).filter(M=>{if(!_)return!0;if(a.filterFn)return a.filterFn(M,_);const G=String(a.getItemLabel(M)||"").toLowerCase(),O=a.getItemSubLabel?String(a.getItemSubLabel(M)||"").toLowerCase():"";return G.includes(_)||O.includes(_)})},L=()=>{if(d&&!a.disabled?N.style.display="":N.style.display="none",b.textContent=i?"▲":"▼",b.disabled=!!a.disabled,!i||a.disabled){k.style.display="none",k.innerHTML="";return}const _=d.trim().toLowerCase(),x=g();let M=`
      <div class="filtro-dropdown-header">
        <span>
          ${x.length} ${x.length===1?"coincidencia":"coincidencias"}
        </span>
        ${_?`<span class="filtro-term-indicator">filtrando por: "<em>${Ve(_)}</em>"</span>`:""}
      </div>
      <ul class="filtro-options-list">
    `;x.length===0?M+=`
        <li class="filtro-no-results">
          No se encontraron resultados para "<strong>${Ve(d)}</strong>"
        </li>
      `:x.forEach((O,z)=>{const U=a.getItemKey(O),D=String(U)===String(a.selectedId),B=Ve(a.getItemLabel(O)),K=a.getItemSubLabel?Ve(a.getItemSubLabel(O)):"";M+=`
          <li class="filtro-option-item ${D?"selected":""}" data-idx="${z}">
            <div class="filtro-option-main">
              <span class="filtro-option-text">${B}</span>
              ${D?'<span class="filtro-check">✓</span>':""}
            </div>
            ${K?`<div class="filtro-option-sub">${K}</div>`:""}
          </li>
        `}),M+="</ul>",k.innerHTML=M,k.style.display="block",k.querySelectorAll(".filtro-option-item").forEach(O=>{O.addEventListener("click",()=>{const z=Number(O.getAttribute("data-idx")),U=x[z];U&&(i=!1,d=a.getItemLabel(U),u.value=d,L(),a.onSelect(U))})})};u.addEventListener("input",_=>{d=_.target.value,i=!0,L()}),u.addEventListener("focus",()=>{a.disabled||(i=!0,L())}),N.addEventListener("click",_=>{_.stopPropagation(),d="",u.value="",i=!0,L(),u.focus()}),b.addEventListener("click",()=>{a.disabled||(i=!i,L())});const q=_=>{$&&!$.contains(_.target)&&i&&(i=!1,P(),L())};document.addEventListener("mousedown",q);const f=(_={})=>{a={...a,..._},a.label?(C.style.display="",C.textContent=a.label,C.setAttribute("for",a.id||"")):C.style.display="none",u.id=a.id||"",u.placeholder=a.placeholder||"Escriba para filtrar...",u.disabled=!!a.disabled;const x=Array.isArray(a.items)?a.items.length:0;(String(a.selectedId)!==String(o)||x!==h&&a.selectedId)&&(o=a.selectedId,h=x,P()),L()};return f(a),{update:f,destroy:()=>{document.removeEventListener("mousedown",q)}}}const $e="http://localhost:3000/api",Ne=[{id:1,nombre:"Febrero / Marzo",mesFin:2,diaFin:31},{id:2,nombre:"Junio / Julio",mesFin:6,diaFin:31},{id:3,nombre:"Diciembre",mesFin:11,diaFin:31}],m=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),Qe=e=>{if(!e)return"—";try{const A=new Date(e);return isNaN(A.getTime())?String(e):A.toLocaleString("es-AR",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"})}catch{return String(e)}};function la(e,A={}){let a={alumnos:[],onVolver:null,...A},d=[],i=[],o=[],h=!1,$="",C="",u="",N="",b="",k="",P="ACTIVAS",g=null,L=4,q=!1,f=null,_=new Date().getFullYear(),x=1,M=1,G="REGULAR",O=!1,z=null,U=[],D=!1;const B=(S,E="success")=>{window.ISFTNotify&&window.ISFTNotify(S,E)},K=()=>{const S=new Date().getFullYear(),E=new Set([S+1,S,S-1,S-2]);return d.forEach(I=>{I.anio_turno&&E.add(Number(I.anio_turno))}),Array.from(E).sort((I,X)=>X-I)},W=()=>{const S=b?o.filter(I=>String(I.id_carrera)===String(b)):o,E=new Map;return S.forEach(I=>{E.has(I.id_materia)||E.set(I.id_materia,I)}),d.forEach(I=>{(!b||String(I.id_carrera)===String(b))&&(E.has(I.id_materia)||E.set(I.id_materia,{id_materia:I.id_materia,nombre_materia:I.nombre_materia,id_carrera:I.id_carrera}))}),Array.from(E.values()).sort((I,X)=>String(I.nombre_materia||"").localeCompare(String(X.nombre_materia||""),"es"))},J=()=>{const S=$.trim().toLowerCase();return d.filter(E=>!(P==="ACTIVAS"&&E.estado==="BAJA"||P!=="ACTIVAS"&&P!=="TODAS"&&E.estado!==P||C&&Number(E.anio_turno)!==Number(C)||u&&Number(E.turno_instancia)!==Number(u)||N&&Number(E.id_llamado||1)!==Number(N)||b&&Number(E.id_carrera)!==Number(b)||k&&Number(E.id_materia)!==Number(k)||S&&!(String(E.numero_documento||"").toLowerCase().includes(S)||String(E.primer_apellido||"").toLowerCase().includes(S)||String(E.primer_nombre||"").toLowerCase().includes(S)||`${E.primer_apellido||""} ${E.primer_nombre||""}`.toLowerCase().includes(S)||String(E.legajo||"").toLowerCase().includes(S)||String(E.nombre_materia||"").toLowerCase().includes(S))))},ye=async()=>{try{const E=await(await fetch(`${$e}/alumnos/catalogo/carreras`)).json(),I=E.success&&Array.isArray(E.data)?E.data:[];i=I;const X=I.map(se=>fetch(`${$e}/finales/materias/${se.id_carrera}`).then(ae=>ae.json()).then(ae=>ae.success?ae.data:[]).catch(()=>[]));o=(await Promise.all(X)).flat(),H()}catch(S){console.error("Error al cargar catálogos para filtros desde MySQL:",S)}},Y=async()=>{h=!0,H();try{const S=await fetch(`${$e}/finales/listado`);if(!S.ok)throw new Error("Error de conexión con el servidor");const E=await S.json();E.success&&Array.isArray(E.data)?d=E.data:d=[]}catch{d=[],B("Error al cargar el listado de inscripciones a finales","error")}finally{h=!1,H()}},Le=S=>{if(!S||S.length===0){B("No hay inscripciones visibles con los filtros actuales para exportar.","error");return}const E=new Map;S.forEach(v=>{const Q=`${v.nombre_carrera}__${v.anio_cursada||1}__${v.nombre_materia}__${v.anio_turno}__${v.nombre_instancia}`;E.has(Q)||E.set(Q,{carrera:v.nombre_carrera||"",anioCursada:v.anio_cursada?`${v.anio_cursada}° Año`:"—",materia:v.nombre_materia||"",anioMesa:v.anio_turno||"",turno:v.nombre_instancia||"",regulares:0,libres:0,total:0});const pe=E.get(Q);pe.total+=1,String(v.modalidad||"REGULAR").toUpperCase()==="LIBRE"?pe.libres+=1:pe.regulares+=1});const I=Array.from(E.values()).map(v=>`
          <tr>
            <td>${m(v.carrera)}</td>
            <td>${m(v.anioCursada)}</td>
            <td>${m(v.materia)}</td>
            <td>${m(v.anioMesa)}</td>
            <td>${m(v.turno)}</td>
            <td>${v.regulares}</td>
            <td>${v.libres}</td>
            <td><strong>${v.total}</strong></td>
          </tr>
        `).join(""),X=S.map((v,Q)=>`
          <tr>
            <td>${Q+1}</td>
            <td>#${m(v.id_rendicion)}</td>
            <td>${m(v.primer_apellido)}, ${m(v.primer_nombre)}</td>
            <td>${m(v.numero_documento||"")}</td>
            <td>${m(v.legajo||"")}</td>
            <td>${m(v.nombre_carrera||"")}</td>
            <td>${m(v.anio_cursada?`${v.anio_cursada}° Año`:"")}</td>
            <td>${m(v.nombre_materia||"")}</td>
            <td>${m(v.anio_turno)}</td>
            <td>${m(v.nombre_instancia)}</td>
            <td>${m(v.id_llamado||1)}° Llamado</td>
            <td>${m(v.modalidad||"REGULAR")}</td>
            <td>${m(v.estado)}</td>
            <td>${v.es_ausente?"Ausente":v.nota!==null&&v.nota!==void 0?m(v.nota):"A rendir"}</td>
          </tr>
        `).join(""),Z=`
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; }
          h2, h3 { font-family: Calibri, Arial, sans-serif; color: #1e3a8a; }
        </style>
      </head>
      <body>
        <h2>ISFT Nº 182 — Planilla de Inscriptos a Exámenes Finales</h2>
        <p>Generado el ${m(new Date().toLocaleString("es-AR"))} — Registros exportados: ${S.length}</p>

        <h3>1. Resumen Agrupado por Carrera, Año y Materia</h3>
        <table>
          <thead>
            <tr>
              <th>Carrera</th>
              <th>Año Plan</th>
              <th>Materia</th>
              <th>Año Mesa</th>
              <th>Turno</th>
              <th>Regulares</th>
              <th>Libres</th>
              <th>Total Inscriptos</th>
            </tr>
          </thead>
          <tbody>${I}</tbody>
        </table>

        <br />
        <h3>2. Nómina Detallada de Inscriptos</h3>
        <table>
          <thead>
            <tr>
              <th>N°</th>
              <th>ID</th>
              <th>Apellido y Nombre</th>
              <th>DNI</th>
              <th>Legajo</th>
              <th>Carrera</th>
              <th>Año Plan</th>
              <th>Materia</th>
              <th>Año Mesa</th>
              <th>Turno</th>
              <th>Llamado</th>
              <th>Condición</th>
              <th>Estado</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>${X}</tbody>
        </table>
      </body>
      </html>
    `,se=new Blob(["\uFEFF"+Z],{type:"application/vnd.ms-excel;charset=utf-8;"}),ae=URL.createObjectURL(se),le=document.createElement("a"),Se=new Date().toISOString().split("T")[0];le.href=ae,le.download=`Planilla_Inscriptos_Finales_ISFT182_${Se}.xls`,document.body.appendChild(le),le.click(),document.body.removeChild(le),URL.revokeObjectURL(ae),B(`Planilla Excel descargada (${S.length} registros).`)},Te=async S=>{z=S,U=[],D=!0,H();try{const I=await(await fetch(`${$e}/finales/${S.id_rendicion}/auditoria`)).json();U=I.success&&Array.isArray(I.data)?I.data:[]}catch{U=[]}finally{D=!1,H()}},qe=async S=>{if(window.confirm(`¿Confirmar BAJA LÓGICA de la inscripción #${S.id_rendicion}?

Alumno: ${S.primer_apellido}, ${S.primer_nombre}
Materia: ${S.nombre_materia}
Turno: ${S.nombre_instancia} ${S.anio_turno}

El registro no se borrará físicamente; quedará en estado BAJA con trazabilidad en auditoría.`))try{const X=await(await fetch(`${$e}/finales/${S.id_rendicion}`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({modificado_por:"Preceptoría"})})).json();X.success?(B(`Inscripción #${S.id_rendicion} dada de baja correctamente.`),Y()):B(X.message||"No se pudo dar de baja la inscripción.","error")}catch{B("Error de conexión al intentar dar de baja la inscripción.","error")}},H=()=>{const S=K(),E=W(),I=J(),X=!!($||C||u||N||b||k||P!=="ACTIVAS");let Z="";if(h)Z='<p class="loading-text">Cargando listado general de finales inscriptos...</p>';else if(I.length===0)Z=`
        <p class="empty-text">
          No se encontraron inscripciones a finales que coincidan con los filtros seleccionados.
        </p>
      `;else{let s="";I.forEach((l,V)=>{let ce='<span class="text-muted">Regular</span>';l.modalidad==="LIBRE"||String(l.motivo_excepcion||"").includes("Modalidad LIBRE")?ce='<span class="badge-libre">Libre</span>':l.es_excepcion&&!String(l.motivo_excepcion||"").includes("Ausentes no computan")&&(ce=`<span class="badge-warning" title="${m(l.motivo_excepcion||"Por excepción")}">Excepción</span>`),Number(l.reasignada)===1&&(ce+=' <span class="badge-warning" style="font-size: 0.7rem;" title="Inscripción reasignada">Reasig.</span>');let te='<span class="text-muted">A rendir</span>';l.estado==="BAJA"?te=`<span class="text-muted" title="Baja: ${m(Qe(l.fecha_baja))}">Dada de baja</span>`:l.es_ausente?te='<span class="text-danger font-weight-bold">Ausente</span>':l.nota!==null&&l.nota!==void 0&&(te=`<strong class="${l.nota>=4?"nota-aprobada":"nota-desaprobada"}">${m(l.nota)}</strong>`);const be=String(l.estado||"").toLowerCase(),ie=l.estado==="INSCRIPTO"||l.estado==="AUSENTE";s+=`
          <tr style="${l.estado==="BAJA"?"opacity: 0.65;":""}">
            <td><span class="badge-id">#${m(l.id_rendicion)}</span></td>
            <td><strong>${m(l.primer_apellido)}, ${m(l.primer_nombre)}</strong></td>
            <td><span class="badge-doc">${m(l.numero_documento||"S/D")}</span></td>
            <td><span class="badge-carrera">${m(l.nombre_carrera)}</span></td>
            <td><strong>${m(l.nombre_materia)}</strong></td>
            <td>${m(l.anio_turno)}</td>
            <td>${m(l.nombre_instancia)}</td>
            <td>${m(l.id_llamado||1)}° Llamado</td>
            <td>${ce}</td>
            <td><span class="status-badge status-${m(be)}">${m(l.estado)}</span></td>
            <td>${te}</td>
            <td>
              <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                ${l.estado!=="BAJA"?`<button type="button" data-action="calificar" data-idx="${V}" class="btn btn-warning btn-sm" title="Asentar calificación o ausencia">Calificar</button>`:""}
                ${ie?`<button type="button" data-action="reasignar" data-idx="${V}" class="btn btn-secondary btn-sm" title="Reasignar turno, año, llamado o modalidad">Reasignar</button>
                       <button type="button" data-action="baja" data-idx="${V}" class="btn btn-danger btn-sm" style="background:#dc2626;color:#fff;" title="Baja lógica sin borrado físico">Baja</button>`:""}
                <button type="button" data-action="auditoria" data-idx="${V}" class="btn btn-secondary btn-sm" title="Ver historial de auditoría de esta inscripción">Historial</button>
              </div>
            </td>
          </tr>
        `}),Z=`
        <div class="table-responsive">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 70px;">#ID</th>
                <th>Alumno</th>
                <th>DNI</th>
                <th>Carrera</th>
                <th>Materia</th>
                <th>Año</th>
                <th>Turno</th>
                <th>Llamado</th>
                <th>Condición</th>
                <th>Estado</th>
                <th>Nota</th>
                <th style="min-width: 220px;">Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${s}
            </tbody>
          </table>
        </div>
      `}let se="";g&&(se=`
        <div class="modal-overlay">
          <div class="card modal-card">
            <div class="card-header">
              <h3>Asentar Calificación de Examen Final</h3>
              <p>
                <strong>${m(g.primer_apellido)}, ${m(g.primer_nombre)}</strong>
                — ${m(g.nombre_materia)} (${m(g.nombre_instancia)} ${m(g.anio_turno)})
              </p>
            </div>
            <form id="formCalificarListado" class="form-grid">
              <div class="form-group full-width">
                <label class="checkbox-label">
                  <input id="chkAusenteListado" type="checkbox" ${q?"checked":""} />
                  <strong>Figurar como AUSENTE</strong> (No computa como falla)
                </label>
              </div>

              ${q?"":`
                <div class="form-group full-width">
                  <label for="notaModalListado">Calificación obtenida (1 a 10):</label>
                  <input id="notaModalListado" type="number" min="1" max="10" value="${m(L)}" required />
                  <small id="helpNotaListado" class="help-text">
                    ${L>=4?"🟢 Aprobado (>= 4)":"🔴 Aplazo (< 4, cuenta como falla)"}
                  </small>
                </div>
              `}

              <div class="form-actions full-width">
                <button type="submit" class="btn btn-primary">Guardar Calificación</button>
                <button type="button" id="btnCancelarModalListado" class="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `),f&&(se=`
        <div class="modal-overlay">
          <div class="card modal-card">
            <div class="card-header">
              <h3>Reasignar Inscripción a Examen Final (#${m(f.id_rendicion)})</h3>
              <p>
                <strong>${m(f.primer_apellido)}, ${m(f.primer_nombre)}</strong>
                — ${m(f.nombre_materia)}
              </p>
              <small class="help-text">El cambio quedará registrado en la auditoría histórica sin sobrescribir el historial previo.</small>
            </div>
            <form id="formReasignarListado" class="form-grid">
              <div class="form-group">
                <label for="reasigAnio">Año de Mesa:</label>
                <input id="reasigAnio" type="number" min="2024" max="2035" value="${m(_)}" required />
              </div>

              <div class="form-group">
                <label for="reasigTurno">Turno (Instancia):</label>
                <select id="reasigTurno" required>
                  ${Ne.map(s=>`<option value="${s.id}" ${Number(x)===s.id?"selected":""}>${s.id} - ${m(s.nombre)}</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label for="reasigLlamado">Llamado:</label>
                <select id="reasigLlamado" required>
                  <option value="1" ${Number(M)===1?"selected":""}>1° Llamado</option>
                  <option value="2" ${Number(M)===2?"selected":""}>2° Llamado</option>
                </select>
              </div>

              <div class="form-group">
                <label for="reasigModalidad">Modalidad:</label>
                <select id="reasigModalidad" required>
                  <option value="REGULAR" ${G==="REGULAR"?"selected":""}>REGULAR</option>
                  <option value="LIBRE" ${G==="LIBRE"?"selected":""}>LIBRE (sujeto a excepción normativa)</option>
                </select>
              </div>

              <div class="form-actions full-width">
                <button type="submit" class="btn btn-primary" ${O?"disabled":""}>
                  ${O?"Guardando...":"Confirmar Reasignación"}
                </button>
                <button type="button" id="btnCancelarReasignar" class="btn btn-secondary">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      `),z&&(se=`
        <div class="modal-overlay">
          <div class="card modal-card" style="max-width: 680px;">
            <div class="card-header">
              <h3>Historial de Auditoría — Inscripción #${m(z.id_rendicion)}</h3>
              <p>
                <strong>${m(z.primer_apellido)}, ${m(z.primer_nombre)}</strong>
                — ${m(z.nombre_materia)}
              </p>
            </div>
            <div style="padding: 12px 0;">
              ${D?'<p class="loading-text">Cargando historial de auditoría...</p>':U.length===0?'<p class="empty-text">No hay movimientos de auditoría registrados para esta inscripción (fue cargada previamente o por seed inicial).</p>':`
                      <div class="table-responsive">
                        <table class="custom-table">
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Acción</th>
                              <th>Anterior</th>
                              <th>Nuevo</th>
                              <th>Usuario</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${U.map(s=>`
                                  <tr>
                                    <td>${m(Qe(s.fecha_cambio))}</td>
                                    <td><strong>${m(s.accion)}</strong></td>
                                    <td>${m(s.detalle_anterior||"—")}</td>
                                    <td>${m(s.detalle_nuevo||"—")}</td>
                                    <td>${m(s.modificado_por||"Preceptoría")}</td>
                                  </tr>
                                `).join("")}
                          </tbody>
                        </table>
                      </div>
                    `}
            </div>
            <div class="form-actions full-width">
              <button type="button" id="btnCerrarAuditoria" class="btn btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      `),e.innerHTML=`
      <div class="listado-general-finales">
        <div class="card">
          <div class="card-header header-con-resumen">
            <div>
              <h3>Listado General de Alumnos Inscriptos a Exámenes Finales</h3>
              <p class="tab-description">
                Vista unificada para <strong>Preceptoría</strong>. Permite filtrar inscripciones, <strong>calificar</strong>, <strong>reasignar turno/modalidad</strong>, aplicar <strong>baja lógica auditada</strong> y <strong>exportar planillas a Excel</strong>.
              </p>
            </div>

            <div class="header-actions-row">
              <button type="button" id="btnExportarExcelListado" class="btn btn-primary" ${I.length===0?"disabled":""}>
                Exportar Excel (.xls)
              </button>
              <button type="button" id="btnActualizarListado" class="btn btn-secondary" ${h?"disabled":""}>
                Actualizar
              </button>
              ${a.onVolver?'<button type="button" id="btnVolverInscripcion" class="btn btn-secondary">Volver a Inscripción de Finales</button>':""}
            </div>
          </div>

          <div class="filtros-finales-panel">
            <div class="filtros-finales-header">
              <h4>Filtros de Búsqueda de Inscripciones</h4>
              <div class="filtros-resumen-derecha">
                <span class="badge-count-materias">
                  Mostrando ${I.length} de ${d.length} registros
                </span>
                ${X?'<button type="button" id="btnLimpiarFiltrosListado" class="btn btn-secondary btn-sm">Limpiar Filtros</button>':""}
              </div>
            </div>

            <div class="filtros-finales-grid">
              <div class="form-group">
                <label for="filtroBusquedaTexto">Buscar (DNI / Apellido / Legajo):</label>
                <input id="filtroBusquedaTexto" type="text" placeholder="Ej: 40111222 o Pérez..." value="${m($)}" />
              </div>

              <div class="form-group">
                <label for="filtroEstado">Estado:</label>
                <select id="filtroEstado">
                  <option value="ACTIVAS" ${P==="ACTIVAS"?"selected":""}>Activas (sin bajas)</option>
                  <option value="TODAS" ${P==="TODAS"?"selected":""}>Todas (incluye bajas)</option>
                  <option value="INSCRIPTO" ${P==="INSCRIPTO"?"selected":""}>INSCRIPTO</option>
                  <option value="APROBADO" ${P==="APROBADO"?"selected":""}>APROBADO</option>
                  <option value="DESAPROBADO" ${P==="DESAPROBADO"?"selected":""}>DESAPROBADO</option>
                  <option value="AUSENTE" ${P==="AUSENTE"?"selected":""}>AUSENTE</option>
                  <option value="BAJA" ${P==="BAJA"?"selected":""}>BAJA (Baja Lógica)</option>
                </select>
              </div>

              <div class="form-group">
                <label for="filtroAnio">Año:</label>
                <select id="filtroAnio">
                  <option value="">-- Todos los años --</option>
                  ${S.map(s=>`<option value="${s}" ${String(C)===String(s)?"selected":""}>${s}</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label for="filtroTurno">Turno (Instancia):</label>
                <select id="filtroTurno">
                  <option value="">-- Todos los turnos --</option>
                  ${Ne.map(s=>`<option value="${s.id}" ${String(u)===String(s.id)?"selected":""}>${s.id} - ${m(s.nombre)}</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label for="filtroLlamado">Llamado:</label>
                <select id="filtroLlamado">
                  <option value="">-- Todos los llamados --</option>
                  <option value="1" ${String(N)==="1"?"selected":""}>1° Llamado</option>
                  <option value="2" ${String(N)==="2"?"selected":""}>2° Llamado</option>
                </select>
              </div>

              <div class="form-group">
                <label for="filtroCarrera">Carrera:</label>
                <select id="filtroCarrera">
                  <option value="">-- Todas las carreras --</option>
                  ${i.map(s=>`<option value="${s.id_carrera}" ${String(b)===String(s.id_carrera)?"selected":""}>${m(s.nombre_carrera)}</option>`).join("")}
                </select>
              </div>

              <div class="form-group">
                <label for="filtroMateria">Materia:</label>
                <select id="filtroMateria">
                  <option value="">-- Todas las materias --</option>
                  ${E.map(s=>`<option value="${s.id_materia}" ${String(k)===String(s.id_materia)?"selected":""}>${m(s.nombre_materia)}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>

          ${Z}
        </div>
        ${se}
      </div>
    `;const ae=e.querySelector("#btnExportarExcelListado");ae&&ae.addEventListener("click",()=>Le(I));const le=e.querySelector("#btnActualizarListado");le&&le.addEventListener("click",Y);const Se=e.querySelector("#btnVolverInscripcion");Se&&a.onVolver&&Se.addEventListener("click",a.onVolver);const v=e.querySelector("#btnLimpiarFiltrosListado");v&&v.addEventListener("click",()=>{$="",P="ACTIVAS",C="",u="",N="",b="",k="",H()});const Q=e.querySelector("#filtroBusquedaTexto");Q&&Q.addEventListener("input",s=>{$=s.target.value;const l=s.target.selectionStart;H();const V=e.querySelector("#filtroBusquedaTexto");V&&(V.focus(),V.setSelectionRange(l,l))});const pe=e.querySelector("#filtroEstado");pe&&pe.addEventListener("change",s=>{P=s.target.value,H()});const Oe=e.querySelector("#filtroAnio");Oe&&Oe.addEventListener("change",s=>{C=s.target.value,H()});const Ue=e.querySelector("#filtroTurno");Ue&&Ue.addEventListener("change",s=>{u=s.target.value,H()});const xe=e.querySelector("#filtroLlamado");xe&&xe.addEventListener("change",s=>{N=s.target.value,H()});const Ie=e.querySelector("#filtroCarrera");Ie&&Ie.addEventListener("change",s=>{b=s.target.value,b&&k&&(o.some(V=>String(V.id_carrera)===String(b)&&String(V.id_materia)===String(k))||(k="")),H()});const fe=e.querySelector("#filtroMateria");fe&&fe.addEventListener("change",s=>{k=s.target.value,H()}),e.querySelectorAll('button[data-action="calificar"]').forEach(s=>{s.addEventListener("click",()=>{const l=I[Number(s.getAttribute("data-idx"))];l&&(g=l,L=l.nota||4,q=!!l.es_ausente,H())})}),e.querySelectorAll('button[data-action="reasignar"]').forEach(s=>{s.addEventListener("click",()=>{const l=I[Number(s.getAttribute("data-idx"))];l&&(f=l,_=Number(l.anio_turno)||new Date().getFullYear(),x=Number(l.turno_instancia)||1,M=Number(l.id_llamado)||1,G=l.modalidad||"REGULAR",H())})}),e.querySelectorAll('button[data-action="baja"]').forEach(s=>{s.addEventListener("click",()=>{const l=I[Number(s.getAttribute("data-idx"))];l&&qe(l)})}),e.querySelectorAll('button[data-action="auditoria"]').forEach(s=>{s.addEventListener("click",()=>{const l=I[Number(s.getAttribute("data-idx"))];l&&Te(l)})});const Fe=e.querySelector("#chkAusenteListado");Fe&&Fe.addEventListener("change",s=>{q=s.target.checked,H()});const Re=e.querySelector("#notaModalListado");Re&&Re.addEventListener("input",s=>{L=Number(s.target.value);const l=e.querySelector("#helpNotaListado");l&&(l.textContent=L>=4?"🟢 Aprobado (>= 4)":"🔴 Aplazo (< 4, cuenta como falla)")});const Me=e.querySelector("#btnCancelarModalListado");Me&&Me.addEventListener("click",()=>{g=null,H()});const Be=e.querySelector("#formCalificarListado");Be&&Be.addEventListener("submit",async s=>{if(s.preventDefault(),!!g)try{const V=await(await fetch(`${$e}/finales/calificar/${g.id_rendicion}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({nota:q?null:L,es_ausente:q,fecha_examen:new Date().toISOString().split("T")[0]})})).json();V.success?(g=null,B("Calificación / estado del examen final actualizado correctamente."),Y()):B(V.message||"Error al calificar","error")}catch{B("Error al conectar con el servidor","error")}});const He=e.querySelector("#btnCancelarReasignar");He&&He.addEventListener("click",()=>{f=null,H()});const Ce=e.querySelector("#formReasignarListado");Ce&&Ce.addEventListener("submit",async s=>{var V,ce,te,be;if(s.preventDefault(),!f)return;O=!0;const l={anio_turno:Number((V=e.querySelector("#reasigAnio"))==null?void 0:V.value),turno_instancia:Number((ce=e.querySelector("#reasigTurno"))==null?void 0:ce.value),id_llamado:Number((te=e.querySelector("#reasigLlamado"))==null?void 0:te.value),modalidad:((be=e.querySelector("#reasigModalidad"))==null?void 0:be.value)||"REGULAR",modificado_por:"Preceptoría"};try{const je=await(await fetch(`${$e}/finales/${f.id_rendicion}/reasignar`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(l)})).json();je.success?(f=null,B("Inscripción reasignada con éxito y registrada en el historial de auditoría."),Y()):B(je.message||"No se pudo reasignar la inscripción.","error")}catch{B("Error al conectar con el servidor para reasignar.","error")}finally{O=!1,H()}});const we=e.querySelector("#btnCerrarAuditoria");we&&we.addEventListener("click",()=>{z=null,H()})};return ye(),Y(),{update:(S={})=>{a={...a,...S},H()}}}const Xe=()=>{if(typeof document>"u")return{};const e={};return(document.cookie||"").split(";").forEach(a=>{const d=a.trim();if(!d)return;const i=d.indexOf("=");if(i===-1)return;const o=d.substring(0,i).trim(),h=d.substring(i+1).trim();try{e[o]=decodeURIComponent(h)}catch{e[o]=h}}),e},Pe=()=>{const e=Xe();let A={};const a=e.usuario||e.sesion||e.user;if(a&&(a.startsWith("{")||a.startsWith("%7B")))try{A=JSON.parse(a)}catch{A={}}const d=(e.tipo_usuario||e.tipoUsuario||e.rol||e.role||e.tipo||A.tipo_usuario||A.tipoUsuario||A.rol||A.tipo||"preceptor").toString().trim().toLowerCase(),i=d==="alumno"||d==="estudiante"?"alumno":"preceptor",o=e.id_alumno||e.idAlumno||e.alumno_id||e.id_usuario||A.id_alumno||A.idAlumno||A.id||null,h=e.nombre_alumno||e.nombreAlumno||e.nombre_usuario||A.nombre_alumno||A.nombre_completo||A.nombre||"";return{tipoUsuario:i,esAlumno:i==="alumno",esPreceptor:i==="preceptor",idAlumno:o?Number(o):null,nombreAlumno:h}},ca=({tipoUsuario:e,idAlumno:A,nombreAlumno:a})=>{if(typeof document>"u")return;const d=3600*24*7;document.cookie=`tipo_usuario=${encodeURIComponent(e)}; path=/; max-age=${d}; SameSite=Lax`,document.cookie=`id_alumno=${encodeURIComponent(A)}; path=/; max-age=${d}; SameSite=Lax`,document.cookie=`nombre_alumno=${encodeURIComponent(a)}; path=/; max-age=${d}; SameSite=Lax`;try{const o=(String(e||"preceptor").toLowerCase()==="alumno"?"alumno":"preceptor")==="alumno"?{rol:"alumno",id_usuario:Number(A||1),nombre:a||"Alumno ISFT 182",id_alumno:Number(A||1)}:{rol:"preceptor",id_usuario:1,nombre:"Preceptoría ISFT 182"};sessionStorage.setItem("isft182_user",JSON.stringify(o))}catch{}window.dispatchEvent(new Event("cookie-usuario-actualizada"))},Ze=()=>{if(typeof document>"u")return;const e=Xe();e.tipo_usuario||e.tipoUsuario||e.rol||e.role||e.tipo||e.usuario||ca({tipoUsuario:"preceptor",idAlumno:1,nombreAlumno:"Pérez García, Juan Carlos"})},_e="http://localhost:3000/api",Ee=(e,A,a=new Date)=>{if(!e||!A)return!1;const d=Number(A),i=a.getFullYear();if(d<i)return!0;if(d>i)return!1;const o=Ne.find($=>$.id===Number(e));if(!o)return!1;const h=new Date(d,o.mesFin,o.diaFin,23,59,59,999);return a>h},R=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function da(e,A={}){Ze();let a=Pe(),d=!1,i=null,o=A.alumnos||[],h="",$="",C=[],u="",N="",b="",k="",g=new Date().getFullYear(),L=!1,q="",f=null,_=!1,x=!1,M=[],G=!1,O=null,z=4,U=!1,D=null,B=null;e.innerHTML=`
    <div class="finales-container">
      <div id="cookieSessionBarSlot"></div>
      <div id="topNotificationSlot"></div>
      <div id="listadoGeneralSlot" style="display: none;"></div>
      <div id="inscripcionViewSlot">
        <div class="card">
          <div id="cardHeaderInscripcionSlot" class="card-header header-con-resumen"></div>
          <form id="formInscribirFinal" class="form-grid">
            <div class="form-group">
              <div id="alumnoFijoSlot" style="display: none;"></div>
              <div id="filtroAlumnoSlot"></div>
            </div>

            <div class="form-group">
              <div id="filtroMateriaSlot"></div>
            </div>

            <div class="form-group">
              <label for="modalidadSelect">Modalidad de Inscripción:</label>
              <select id="modalidadSelect" required>
                <option value="">-- Seleccione modalidad --</option>
                <option value="REGULAR">Regular (Con cursada regularizada)</option>
                <option value="LIBRE">Libre (Verifica correlativa previa regular o aprobada)</option>
              </select>
            </div>

            <div class="form-group">
              <label for="anioTurno">Año del Turno:</label>
              <input id="anioTurno" type="number" min="2020" max="2035" required />
            </div>

            <div class="form-group" id="turnoInstanciaGroupSlot"></div>

            <div class="form-group">
              <label for="llamadoSelect">Llamado:</label>
              <select id="llamadoSelect" required>
                <option value="">-- Seleccione llamado --</option>
                <option value="1">1° Llamado</option>
                <option value="2">2° Llamado</option>
              </select>
            </div>

            <div id="exceptionBoxSlot" class="form-group full-width exception-box" style="display: none;"></div>

            <div id="conditionsPanelSlot" class="full-width conditions-panel"></div>

            <div id="bottomNotificationSlot" class="full-width"></div>

            <div id="formActionsSlot" class="form-actions full-width"></div>
          </form>
        </div>

        <div id="historialCardSlot" class="card mt-4"></div>
        <div id="modalCalificarSlot"></div>
      </div>
    </div>
  `;const K=e.querySelector("#cookieSessionBarSlot"),W=e.querySelector("#topNotificationSlot"),J=e.querySelector("#listadoGeneralSlot"),ye=e.querySelector("#inscripcionViewSlot"),Y=e.querySelector("#cardHeaderInscripcionSlot"),Le=e.querySelector("#formInscribirFinal"),Te=e.querySelector("#alumnoFijoSlot"),qe=e.querySelector("#filtroAlumnoSlot"),H=e.querySelector("#filtroMateriaSlot"),S=e.querySelector("#modalidadSelect"),E=e.querySelector("#anioTurno"),I=e.querySelector("#turnoInstanciaGroupSlot"),X=e.querySelector("#llamadoSelect"),Z=e.querySelector("#exceptionBoxSlot"),se=e.querySelector("#conditionsPanelSlot"),ae=e.querySelector("#bottomNotificationSlot"),le=e.querySelector("#formActionsSlot"),Se=e.querySelector("#historialCardSlot"),v=e.querySelector("#modalCalificarSlot");D=Ye(qe,{label:"Alumno (Filtro Activo):",id:"filtroAlumno",placeholder:"Seleccione o busque un alumno por apellido, nombre o DNI...",items:[],selectedId:"",onSelect:t=>{Ie(t.id||t.id_alumno)},getItemKey:t=>t.id||t.id_alumno,getItemLabel:t=>`${t.apellido||t.primer_apellido||""}, ${t.nombre||t.primer_nombre||""}`,getItemSubLabel:t=>`DNI: ${t.numero_documento||"S/D"} • ${t.carrera||"Sin carrera"}`,filterFn:(t,n)=>{const r=(t.nombre||t.primer_nombre||"").toLowerCase(),c=(t.apellido||t.primer_apellido||"").toLowerCase(),y=String(t.numero_documento||""),j=(t.legajo||"").toLowerCase(),p=String(t.id||t.id_alumno||""),F=(t.carrera||"").toLowerCase();return r.includes(n)||c.includes(n)||y.includes(n)||j.includes(n)||p.includes(n)||F.includes(n)}}),B=Ye(H,{label:"Materia a rendir (Filtro Activo):",id:"filtroMateria",placeholder:"Primero seleccione un alumno para listar sus materias...",items:[],selectedId:"",disabled:!0,onSelect:t=>{u=t.id_materia,ie(),fe()},getItemKey:t=>t.id_materia,getItemLabel:t=>t.nombre_materia,getItemSubLabel:t=>`Año ${t.anio_cursada}° de cursada`,filterFn:(t,n)=>{const r=(t.nombre_materia||"").toLowerCase(),c=String(t.anio_cursada||"");return r.includes(n)||c.includes(n)}});const Q=(t,n="success")=>{window.ISFTNotify&&window.ISFTNotify(t,n)},pe=()=>o.find(t=>String(t.id||t.id_alumno)===String(h))||null,Oe=()=>{const t=pe();if(t){const n=t.apellido||t.primer_apellido||"",r=t.nombre||t.primer_nombre||"";return`${n}, ${r}`.trim()}return a.nombreAlumno||"Alumno Registrado"},Ue=async t=>{try{const r=await(await fetch(`${_e}/finales/materias/${t}`)).json();r.success&&(C=r.data,Ce())}catch(n){console.error("Error al cargar materias:",n)}},xe=async t=>{G=!0,ce();try{const r=await(await fetch(`${_e}/finales/alumno/${t}`)).json();r.success&&(M=r.data)}catch(n){console.error("Error al cargar historial:",n)}finally{G=!1,ie()}},Ie=t=>{if(h=t,!h){$="",C=[],u="",M=[],f=null,ie();return}const n=o.find(r=>String(r.id||r.id_alumno)===String(h));if(n){const r=n.id_carrera||1;$=r,u="",f=null,ie(),Ue(r),xe(h)}},fe=()=>{var r;if(!h||!$||!u){f=null,l();return}const t=a.esAlumno,n=((r=Ne.find(c=>!Ee(c.id,g)))==null?void 0:r.id)||3;_=!0,l(),fetch(`${_e}/finales/validar`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id_alumno:h,id_carrera:$,id_materia:u,anio_turno:g,turno_instancia:b?Number(b):n,modalidad:N||"REGULAR",es_excepcion:t?!1:L,tipo_usuario:a.tipoUsuario})}).then(c=>c.json()).then(c=>{c.success?f=c.data:f=null}).catch(c=>{console.error("Error al evaluar condiciones:",c),f=null}).finally(()=>{_=!1,l()})},Fe=()=>{if(a.esAlumno&&(L=!1,q="",d=!1,o.length>0)){let t=null;if(a.idAlumno&&(t=o.find(n=>Number(n.id||n.id_alumno)===Number(a.idAlumno))),!t&&a.nombreAlumno){const n=a.nombreAlumno.toLowerCase();t=o.find(r=>`${r.apellido||r.primer_apellido||""}, ${r.nombre||r.primer_nombre||""}`.toLowerCase().includes(n))}if(t||(t=o[0]),t){const n=t.id||t.id_alumno;if(String(h)!==String(n)){Ie(n);return}}}ie()};S.addEventListener("change",t=>{N=t.target.value,l(),fe()}),E.value=g,E.addEventListener("input",t=>{g=t.target.value,b&&Ee(b,g)&&(b=""),we(),l(),fe()}),X.addEventListener("change",t=>{k=t.target.value?Number(t.target.value):"",l()});const Re=()=>{var re,ne,ze,Ge,ge,ke;const t=a.esAlumno,n=N||(f==null?void 0:f.modalidad)||"REGULAR",r=n==="LIBRE";let c=null;if(f){const T=((re=f.condiciones)==null?void 0:re.regularidad)||null;if(r){const ee=!!(T!=null&&T.exceptuadaLibre);c={cumple:!ee,esModalidadLibre:!0,exceptuadaLibre:ee,tipoEspacio:(T==null?void 0:T.tipoEspacio)||"Asignatura",detalle:ee?(T==null?void 0:T.detalle)||"No se puede inscribir como libre: este espacio curricular está exceptuado por normativa institucional (Práctica / Taller / Seminario).":"Modalidad LIBRE habilitada: El espacio curricular admite examen libre (se validan correlatividades previas)."}}else c=T}let y=null;if(f){const T=(ne=f.condiciones)==null?void 0:ne.correlatividades;!T||T.tieneCorrelativas===!1||Array.isArray(T.correlativas)&&T.correlativas.length===0?y={cumple:!0,tieneCorrelativas:!1,correlativas:[],detalle:"Cumplida: La materia no posee espacios curriculares anteriores requeridos como correlativos."}:y=T}const j=((ze=f==null?void 0:f.condiciones)==null?void 0:ze.noAprobada)||null;let p=null;f&&(r?p={cumple:!0,esModalidadLibre:!0,detalle:"En Modalidad LIBRE no aplica el límite de 8 turnos de regularidad."}:p=((Ge=f.condiciones)==null?void 0:Ge.plazoTurnos)||null);let F=null;if(f&&((ge=f.condiciones)!=null&&ge.limiteFallas)){const T=f.condiciones.limiteFallas,ee=Array.isArray(T.historialFallas)?T.historialFallas.filter(ta=>!String(ta.tipoFalla||"").toUpperCase().includes("AUSENTE")):null,Ae=ee!==null?ee.length:Number(T.cantidadFallas||0),aa=r?!0:Ae<=3;F={...T,cumple:aa,cantidadFallas:Ae,detalle:Ae===0?"No registra aplazos en exámenes finales de esta materia. (Los ausentes no computan como falla).":Ae<=3?`Registra ${Ae} aplazo(s) de 3 permitidos. (Los ausentes no computan como falla).`:r?`Registra ${Ae} aplazos previos en cursada regular, pero rinde en Modalidad LIBRE.`:`Límite superado: Registra ${Ae} aplazos (más de 3). Debe recursar.`}}const w=b?((ke=f==null?void 0:f.condiciones)==null?void 0:ke.vigenciaTurno)||{cumple:!Ee(b,g),pendiente:!1,detalle:Ee(b,g)?"El período seleccionado ya finalizó.":"El turno seleccionado se encuentra vigente para inscripción."}:{cumple:!1,pendiente:!0,detalle:"Seleccione una instancia de turno para comprobar su vigencia."},de=!!(f&&(r?c!=null&&c.cumple&&(y!=null&&y.cumple)&&(j!=null&&j.cumple):c!=null&&c.cumple&&(j!=null&&j.cumple)&&(p!=null&&p.cumple)&&(F!=null&&F.cumple)&&(y!=null&&y.cumple))),ue=!!(f&&(!t&&L||de&&(w!=null&&w.cumple)&&!(w!=null&&w.pendiente))),me=!!(h&&u&&N&&b&&k),oe=!!(u&&g&&b&&k&&M.some(T=>T.estado!=="BAJA"&&Number(T.id_materia)===Number(u)&&Number(T.anio_turno)===Number(g)&&Number(T.turno_instancia)===Number(b)&&Number(T.id_llamado||1)===Number(k)));return{modalidadEfectiva:n,condReg:c,condCorr:y,condNoAp:j,condPlazo:p,condFallas:F,condVigencia:w,cumpleCondicionesBase:de,aptoEfectivo:ue,todosCamposSeleccionados:me,yaInscriptoEnEsteTurno:oe}};Le.addEventListener("submit",async t=>{var j;if(t.preventDefault(),x)return;if(!h||!u||!N||!b||!k){Q("Por favor complete todos los campos desplegables antes de confirmar la inscripción","error");return}const r=!a.esAlumno&&L;if(r&&!q.trim()){Q("Debe especificar el motivo de la inscripción por excepción","error");return}const{aptoEfectivo:c}=Re();x=!0,Be(),l();const y={id_alumno:Number(h),id_carrera:Number($),id_materia:Number(u),anio_turno:Number(g),turno_instancia:Number(b),id_llamado:Number(k),modalidad:N,es_excepcion:r,motivo_excepcion:r?q:null,tipo_usuario:a.tipoUsuario};try{let p=await fetch(`${_e}/finales/inscribir`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(y)}),F=await p.json();if(!F.success&&c&&!r&&F.message&&F.message.includes("Inscripción rechazada")&&(p=await fetch(`${_e}/finales/inscribir`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...y,es_excepcion:!0,motivo_excepcion:N==="LIBRE"?"Inscripción en Modalidad LIBRE (Correlatividades cumplidas)":"Inscripción ordinaria (Ausentes no computan como falla)"})}),F=await p.json()),F.success){const w=N==="LIBRE"&&!r?"Inscripción en modalidad LIBRE registrada correctamente.":`${((j=F.data)==null?void 0:j.mensaje)||"Inscripción a examen final registrada correctamente."}`;Q(w,"success"),L=!1,q="",await xe(h)}else Q(`${F.message||"No se pudo completar la inscripción"}`,"error")}catch{Q("Error de conexión al intentar inscribir en el servidor","error")}finally{x=!1,ie()}});const Me=()=>{K&&(K.innerHTML="")},Be=()=>{W&&(W.innerHTML=""),ae&&(ae.innerHTML="")},He=()=>{const t=a.esAlumno;Y.innerHTML=`
      <div>
        <h3>Control y Verificación de Inscripciones a Exámenes Finales</h3>
        <p class="tab-description">
          Valida automáticamente el estado de <strong>regularidad</strong> o <strong>correlatividades para modalidad libre</strong>, límite de <strong>8 turnos</strong> desde regularización, tope de <strong>hasta 3 aplazos</strong> (los ausentes no cuentan como falla)${t?"":" y la opción de <strong>inscripción por excepción</strong>"}.
        </p>
      </div>
      ${t?"":`
        <button type="button" id="btnIrListadoGeneral" class="btn btn-primary">
          Ver Listado de Finales Inscriptos
        </button>
      `}
    `;const n=Y.querySelector("#btnIrListadoGeneral");n&&n.addEventListener("click",()=>{d=!0,be()})},Ce=()=>{if(a.esAlumno){qe.style.display="none",Te.style.display="";const n=Oe(),r=pe();Te.innerHTML=`
        <div class="alumno-fijo-group">
          <label for="alumnoFijoInput">Alumno:</label>
          <input
            id="alumnoFijoInput"
            type="text"
            class="input-alumno-bloqueado"
            value="${R(n)}"
            readonly
            disabled
          />
          ${r?`<small class="alumno-fijo-sublabel">DNI: ${R(r.numero_documento||"S/D")} • ${R(r.carrera||"Sin carrera")}</small>`:""}
        </div>
      `}else Te.style.display="none",qe.style.display="",D.update({items:o,selectedId:h});B.update({items:C,selectedId:u,disabled:!h,placeholder:h?"Seleccione o busque una materia por nombre o año...":"Primero seleccione un alumno para listar sus materias..."})},we=()=>{const t=b&&Ee(b,g),n=Ne.map(c=>{const y=Ee(c.id,g),j=`${c.id} - ${c.nombre} ${y?"(Período anterior a hoy - Desactivado)":"🟢 (Período Vigente)"}`;return`<option value="${c.id}" ${y?"disabled":""} ${String(b)===String(c.id)?"selected":""}>${R(j)}</option>`}).join("");I.innerHTML=`
      <div class="label-with-hint">
        <label for="turnoInstancia">Instancia de Turno:</label>
        ${t?'<span class="badge-aviso-desactivado">Período desactivado</span>':""}
      </div>
      <select
        id="turnoInstancia"
        class="${t?"select-desactivado":""}"
        required
      >
        <option value="">-- Seleccione instancia de turno --</option>
        ${n}
      </select>
      ${t?`
        <small class="error-text">
          El período seleccionado corresponde a un momento anterior a hoy y se encuentra deshabilitado para nuevas inscripciones.
        </small>
      `:""}
    `;const r=I.querySelector("#turnoInstancia");r&&r.addEventListener("change",c=>{b=c.target.value?Number(c.target.value):"",we(),l(),fe()})},s=()=>{if(a.esAlumno){Z.style.display="none",Z.innerHTML="";return}Z.style.display="",Z.innerHTML=`
      <label class="checkbox-label">
        <input
          id="chkEsExcepcion"
          type="checkbox"
          ${L?"checked":""}
        />
        <strong>Inscribir por Excepción</strong> (Omite todas las restricciones reglamentarias)
      </label>
      ${L?`
        <input
          id="inputMotivoExcepcion"
          type="text"
          placeholder="Motivo de la excepción (ej: Autorización directiva, mesa especial, etc.)"
          value="${R(q)}"
          class="mt-2"
          required
        />
      `:""}
    `;const n=Z.querySelector("#chkEsExcepcion");n&&n.addEventListener("change",c=>{L=c.target.checked,s(),l(),fe()});const r=Z.querySelector("#inputMotivoExcepcion");r&&r.addEventListener("input",c=>{q=c.target.value})},l=()=>{var ke;const t=a.esAlumno,{modalidadEfectiva:n,condReg:r,condCorr:c,condNoAp:y,condPlazo:j,condFallas:p,condVigencia:F,cumpleCondicionesBase:w,aptoEfectivo:de,todosCamposSeleccionados:ue,yaInscriptoEnEsteTurno:me}=Re(),oe=T=>!f||!T||T.pendiente?"pending":T.cumple?"pass":"fail",re=T=>!f||!T||T.pendiente?"...":T.cumple?"[OK]":"[No cumple]";let ne="";if(!h||!u)ne=`
        <div class="verdict-banner verdict-pending">
          <span>
            <strong>PENDIENTE DE VERIFICACIÓN:</strong> Seleccione alumno, materia, modalidad, turno y llamado para validar la inscripción.
          </span>
        </div>
      `;else if(me){const T=((ke=Ne.find(ee=>ee.id===Number(b)))==null?void 0:ke.nombre)||"";ne=`
        <div class="verdict-banner verdict-pass">
          <span>
            <strong>INSCRIPCIÓN REGISTRADA:</strong> El alumno ya se encuentra inscripto para rendir esta materia en el turno (${R(T)} ${R(g)}) y ${R(k)}° llamado seleccionados.
          </span>
        </div>
      `}else if(_)ne=`
        <div class="verdict-banner verdict-pending">
          <span><strong>VERIFICANDO CONDICIONES...</strong> Consultando historial académico y correlatividades.</span>
        </div>
      `;else if(f){const T=!t&&L||de&&ue?"verdict-pass":w&&!ue?"verdict-pending":"verdict-fail";let ee="";!t&&L?ee="<span><strong>MODO EXCEPCIÓN ACTIVADO:</strong> Se autorizará la inscripción omitiendo las restricciones.</span>":de&&ue?ee=`<span><strong>ALUMNO HABILITADO (${R(n)}):</strong> Cumple con todas las condiciones reglamentarias para rendir.</span>`:w&&!ue?ee=`<span><strong>CONDICIONES ACADÉMICAS CUMPLIDAS (${R(n)}):</strong> Complete la selección de modalidad, instancia de turno y llamado para confirmar.</span>`:ee=`<span><strong>INSCRIPCIÓN BLOQUEADA:</strong> No cumple los requisitos reglamentarios para la modalidad ${R(n)}.${t?"":" Requiere recursar, cambiar a modalidad libre o inscripción por excepción."}</span>`,ne=`<div class="verdict-banner ${T}">${ee}</div>`}else ne=`
        <div class="verdict-banner verdict-fail">
          <span>No se pudo conectar con el servidor de validación. Intente nuevamente.</span>
        </div>
      `;se.innerHTML=`
      <h4>
        Evaluación de Condiciones Reglamentarias${N?` (Modalidad: ${R(n)})`:""}:
      </h4>

      <div class="conditions-grid">
        <div class="condition-card ${oe(r)}">
          <div class="condition-header">
            <span>${re(r)}</span>
            <strong>${n==="LIBRE"?"1. Condición Libre":"1. Estado Regular"}</strong>
          </div>
          <p>${R(r?r.detalle:"Seleccione un alumno y una materia para verificar el estado de regularidad.")}</p>
        </div>

        <div class="condition-card ${oe(y)}">
          <div class="condition-header">
            <span>${re(y)}</span>
            <strong>2. No Aprobada Aún</strong>
          </div>
          <p>${R(y?y.detalle:"Verifica que el estudiante no tenga el examen final ya aprobado.")}</p>
        </div>

        <div class="condition-card ${oe(j)}">
          <div class="condition-header">
            <span>${re(j)}</span>
            <strong>3. Plazo de 8 Turnos</strong>
          </div>
          <p>${R(j?j.detalle:"Verifica que no hayan transcurrido más de 8 turnos desde la regularización.")}</p>
        </div>

        <div class="condition-card ${oe(p)}">
          <div class="condition-header">
            <span>${re(p)}</span>
            <strong>4. Fallas (${p?`${p.cantidadFallas} de 3 máx.`:"Máx. 3 aplazos"})</strong>
          </div>
          <p>${R(p?p.detalle:"Verifica que no supere los 3 aplazos permitidos (los ausentes no computan como falla).")}</p>
        </div>

        <div class="condition-card ${oe(c)}">
          <div class="condition-header">
            <span>${re(c)}</span>
            <strong>5. Correlatividades ${n==="LIBRE"?"(Req. Libre)":"(Previas)"}</strong>
          </div>
          <p>${R(c?c.detalle:"Verifica que el espacio curricular anterior figure regular o con final aprobado.")}</p>
        </div>

        <div class="condition-card ${oe(F)}">
          <div class="condition-header">
            <span>${re(F)}</span>
            <strong>6. Período Vigente</strong>
          </div>
          <p>${R(F?F.detalle:"Seleccione una instancia de turno para comprobar su vigencia.")}</p>
        </div>
      </div>

      ${ne}
    `;const ze=x||me||!ue||!de||_||!(L&&!t)&&Ee(b,g),Ge=de&&ue&&!me?"btn-primary":"btn-secondary";let ge=`Confirmar Inscripción a Final${N?` (${N==="LIBRE"?"Libre":"Regular"})`:""}`;x?ge="Registrando inscripción...":me?ge="Inscripción Ya Registrada en este Turno y Llamado":_?ge="Verificando...":!t&&L&&(ge="Inscribir por Excepción"),le.innerHTML=`
      <button
        type="submit"
        class="btn ${Ge}"
        ${ze?"disabled":""}
      >
        ${R(ge)}
      </button>
    `},V=()=>{if(!M||M.length===0)return[];const t=new Map;M.forEach(r=>{const c=r.id_materia;t.has(c)||t.set(c,{id_materia:c,nombre_materia:r.nombre_materia,anio_regular:r.anio_regular,validado_regular:r.validado_regular,rendiciones:[]}),t.get(c).rendiciones.push(r)});const n=Array.from(t.values());return n.forEach(r=>{r.rendiciones.sort((p,F)=>Number(F.anio_turno)!==Number(p.anio_turno)?Number(F.anio_turno)-Number(p.anio_turno):Number(F.turno_instancia)!==Number(p.turno_instancia)?Number(F.turno_instancia)-Number(p.turno_instancia):Number(F.id_llamado||1)!==Number(p.id_llamado||1)?Number(F.id_llamado||1)-Number(p.id_llamado||1):p.fecha_examen&&F.fecha_examen&&p.fecha_examen!==F.fecha_examen?new Date(F.fecha_examen)-new Date(p.fecha_examen):Number(F.id_rendicion)-Number(p.id_rendicion));const c=r.rendiciones.find(p=>p.estado==="APROBADO"||p.nota!==null&&p.nota>=4),y=r.rendiciones.filter(p=>!p.es_ausente&&p.estado!=="AUSENTE"&&(p.es_falla||p.nota!==null&&p.nota<4||p.estado==="DESAPROBADO")),j=r.rendiciones.some(p=>p.estado==="INSCRIPTO");r.aprobada=!!c,r.notaAprobada=c?c.nota:null,r.cantidadFallas=y.length,r.tieneInscripto=j}),n.sort((r,c)=>r.nombre_materia.localeCompare(c.nombre_materia,"es",{sensitivity:"base"})),n},ce=()=>{const t=a.esAlumno,n=V();let r="";if(!h)r='<p class="empty-text">Seleccione un alumno para visualizar su historial de finales rendidos e inscripciones.</p>';else if(G)r='<p class="loading-text">Cargando historial de finales...</p>';else if(M.length===0)r='<p class="empty-text">El alumno no registra rendiciones ni inscripciones a finales aún.</p>';else{let c="";n.forEach(y=>{const j=y.validado_regular==="T"&&Number(y.anio_regular)>0?`Cursada regular: Ciclo Lectivo ${y.anio_regular}`:"Sin cursada regular registrada";let p='<span class="badge-regular-ok">Sin aplazos (0 fallas)</span>';y.aprobada?p=`<span class="badge-ok">APROBADA (Nota: ${R(y.notaAprobada)})</span>`:y.cantidadFallas>=4?p=`<span class="badge-falla-bloqueada"> ${y.cantidadFallas} Fallas (Debe recursar)</span>`:y.cantidadFallas>0&&(p=`<span class="badge-falla"> ${y.cantidadFallas} Falla${y.cantidadFallas!==1?"s":""} (${y.cantidadFallas}/3 máx.)</span>`);let F="";y.rendiciones.forEach((w,de)=>{const ue=!w.es_ausente&&w.estado!=="AUSENTE"&&(w.es_falla||w.nota!==null&&w.nota<4||w.estado==="DESAPROBADO");let me='<span class="text-muted">Pendiente</span>';w.es_ausente?me='<span class="text-danger font-weight-bold">Ausente</span>':w.nota!==null&&w.nota!==void 0&&(me=`<strong class="${w.nota>=4?"nota-aprobada":"nota-desaprobada"}">${R(w.nota)}</strong>`);let oe='<span class="text-muted">No computa</span>';ue?oe='<span class="badge-falla"> Falla (Aplazo)</span>':w.es_ausente||w.estado==="AUSENTE"?oe='<span class="text-muted">No computa (Ausente)</span>':w.estado==="APROBADO"&&(oe='<span class="badge-ok">Aprobada</span>');let re='<span class="text-muted">Regular</span>';w.modalidad==="LIBRE"||String(w.motivo_excepcion||"").includes("Modalidad LIBRE")?re='<span class="badge-libre">Libre</span>':w.es_excepcion&&!String(w.motivo_excepcion||"").includes("Ausentes no computan")&&(re=`<span class="badge-warning" title="${R(w.motivo_excepcion||"Por excepción")}">Excepción</span>`);const ne=w.fecha_examen?R(String(w.fecha_examen).split("T")[0]):'<span class="text-muted">A rendir</span>';F+=`
            <tr class="${de===0?"fila-mas-reciente":""}">
              <td>
                <span class="badge-id">#${R(w.id_rendicion)}</span>
                ${de===0?'<span class="badge-reciente-tag" title="Instancia más reciente cronológicamente">A tope (Reciente)</span>':""}
              </td>
              <td><strong>${R(w.nombre_instancia)} ${R(w.anio_turno)}</strong></td>
              <td>${R(w.id_llamado)}° Llamado</td>
              <td>${ne}</td>
              <td>
                <span class="status-badge status-${R(String(w.estado||"").toLowerCase())}">
                  ${R(w.estado)}
                </span>
              </td>
              <td>${me}</td>
              <td>${oe}</td>
              <td>${re}</td>
              ${t?"":`
                <td>
                  <button
                    type="button"
                    data-action="calificar-rend"
                    data-id="${R(w.id_rendicion)}"
                    class="btn btn-warning btn-sm"
                    title="Asentar nota o ausencia"
                  >
                    Calificar
                  </button>
                </td>
              `}
            </tr>
          `}),c+=`
          <div class="materia-grupo-card">
            <div class="materia-grupo-header">
              <div class="materia-titulo-box">
                <h4 class="materia-nombre">
                   ${R(y.nombre_materia)}
                </h4>
                <span class="materia-subtitulo">${R(j)}</span>
              </div>

              <div class="materia-resumen-badges">
                <span class="badge-intentos">
                  ${y.rendiciones.length} instancia${y.rendiciones.length!==1?"s":""} / turno${y.rendiciones.length!==1?"s":""}
                </span>
                ${p}
                ${y.tieneInscripto?'<span class="status-badge status-inscripto">Inscripción Activa</span>':""}
              </div>
            </div>

            <div class="table-responsive">
              <table class="custom-table table-materia-rendiciones">
                <thead>
                  <tr>
                    <th style="width: 90px;">#ID</th>
                    <th>Turno e Instancia</th>
                    <th>Llamado</th>
                    <th>Fecha de Examen</th>
                    <th>Estado</th>
                    <th>Nota</th>
                    <th>¿Computa Falla?</th>
                    <th>Condición</th>
                    ${t?"":'<th style="width: 100px;">Acción</th>'}
                  </tr>
                </thead>
                <tbody>
                  ${F}
                </tbody>
              </table>
            </div>
          </div>
        `}),r=`<div class="materias-historial-container">${c}</div>`}Se.innerHTML=`
      <div class="card-header">
        <div class="header-con-resumen">
          <h3>Listado de Finales Rendidos e Inscripciones (${M.length})</h3>
          <span class="badge-count-materias">
            ${n.length} materia${n.length!==1?"s":""} con historial
          </span>
        </div>
        <p class="tab-description">
          Rendiciones <strong>agrupadas por materia</strong> y ordenadas <strong>cronológicamente</strong> (lo más reciente a tope y lo más viejo debajo). <em>Nota: las ausencias no computan como falla.</em>
        </p>
      </div>
      ${r}
    `,Se.querySelectorAll('button[data-action="calificar-rend"]').forEach(c=>{c.addEventListener("click",()=>{const y=Number(c.getAttribute("data-id")),j=M.find(p=>Number(p.id_rendicion)===y);j&&(O=j,z=j.nota||4,U=!!j.es_ausente,te())})})},te=()=>{if(a.esAlumno||!O){v.innerHTML="";return}v.innerHTML=`
      <div class="modal-overlay">
        <div class="card modal-card">
          <div class="card-header">
            <h3>Asentar Calificación de Examen Final</h3>
            <p>
              <strong>${R(O.nombre_materia)}</strong> - ${R(O.nombre_instancia)} ${R(O.anio_turno)}
            </p>
          </div>
          <form id="formCalificarModal" class="form-grid">
            <div class="form-group full-width">
              <label class="checkbox-label">
                <input
                  id="chkAusenteModal"
                  type="checkbox"
                  ${U?"checked":""}
                />
                <strong>Figurar como AUSENTE</strong> (No computa como falla)
              </label>
            </div>

            ${U?"":`
              <div class="form-group full-width">
                <label for="notaModal">Calificación obtenida (1 a 10):</label>
                <input
                  id="notaModal"
                  type="number"
                  min="1"
                  max="10"
                  value="${R(z)}"
                  required
                />
                <small id="helpTextNotaModal" class="help-text">
                  ${z>=4?"🟢 Aprobado (>= 4)":"🔴 Aplazo (< 4, cuenta como falla)"}
                </small>
              </div>
            `}

            <div class="form-actions full-width">
              <button type="submit" class="btn btn-primary">
                Guardar Calificación
              </button>
              <button type="button" id="btnCancelarCalificarModal" class="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    `;const n=v.querySelector("#chkAusenteModal");n&&n.addEventListener("change",j=>{U=j.target.checked,te()});const r=v.querySelector("#notaModal");r&&r.addEventListener("input",j=>{z=Number(j.target.value);const p=v.querySelector("#helpTextNotaModal");p&&(p.textContent=z>=4?"🟢 Aprobado (>= 4)":"🔴 Aplazo (< 4, cuenta como falla)")});const c=v.querySelector("#btnCancelarCalificarModal");c&&c.addEventListener("click",()=>{O=null,te()});const y=v.querySelector("#formCalificarModal");y&&y.addEventListener("submit",async j=>{if(j.preventDefault(),!!O)try{const F=await(await fetch(`${_e}/finales/calificar/${O.id_rendicion}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({nota:U?null:z,es_ausente:U,fecha_examen:new Date().toISOString().split("T")[0]})})).json();F.success?(O=null,te(),Q("Calificación / condición de examen actualizada"),xe(h),fe()):Q(F.message||"Error al calificar","error")}catch{Q("Error al conectar con el servidor","error")}})},be=()=>{!a.esAlumno&&d?(ye.style.display="none",J.style.display="",i=la(J,{alumnos:o,onVolver:()=>{d=!1,be()}})):(J.style.display="none",J.innerHTML="",i=null,ye.style.display="")},ie=()=>{Me(),Be(),be(),He(),Ce(),we(),s(),l(),ce(),te()},je=t=>{o=t||[];const n=Pe();if(n.esAlumno&&o.length>0){const c=(n.idAlumno?o.find(y=>Number(y.id||y.id_alumno)===Number(n.idAlumno)):o[0])||o[0];Ie(c.id||c.id_alumno)}else ie()};o.length>0?je(o):(ie(),fetch(`${_e}/alumnos`).then(t=>t.json()).then(t=>{t.success&&t.data.length>0&&je(t.data)}).catch(()=>{}));const De=()=>{const t=Pe();(t.tipoUsuario!==a.tipoUsuario||t.idAlumno!==a.idAlumno||t.nombreAlumno!==a.nombreAlumno)&&(a=t,Fe())};window.addEventListener("cookie-usuario-actualizada",De),window.addEventListener("focus",De);const ea=setInterval(De,1e3);return{update:(t={})=>{if(t.alumnos&&t.alumnos.length>0){const n=o.length===0;o=t.alumnos,n&&a.esAlumno?Fe():(Ce(),Me(),i&&i.update({alumnos:o}))}},destroy:()=>{window.removeEventListener("cookie-usuario-actualizada",De),window.removeEventListener("focus",De),clearInterval(ea),D&&D.destroy(),B&&B.destroy()}}}const Je="http://localhost:3000/api/alumnos",Ke=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");function ua(e){Ze();let A=Pe(),a=window.ISFTAuth?window.ISFTAuth.getUser():null,d="finales",i=[],o=null,h=!1;e.innerHTML=`
    <header class="navbar">
      <div class="nav-brand">
        <div class="nav-logo-badge" title="ISFT Nº 182">
          <img src="./isft182.jpg" alt="ISFT 182" />
        </div>
        <div class="nav-title-group">
          <h1>Sistema Académico y de Preceptoría</h1>
          <span>ISFT 182 · Exámenes Finales y Alumnos</span>
        </div>
      </div>

      <nav class="nav-links" id="moduleNavTabs">
        <a href="${window.ISFTAuth?.legacyBaseUrl?`${window.ISFTAuth.legacyBaseUrl()}/index.html`:"../../index.html"}" class="nav-button" title="Volver al Home del Portal">
          Home
        </a>
        <span style="color: #cbd5e1; user-select: none;">|</span>
        <button
          type="button"
          id="tabBtnFinales"
          class="nav-button active"
        >
          Control de Exámenes Finales
        </button>
        <button
          type="button"
          id="tabBtnAlumnos"
          class="nav-button"
        >
          Gestión de Alumnos
        </button>
      </nav>

      <div id="navUserBadgeSlot"></div>
    </header>

    <div class="container">
      <header class="main-header">
        <h1>Sistema Académico y de Preceptoría (ISFT 182)</h1>
      </header>

      <div id="vistaFinalesSlot"></div>

      <div id="vistaAlumnosSlot" style="display: none;">
        <div class="layout-grid">
          <div id="formularioAlumnoSlot"></div>
          <div id="buscadorAlumnosSlot"></div>
        </div>
        <div id="listaAlumnosSlot" class="mt-4"></div>
      </div>
    </div>
  `;const $=e.querySelector("#navUserBadgeSlot"),C=e.querySelector("#tabBtnFinales"),u=e.querySelector("#tabBtnAlumnos"),N=e.querySelector("#vistaFinalesSlot"),b=e.querySelector("#vistaAlumnosSlot"),k=e.querySelector("#formularioAlumnoSlot"),P=e.querySelector("#buscadorAlumnosSlot"),g=e.querySelector("#listaAlumnosSlot"),L=()=>{var J,ye;A=Pe();const D=A.esAlumno;D?(u.style.display="none",d!=="finales"&&(d="finales")):u.style.display="";let B=a?`${a.firstName||""} ${a.lastName||""}`.trim():"Preceptoría ISFT 182",K=(a==null?void 0:a.role)||"Personal de Gestión",W=(((J=a==null?void 0:a.firstName)==null?void 0:J[0])||"P").toUpperCase();if(D){const Y=i.find(Le=>Number(Le.id||Le.id_alumno)===Number(A.idAlumno))||i[0];Y?(B=`${Y.apellido||Y.primer_apellido||""}, ${Y.nombre||Y.primer_nombre||""}`.trim(),K=`Estudiante · Leg. ${Y.legajo||"—"}`,W=(Y.apellido||Y.primer_apellido||"E").charAt(0).toUpperCase()):(B=A.nombreAlumno||B||"Estudiante",K="Estudiante Registrado",W="ES")}$.innerHTML=`
      <div class="nav-user-actions">
        <div class="nav-user-badge" style="display: flex; align-items: center; gap: 0.65rem; padding: 0.35rem 0.75rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--primary); color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.82rem; flex-shrink: 0;">
            ${Ke(W)}
          </div>
          <div style="display: flex; flex-direction: column; text-align: left; line-height: 1.2;">
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-main); white-space: nowrap;">
              ${Ke(B)}
            </span>
            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; white-space: nowrap;">
              ${Ke(K)}
            </span>
          </div>
        </div>
        <button type="button" id="btnSistemaLogout" class="btn-nav-logout" title="Cerrar sesión institucional">
          Salir
        </button>
      </div>
    `,(ye=$.querySelector("#btnSistemaLogout"))==null||ye.addEventListener("click",()=>{window.ISFTAuth&&window.ISFTAuth.logout(window.ISFTAuth?.legacyBaseUrl?window.ISFTAuth.legacyBaseUrl()+"/index.html":"../../index.html")}),f()};window.ISFTAuth&&window.ISFTAuth.requireAuth(window.ISFTAuth?.legacyBaseUrl?window.ISFTAuth.legacyBaseUrl()+"/index.html":"../../index.html").then(D=>{D&&(a=D,L())});const q=(D,B="success")=>{window.ISFTNotify&&window.ISFTNotify(D,B)},f=()=>{d==="finales"?(C.classList.add("active"),u.classList.remove("active"),N.style.display="",b.style.display="none"):(C.classList.remove("active"),u.classList.add("active"),N.style.display="none",b.style.display="")};C.addEventListener("click",()=>{d="finales",f()}),u.addEventListener("click",()=>{A.esAlumno||(d="alumnos",f())});const _=da(N,{alumnos:i}),x=async D=>{var B;try{if(o){const W=await(await fetch(`${Je}/${o.id||o.id_alumno}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(D)})).json();W.success?(q("Alumno actualizado correctamente"),o=null,G.update({alumnoSeleccionado:o}),U()):q(W.message||"Error al actualizar","error")}else{const W=await(await fetch(Je,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(D)})).json();if(W.success){const J=W.usuario_creado||((B=W.data)==null?void 0:B.usuario_creado);J!=null&&J.creado?q(`Alumno registrado con éxito. Cuenta creada: ${J.email} (contraseña inicial: ${J.password_inicial})`,"success"):J&&!J.creado?q(`Alumno registrado con éxito. ${J.motivo||""}`.trim(),"warning"):q("Alumno registrado con éxito."),U()}else q(W.message||"Error al crear","error")}}catch{q("Error de conexión al guardar alumno","error")}},M=async D=>{if(window.confirm(`¿Está seguro de eliminar al alumno #${D}?`))try{const K=await(await fetch(`${Je}/${D}`,{method:"DELETE"})).json();K.success?(q("Alumno eliminado correctamente"),o&&(o.id===D||o.id_alumno===D)&&(o=null,G.update({alumnoSeleccionado:o})),U()):q(K.message||"Error al eliminar","error")}catch{q("Error al conectar con el servidor","error")}},G=ia(k,{alumnoSeleccionado:o,onGuardar:x,onCancelar:()=>{o=null,G.update({alumnoSeleccionado:o})}}),O=sa(P,{alumnos:i,onEditar:D=>{o=D,G.update({alumnoSeleccionado:o})}}),z=na(g,{alumnos:i,cargando:h,onEditar:D=>{o=D,G.update({alumnoSeleccionado:o})},onEliminar:M}),U=async()=>{h=!0,z.update({alumnos:i,cargando:h});try{const B=await(await fetch(Je)).json();B.success?(i=B.data,_.update({alumnos:i}),O.update({alumnos:i}),L()):q(B.message||"Error al cargar alumnos","error")}catch{q("No se pudo conectar con el servidor.","error")}finally{h=!1,z.update({alumnos:i,cargando:h})}};window.addEventListener("cookie-usuario-actualizada",L),window.addEventListener("focus",L),setInterval(L,1e3),L(),U()}const We=document.getElementById("root");We&&ua(We);
