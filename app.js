// --- COMPONENTE A-FRAME PARA DETECTAR EL MARCADOR ---
AFRAME.registerComponent('controlador-marcador', {
    init: function () {
        this.el.addEventListener('markerFound', () => { iniciarEscaneoSimulado(); });
        this.el.addEventListener('markerLost', () => { pausarEscaneoSimulado(); });
    }
});

// --- VARIABLES GLOBALES ---
let historialEscaneos = []; 
let datosActuales = null;   
let temporizadorEscaneo;      
let escaneoCompletado = false; 

// --- 1. PREPARAR DATOS ---
async function prepararEscaneo(tipoSeleccionado) {
    try {
        const respuesta = await fetch('./datos.json');
        const baseDeDatos = await respuesta.json();
        datosActuales = baseDeDatos[tipoSeleccionado];
        reiniciarInterfazHUD();
    } catch (error) {
        console.error("Error al cargar datos:", error);
    }
}

// --- 2. LÓGICA DE SIMULACIÓN DE ESCANEO ---
function iniciarEscaneoSimulado() {
    if (escaneoCompletado || !datosActuales) return;

    const hudTitulo = document.getElementById('hud-titulo');
    const hudEscaneando = document.getElementById('hud-escaneando');
    const hud2d = document.getElementById('hud-2d');

    hudTitulo.innerText = "PROCESANDO SENSORES...";
    hudTitulo.style.color = "var(--color-cyan-ar)";
    hud2d.style.borderColor = "var(--color-cyan-ar)";
    hudEscaneando.style.display = "block";

    temporizadorEscaneo = setTimeout(() => {
        escaneoCompletado = true;
        hudEscaneando.style.display = "none";
        
        mostrarResultadosEnPantalla(datosActuales);
        registrarEnHistorial(datosActuales);
    }, 2500);
}

function pausarEscaneoSimulado() {
    if (!escaneoCompletado) {
        clearTimeout(temporizadorEscaneo); 
        reiniciarInterfazHUD();            
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

// --- 3. MOSTRAR RESULTADOS ---
function mostrarResultadosEnPantalla(datos) {
    const hudDatos = document.getElementById('hud-datos');
    const hudTitulo = document.getElementById('hud-titulo');
    const hud2d = document.getElementById('hud-2d');

    hudDatos.style.display = "block";
    document.getElementById('btn-generar-qr').style.display = "block"; 
    hudTitulo.innerText = "RESULTADO DE ANÁLISIS";

    document.getElementById('hud-especie').innerText = `Especie: ${datos.especie}`;
    document.getElementById('hud-humedad').innerText = `Humedad: ${datos.humedad}`;
    document.getElementById('hud-defectos').innerText = `Defectos: ${datos.defectos}`;
    
    const textoCalidad = document.getElementById('hud-calidad');
    textoCalidad.innerText = `CALIDAD: ${datos.calidad}`;
    
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
        // AQUÍ CORREGIMOS EL COLOR AMARILLO ILEGIBLE DEL HISTORIAL
        let colorLegible = "#ef4444"; 
        if(item.calidad === "PREMIUM") colorLegible = "#1b6e49"; 
        if(item.calidad === "MEDIA") colorLegible = "#d97706"; // Naranja oscuro para leer en fondo crema

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
    // Pantallas principales
    const pantallaBienvenida = document.getElementById('pantalla-bienvenida');
    const pantallaInicio = document.getElementById('pantalla-inicio');
    const interfazAR = document.getElementById('interfaz-ar');
    
    // Menú y Modales
    const menuLateral = document.getElementById('menu-lateral');
    const overlayMenu = document.getElementById('overlay-menu');
    const modales = document.querySelectorAll('.modal');

    // 1. TRANSICIÓN DE BIENVENIDA A CONFIGURACIÓN
    document.getElementById('btn-ingresar').addEventListener('click', () => {
        pantallaBienvenida.style.opacity = '0';
        setTimeout(() => {
            pantallaBienvenida.style.display = 'none';
            pantallaInicio.style.display = 'flex'; // Mostramos el panel de seleccionar madera
            // Pequeño efecto de aparición suave
            pantallaInicio.style.opacity = '0';
            setTimeout(() => { pantallaInicio.style.opacity = '1'; }, 50);
        }, 500);
    });

    function abrirMenu() { menuLateral.classList.add('abierto'); overlayMenu.classList.add('abierto'); }
    function cerrarMenu() { menuLateral.classList.remove('abierto'); overlayMenu.classList.remove('abierto'); }
    function mostrarModal(idModal) { cerrarMenu(); modales.forEach(m => m.style.display = 'none'); document.getElementById(idModal).style.display = 'flex'; }

    document.getElementById('btn-hamburger').addEventListener('click', abrirMenu);
    overlayMenu.addEventListener('click', cerrarMenu);

    // Volver a elegir madera (desde el menú hamburguesa)
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
    
    // 2. INICIAR LA CÁMARA RA
    document.getElementById('btn-iniciar').addEventListener('click', () => {
        const seleccion = document.getElementById('selector-madera').value;
        prepararEscaneo(seleccion); 
        
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