// Lookup tables from Tabla.csv (Source 6)
const PERCENTAGE_DISABILITY_TABLE = {
    0: 0, 100: 0, 105: 1.9, 110: 3.9, 115: 5.6, 120: 7.5, 125: 9.4, 130: 11.2, 135: 13.1,
    140: 15, 145: 16.9, 150: 18.8, 155: 20.6, 160: 22.5, 165: 24.5, 170: 26.2, 175: 28.1,
    180: 30, 185: 31.9, 190: 33.8, 195: 35.6, 200: 37.5, 205: 39.4, 210: 41.2, 215: 43.1,
    220: 45, 225: 46.9, 230: 48.9, 235: 50.5, 240: 52.5, 245: 54.4, 250: 56.2, 255: 58.1,
    260: 60, 265: 61.9, 270: 63.8, 275: 65.6, 280: 67.5, 285: 69.3, 290: 71.2, 295: 73.1,
    300: 75, 305: 76.9, 310: 78.8, 315: 80.6, 320: 82.5, 325: 84.4, 330: 86.2, 335: 88.1,
    340: 90, 345: 90.9, 350: 93.8, 355: 95.6, 360: 97.5, 365: 99.4, 370: 100
};

const HEARING_LOSS_SEVERITY_TABLE = [
    { threshold: 20, description: "Normoacusia" },
    { threshold: 21, description: "Pérdida leve" },
    { threshold: 35, description: "Pérdida leve moderada" },
    { threshold: 40, description: "Pérdida moderada" },
    { threshold: 65, description: "Pérdida severa" },
    { threshold: 80, description: "Pérdida profunda" },
    { threshold: 110, description: "Cofosis" }
];

const TRANSMISSION_LOSS_TABLE = [
    { threshold: -10, description: "No hay hipoacusia de transmisión" }, // Corrected spelling
    { threshold: 20, description: "Posible componente de transmisión" }, // Corrected spelling
    { threshold: 30, description: "Hipoacusia de Transmisión" },
    { threshold: 50, description: "Marcada hipoacusia de transmisión" } // Corrected spelling
];

const ASYMMETRY_TABLE = [
    { threshold: 0, description: "No asimetría" },
    { threshold: 10, description: "Discreta asimetría" }, // Corrected spelling
    { threshold: 15, description: "Asimetría" },
    { threshold: 20, description: "Asimetría significativa" },
    { threshold: 40, description: "Asimetría importante" }, // Corrected spelling
    { threshold: 60, description: "Gran asimetría" }
];

const ASYMMETRY_HIGH_FREQ_TABLE = [
    { threshold: 0, description: "No asimetría en tonos agudos" },
    { threshold: 20, description: "Discreta asimetría en tonos agudos" }, // Corrected spelling
    { threshold: 30, description: "Asimetría en tonos agudos" },
    { threshold: 40, description: "Asimetría significativa en tonos agudos" },
    { threshold: 50, description: "Asimetría importante en tonos agudos" }, // Corrected spelling
    { threshold: 70, description: "Gran asimetría en tonos agudos" }
];

const AUDIOPROSTHESIS_TABLE = [
    { threshold: 0, description: "No precisa audioprótesis" },
    { threshold: 7.5, description: "Pérdida de audición leve, la amplificación audioprotésica es opcional" }, // Corrected spelling
    { threshold: 22.5, description: "Pérdida de audición moderada, la amplificación audioprotésica es necesaria" }, // Corrected spelling
    { threshold: 67.5, description: "Pérdida de audición severa, la amplificación audioprotésica es imprescindible" }, // Corrected spelling
    { threshold: 100, description: "Pérdida de audición severa, la amplificación audioprotésica es imprescindible" } // Assuming 100 is max, matches 67.5 description
];

const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 8000];
const CONVERSATIONAL_FREQUENCIES = [500, 1000, 2000, 3000];
const HIGH_FREQUENCIES = [3000, 4000, 8000];


// Function to get input values
function getThresholds() {
    const thresholds = {
        va: { od: {}, oi: {} },
        vo: { od: {}, oi: {} }
    };

    FREQUENCIES.forEach(freq => {
        thresholds.va.od[freq] = parseInt(document.getElementById(`va-od-${freq}`).value) || 0;
        thresholds.vo.od[freq] = parseInt(document.getElementById(`vo-od-${freq}`).value) || 0;
        thresholds.va.oi[freq] = parseInt(document.getElementById(`va-oi-${freq}`).value) || 0;
        thresholds.vo.oi[freq] = parseInt(document.getElementById(`vo-oi-${freq}`).value) || 0;
    });
    return thresholds;
}

// Function to automatically update bone conduction when air conduction changes
function setupAutoUpdate() {
    ['od', 'oi'].forEach(ear => {
        FREQUENCIES.forEach(freq => {
            const vaInput = document.getElementById(`va-${ear}-${freq}`);
            const voInput = document.getElementById(`vo-${ear}-${freq}`);

            if (vaInput && voInput) {
                vaInput.addEventListener('input', (event) => {
                    voInput.value = event.target.value; // Always auto-update VO when VA changes
                    calculateAndDisplay(); // Recalculate on VA input change
                });

                voInput.addEventListener('input', () => {
                    // If VO is manually changed, simply recalculate.
                    // The auto-update from VA will still override it if VA changes later.
                    calculateAndDisplay(); // Recalculate on VO input change
                });
            }
        });
    });
}


// Calculate Monoaural Loss (Sum of 500, 1000, 2000, 3000 Hz via Aérea)
function calculateMonoauralLoss(earThresholds) {
    let sum = 0;
    CONVERSATIONAL_FREQUENCIES.forEach(freq => {
        sum += earThresholds[freq];
    });
    return sum;
}

// Calculate Binaural Loss
function calculateBinauralLoss(sumOD, sumOI) {
    let betterEarSum = Math.min(sumOD, sumOI);
    let worseEarSum = Math.max(sumOD, sumOI);

    if (isNaN(betterEarSum) || isNaN(worseEarSum)) {
        return 0; // Handle cases where sums might be NaN if inputs are invalid
    }

    return ((5 * betterEarSum) + (1 * worseEarSum)) / 6;
}

// Get percentage from lookup table with linear interpolation
function getPercentageDisability(binauralLoss) {
    const keys = Object.keys(PERCENTAGE_DISABILITY_TABLE).map(Number).sort((a, b) => a - b);
    let percentage = 0;

    for (let i = 0; i < keys.length; i++) {
        if (binauralLoss === keys[i]) {
            percentage = PERCENTAGE_DISABILITY_TABLE[keys[i]];
            break;
        } else if (binauralLoss < keys[i]) {
            if (i === 0) { // If less than the first key, use the first percentage
                percentage = PERCENTAGE_DISABILITY_TABLE[keys[0]];
            } else {
                const lowerKey = keys[i - 1];
                const upperKey = keys[i];
                const lowerVal = PERCENTAGE_DISABILITY_TABLE[lowerKey];
                const upperVal = PERCENTAGE_DISABILITY_TABLE[upperKey];

                if (upperKey - lowerKey === 0) { // Avoid division by zero
                    percentage = lowerVal;
                } else {
                    percentage = lowerVal + (binauralLoss - lowerKey) * (upperVal - lowerVal) / (upperKey - lowerKey);
                }
            }
            break;
        } else if (i === keys.length - 1) { // If greater than the last key, use the last percentage
            percentage = PERCENTAGE_DISABILITY_TABLE[keys[i]];
        }
    }
    return parseFloat(percentage.toFixed(2)); // Round to 2 decimal places
}


// Generic lookup function for severity/recommendation tables (finds the highest threshold met)
function getDescriptor(value, table) {
    let description = "Valor no especificado"; // Default if no match
    // Ensure table is sorted by threshold ascending
    const sortedTable = [...table].sort((a, b) => a.threshold - b.threshold);

    for (const item of sortedTable) {
        if (value >= item.threshold) {
            description = item.description;
        } else {
            // Since the table is sorted, if value is less than current threshold,
            // it means it's less than all subsequent thresholds as well.
            break;
        }
    }
    return description;
}


// Main calculation and display function
function calculateAndDisplay() {
    const thresholds = getThresholds();

    const sumOD = calculateMonoauralLoss(thresholds.va.od);
    const sumOI = calculateMonoauralLoss(thresholds.va.oi);

    const binauralLoss = calculateBinauralLoss(sumOD, sumOI);
    const percentageDisability = getPercentageDisability(binauralLoss);

    // Calculate individual ear percentages for the basic report
    const percentageOD = getPercentageDisability(sumOD); // Use the same table for monoaural sum
    const percentageOI = getPercentageDisability(sumOI); // Use the same table for monoaural sum

    displayResultsTable(thresholds, sumOD, sumOI);
    generateBasicReport(sumOD, sumOI, percentageOD, percentageOI, binauralLoss, percentageDisability);
    generateDetailedReport(thresholds, sumOD, sumOI, binauralLoss, percentageDisability);
}

function displayResultsTable(thresholds, sumOD, sumOI) {
    const tableBody = document.querySelector('#audiometry-table tbody');
    tableBody.innerHTML = ''; // Clear previous results

    // Right Ear - Via Aérea
    let rowOD_VA = `<tr><td>Oído Derecho (Vía Aérea)</td>`;
    FREQUENCIES.forEach(freq => {
        rowOD_VA += `<td>${thresholds.va.od[freq]}</td>`;
    });
    rowOD_VA += `<td>${sumOD}</td></tr>`;
    tableBody.innerHTML += rowOD_VA;

    // Right Ear - Via Ósea
    let rowOD_VO = `<tr><td>Oído Derecho (Vía Ósea)</td>`;
    FREQUENCIES.forEach(freq => {
        rowOD_VO += `<td>${thresholds.vo.od[freq]}</td>`;
    });
    rowOD_VO += `<td></td></tr>`; // No sum for bone conduction in this table context
    tableBody.innerHTML += rowOD_VO;

    // Left Ear - Via Aérea
    let rowOI_VA = `<tr><td>Oído Izquierdo (Vía Aérea)</td>`;
    FREQUENCIES.forEach(freq => {
        rowOI_VA += `<td>${thresholds.va.oi[freq]}</td>`;
    });
    rowOI_VA += `<td>${sumOI}</td></tr>`;
    tableBody.innerHTML += rowOI_VA;

    // Left Ear - Via Ósea
    let rowOI_VO = `<tr><td>Oído Izquierdo (Vía Ósea)</td>`;
    FREQUENCIES.forEach(freq => {
        rowOI_VO += `<td>${thresholds.vo.oi[freq]}</td>`;
    });
    rowOI_VO += `<td></td></tr>`; // No sum for bone conduction in this table context
    tableBody.innerHTML += rowOI_VO;
}

// Updated generateBasicReport to include individual ear percentages and corrected orthography
function generateBasicReport(sumOD, sumOI, percentageOD, percentageOI, binauralLoss, percentageDisability) {
    const reportContentDiv = document.getElementById('basic-report-content');
    let reportText = `          Informe de la medida de la pérdida auditiva
según Real Decreto 1971/1999 de 23 de diciembre,
de Procedimiento para el Reconocimiento, Declaración
y Calificación del Grado de Minusvalía (BOE de 26 de
enero y 13 de marzo de 2000). Anexo 1ª, Capítulo 13.
BOE de 16 de Enero de 2000: SS - 1104/78- 81.

    La pérdida MONOAURAL obtenida por el sumatorio
de los umbrales de vía aérea de las cuatro frecuencias
conversacionales (500, 1000, 2000 y 3000 Hz),
en la audiometría tonal liminar en cada oído.

Oído Dcho. sumatorio: ${sumOD}  (Pérdida OD: ${percentageOD.toFixed(2)}%)
Oído Izq. sumatorio: ${sumOI}  (Pérdida OI: ${percentageOI.toFixed(2)}%)

    El cálculo de PÉRDIDA BINAURAL es el siguiente:
PB = Pérdida Binaural / E MO = sumatoria del mejor oído /
E PO = sumatoria del peor oído. Así la pérdida binaural
NO es la media aritmética de ambos oídos, sino la media
ponderada consistente en: 5 veces la suma de las 4
frecuencias en el oído más sano + 1 vez la suma de las
4 frecuencias en el oído peor, todo ello dividido entre 6.

    Aplicando esta fórmula,
PÉRDIDA AUDITIVA BINAURAL ponderada entre los dos oídos es de ${binauralLoss.toFixed(2)} dB, con un porcentaje de discapacidad del ${percentageDisability.toFixed(2)}%.`;

    reportContentDiv.textContent = reportText;
}

// No changes to detailed report expected, but included for completeness and orthography review.
function generateDetailedReport(thresholds, sumOD, sumOI, binauralLoss, percentageDisability) {
    const reportContentDiv = document.getElementById('detailed-report-content');
    let reportText = `--- Interpretación Detallada ---\n\n`;

    // Hearing Loss Severity (based on average of conversational frequencies)
    const getConversationalAverage = (earThresholds) => {
        let sum = 0;
        CONVERSATIONAL_FREQUENCIES.forEach(freq => {
            sum += earThresholds[freq];
        });
        return sum / CONVERSATIONAL_FREQUENCIES.length;
    };

    const avgOD_VA = getConversationalAverage(thresholds.va.od);
    const avgOI_VA = getConversationalAverage(thresholds.va.oi);

    reportText += `Diagnóstico de Pérdida Auditiva (Vía Aérea):\n`;
    reportText += `  Oído Derecho: ${getDescriptor(avgOD_VA, HEARING_LOSS_SEVERITY_TABLE)}\n`;
    reportText += `  Oído Izquierdo: ${getDescriptor(avgOI_VA, HEARING_LOSS_SEVERITY_TABLE)}\n\n`;

    // Transmission Loss (Air-Bone Gap)
    const getTransmissionResult = (vaValue, voValue) => {
        const diff = vaValue - voValue;
        return getDescriptor(diff, TRANSMISSION_LOSS_TABLE);
    };

    reportText += `Componente de Transmisión:\n`;
    reportText += `  Oído Derecho:\n`;
    FREQUENCIES.forEach(freq => {
        reportText += `    ${freq} Hz: ${getTransmissionResult(thresholds.va.od[freq], thresholds.vo.od[freq])}\n`;
    });
    reportText += `  Oído Izquierdo:\n`;
    FREQUENCIES.forEach(freq => {
        reportText += `    ${freq} Hz: ${getTransmissionResult(thresholds.va.oi[freq], thresholds.vo.oi[freq])}\n`;
    });
    reportText += `\n`;

    // Asymmetry
    const getAsymmetryResult = (freq) => {
        const diff = Math.abs(thresholds.va.od[freq] - thresholds.va.oi[freq]);
        return getDescriptor(diff, ASYMMETRY_TABLE);
    };

    const getHighFreqAsymmetryResult = () => {
        let sumDiffHighFreq = 0;
        HIGH_FREQUENCIES.forEach(freq => {
            sumDiffHighFreq += Math.abs(thresholds.va.od[freq] - thresholds.va.oi[freq]);
        });
        const avgDiffHighFreq = sumDiffHighFreq / HIGH_FREQUENCIES.length;
        return getDescriptor(avgDiffHighFreq, ASYMMETRY_HIGH_FREQ_TABLE);
    };

    reportText += `Asimetría entre Oídos (Vía Aérea):\n`;
    CONVERSATIONAL_FREQUENCIES.forEach(freq => {
        reportText += `  ${freq} Hz: ${getAsymmetryResult(freq)}\n`;
    });
    reportText += `  Asimetría en tonos agudos (promedio 3k, 4k, 8k Hz): ${getHighFreqAsymmetryResult()}\n\n`;

    // Audioprosthesis Recommendation
    reportText += `Recomendación de Audioprótesis: ${getDescriptor(percentageDisability, AUDIOPROSTHESIS_TABLE)}\n`;


    reportContentDiv.textContent = reportText;
}

// Copy functions
function copyTable() {
    const table = document.getElementById('audiometry-table');
    const range = document.createRange();
    range.selectNode(table);
    window.getSelection().removeAllRanges(); // Clear any current selections
    window.getSelection().addRange(range); // Select the table
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert('Tabla copiada al portapapeles!');
        } else {
            throw new Error('Failed to copy using execCommand');
        }
    } catch (err) {
        console.error('Error al copiar la tabla: ', err);
        alert('No se pudo copiar la tabla. Por favor, seleccione y copie manualmente.');
    } finally {
        window.getSelection().removeAllRanges(); // Deselect
    }
}

async function copyBasicReport() {
    const reportContent = document.getElementById('basic-report-content');
    try {
        await navigator.clipboard.writeText(reportContent.textContent);
        alert('Informe Básico copiado al portapapeles!');
    } catch (err) {
        console.error('Error al copiar el informe básico: ', err);
        alert('No se pudo copiar el informe básico. Por favor, seleccione y copie manualmente.');
    }
}

async function copyDetailedReport() {
    const reportContent = document.getElementById('detailed-report-content');
    try {
        await navigator.clipboard.writeText(reportContent.textContent);
        alert('Informe Detallado copiado al portapapeles!');
    } catch (err) {
        console.error('Error al copiar el informe detallado: ', err);
        alert('No se pudo copiar el informe detallado. Por favor, seleccione y copie manualmente.');
    }
}

// Initial setup when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setupAutoUpdate();
    calculateAndDisplay(); // Display initial values based on default inputs
});