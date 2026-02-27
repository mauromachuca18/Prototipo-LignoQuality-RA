// --- VARIABLES GLOBALES DEL SISTEMA ---
let historialEscaneos = []; // Aquí guardaremos las maderas escaneadas
let datosActuales = null;   // Guarda la madera que se está viendo en cámara ahora mismo

// --- CONEXIÓN CON LOS "SENSORES" (JSON) ---
async function obtenerDatosMadera(tipoSeleccionado) {
    try {
        const respuesta = await fetch('./datos.json');
        const baseDeDatos = await respuesta.json();
        datosActuales = baseDeDatos[tipoSeleccionado];

        actualizarPantallaRA(datosActuales);
        registrarEnHistorial(datosActuales); // Guardamos el escaneo
    } catch (error) {
        console.error("Error al conectar con los sensores:", error);
    }
}

// --- ACTUALIZACIÓN DE LA REALIDAD AUMENTADA ---
function actualizarPantallaRA(datos) {
    document.getElementById('campo-especie').setAttribute('value', `Especie: ${datos.especie}`);
    document.getElementById('campo-humedad').setAttribute('value', `Humedad: ${datos.humedad}`);
    document.getElementById('campo-defectos').setAttribute('value', `Defectos: ${datos.defectos}`);
    document.getElementById('campo-calidad').setAttribute('value', `CALIDAD: ${datos.calidad}`);

    document.getElementById('campo-calidad').setAttribute('color', datos.colorCubo);
    document.getElementById('linea-color').setAttribute('color', datos.colorCubo);

    // --- LÓGICA DE MAPEO ESPACIAL DE DEFECTOS ---
    const zonaDefecto = document.getElementById('zona-defecto');
    const anilloDefecto = document.getElementById('anillo-defecto');
    const textoZona = document.getElementById('texto-zona');

    if (datos.mostrarDefecto) {
        // Hacemos visible el holograma
        zonaDefecto.setAttribute('visible', 'true');

        // Lo movemos a la coordenada exacta que dijo el radar/sensor
        zonaDefecto.setAttribute('position', datos.posicionDefecto);

        // Cambiamos el color y texto según si es humedad o grieta
        if (datos.tipoDefecto === 'humedad') {
            anilloDefecto.setAttribute('color', '#00D2FF'); // Celeste para humedad
            textoZona.setAttribute('value', 'ZONA HUMEDA');
            textoZona.setAttribute('color', '#00D2FF');
        } else {
            anilloDefecto.setAttribute('color', '#FF0000'); // Rojo para grieta
            textoZona.setAttribute('value', 'ALERTA: GRIETA');
            textoZona.setAttribute('color', '#FF0000');
        }
    } else {
        // Si es calidad Premium, escondemos el holograma de defecto
        zonaDefecto.setAttribute('visible', 'false');
    }
}

// --- LÓGICA DEL HISTORIAL ---
function registrarEnHistorial(datos) {
    // Obtenemos la hora actual
    const ahora = new Date();
    const horaFormateada = ahora.getHours() + ':' + ahora.getMinutes().toString().padStart(2, '0');

    // Guardamos en la memoria RAM
    historialEscaneos.push({
        hora: horaFormateada,
        especie: datos.especie,
        calidad: datos.calidad,
        color: datos.colorCubo
    });

    // Actualizamos la tabla visual
    actualizarTablaHistorial();
}

function actualizarTablaHistorial() {
    const tbody = document.querySelector('#tabla-historial tbody');
    tbody.innerHTML = ''; // Limpiamos la tabla

    // Si no hay datos
    if (historialEscaneos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay escaneos en este turno</td></tr>';
        return;
    }

    // Dibujamos las filas invertidas (las más nuevas arriba)
    const historialInvertido = [...historialEscaneos].reverse();

    historialInvertido.forEach(item => {
        const fila = `
            <tr>
                <td>${item.hora}</td>
                <td>${item.especie}</td>
                <td style="color: ${item.color}; font-weight: bold;">${item.calidad}</td>
            </tr>
        `;
        tbody.innerHTML += fila;
    });
}

// --- LÓGICA DEL CÓDIGO QR ---
function generarQR() {
    if (!datosActuales) return;

    // 1. Armamos los datos que irán dentro del QR
    const textoQR = `LignoQuality RA - Trazabilidad\nEspecie: ${datosActuales.especie}\nHumedad: ${datosActuales.humedad}\nDefectos: ${datosActuales.defectos}\nCalidad Final: ${datosActuales.calidad}`;

    // 2. Usamos una API gratuita para generar la imagen del QR al instante
    const urlAPI = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(textoQR)}`;

    // 3. Inyectamos la imagen y los textos en el Modal
    document.getElementById('imagen-qr').src = urlAPI;
    const textoCalidad = document.getElementById('texto-qr-calidad');
    textoCalidad.innerText = `CALIDAD: ${datosActuales.calidad}`;
    textoCalidad.style.color = datosActuales.colorCubo;

    // 4. Mostramos el Modal
    document.getElementById('modal-qr').style.display = 'flex';
}

// --- CONTROLADOR DE LA INTERFAZ Y BOTONES ---
document.addEventListener('DOMContentLoaded', () => {
    // Inicializamos la tabla vacía
    actualizarTablaHistorial();

    // Pantallas
    const pantallaInicio = document.getElementById('pantalla-inicio');
    const interfazAR = document.getElementById('interfaz-ar');

    // Botones Principales
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

    // Control del Modal Historial
    const modalHistorial = document.getElementById('modal-historial');
    document.getElementById('btn-abrir-historial').addEventListener('click', () => {
        modalHistorial.style.display = 'flex';
    });
    document.getElementById('btn-cerrar-historial').addEventListener('click', () => {
        modalHistorial.style.display = 'none';
    });

    // Control del Modal QR
    document.getElementById('btn-generar-qr').addEventListener('click', generarQR);
    document.getElementById('btn-cerrar-qr').addEventListener('click', () => {
        document.getElementById('modal-qr').style.display = 'none';
    });
});