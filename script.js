// Data storage for audiometry records
let audiometryRecords = [];
const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 8000];
const KEY_FREQUENCIES_FOR_AVG = [500, 1000, 2000, 4000]; // Frequencies for average calculation and diagnosis

document.addEventListener('DOMContentLoaded', () => {
    // Set current date for audiometry date input
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('audiometry-date').value = `${yyyy}-${mm}-${dd}`;

    loadAudiometryRecords(); // Load existing records on startup
    populateComparisonSelects(); // Populate comparison selects on startup
    addVACopyToVOListeners(); // Add listeners for VA to VO copy functionality
});

/**
 * Adds event listeners to VA input fields to automatically copy values to corresponding VO fields.
 */
function addVACopyToVOListeners() {
    const ears = ['od', 'oi'];
    ears.forEach(ear => {
        FREQUENCIES.forEach(freq => {
            const vaInput = document.getElementById(`va-${ear}-${freq}`);
            const voInput = document.getElementById(`vo-${ear}-${freq}`);

            if (vaInput && voInput) {
                vaInput.addEventListener('input', (event) => {
                    voInput.value = event.target.value;
                });
            }
        });
    });
}


/**
 * Calculates the average hearing loss for a given ear based on specified frequencies.
 * @param {string} earType - 'od' for Oído Derecho, 'oi' for Oído Izquierdo.
 * @returns {number} - The calculated average hearing loss in dB HL.
 */
function calculateAverageLoss(earType) {
    let sumVA = 0;
    let count = 0;
    KEY_FREQUENCIES_FOR_AVG.forEach(freq => {
        const vaValue = parseInt(document.getElementById(`va-${earType}-${freq}`).value);
        if (!isNaN(vaValue)) {
            sumVA += vaValue;
            count++;
        }
    });
    return count > 0 ? sumVA / count : 0;
}

/**
 * Calculates the Percentage of Binaural Combined Hearing Loss (PABC) based on the VAs of both ears.
 * Uses the formula: PABC = ( (Average OD * 5) + (Average OI * 1) ) / 6.
 * @param {number} avgOD - Average hearing loss for Oído Derecho.
 * @param {number} avgOI - Average hearing loss for Oído Izquierdo.
 * @returns {number} - The calculated PABC.
 */
function calculatePABC(avgOD, avgOI) {
    // Formula for PABC (Pérdida Auditiva Bilateral Combinada)
    return ((avgOD * 5) + (avgOI * 1)) / 6;
}

/**
 * Determines the disability grade based on the PABC according to RD 888/2022.
 * @param {number} pabc - The Percentage of Binaural Combined Hearing Loss.
 * @returns {{grade: string, range: string}} - An object containing the grade description and its percentage range.
 */
function getDisabilityGrade(pabc) {
    if (pabc >= 96) return { grade: "Grado 4 (Total o Completa)", range: "96% al 100%" };
    if (pabc >= 50) return { grade: "Grado 3 (Grave)", range: "50% al 95%" };
    if (pabc >= 25) return { grade: "Grado 2 (Moderada)", range: "25% al 49%" };
    if (pabc >= 5) return { grade: "Grado 1 (Leve)", range: "5% al 24%" };
    return { grade: "Grado 0 (No hay discapacidad)", range: "0% al 4%" };
}

/**
 * Diagnoses the type of hearing loss (normal, conductive, sensorineural, mixed) for a given ear.
 * @param {object} earVA - Object with VA data for the ear (freq: value).
 * @param {object} earVO - Object with VO data for the ear (freq: value).
 * @returns {string} - The diagnosis string.
 */
function diagnoseHipoacusia(earVA, earVO) {
    let sumVA_key = 0;
    let sumVO_key = 0;
    let sumGAP_key = 0;
    let count = 0;

    KEY_FREQUENCIES_FOR_AVG.forEach(freq => {
        const vaValue = earVA[freq];
        const voValue = earVO[freq];

        if (!isNaN(vaValue) && !isNaN(voValue)) {
            sumVA_key += vaValue;
            sumVO_key += voValue;
            sumGAP_key += (vaValue - voValue);
            count++;
        }
    });

    if (count === 0) return "No se pudo determinar el tipo (datos insuficientes)";

    const avgVA = sumVA_key / count;
    const avgVO = sumVO_key / count;
    const avgGAP = sumGAP_key / count;

    const HL_THRESHOLD = 20; // dB HL threshold for hearing loss
    const GAP_THRESHOLD = 10; // dB HL threshold for significant air-bone gap

    let diagnosis = "";

    // Criteria based on common audiometric interpretation
    if (avgVA <= HL_THRESHOLD && avgVO <= HL_THRESHOLD) {
        diagnosis = "Audición Normal";
    } else if (avgVA > HL_THRESHOLD && avgVO <= HL_THRESHOLD && avgGAP > GAP_THRESHOLD) {
        diagnosis = "De Transmisión (Conductiva)";
    } else if (avgVA > HL_THRESHOLD && avgVO > HL_THRESHOLD && avgGAP <= GAP_THRESHOLD) {
        diagnosis = "Neurosensorial";
    } else if (avgVA > HL_THRESHOLD && avgVO > HL_THRESHOLD && avgGAP > GAP_THRESHOLD) {
        diagnosis = "Mixta";
    } else {
        diagnosis = "Tipo no clasificado (requiere evaluación adicional)";
    }

    return diagnosis;
}


/**
 * Calculates and displays audiometry results in the table.
 */
function calculateAndDisplay() {
    const tableBody = document.querySelector('#audiometry-table tbody');
    if (!tableBody) {
        console.error("Error: Element #audiometry-table tbody not found.");
        return;
    }
    tableBody.innerHTML = ''; // Clear previous results

    const ears = ['od', 'oi'];
    const results = {};

    ears.forEach(ear => {
        const rowVA = document.createElement('tr');
        const rowVO = document.createElement('tr');
        const rowGAP = document.createElement('tr'); // For Air-Bone Gap (GAP)
        const rowSum = document.createElement('tr'); // For Summatory

        // Initialize sum and array for average calculation (500, 1000, 2000, 4000)
        let sumVA = 0;
        let vaCount = 0;
        let sumVO = 0;
        let voCount = 0;

        // Headers for rows
        const vaLabel = document.createElement('td');
        vaLabel.textContent = `VA ${ear.toUpperCase()}`;
        rowVA.appendChild(vaLabel);

        const voLabel = document.createElement('td');
        voLabel.textContent = `VO ${ear.toUpperCase()}`;
        rowVO.appendChild(voLabel);

        const gapLabel = document.createElement('td');
        gapLabel.textContent = `GAP ${ear.toUpperCase()}`;
        rowGAP.appendChild(gapLabel);

        const sumLabel = document.createElement('td');
        sumLabel.textContent = `Sumatorio ${ear.toUpperCase()}`;
        rowSum.appendChild(sumLabel);

        let vaValues = {};
        let voValues = {};

        FREQUENCIES.forEach(freq => {
            const vaInput = document.getElementById(`va-${ear}-${freq}`);
            const voInput = document.getElementById(`vo-${ear}-${freq}`);

            const vaValue = vaInput ? parseInt(vaInput.value) : NaN;
            const voValue = voInput ? parseInt(voInput.value) : NaN;

            vaValues[freq] = vaValue;
            voValues[freq] = voValue;

            // Display VA, VO, and GAP
            const vaCell = document.createElement('td');
            vaCell.textContent = isNaN(vaValue) ? '-' : vaValue;
            rowVA.appendChild(vaCell);

            const voCell = document.createElement('td');
            voCell.textContent = isNaN(voValue) ? '-' : voValue;
            rowVO.appendChild(voCell);

            const gapCell = document.createElement('td');
            if (!isNaN(vaValue) && !isNaN(voValue)) {
                const gap = vaValue - voValue;
                gapCell.textContent = gap;
                if (gap > 10) { // Highlight significant gap
                    gapCell.style.backgroundColor = '#ffdddd'; // Light red
                }
            } else {
                gapCell.textContent = '-';
            }
            rowGAP.appendChild(gapCell);

            // Add to sum for specific frequencies
            if (KEY_FREQUENCIES_FOR_AVG.includes(freq) && !isNaN(vaValue)) {
                sumVA += vaValue;
                vaCount++;
            }
            if (KEY_FREQUENCIES_FOR_AVG.includes(freq) && !isNaN(voValue)) {
                sumVO += voValue;
                voCount++;
            }
        });

        // Calculate and display average for VA and VO (for sum column)
        const vaAvg = vaCount > 0 ? sumVA / vaCount : 0;
        // const voAvg = voCount > 0 ? sumVO / voCount : 0; // Not used in report currently

        // Append summatory (average for VA for sum column)
        const sumCell = document.createElement('td');
        sumCell.colSpan = FREQUENCIES.length; // Span across frequency columns
        sumCell.textContent = `${sumVA} dB HL (Media VA: ${vaAvg.toFixed(1)} dB HL)`; // Display sum and average
        rowSum.appendChild(sumCell);

        tableBody.appendChild(rowVA);
        tableBody.appendChild(rowVO);
        tableBody.appendChild(rowGAP);
        tableBody.appendChild(rowSum);

        results[ear] = { 
            va: vaValues, 
            vo: voValues, 
            avgVA: vaAvg, 
            sumVA: sumVA,
            diagnosis: diagnoseHipoacusia(vaValues, voValues) // Add diagnosis here
        };
    });

    const avgOD = results.od.avgVA;
    const avgOI = results.oi.avgVA;
    const pabc = calculatePABC(avgOD, avgOI);

    // Store results in global scope or pass them as needed
    window.currentAudiometryResults = {
        od: results.od,
        oi: results.oi,
        pabc: pabc
    };

    drawAudiogram(results.od.va, results.od.vo, results.oi.va, results.oi.vo);
    displayReports(); // Update reports after calculations
}

/**
 * Draws the audiogram SVG based on VA and VO data.
 * @param {object} odVA - Object with OD VA data (freq: value).
 * @param {object} odVO - Object with OD VO data (freq: value).
 * @param {object} oiVA - Object with OI VA data (freq: value).
 * @param {object} oiVO - Object with OI VO data (freq: value).
 */
function drawAudiogram(odVA, odVO, oiVA, oiVO) {
    const container = document.getElementById('audiogram-container');
    if (!container) {
        console.error("Error: Audiogram container not found.");
        return;
    }
    container.innerHTML = ''; // Clear previous SVG

    const width = 800;
    const height = 500;
    const padding = 50;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "audiogram-svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");

    // Scales
    const freqs = [250, 500, 1000, 2000, 3000, 4000, 8000];
    const dbLevels = Array.from({ length: 14 }, (_, i) => i * 10 - 10); // -10 to 120 dB HL

    const xScale = (freq) => {
        const index = freqs.indexOf(freq);
        return padding + (index / (freqs.length - 1)) * (width - 2 * padding);
    };

    // BUG FIX: Corrected yScale to handle any number, not just multiples of 10.
    const yScale = (db) => {
        const dbMin = -10;
        const dbMax = 120;
        const yMin = padding;
        const yRange = height - 2 * padding;

        // Clamp the db value to be within the expected range to avoid drawing outside the chart
        const clampedDb = Math.max(dbMin, Math.min(db, dbMax));

        // Linear interpolation to find the y position
        const percentage = (clampedDb - dbMin) / (dbMax - dbMin);
        return yMin + percentage * yRange;
    };


    // Grid lines and labels
    // Horizontal lines (dB HL)
    dbLevels.forEach(db => {
        const y = yScale(db);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", padding);
        line.setAttribute("y1", y);
        line.setAttribute("x2", width - padding);
        line.setAttribute("y2", y);
        line.setAttribute("stroke", "#ccc");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", padding - 15);
        text.setAttribute("y", y + 4);
        text.setAttribute("text-anchor", "end");
        text.setAttribute("font-size", "12");
        text.setAttribute("fill", "#555");
        text.textContent = db;
        svg.appendChild(text);
    });

    // Vertical lines (Frequencies)
    freqs.forEach(freq => {
        const x = xScale(freq);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", padding);
        line.setAttribute("x2", x);
        line.setAttribute("y2", height - padding);
        line.setAttribute("stroke", "#ccc");
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", height - padding + 20);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "12");
        text.setAttribute("fill", "#555");
        text.textContent = freq >= 1000 ? `${freq / 1000}K` : freq;
        svg.appendChild(text);
    });

    // Labels for axes
    const yAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yAxisLabel.setAttribute("x", 20);
    yAxisLabel.setAttribute("y", height / 2);
    yAxisLabel.setAttribute("text-anchor", "middle");
    yAxisLabel.setAttribute("transform", `rotate(-90, 20, ${height / 2})`);
    yAxisLabel.setAttribute("font-size", "14");
    yAxisLabel.setAttribute("font-weight", "bold");
    yAxisLabel.setAttribute("fill", "#333");
    yAxisLabel.textContent = "Intensidad (dB HL)";
    svg.appendChild(yAxisLabel);

    const xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xAxisLabel.setAttribute("x", width / 2);
    xAxisLabel.setAttribute("y", height - 20);
    xAxisLabel.setAttribute("text-anchor", "middle");
    xAxisLabel.setAttribute("font-size", "14");
    xAxisLabel.setAttribute("font-weight", "bold");
    xAxisLabel.setAttribute("fill", "#333");
    xAxisLabel.textContent = "Frecuencia (Hz)";
    svg.appendChild(xAxisLabel);

    // Function to draw a path
    const drawPath = (data, symbol, color, stroke, isDashed = false) => {
        let pathData = "";
        const points = [];
        freqs.forEach(freq => {
            const value = data[freq];
            if (value !== undefined && !isNaN(value)) {
                points.push({ x: xScale(freq), y: yScale(value), freq: freq, value: value });
            }
        });

        // Sort points by frequency to ensure lines are drawn correctly
        points.sort((a, b) => a.freq - b.freq);

        points.forEach((point, index) => {
            if (index === 0) {
                pathData += `M ${point.x} ${point.y}`;
            } else {
                pathData += ` L ${point.x} ${point.y}`;
            }

            // Draw symbol
            const symbolElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            symbolElement.setAttribute("x", point.x);
            symbolElement.setAttribute("y", point.y);
            symbolElement.setAttribute("text-anchor", "middle");
            symbolElement.setAttribute("dominant-baseline", "middle");
            symbolElement.setAttribute("font-size", "16");
            symbolElement.setAttribute("fill", color);
            symbolElement.textContent = symbol;
            svg.appendChild(symbolElement);
        });

        if (pathData !== "") {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", stroke);
            path.setAttribute("stroke-width", "2");
            if (isDashed) {
                path.setAttribute("stroke-dasharray", "5,5"); // Dashed line
            }
            svg.appendChild(path);
        }
    };

    // Draw OD VA (red circle)
    drawPath(odVA, 'O', 'red', 'red', false);
    // Draw OD VO (red left bracket)
    drawPath(odVO, '[', 'red', 'red', true); 
    // Draw OI VA (blue X)
    drawPath(oiVA, 'X', 'blue', 'blue', false);
    // Draw OI VO (blue right bracket)
    drawPath(oiVO, ']', 'blue', 'blue', true);


    // Legend
    const legendX = width - padding - 100; // Adjusted legend position
    const legendY = padding + 20;
    const legendSpacing = 25;

    const addLegendItem = (symbol, text, color, yOffset, isDashed = false) => {
        const symbolElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        symbolElement.setAttribute("x", legendX);
        symbolElement.setAttribute("y", legendY + yOffset);
        symbolElement.setAttribute("text-anchor", "start");
        symbolElement.setAttribute("dominant-baseline", "middle");
        symbolElement.setAttribute("font-size", "16");
        symbolElement.setAttribute("fill", color);
        symbolElement.textContent = symbol;
        svg.appendChild(symbolElement);

        // Draw a small line next to the symbol to show line style
        const lineElement = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineElement.setAttribute("x1", legendX + 15);
        lineElement.setAttribute("y1", legendY + yOffset);
        lineElement.setAttribute("x2", legendX + 35);
        lineElement.setAttribute("y2", legendY + yOffset);
        lineElement.setAttribute("stroke", color);
        lineElement.setAttribute("stroke-width", "2");
        if (isDashed) {
            lineElement.setAttribute("stroke-dasharray", "5,5");
        }
        svg.appendChild(lineElement);


        const textElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textElement.setAttribute("x", legendX + 40); // Adjusted position
        textElement.setAttribute("y", legendY + yOffset);
        textElement.setAttribute("font-size", "14");
        textElement.setAttribute("fill", "#333");
        textElement.textContent = text;
        svg.appendChild(textElement);
    };

    addLegendItem('O', 'OD Vía Aérea', 'red', 0, false);
    addLegendItem('[', 'OD Vía Ósea', 'red', legendSpacing, true);
    addLegendItem('X', 'OI Vía Aérea', 'blue', legendSpacing * 2, false);
    addLegendItem(']', 'OI Vía Ósea', 'blue', legendSpacing * 3, true);


    container.appendChild(svg);
}


/**
 * Displays the basic and detailed reports based on current results.
 */
function displayReports() {
    if (window.currentAudiometryResults) {
        document.getElementById('basic-report-content').textContent = generateBasicReport();
        document.getElementById('detailed-report-content').textContent = generateDetailedReport();
    } else {
        document.getElementById('basic-report-content').textContent = 'Calcule los resultados primero para generar el informe.';
        document.getElementById('detailed-report-content').textContent = 'Calcule los resultados primero para generar el informe.';
    }
}


/**
 * Generates the basic audiometry report content.
 * @returns {string} - The formatted basic report.
 */
function generateBasicReport() {
    const historyNumber = document.getElementById('history-number').value || 'N/D';
    const audiometryDate = document.getElementById('audiometry-date').value || 'N/D';
    const results = window.currentAudiometryResults;

    if (!results) {
        return 'No hay datos para generar el informe básico. Calcule los resultados.';
    }

    const avgOD = results.od.avgVA.toFixed(1);
    const avgOI = results.oi.avgVA.toFixed(1);
    const pabc = results.pabc.toFixed(2);
    const disability = getDisabilityGrade(results.pabc);
    const diagnosisOD = results.od.diagnosis;
    const diagnosisOI = results.oi.diagnosis;


    return `--- INFORME BÁSICO DE AUDIOMETRÍA ---

Nº de Historia: ${historyNumber}
Fecha de Audiometría: ${audiometryDate}

Resultados Globales de Pérdida Auditiva (según fórmulas internas de cálculo):
   - Oído Derecho (OD): ${avgOD} dB HL
   - Oído Izquierdo (OI): ${avgOI} dB HL
   - Pérdida Auditiva Bilateral Combinada (PABC): ${pabc} %

Diagnóstico del Tipo de Hipoacusia:
   - Oído Derecho (OD): ${diagnosisOD}
   - Oído Izquierdo (OI): ${diagnosisOI}

Valoración del Grado de Discapacidad Auditiva (según Real Decreto 888/2022):
   - Grado de Discapacidad Estimado: ${disability.grade}
     (Corresponde a un rango del ${disability.range} de la PABC según el baremo actualizado).

Observaciones:
   La valoración del grado de discapacidad se ha realizado conforme a los criterios del Real Decreto 888/2022, de 18 de octubre, que sustituye al RD 1971/1999. Este nuevo baremo considera, además de los umbrales auditivos, el impacto en la vida diaria y la participación social del individuo.

--- FIN INFORME BÁSICO ---`;
}

/**
 * Generates the detailed audiometry report content.
 * @returns {string} - The formatted detailed report.
 */
function generateDetailedReport() {
    const historyNumber = document.getElementById('history-number').value || 'N/D';
    const audiometryDate = document.getElementById('audiometry-date').value || 'N/D';
    const results = window.currentAudiometryResults;

    if (!results) {
        return 'No hay datos para generar el informe detallado. Calcule los resultados.';
    }

    const getFormattedValues = (data) => {
        return FREQUENCIES.map(freq => {
            const val = data[freq];
            return `${freq}Hz: ${val !== undefined && !isNaN(val) ? val : '-'}`;
        }).join(' | ');
    };

    const sumOD = results.od.sumVA !== undefined ? results.od.sumVA : '-';
    const avgOD = results.od.avgVA !== undefined ? results.od.avgVA.toFixed(1) : '-';
    const sumOI = results.oi.sumVA !== undefined ? results.oi.sumVA : '-';
    const avgOI = results.oi.avgVA !== undefined ? results.oi.avgVA.toFixed(1) : '-';
    const pabc = results.pabc.toFixed(2);
    const disability = getDisabilityGrade(results.pabc);
    const diagnosisOD = results.od.diagnosis;
    const diagnosisOI = results.oi.diagnosis;


    return `--- INFORME DETALLADO DE AUDIOMETRÍA ---

**1. Datos del Paciente y Evaluación**
   - Nº de Historia: ${historyNumber}
   - Fecha de Audiometría: ${audiometryDate}

**2. Umbrales Auditivos por Frecuencia (dB HL)**

   **Oído Derecho (OD):**
     - Vía Aérea (VA):
       ${getFormattedValues(results.od.va)}
     - Vía Ósea (VO):
       ${getFormattedValues(results.od.vo)}
     - Sumatorio Frecuencias Clave OD (500Hz, 1000Hz, 2000Hz, 4000Hz): ${sumOD} dB HL
     - Diagnóstico del Tipo de Hipoacusia: ${diagnosisOD}

   **Oído Izquierdo (OI):**
     - Vía Aérea (VA):
       ${getFormattedValues(results.oi.va)}
     - Vía Ósea (VO):
       ${getFormattedValues(results.oi.vo)}
     - Sumatorio Frecuencias Clave OI (500Hz, 1000Hz, 2000Hz, 4000Hz): ${sumOI} dB HL
     - Diagnóstico del Tipo de Hipoacusia: ${diagnosisOI}

   **Pérdida Auditiva Bilateral Combinada (PABC):** ${pabc}%

**3. Grado de Discapacidad Auditiva (según Real Decreto 888/2022)**

   - El porcentaje de la Pérdida Auditiva Bilateral Combinada (PABC) calculada, ${pabc}%, se correlaciona con el **${disability.grade}** de discapacidad auditiva según la tabla de baremos establecida por el Real Decreto 888/2022, de 18 de octubre.
   - **Rangos del Nuevo Baremo (RD 888/2022):**
     - Grado 0: 0-4% (No hay discapacidad)
     - Grado 1: 5-24% (Leve)
     - Grado 2: 25-49% (Moderada)
     - Grado 3: 50-95% (Grave)
     - Grado 4: 96-100% (Total o Completa)

**4. Consideraciones Legales y Metodológicas**

   Este informe se basa en el **Real Decreto 888/2022, de 18 de octubre**, que establece el nuevo procedimiento para el reconocimiento, declaración y calificación del grado de discapacidad en España. Este Real Decreto sustituye al anterior RD 1971/1999, introduciendo un enfoque más moderno y alineado con la Convención Internacional sobre los Derechos de las Personas con Discapacidad de la ONU.

   A diferencia del baremo anterior, el RD 888/2022 promueve una **valoración más global e individualizada**, que va más allá de la mera cuantificación numérica de la pérdida en decibelios. Considera de manera primordial el **impacto real de la pérdida auditiva en la actividad diaria y la participación social** de la persona, buscando una evaluación más funcional y contextualizada.

   Asimismo, este marco normativo se alinea con la reciente entrada en vigor del **Acta Europea de Accesibilidad (junio de 2025)**, reforzando los derechos de accesibilidad auditiva y la necesidad de adaptar la comunicación mediante el uso de subtítulos, tecnologías de apoyo y otros medios.

   *Nota: La presente aplicación proporciona un cálculo de la PABC y una estimación del grado de discapacidad basada en el porcentaje. Para una valoración oficial y completa, es imprescindible la evaluación por parte de los organismos competentes, que considerarán todos los factores multidimensionales exigidos por la normativa vigente.*

--- FIN INFORME DETALLADO ---`;
}


/**
 * Copies the content of the audiometry table to the clipboard.
 */
function copyTable() {
    const table = document.getElementById('audiometry-table');
    if (!table) {
        alert('No se encontró la tabla de audiometría.');
        return;
    }
    let tableText = '';

    // Get table headers
    Array.from(table.querySelectorAll('thead th')).forEach(th => {
        tableText += th.textContent + '\t'; // Use tab for columns
    });
    tableText = tableText.trim() + '\n'; // New line after headers

    // Get table rows
    Array.from(table.querySelectorAll('tbody tr')).forEach(tr => {
        Array.from(tr.querySelectorAll('td')).forEach(td => {
            tableText += td.textContent + '\t'; // Use tab for columns
        });
        tableText = tableText.trim() + '\n'; // New line after each row
    });

    navigator.clipboard.writeText(tableText)
        .then(() => alert('Tabla copiada al portapapeles.'))
        .catch(err => console.error('Error al copiar la tabla:', err));
}

/**
 * Copies the basic report content to the clipboard.
 */
function copyBasicReport() {
    const reportContent = document.getElementById('basic-report-content').textContent;
    navigator.clipboard.writeText(reportContent)
        .then(() => alert('Informe básico copiado al portapapeles.'))
        .catch(err => console.error('Error al copiar el informe básico:', err));
}

/**
 * Copies the detailed report content to the clipboard.
 */
function copyDetailedReport() {
    const reportContent = document.getElementById('detailed-report-content').textContent;
    navigator.clipboard.writeText(reportContent)
        .then(() => alert('Informe detallado copiado al portapapeles.'))
        .catch(err => console.error('Error al copiar el informe detallado:', err));
}

/**
 * Saves the current audiometry data to local storage.
 */
function saveAudiometry() {
    const historyNumber = document.getElementById('history-number').value;
    const audiometryDate = document.getElementById('audiometry-date').value;

    if (!historyNumber || !audiometryDate) {
        alert('Por favor, introduce el número de historia y la fecha de la audiometría.');
        return;
    }

    const audiometryData = {
        historyNumber: historyNumber,
        audiometryDate: audiometryDate,
        va: { od: {}, oi: {} },
        vo: { od: {}, oi: {} }
    };

    FREQUENCIES.forEach(freq => {
        audiometryData.va.od[freq] = parseInt(document.getElementById(`va-od-${freq}`).value) || 0;
        audiometryData.vo.od[freq] = parseInt(document.getElementById(`vo-od-${freq}`).value) || 0;
        audiometryData.va.oi[freq] = parseInt(document.getElementById(`va-oi-${freq}`).value) || 0;
        audiometryData.vo.oi[freq] = parseInt(document.getElementById(`vo-oi-${freq}`).value) || 0;
    });

    // Check if an existing record with the same history number and date exists
    const existingIndex = audiometryRecords.findIndex(record =>
        record.historyNumber === historyNumber && record.audiometryDate === audiometryDate
    );

    if (existingIndex > -1) {
        // Update existing record
        audiometryRecords[existingIndex] = audiometryData;
        alert('Audiometría actualizada exitosamente.');
    } else {
        // Add new record
        audiometryRecords.push(audiometryData);
        alert('Audiometría guardada exitosamente.');
    }

    localStorage.setItem('audiometryRecords', JSON.stringify(audiometryRecords));
    loadAudiometryRecords(); // Refresh the list of saved audiometries
}

/**
 * Loads audiometry records from local storage and populates the select dropdown.
 */
function loadAudiometryRecords() {
    const storedRecords = localStorage.getItem('audiometryRecords');
    if (storedRecords) {
        audiometryRecords = JSON.parse(storedRecords);
    } else {
        audiometryRecords = [];
    }

    const selectElement = document.getElementById('saved-audiometries');
    if (selectElement) {
        selectElement.innerHTML = '<option value="">Cargar Audiometría Guardada</option>'; // Default option

        audiometryRecords.forEach((record, index) => {
            const option = document.createElement('option');
            option.value = index; // Store the index as value
            option.textContent = `Historia: ${record.historyNumber} - Fecha: ${record.audiometryDate}`;
            selectElement.appendChild(option);
        });
    }


    populateComparisonSelects(); // Update comparison selects whenever records change
}

/**
 * Loads the selected audiometry record into the input fields.
 */
function loadSelectedAudiometry() {
    const selectElement = document.getElementById('saved-audiometries');
    const selectedIndex = selectElement.value;

    if (selectedIndex === "") {
        // Option to "Cargar Audiometría Guardada" selected, clear inputs or do nothing
        // Or you might want to call resetApplication() here if no record is selected.
        return;
    }

    const record = audiometryRecords[parseInt(selectedIndex)];

    if (record) {
        document.getElementById('history-number').value = record.historyNumber;
        document.getElementById('audiometry-date').value = record.audiometryDate;

        FREQUENCIES.forEach(freq => {
            document.getElementById(`va-od-${freq}`).value = record.va.od[freq] !== undefined ? record.va.od[freq] : 0;
            document.getElementById(`vo-od-${freq}`).value = record.vo.od[freq] !== undefined ? record.vo.od[freq] : 0;
            document.getElementById(`va-oi-${freq}`).value = record.va.oi[freq] !== undefined ? record.va.oi[freq] : 0;
            document.getElementById(`vo-oi-${freq}`).value = record.vo.oi[freq] !== undefined ? record.vo.oi[freq] : 0;
        });

        calculateAndDisplay(); // Recalculate and display based on loaded data
        alert('Audiometría cargada exitosamente.');
    }
}

/**
 * Resets the application to its initial state, clearing inputs and data.
 */
function resetApplication() {
    // Clear input fields
    document.getElementById('history-number').value = '00000';
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('audiometry-date').value = `${yyyy}-${mm}-${dd}`;

    FREQUENCIES.forEach(freq => {
        document.getElementById(`va-od-${freq}`).value = 0;
        document.getElementById(`vo-od-${freq}`).value = 0;
        document.getElementById(`va-oi-${freq}`).value = 0;
        document.getElementById(`vo-oi-${freq}`).value = 0;
    });

    // Clear results table
    const tableBody = document.querySelector('#audiometry-table tbody');
    if (tableBody) tableBody.innerHTML = '';

    // Clear audiogram
    const audiogramContainer = document.getElementById('audiogram-container');
    if (audiogramContainer) audiogramContainer.innerHTML = '<p>El audiograma se generará aquí tras calcular los resultados.</p>';
    
    const comparisonAudiogram1 = document.getElementById('comparison-audiogram-1-container');
    if (comparisonAudiogram1) comparisonAudiogram1.innerHTML = '<p>Audiograma de la primera audiometría.</p>';
    
    const comparisonAudiogram2 = document.getElementById('comparison-audiogram-2-container');
    if (comparisonAudiogram2) comparisonAudiogram2.innerHTML = '<p>Audiograma de la segunda audiometría.</p>';

    // Clear reports
    const basicReport = document.getElementById('basic-report-content');
    if (basicReport) basicReport.textContent = 'El informe básico se generará aquí tras calcular los resultados.';
    
    const detailedReport = document.getElementById('detailed-report-content');
    if (detailedReport) detailedReport.textContent = 'El informe detallado se generará aquí tras calcular los resultados.';
    
    const comparisonReport = document.getElementById('comparison-report-content');
    if (comparisonReport) comparisonReport.textContent = 'El informe de comparación se generará aquí.';


    // Clear current results stored in window
    window.currentAudiometryResults = null;
    window.audiometryCompare1 = null;
    window.audiometryCompare2 = null;

    // Reset select dropdowns
    const savedAudiometriesSelect = document.getElementById('saved-audiometries');
    if (savedAudiometriesSelect) savedAudiometriesSelect.value = "";
    
    const compare1Select = document.getElementById('select-audiometry-compare-1');
    if (compare1Select) compare1Select.value = "";
    
    const compare2Select = document.getElementById('select-audiometry-compare-2');
    if (compare2Select) compare2Select.value = "";


    alert('Aplicación reiniciada. Todos los datos temporales han sido borrados.');
}


/**
 * Populates the comparison select dropdowns with saved audiometry records.
 */
function populateComparisonSelects() {
    const select1 = document.getElementById('select-audiometry-compare-1');
    const select2 = document.getElementById('select-audiometry-compare-2');

    if (!select1 || !select2) return; // Exit if elements not found

    // Clear previous options, but keep a default empty one
    select1.innerHTML = '<option value="">Seleccionar Audiometría Basal</option>';
    select2.innerHTML = '<option value="">Seleccionar Audiometría de Seguimiento</option>';

    audiometryRecords.forEach((record, index) => {
        const option1 = document.createElement('option');
        option1.value = index;
        option1.textContent = `Historia: ${record.historyNumber} - Fecha: ${record.audiometryDate}`;
        select1.appendChild(option1);

        const option2 = option1.cloneNode(true); // Clone for the second select
        select2.appendChild(option2);
    });
}


/**
 * Calculates the average hearing loss for a given ear from a specific record.
 * This is a helper function for comparison.
 */
function calculateAverageLossFromRecord(earData) {
    let sum = 0;
    let count = 0;
    KEY_FREQUENCIES_FOR_AVG.forEach(freq => {
        if (!isNaN(earData[freq])) { // Access directly from earData
                sum += earData[freq];
                count++;
            }
        });
        return count > 0 ? sum / count : 0;
    }

/**
 * Compares two selected audiometries and displays their audiograms and a comparison report.
 */
function compareAudiometries() {
    const select1 = document.getElementById('select-audiometry-compare-1');
    const select2 = document.getElementById('select-audiometry-compare-2');

    const index1 = select1 ? select1.value : "";
    const index2 = select2 ? select2.value : "";

    if (index1 === "" || index2 === "") {
        alert('Por favor, selecciona dos audiometrías para comparar.');
        return;
    }

    const audiometry1 = audiometryRecords[parseInt(index1)];
    const audiometry2 = audiometryRecords[parseInt(index2)];

    if (!audiometry1 || !audiometry2) {
        alert('No se pudieron cargar las audiometrías seleccionadas.');
        return;
    }

    // Store for drawing individual comparison audiograms
    window.audiometryCompare1 = audiometry1;
    window.audiometryCompare2 = audiometry2;


    // Draw audiogram for Audiometry 1
    const container1 = document.getElementById('comparison-audiogram-1-container');
    if (container1) {
        container1.innerHTML = ''; // Clear previous SVG
        drawAudiogramComparison(container1, audiometry1.va.od, audiometry1.vo.od, audiometry1.va.oi, audiometry1.vo.oi);
    }


    // Draw audiogram for Audiometry 2
    const container2 = document.getElementById('comparison-audiogram-2-container');
    if (container2) {
        container2.innerHTML = ''; // Clear previous SVG
        drawAudiogramComparison(container2, audiometry2.va.od, audiometry2.vo.od, audiometry2.va.oi, audiometry2.vo.oi);
    }


    // Generate comparison report
    const reportContent = generateComparisonReport(audiometry1, audiometry2);
    const comparisonReportEl = document.getElementById('comparison-report-content');
    if (comparisonReportEl) {
        comparisonReportEl.textContent = reportContent;
    }
}

/**
 * Draws an audiogram for comparison purposes, into a specified container.
 * This is a slightly modified version of drawAudiogram to be reusable for comparison.
 */
function drawAudiogramComparison(containerElement, odVA, odVO, oiVA, oiVO) {
    if (!containerElement) {
        console.error("Error: Comparison audiogram container not found.");
        return;
    }
    containerElement.innerHTML = ''; // Clear previous SVG

    const width = 400; // Smaller width for comparison graphs
    const height = 300; // Smaller height
    const padding = 30; // Smaller padding

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", `audiogram-svg-${containerElement.id}`); // Unique ID
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");

    // Scales (same logic, adapted for new dimensions)
    const freqs = [250, 500, 1000, 2000, 3000, 4000, 8000];
    const dbLevels = Array.from({ length: 14 }, (_, i) => i * 10 - 10); // -10 to 120 dB HL

    const xScale = (freq) => {
        const index = freqs.indexOf(freq);
        return padding + (index / (freqs.length - 1)) * (width - 2 * padding);
    };

    // BUG FIX: Corrected yScale to handle any number, not just multiples of 10.
    const yScale = (db) => {
        const dbMin = -10;
        const dbMax = 120;
        const yMin = padding;
        const yRange = height - 2 * padding;

        const clampedDb = Math.max(dbMin, Math.min(db, dbMax));
        const percentage = (clampedDb - dbMin) / (dbMax - dbMin);
        return yMin + percentage * yRange;
    };

    // Grid lines and labels (simplified for comparison)
    // Horizontal lines (dB HL)
    dbLevels.forEach(db => {
        if (db % 20 === 0) { // Only major grid lines for cleaner look
            const y = yScale(db);
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", padding);
            line.setAttribute("y1", y);
            line.setAttribute("x2", width - padding);
            line.setAttribute("y2", y);
            line.setAttribute("stroke", "#eee"); // Lighter grid
            line.setAttribute("stroke-width", "1");
            svg.appendChild(line);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", padding - 10);
            text.setAttribute("y", y + 4);
            text.setAttribute("text-anchor", "end");
            text.setAttribute("font-size", "10");
            text.setAttribute("fill", "#777");
            text.textContent = db;
            svg.appendChild(text);
        }
    });

    // Vertical lines (Frequencies)
    freqs.forEach(freq => {
        const x = xScale(freq);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", padding);
        line.setAttribute("x2", x);
        line.setAttribute("y2", height - padding);
        line.setAttribute("stroke", "#eee"); // Lighter grid
        line.setAttribute("stroke-width", "1");
        svg.appendChild(line);

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", height - padding + 15);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("font-size", "10");
        text.setAttribute("fill", "#777");
        text.textContent = freq >= 1000 ? `${freq / 1000}K` : freq;
        svg.appendChild(text);
    });

    // Function to draw a path (same as before, but with symbols slightly smaller)
    const drawPath = (data, symbol, color, stroke, isDashed = false) => {
        let pathData = "";
        const points = [];
        freqs.forEach(freq => {
            const value = data[freq];
            if (value !== undefined && !isNaN(value)) {
                points.push({ x: xScale(freq), y: yScale(value), freq: freq, value: value });
            }
        });

        // Sort points by frequency to ensure lines are drawn correctly
        points.sort((a, b) => a.freq - b.freq);


        points.forEach((point, index) => {
            if (index === 0) {
                pathData += `M ${point.x} ${point.y}`;
            } else {
                pathData += ` L ${point.x} ${point.y}`;
            }

            const symbolElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
            symbolElement.setAttribute("x", point.x);
            symbolElement.setAttribute("y", point.y);
            symbolElement.setAttribute("text-anchor", "middle");
            symbolElement.setAttribute("dominant-baseline", "middle");
            symbolElement.setAttribute("font-size", "12"); // Smaller symbols
            symbolElement.setAttribute("fill", color);
            symbolElement.textContent = symbol;
            svg.appendChild(symbolElement);
        });

        if (pathData !== "") {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", stroke);
            path.setAttribute("stroke-width", "1.5"); // Thinner line
            if (isDashed) {
                path.setAttribute("stroke-dasharray", "4,4"); // Dashed line for comparison graphs
            }
            svg.appendChild(path);
        }
    };
    
    // Draw paths for both ears (using comparison-specific symbols/styles if needed, currently same)
    drawPath(odVA, 'O', 'red', 'red', false);
    drawPath(odVO, '[', 'red', 'red', true);
    drawPath(oiVA, 'X', 'blue', 'blue', false);
    drawPath(oiVO, ']', 'blue', 'blue', true);

    containerElement.appendChild(svg);
}


/**
 * Generates the comparison report between two audiometries.
 * @param {object} aud1 - First audiometry record.
 * @param {object} aud2 - Second audiometry record.
 * @returns {string} - The formatted comparison report.
 */
function generateComparisonReport(aud1, aud2) {
    const calculateAverage = (earVAData) => { // Takes aud.va.od or aud.va.oi directly
        let sum = 0;
        let count = 0;
        KEY_FREQUENCIES_FOR_AVG.forEach(freq => {
            if (!isNaN(earVAData[freq])) { // Access directly from earVAData
                sum += earVAData[freq];
                count++;
            }
        });
        return count > 0 ? sum / count : 0;
    };

    const avgOD1 = calculateAverage(aud1.va.od);
    const avgOI1 = calculateAverage(aud1.va.oi);
    const pabc1 = calculatePABC(avgOD1, avgOI1).toFixed(2);
    const disability1 = getDisabilityGrade(parseFloat(pabc1));
    const diagnosisOD1 = diagnoseHipoacusia(aud1.va.od, aud1.vo.od);
    const diagnosisOI1 = diagnoseHipoacusia(aud1.va.oi, aud1.vo.oi);


    const avgOD2 = calculateAverage(aud2.va.od);
    const avgOI2 = calculateAverage(aud2.va.oi);
    const pabc2 = calculatePABC(avgOD2, avgOI2).toFixed(2);
    const disability2 = getDisabilityGrade(parseFloat(pabc2));
    const diagnosisOD2 = diagnoseHipoacusia(aud2.va.od, aud2.vo.od);
    const diagnosisOI2 = diagnoseHipoacusia(aud2.va.oi, aud2.vo.oi);


    let comparisonText = `--- INFORME DE COMPARACIÓN DE AUDIOMETRÍAS ---

**Audiometría 1 (Basal):**
   - Nº de Historia: ${aud1.historyNumber}
   - Fecha: ${aud1.audiometryDate}
   - Promedio Oído Derecho (VA): ${avgOD1.toFixed(1)} dB HL
   - Promedio Oído Izquierdo (VA): ${avgOI1.toFixed(1)} dB HL
   - PABC: ${pabc1}%
   - Grado de Discapacidad (RD 888/2022): ${disability1.grade} (rango ${disability1.range})
   - Diagnóstico OD: ${diagnosisOD1}
   - Diagnóstico OI: ${diagnosisOI1}

**Audiometría 2 (Seguimiento):**
   - Nº de Historia: ${aud2.historyNumber}
   - Fecha: ${aud2.audiometryDate}
   - Promedio Oído Derecho (VA): ${avgOD2.toFixed(1)} dB HL
   - Promedio Oído Izquierdo (VA): ${avgOI2.toFixed(1)} dB HL
   - PABC: ${pabc2}%
   - Grado de Discapacidad (RD 888/2022): ${disability2.grade} (rango ${disability2.range})
   - Diagnóstico OD: ${diagnosisOD2}
   - Diagnóstico OI: ${diagnosisOI2}

**Análisis Comparativo:**

`;

    const diffOD = avgOD2 - avgOD1;
    const diffOI = avgOI2 - avgOI1;
    const diffPABC = parseFloat(pabc2) - parseFloat(pabc1);

    if (diffOD > 5) {
        comparisonText += `- El Oído Derecho ha mostrado un empeoramiento de ${diffOD.toFixed(1)} dB HL en el promedio de VA.\n`;
    } else if (diffOD < -5) {
        comparisonText += `- El Oído Derecho ha mostrado una mejora de ${Math.abs(diffOD).toFixed(1)} dB HL en el promedio de VA.\n`;
    } else {
        comparisonText += `- El Oído Derecho se mantiene relativamente estable.\n`;
    }

    if (diffOI > 5) {
        comparisonText += `- El Oído Izquierdo ha mostrado un empeoramiento de ${diffOI.toFixed(1)} dB HL en el promedio de VA.\n`;
    } else if (diffOI < -5) {
        comparisonText += `- El Oído Izquierdo ha mostrado una mejora de ${Math.abs(diffOI).toFixed(1)} dB HL en el promedio de VA.\n`;
    } else {
        comparisonText += `- El Oído Izquierdo se mantiene relativamente estable.\n`;
    }

    if (disability1.grade !== disability2.grade) {
        comparisonText += `- El grado de discapacidad ha cambiado de ${disability1.grade} a ${disability2.grade} (${diffPABC.toFixed(2)}% de cambio en PABC).\n`;
    } else {
        comparisonText += `- El grado de discapacidad se mantiene en ${disability2.grade} (${diffPABC.toFixed(2)}% de cambio en PABC).\n`;
    }

    if (diffPABC > 5) {
        comparisonText += `   Existe un incremento significativo en la Pérdida Auditiva Bilateral Combinada.\n`;
    } else if (diffPABC < -5) {
        comparisonText += `   Existe una disminución significativa en la Pérdida Auditiva Bilateral Combinada.\n`;
    }

    // Add comparison of diagnosis if different
    if (diagnosisOD1 !== diagnosisOD2) {
        comparisonText += `- El diagnóstico de hipoacusia para el Oído Derecho ha cambiado de "${diagnosisOD1}" a "${diagnosisOD2}".\n`;
    }
    if (diagnosisOI1 !== diagnosisOI2) {
        comparisonText += `- El diagnóstico de hipoacusia para el Oído Izquierdo ha cambiado de "${diagnosisOI1}" a "${diagnosisOI2}".\n`;
    }


    comparisonText += `
--- FIN INFORME DE COMPARACIÓN ---`;

    return comparisonText;
}

/**
 * Copies the comparison report content to the clipboard.
 */
function copyComparisonReport() {
    const reportContent = document.getElementById('comparison-report-content').textContent;
    navigator.clipboard.writeText(reportContent)
        .then(() => alert('Informe comparativo copiado al portapapeles.'))
        .catch(err => console.error('Error al copiar el informe comparativo:', err));
}


/**
 * Handles the printing functionality.
 */
function printAudiometry() {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');

    // Get current patient info and results
    const historyNumber = document.getElementById('history-number').value || 'N/D';
    const audiometryDate = document.getElementById('audiometry-date').value || 'N/D';
    // const currentResults = window.currentAudiometryResults; // Not directly used here, but data comes from generateDetailedReport

    // Get the detailed report content
    const detailedReportContent = generateDetailedReport();

    // Get the main audiogram SVG
    const audiogramSvgContent = document.getElementById('audiogram-container').innerHTML;

    // Build the content for the print window
    let printContent = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Audiometría - Impresión</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: white;
                    color: black;
                    font-size: 10pt;
                }
                .print-container {
                    width: 210mm; /* A4 width */
                    min-height: 297mm; /* A4 height */
                    margin: 0 auto;
                    padding: 15mm; /* Margins for A4 */
                    box-sizing: border-box;
                }
                h1, h2, h3 {
                    color: black;
                    text-align: center;
                    margin-top: 15px;
                    margin-bottom: 10px;
                }
                h1 { font-size: 18pt; }
                h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 15px; }
                h3 { font-size: 12pt; }

                .print-info {
                    text-align: left;
                    margin-bottom: 20px;
                    font-size: 11pt;
                }
                .print-info p {
                    margin: 5px 0;
                }

                .audiometry-summary-print {
                    display: flex;
                    flex-wrap: wrap; /* Allows items to wrap on smaller print areas if needed */
                    justify-content: space-between;
                    margin-bottom: 20px;
                }
                .audiometry-summary-print .half-width {
                    width: 48%; /* Roughly half width for two columns */
                    box-sizing: border-box;
                }
                .audiometry-summary-print #audiogram-container-print {
                    height: 350px; /* Fixed height for audiogram in print */
                    border: 1px solid #ccc;
                    border-radius: 5px;
                    padding: 5px;
                    background-color: #fff;
                    display: flex; /* To center SVG */
                    align-items: center;
                    justify-content: center;
                }
                .audiometry-summary-print #audiogram-container-print svg {
                    width: 100%;
                    height: 100%;
                }

                #audiometry-table-print table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 5px;
                }
                #audiometry-table-print th, #audiometry-table-print td {
                    border: 1px solid #999;
                    padding: 8px 4px;
                    text-align: center;
                    font-size: 9pt;
                }
                #audiometry-table-print th {
                    background-color: #e9e9e9;
                }

                .report-content-print {
                    border: 1px solid #ccc;
                    padding: 15px;
                    margin-top: 20px;
                    white-space: pre-wrap; /* Preserve formatting */
                    font-family: 'Consolas', 'Courier New', monospace;
                    font-size: 9pt;
                    line-height: 1.4;
                    background-color: #f9fbfd;
                }

                @page {
                    size: A4;
                    margin: 15mm; /* Apply uniform margins for the print page itself */
                }
            </style>
        </head>
        <body>
            <div class="print-container">
                <h1>Informe de Audiometría</h1>

                <div class="print-info">
                    <p><strong>Nº de Historia:</strong> ${historyNumber}</p>
                    <p><strong>Fecha de Audiometría:</strong> ${audiometryDate}</p>
                </div>

                <h2>Resumen de Resultados</h2>
                <div class="audiometry-summary-print">
                    <div id="audiometry-table-print" class="half-width">
                        </div>
                    <div id="audiogram-container-print" class="half-width">
                        ${audiogramSvgContent}
                    </div>
                </div>

                <h2>Informe Detallado</h2>
                <div class="report-content-print">
                    ${detailedReportContent}
                </div>
            </div>
        </body>
        </html>
    `;

    printWindow.document.write(printContent);

    // Get the table from the main document and clone it for the print window
    const originalTable = document.getElementById('audiometry-table');
    if (originalTable) {
        const clonedTable = originalTable.cloneNode(true); // true means deep clone
        const printTableContainer = printWindow.document.getElementById('audiometry-table-print');
        if (printTableContainer) {
            printTableContainer.innerHTML = ''; // Clear any placeholder
            printTableContainer.appendChild(clonedTable);
        }
    }


    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}
