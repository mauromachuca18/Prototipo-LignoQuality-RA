// --- VARIABLES GLOBALES ---
let historialEscaneos = []; 
let datosActuales = null;  

// --- CONEXIÓN CON JSON ---
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

// --- ACTUALIZACIÓN DE INTERFAZ Y REALIDAD AUMENTADA ---
function actualizarPantallaRA(datos) {
    // 1. Actualizamos el NUEVO panel 2D en la pantalla
    document.getElementById('hud-especie').innerText = `Especie: ${datos.especie}`;
    document.getElementById('hud-humedad').innerText = `Humedad: ${datos.humedad}`;
    document.getElementById('hud-defectos').innerText = `Defectos: ${datos.defectos}`;
    
    const textoCalidad = document.getElementById('hud-calidad');
    textoCalidad.innerText = `CALIDAD: ${datos.calidad}`;
    textoCalidad.style.color = datos.colorCubo; // Pinta la letra de color
    
    // Cambiamos el color de la rayita superior del panel
    document.getElementById('hud-2d').style.borderTopColor = datos.colorCubo;

    // 2. Lógica del Anillo 3D (Se mantiene igual, sobre la madera)
    const zonaDefecto = document.getElementById('zona-defecto');
    const anilloDefecto = document.getElementById('anillo-defecto');
    const textoZona = document.getElementById('texto-zona');

    if (datos.mostrarDefecto) {
        zonaDefecto.setAttribute('visible', true);
        zonaDefecto.setAttribute('position', datos.posicionDefecto);

        if (datos.tipoDefecto === 'humedad') {
            anilloDefecto.setAttribute('color', '#00D2FF'); 
            textoZona.setAttribute('value', 'ZONA HUMEDA');
            textoZona.setAttribute('color', '#00D2FF');
        } else {
            anilloDefecto.setAttribute('color', '#FF0000'); 
            textoZona.setAttribute('value', 'ALERTA: GRIETA');
            textoZona.setAttribute('color', '#FF0000');
        }
    } else {
        zonaDefecto.setAttribute('visible', false);
    }
}

// --- HISTORIAL ---
function registrarEnHistorial(datos) {
    const ahora = new Date();
    const horaFormateada = ahora.getHours() + ':' + ahora.getMinutes().toString().padStart(2, '0');
    historialEscaneos.push({ hora: horaFormateada, especie: datos.especie, calidad: datos.calidad, color: datos.colorCubo });
    actualizarTablaHistorial();
}

function actualizarTablaHistorial() {
    const tbody = document.querySelector('#tabla-historial tbody');
    tbody.innerHTML = ''; 
    if (historialEscaneos.length === 0) {
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
    if (!datosActuales) return;
    const textoQR = `LignoQuality RA - Trazabilidad\nEspecie: ${datosActuales.especie}\nHumedad: ${datosActuales.humedad}\nDefectos: ${datosActuales.defectos}\nCalidad Final: ${datosActuales.calidad}`;
    const urlAPI = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(textoQR)}`;
    
    document.getElementById('imagen-qr').src = urlAPI;
    const textoCalidad = document.getElementById('texto-qr-calidad');
    textoCalidad.innerText = `CALIDAD: ${datosActuales.calidad}`;
    textoCalidad.style.color = datosActuales.colorCubo;

    document.getElementById('modal-qr').style.display = 'flex';
}

// --- CONTROLADOR DE EVENTOS ---
document.addEventListener('DOMContentLoaded', () => {
    actualizarTablaHistorial();

    const pantallaInicio = document.getElementById('pantalla-inicio');
    const interfazAR = document.getElementById('interfaz-ar');

    document.getElementById('btn-iniciar').addEventListener('click', () => {
        const seleccion = document.getElementById('selector-madera').value;
        obtenerDatosMadera(seleccion);

        pantallaInicio.style.opacity = '0';
        setTimeout(() => {
            pantallaInicio.style.display = 'none';
            interfazAR.style.display = 'block';
        }, 500);
    });

    document.getElementById('btn-volver').addEventListener('click', () => {
        interfazAR.style.display = 'none';
        pantallaInicio.style.display = 'flex';
        setTimeout(() => { pantallaInicio.style.opacity = '1'; }, 50);
    });

    // Control Historial
    const modalHistorial = document.getElementById('modal-historial');
    document.getElementById('btn-abrir-historial').addEventListener('click', () => modalHistorial.style.display = 'flex');
    document.getElementById('btn-cerrar-historial').addEventListener('click', () => modalHistorial.style.display = 'none');

    // Control QR y solución al congelamiento de cámara (Eliminamos el alert)
    document.getElementById('btn-generar-qr').addEventListener('click', generarQR);
    document.getElementById('btn-cerrar-qr').addEventListener('click', () => document.getElementById('modal-qr').style.display = 'none');
    
    // Botón de imprimir simulado sin alert()
    document.getElementById('btn-imprimir').addEventListener('click', (e) => {
        const btn = e.target;
        btn.innerText = "¡Enviado a Impresora!";
        btn.style.backgroundColor = "#00ff00";
        setTimeout(() => {
            btn.innerText = "IMPRIMIR ETIQUETA";
            btn.style.backgroundColor = "#00D2FF";
        }, 2000);
    });
});