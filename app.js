// --- VARIABLES GLOBALES DEL SISTEMA ---
let historialEscaneos = []; 
let datosActuales = null;   

// --- CONEXIÓN CON JSON ("SENSORES") ---
async function obtenerDatosMadera(tipoSeleccionado) {
    try {
        const respuesta = await fetch('./datos.json');
        const baseDeDatos = await respuesta.json();
        datosActuales = baseDeDatos[tipoSeleccionado];
        
        actualizarPantallaRA(datosActuales);
        registrarEnHistorial(datosActuales); 
    } catch (error) {
        console.error("Error al conectar con los sensores:", error);
    }
}

// --- ACTUALIZACIÓN DE INTERFAZ (HUD 2D) Y RA (Anillos) ---
function actualizarPantallaRA(datos) {
    // 1. Actualizamos el NUEVO HUD 2D en pantalla (Pego el código HTML nuevo)
    const hud2d = document.getElementById('hud-2d');
    document.getElementById('hud-especie').innerText = `Especie: ${datos.especie}`;
    document.getElementById('hud-humedad').innerText = `Humedad: ${datos.humedad}`;
    document.getElementById('hud-defectos').innerText = `Defectos: ${datos.defectos}`;
    
    const textoCalidad = document.getElementById('hud-calidad');
    textoCalidad.innerText = `CALIDAD: ${datos.calidad}`;
    
    // Mantenemos los colores tradicionales para el estado de calidad (red/yellow/forest green)
    if(datos.calidad === "PREMIUM"){
        textoCalidad.style.color = '#1b6e49'; // Verde foresta para Premium
        hud2d.style.borderColor = '#1b6e49';  // Pintamos el borde del panel del mismo color
    } else if(datos.calidad === "MEDIA"){
        textoCalidad.style.color = '#f59e0b'; // Amarillo para Media
        hud2d.style.borderColor = '#f59e0b';
    } else {
        textoCalidad.style.color = '#ef4444'; // Rojo para Baja
        hud2d.style.borderColor = '#ef4444';
    }

    // 2. Lógica de los Anillos 3D (Sobre la madera, se mantiene igual)
    const zonaDefecto = document.getElementById('zona-defecto');
    const anilloDefecto = document.getElementById('anillo-defecto');
    const textoZona = document.getElementById('texto-zona');

    if (datos.mostrarDefecto) {
        zonaDefecto.setAttribute('visible', true);
        zonaDefecto.setAttribute('position', datos.posicionDefecto);
        
        if (datos.tipoDefecto === 'humedad') {
            anilloDefecto.setAttribute('color', '#00eaf1'); // Cian para humedad
            textoZona.setAttribute('value', 'ZONA HUMEDA');
            textoZona.setAttribute('color', '#00eaf1');
        } else {
            anilloDefecto.setAttribute('color', '#ef4444'); // Rojo para grieta
            textoZona.setAttribute('value', 'ALERTA: GRIETA');
            textoZona.setAttribute('color', '#ef4444');
        }
    } else {
        zonaDefecto.setAttribute('visible', false);
    }
}

// --- LÓGICA DEL HISTORIAL ---
function registrarEnHistorial(datos) {
    const ahora = new Date();
    const horaFormateada = ahora.getHours() + ':' + ahora.getMinutes().toString().padStart(2, '0');
    historialEscaneos.push({ hora: horaFormateada, especie: datos.especie, calidad: datos.calidad, color: datos.colorCubo });
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
        tbody.innerHTML += `<tr><td>${item.hora}</td><td>${item.especie}</td><td style="color: ${item.color}; font-weight: bold;">${item.calidad}</td></tr>`;
    });
}

// --- CÓDIGO QR ---
function generarQR() {
    if(!datosActuales) return;
    const textoQR = `LignoQuality RA Trazabilidad\nEspecie: ${datosActuales.especie}\nHumedad: ${datosActuales.humedad}\nDefectos: ${datosActuales.defectos}\nCalidad: ${datosActuales.calidad}`;
    const urlAPI = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(textoQR)}`;
    
    document.getElementById('imagen-qr').src = urlAPI;
    const textoCalidad = document.getElementById('texto-qr-calidad');
    textoCalidad.innerText = `CALIDAD: ${datosActuales.calidad}`;
    
    // Asignamos color al texto del QR
    if(datosActuales.calidad === "PREMIUM"){ textoCalidad.style.color = '#1b6e49'; } 
    else if(datosActuales.calidad === "MEDIA"){ textoCalidad.style.color = '#f59e0b'; } 
    else { textoCalidad.style.color = '#ef4444'; }

    document.getElementById('modal-qr').style.display = 'flex';
}

// --- CONTROLADOR DE LA INTERFAZ Y BOTONES (UI/UX) ---
document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos los elementos
    const pantallaInicio = document.getElementById('pantalla-inicio');
    const interfazAR = document.getElementById('interfaz-ar');
    const menuLateral = document.getElementById('menu-lateral');
    const overlayMenu = document.getElementById('overlay-menu');
    const modales = document.querySelectorAll('.modal');

    // Funciones para el menú
    function abrirMenu() { menuLateral.classList.add('abierto'); overlayMenu.classList.add('abierto'); }
    function cerrarMenu() { menuLateral.classList.remove('abierto'); overlayMenu.classList.remove('abierto'); }

    // Función para cambiar de "Pantalla" (Análisis vs otros modales)
    function mostrarModal(idModal) {
        cerrarMenu(); // Cerramos el menú primero
        modales.forEach(m => m.style.display = 'none'); // Cerramos cualquier otro modal
        document.getElementById(idModal).style.display = 'flex'; // Abrimos el seleccionado
    }

    // --- EVENTOS HAMBURGUESA ---
    document.getElementById('btn-hamburger').addEventListener('click', abrirMenu);
    overlayMenu.addEventListener('click', cerrarMenu);

    // --- ACCIONES DEL MENÚ LATERAL ---
    document.getElementById('opt-analisis').addEventListener('click', () => {
        cerrarMenu();
        modales.forEach(m => m.style.display = 'none'); // Volvemos a la vista limpia de cámara
    });

    document.getElementById('opt-reporte').addEventListener('click', () => mostrarModal('modal-reporte'));
    document.getElementById('opt-historial').addEventListener('click', () => mostrarModal('modal-historial'));
    
    // Acciones simuladas con alert para no congelar la cámara (Mejor que prompt 11)
    document.getElementById('opt-lotes').addEventListener('click', () => { cerrarMenu(); setTimeout(() => alert('Creando Nuevo Lote...'), 50); });
    document.getElementById('opt-settings').addEventListener('click', () => { cerrarMenu(); setTimeout(() => alert('Abriendo Configuración de Sensores...'), 50); });


    // --- PANTALLA INICIO Y CONFIG ---
    document.getElementById('btn-iniciar').addEventListener('click', () => {
        const seleccion = document.getElementById('selector-madera').value;
        obtenerDatosMadera(seleccion);
        
        pantallaInicio.style.opacity = '0';
        setTimeout(() => {
            pantallaInicio.style.display = 'none';
            interfazAR.style.display = 'block';
        }, 500);
    });

    // --- CERRAR MODALES ---
    document.getElementById('btn-cerrar-historial').addEventListener('click', () => document.getElementById('modal-historial').style.display = 'none');
    document.getElementById('btn-cerrar-reporte').addEventListener('click', () => document.getElementById('modal-reporte').style.display = 'none');
    document.getElementById('btn-cerrar-qr').addEventListener('click', () => document.getElementById('modal-qr').style.display = 'none');

    // --- GENERADOR DE QR ---
    document.getElementById('btn-generar-qr').addEventListener('click', generarQR);
});