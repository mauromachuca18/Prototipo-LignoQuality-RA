// --- COMPONENTE A-FRAME PARA DETECTAR EL MARCADOR ---
AFRAME.registerComponent('controlador-marcador', {
    init: function () {
        // Cuando la cámara enfoca el marcador Hiro
        this.el.addEventListener('markerFound', () => {
            iniciarEscaneoSimulado();
        });
        
        // Cuando la cámara pierde el marcador Hiro
        this.el.addEventListener('markerLost', () => {
            pausarEscaneoSimulado();
        });
    }
});

// --- VARIABLES GLOBALES ---
let historialEscaneos = []; 
let datosActuales = null;   
let temporizadorEscaneo;      // Controla los 2.5 segundos
let escaneoCompletado = false; // Evita escanear dos veces la misma madera

// --- 1. PREPARAR DATOS (Al tocar "Iniciar Escaneo" en el menú) ---
async function prepararEscaneo(tipoSeleccionado) {
    try {
        const respuesta = await fetch('./datos.json');
        const baseDeDatos = await respuesta.json();
        datosActuales = baseDeDatos[tipoSeleccionado];
        
        // Reseteamos la interfaz (por si estaba viendo otra madera antes)
        reiniciarInterfazHUD();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

// --- 2. LÓGICA DE SIMULACIÓN DE ESCANEO (Tiempo Real) ---
function iniciarEscaneoSimulado() {
    // Si ya terminó de escanear o no hay datos cargados, no hace nada
    if (escaneoCompletado || !datosActuales) return;

    const hudTitulo = document.getElementById('hud-titulo');
    const hudEscaneando = document.getElementById('hud-escaneando');
    const hud2d = document.getElementById('hud-2d');

    // Cambiamos UI a estado "Escaneando"
    hudTitulo.innerText = "PROCESANDO SENSORES...";
    hudTitulo.style.color = "var(--color-cyan-ar)";
    hud2d.style.borderColor = "var(--color-cyan-ar)";
    hudEscaneando.style.display = "block";

    // Iniciamos el cronómetro de 2.5 segundos
    temporizadorEscaneo = setTimeout(() => {
        // Al terminar el tiempo:
        escaneoCompletado = true;
        hudEscaneando.style.display = "none";
        
        // Mostramos los resultados y guardamos en historial
        mostrarResultadosEnPantalla(datosActuales);
        registrarEnHistorial(datosActuales);
    }, 2500);
}

function pausarEscaneoSimulado() {
    // Si pierde la madera de vista antes de los 2.5 seg, abortamos
    if (!escaneoCompletado) {
        clearTimeout(temporizadorEscaneo); // Detenemos el cronómetro
        reiniciarInterfazHUD();            // Volvemos a estado de espera
    }
}

function reiniciarInterfazHUD() {
    escaneoCompletado = false;
    clearTimeout(temporizadorEscaneo);

    document.getElementById('hud-titulo').innerText = "ESPERANDO MUESTRA...";
    document.getElementById('hud-titulo').style.color = "#cbd5e1";
    document.getElementById('hud-2d').style.borderColor = "#94a3b8";
    
    document.getElementById('hud-escaneando').style.display = "none";
    document.getElementById('hud-datos').style.display = "none";
    document.getElementById('btn-generar-qr').style.display = "none";
    document.getElementById('zona-defecto').setAttribute('visible', false);
}

// --- 3. MOSTRAR RESULTADOS (Después de los 2.5 segundos) ---
function mostrarResultadosEnPantalla(datos) {
    const hudDatos = document.getElementById('hud-datos');
    const hudTitulo = document.getElementById('hud-titulo');
    const hud2d = document.getElementById('hud-2d');

    // Mostramos los textos
    hudDatos.style.display = "block";
    document.getElementById('btn-generar-qr').style.display = "block"; // Habilitamos el botón QR
    hudTitulo.innerText = "RESULTADO DE ANÁLISIS";

    document.getElementById('hud-especie').innerText = `Especie: ${datos.especie}`;
    document.getElementById('hud-humedad').innerText = `Humedad: ${datos.humedad}`;
    document.getElementById('hud-defectos').innerText = `Defectos: ${datos.defectos}`;
    
    const textoCalidad = document.getElementById('hud-calidad');
    textoCalidad.innerText = `CALIDAD: ${datos.calidad}`;
    
    // Colores de los resultados en el HUD oscuro
    if(datos.calidad === "PREMIUM"){
        textoCalidad.style.color = '#00ff00'; 
        hud2d.style.borderColor = '#00ff00';
        hudTitulo.style.color = '#00ff00';  
    } else if(datos.calidad === "MEDIA"){
        textoCalidad.style.color = '#ffff00'; 
        hud2d.style.borderColor = '#ffff00';
        hudTitulo.style.color = '#ffff00';
    } else {
        textoCalidad.style.color = '#ff0000'; 
        hud2d.style.borderColor = '#ff0000';
        hudTitulo.style.color = '#ff0000';
    }

    // Activamos el anillo 3D sobre la madera
    const zonaDefecto = document.getElementById('zona-defecto');
    const anilloDefecto = document.getElementById('anillo-defecto');
    const textoZona = document.getElementById('texto-zona');

    if (datos.mostrarDefecto) {
        zonaDefecto.setAttribute('visible', true);
        zonaDefecto.setAttribute('position', datos.posicionDefecto);
        
        if (datos.tipoDefecto === 'humedad') {
            anilloDefecto.setAttribute('color', '#00eaf1'); 
            textoZona.setAttribute('value', 'ZONA HUMEDA');
            textoZona.setAttribute('color', '#00eaf1');
        } else {
            anilloDefecto.setAttribute('color', '#ef4444'); 
            textoZona.setAttribute('value', 'ALERTA: GRIETA');
            textoZona.setAttribute('color', '#ef4444');
        }
    }
}

// --- LÓGICA DEL HISTORIAL ---
function registrarEnHistorial(datos) {
    const ahora = new Date();
    const horaFormateada = ahora.getHours() + ':' + ahora.getMinutes().toString().padStart(2, '0');
    historialEscaneos.push({ hora: horaFormateada, especie: datos.especie, calidad: datos.calidad });
    actualizarTablaHistorial();
}

function actualizarTablaHistorial() {
    const tbody = document.querySelector('#tabla-historial tbody');
    tbody.innerHTML = ''; 
    if(historialEscaneos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay escaneos en este turno</td></tr>';
        return;
    }
    const historialInvertido = [...historialEscaneos].reverse();
    historialInvertido.forEach(item => {
        let colorLegible = "#ef4444"; 
        if(item.calidad === "PREMIUM") colorLegible = "#1b6e49"; 
        if(item.calidad === "MEDIA") colorLegible = "#d97706";   

        tbody.innerHTML += `<tr><td>${item.hora}</td><td>${item.especie}</td><td style="color: ${colorLegible}; font-weight: bold;">${item.calidad}</td></tr>`;
    });
}

// --- CÓDIGO QR ---
function generarQR() {
    if(!datosActuales) return;
    const textoQR = `LignoQuality RA - Trazabilidad\nEspecie: ${datosActuales.especie}\nHumedad: ${datosActuales.humedad}\nDefectos: ${datosActuales.defectos}\nCalidad: ${datosActuales.calidad}`;
    const urlAPI = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(textoQR)}`;
    
    document.getElementById('imagen-qr').src = urlAPI;
    const textoCalidad = document.getElementById('texto-qr-calidad');
    textoCalidad.innerText = `CALIDAD: ${datosActuales.calidad}`;
    
    if(datosActuales.calidad === "PREMIUM"){ textoCalidad.style.color = '#1b6e49'; } 
    else if(datosActuales.calidad === "MEDIA"){ textoCalidad.style.color = '#d97706'; } 
    else { textoCalidad.style.color = '#ef4444'; }

    document.getElementById('modal-qr').style.display = 'flex';
}

// --- CONTROLADORES UI/UX (Botones) ---
document.addEventListener('DOMContentLoaded', () => {
    const pantallaInicio = document.getElementById('pantalla-inicio');
    const interfazAR = document.getElementById('interfaz-ar');
    const menuLateral = document.getElementById('menu-lateral');
    const overlayMenu = document.getElementById('overlay-menu');
    const modales = document.querySelectorAll('.modal');

    function abrirMenu() { menuLateral.classList.add('abierto'); overlayMenu.classList.add('abierto'); }
    function cerrarMenu() { menuLateral.classList.remove('abierto'); overlayMenu.classList.remove('abierto'); }
    function mostrarModal(idModal) { cerrarMenu(); modales.forEach(m => m.style.display = 'none'); document.getElementById(idModal).style.display = 'flex'; }

    document.getElementById('btn-hamburger').addEventListener('click', abrirMenu);
    overlayMenu.addEventListener('click', cerrarMenu);

    document.getElementById('opt-nueva-muestra').addEventListener('click', () => {
        cerrarMenu();
        modales.forEach(m => m.style.display = 'none'); 
        interfazAR.style.display = 'none'; 
        
        pantallaInicio.style.display = 'flex';
        setTimeout(() => { pantallaInicio.style.opacity = '1'; }, 50);
    });

    document.getElementById('opt-analisis').addEventListener('click', () => { cerrarMenu(); modales.forEach(m => m.style.display = 'none'); });
    document.getElementById('opt-reporte').addEventListener('click', () => mostrarModal('modal-reporte'));
    document.getElementById('opt-historial').addEventListener('click', () => mostrarModal('modal-historial'));
    
    document.getElementById('btn-iniciar').addEventListener('click', () => {
        const seleccion = document.getElementById('selector-madera').value;
        prepararEscaneo(seleccion); // Carga datos, pero NO los muestra aún
        
        pantallaInicio.style.opacity = '0';
        setTimeout(() => {
            pantallaInicio.style.display = 'none';
            interfazAR.style.display = 'block';
        }, 500);
    });

    document.getElementById('btn-cerrar-historial').addEventListener('click', () => document.getElementById('modal-historial').style.display = 'none');
    document.getElementById('btn-cerrar-reporte').addEventListener('click', () => document.getElementById('modal-reporte').style.display = 'none');
    document.getElementById('btn-cerrar-qr').addEventListener('click', () => document.getElementById('modal-qr').style.display = 'none');
    document.getElementById('btn-generar-qr').addEventListener('click', generarQR);
});