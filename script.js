// --- Almacenamiento y Constantes ---
let audiometryRecords = [];
const FREQUENCIES = [250, 500, 1000, 2000, 3000, 4000, 8000];
const KEY_FREQUENCIES_FOR_AVG = [500, 1000, 2000, 4000];

// --- Inicialización de la Aplicación ---
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeDate();
    loadAudiometryRecords();
    addEventListeners();
});

function initializeTheme() {
    const themeSwitch = document.getElementById('theme-switch');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
        themeSwitch.checked = true;
    }
    themeSwitch.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', themeSwitch.checked ? 'dark' : 'light');
    });
}

function initializeDate() {
    document.getElementById('audiometry-date').value = new Date().toISOString().split('T')[0];
}

function addEventListeners() {
    ['od', 'oi'].forEach(ear => {
        FREQUENCIES.forEach(freq => {
            const vaInput = document.getElementById(`va-${ear}-${freq}`);
            vaInput?.addEventListener('input', (e) => {
                const voInput = document.getElementById(`vo-${ear}-${freq}`);
                if (voInput) voInput.value = e.target.value;
            });
        });
    });
}

// --- Notificaciones Toast ---
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

// --- Gestión de Datos ---
function saveAudiometry() {
    const historyNumber = document.getElementById('history-number').value;
    const audiometryDate = document.getElementById('audiometry-date').value;

    if (!historyNumber || !audiometryDate) {
        showToast('Por favor, introduce el Nº de Historia y la Fecha.', 'error');
        return;
    }

    const audiometryData = {
        id: `${historyNumber}-${audiometryDate}-${Date.now()}`,
        historyNumber,
        audiometryDate,
        observations: document.getElementById('observations').value,
        va: { od: {}, oi: {} },
        vo: { od: {}, oi: {} }
    };

    FREQUENCIES.forEach(freq => {
        audiometryData.va.od[freq] = parseInt(document.getElementById(`va-od-${freq}`).value) || 0;
        audiometryData.vo.od[freq] = parseInt(document.getElementById(`vo-od-${freq}`).value) || 0;
        audiometryData.va.oi[freq] = parseInt(document.getElementById(`va-oi-${freq}`).value) || 0;
        audiometryData.vo.oi[freq] = parseInt(document.getElementById(`vo-oi-${freq}`).value) || 0;
    });

    const existingIndex = audiometryRecords.findIndex(rec => rec.historyNumber === historyNumber && rec.audiometryDate === audiometryDate);
    if (existingIndex > -1) {
        if (confirm('Ya existe un registro para este paciente en esta fecha. ¿Desea sobrescribirlo?')) {
            audiometryRecords[existingIndex] = audiometryData;
        } else {
            return;
        }
    } else {
        audiometryRecords.push(audiometryData);
    }
    
    updateLocalStorageAndUI();
    showToast('Audiometría guardada exitosamente.', 'success');
}

function deleteSelectedAudiometry() {
    const select = document.getElementById('saved-audiometries');
    const recordIdToDelete = select.value;
    if (!recordIdToDelete) {
        showToast('Por favor, seleccione una audiometría para eliminar.', 'info');
        return;
    }
    if (confirm('¿Está seguro de que desea eliminar este registro?')) {
        audiometryRecords = audiometryRecords.filter(rec => rec.id !== recordIdToDelete);
        updateLocalStorageAndUI();
        resetApplication();
        showToast('Registro eliminado.', 'success');
    }
}

function loadAudiometryRecords() {
    const storedRecords = localStorage.getItem('audiometryRecords');
    audiometryRecords = storedRecords ? JSON.parse(storedRecords) : [];
    populateSelects();
}

function loadSelectedAudiometry() {
    const select = document.getElementById('saved-audiometries');
    const record = audiometryRecords.find(rec => rec.id === select.value);
    if (record) {
        document.getElementById('history-number').value = record.historyNumber;
        document.getElementById('audiometry-date').value = record.audiometryDate;
        document.getElementById('observations').value = record.observations || '';
        FREQUENCIES.forEach(freq => {
            document.getElementById(`va-od-${freq}`).value = record.va.od[freq] ?? 0;
            document.getElementById(`vo-od-${freq}`).value = record.vo.od[freq] ?? 0;
            document.getElementById(`va-oi-${freq}`).value = record.va.oi[freq] ?? 0;
            document.getElementById(`vo-oi-${freq}`).value = record.vo.oi[freq] ?? 0;
        });
        calculateAndDisplay();
        showToast('Audiometría cargada.', 'info');
    }
}

function populateSelects() {
    const selects = [
        document.getElementById('saved-audiometries'),
        document.getElementById('select-audiometry-compare-1'),
        document.getElementById('select-audiometry-compare-2')
    ];
    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = `<option value="">${select.firstElementChild.textContent}</option>`;
        audiometryRecords
            .sort((a, b) => new Date(b.audiometryDate) - new Date(a.audiometryDate))
            .forEach(record => {
                const option = document.createElement('option');
                option.value = record.id;
                option.textContent = `Nº ${record.historyNumber} - ${record.audiometryDate}`;
                select.appendChild(option);
            });
        select.value = currentValue;
    });
}

function updateLocalStorageAndUI() {
    localStorage.setItem('audiometryRecords', JSON.stringify(audiometryRecords));
    populateSelects();
}

// --- Importar / Exportar ---
function exportData() {
    if (audiometryRecords.length === 0) {
        showToast('No hay datos para exportar.', 'info');
        return;
    }
    const dataStr = JSON.stringify(audiometryRecords, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audiometria_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Datos exportados.', 'success');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedRecords = JSON.parse(e.target.result);
            if (Array.isArray(importedRecords) && importedRecords.every(rec => rec.id && rec.historyNumber)) {
                const existingIds = new Set(audiometryRecords.map(rec => rec.id));
                const newRecords = importedRecords.filter(rec => !existingIds.has(rec.id));
                audiometryRecords.push(...newRecords);
                updateLocalStorageAndUI();
                showToast(`${newRecords.length} nuevos registros importados.`, 'success');
            } else {
                showToast('El archivo no tiene el formato correcto.', 'error');
            }
        } catch (error) {
            showToast('Error al leer el archivo.', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// --- Cálculos Audiométricos ---
function calculateAndDisplay() {
    const tableBody = document.querySelector('#audiometry-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const results = {};

    ['od', 'oi'].forEach(ear => {
        const vaValues = {}, voValues = {};
        FREQUENCIES.forEach(freq => {
            vaValues[freq] = parseInt(document.getElementById(`va-${ear}-${freq}`).value);
            voValues[freq] = parseInt(document.getElementById(`vo-${ear}-${freq}`).value);
        });

        const avgVA = calculateAverage(vaValues, KEY_FREQUENCIES_FOR_AVG);
        results[ear] = { va: vaValues, vo: voValues, avgVA, diagnosis: diagnoseHipoacusia(vaValues, voValues) };
        
        const rowVA = tableBody.insertRow();
        rowVA.innerHTML = `<td>VA ${ear.toUpperCase()}</td>` + FREQUENCIES.map(f => `<td>${vaValues[f] ?? '-'}</td>`).join('');
        
        const rowVO = tableBody.insertRow();
        rowVO.innerHTML = `<td>VO ${ear.toUpperCase()}</td>` + FREQUENCIES.map(f => `<td>${voValues[f] ?? '-'}</td>`).join('');
        
        const rowGAP = tableBody.insertRow();
        rowGAP.innerHTML = `<td>GAP ${ear.toUpperCase()}</td>` + FREQUENCIES.map(f => {
            const gap = vaValues[f] - voValues[f];
            return `<td>${!isNaN(gap) ? gap : '-'}</td>`;
        }).join('');

        const sumVA = KEY_FREQUENCIES_FOR_AVG.reduce((acc, f) => acc + (vaValues[f] || 0), 0);
        const rowSum = tableBody.insertRow();
        rowSum.innerHTML = `<td>Sumatorio ${ear.toUpperCase()}</td><td colspan="${FREQUENCIES.length}">${sumVA} dB HL (Media VA: ${avgVA.toFixed(1)} dB HL)</td>`;
    });

    const pabc = calculatePABC(results.od.avgVA, results.oi.avgVA);
    window.currentAudiometryResults = { ...results, pabc };

    drawAudiogram(results.od.va, results.od.vo, results.oi.va, results.oi.vo);
    displayReports();
}

function calculateAverage(data, freqsToUse) {
    let sum = 0, count = 0;
    freqsToUse.forEach(freq => {
        const value = data[freq];
        if (!isNaN(value)) {
            sum += value;
            count++;
        }
    });
    return count > 0 ? sum / count : 0;
}

function calculatePABC(avgOD, avgOI) {
    return ((avgOD * 5) + (avgOI * 1)) / 6;
}

function diagnoseHipoacusia(earVA, earVO) {
    const avgVA = calculateAverage(earVA, KEY_FREQUENCIES_FOR_AVG);
    const avgVO = calculateAverage(earVO, KEY_FREQUENCIES_FOR_AVG);
    const avgGAP = avgVA - avgVO;

    if (avgVA <= 20) return "Audición Normal";
    if (avgGAP > 10) {
        return avgVO <= 20 ? "De Transmisión (Conductiva)" : "Mixta";
    }
    return "Neurosensorial";
}

// --- Renderizado de Gráfica (Audiograma) ---
function drawAudiogram(odVA, odVO, oiVA, oiVO, containerId = 'audiogram-container') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const width = 800, height = 500, padding = 50;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.id = "audiogram-svg";

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    container.appendChild(tooltip);

    const xScale = (freq) => padding + (FREQUENCIES.indexOf(freq) / (FREQUENCIES.length - 1)) * (width - 2 * padding);
    const yScale = (db) => padding + ((db + 10) / 130) * (height - 2 * padding);

    const dbLevels = Array.from({ length: 14 }, (_, i) => i * 10 - 10);
    let gridHtml = '';
    dbLevels.forEach(db => {
        const y = yScale(db);
        gridHtml += `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(--border-color)" stroke-width="1"/>`;
        gridHtml += `<text x="${padding - 15}" y="${y + 4}" text-anchor="end" font-size="12" fill="var(--text-color)">${db}</text>`;
    });
    FREQUENCIES.forEach(freq => {
        const x = xScale(freq);
        gridHtml += `<line x1="${x}" y1="${padding}" x2="${x}" y2="${height - padding}" stroke="var(--border-color)" stroke-width="1"/>`;
        gridHtml += `<text x="${x}" y="${height - padding + 20}" text-anchor="middle" font-size="12" fill="var(--text-color)">${freq >= 1000 ? `${freq/1000}K` : freq}</text>`;
    });
    gridHtml += `<text x="${padding/2}" y="${height/2}" transform="rotate(-90, ${padding/2}, ${height/2})" text-anchor="middle" font-weight="bold" fill="var(--text-color)">Intensidad (dB HL)</text>`;
    gridHtml += `<text x="${width/2}" y="${height - padding/2.5}" text-anchor="middle" font-weight="bold" fill="var(--text-color)">Frecuencia (Hz)</text>`;
    svg.innerHTML = gridHtml;
    
    container.appendChild(svg);

    const drawPath = (data, symbol, color, isDashed = false, ear, type) => {
        let pathData = "";
        const points = FREQUENCIES.map(freq => {
            const value = data[freq];
            return !isNaN(value) ? { x: xScale(freq), y: yScale(value), freq, value } : null;
        }).filter(p => p);

        points.forEach((p, i) => {
            pathData += `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
            const symbolEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            symbolEl.setAttribute("x", p.x);
            symbolEl.setAttribute("y", p.y);
            Object.assign(symbolEl.style, { textAnchor: "middle", dominantBaseline: "middle", fontSize: "20px", fill: color, cursor: "pointer" });
            symbolEl.textContent = symbol;
            symbolEl.onmouseover = () => {
                tooltip.style.opacity = '1';
                tooltip.innerHTML = `${ear.toUpperCase()} ${type}: ${p.freq}Hz @ ${p.value}dB`;
            };
            symbolEl.onmousemove = (e) => {
                const rect = container.getBoundingClientRect();
                tooltip.style.left = `${e.clientX - rect.left}px`;
                tooltip.style.top = `${e.clientY - rect.top}px`;
            };
            symbolEl.onmouseout = () => { tooltip.style.opacity = '0'; };
            svg.appendChild(symbolEl);
        });

        if (pathData) {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", pathData);
            Object.assign(path.style, { fill: "none", stroke: color, strokeWidth: "2" });
            if (isDashed) path.style.strokeDasharray = "5,5";
            svg.appendChild(path);
        }
    };
    
    const legendItems = [
        { symbol: 'O', text: 'OD Vía Aérea', color: 'red' }, { symbol: '[', text: 'OD Vía Ósea', color: 'red' },
        { symbol: 'X', text: 'OI Vía Aérea', color: 'blue' }, { symbol: ']', text: 'OI Vía Ósea', color: 'blue' }
    ];
    legendItems.forEach((item, i) => {
        const y = padding + 20 + (i * 25);
        const legendSymbol = document.createElementNS("http://www.w3.org/2000/svg", "text");
        legendSymbol.setAttribute('x', width - padding - 80);
        legendSymbol.setAttribute('y', y);
        legendSymbol.style.fill = item.color;
        legendSymbol.style.fontSize = '20px';
        legendSymbol.textContent = item.symbol;
        svg.appendChild(legendSymbol);
        const legendText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        legendText.setAttribute('x', width - padding - 60);
        legendText.setAttribute('y', y);
        legendText.style.fill = 'var(--text-color)';
        legendText.style.fontSize = '12px';
        legendText.style.dominantBaseline = 'middle';
        legendText.textContent = item.text;
        svg.appendChild(legendText);
    });

    drawPath(odVA, 'O', 'red', false, 'od', 'VA');
    drawPath(odVO, '[', 'red', true, 'od', 'VO');
    drawPath(oiVA, 'X', 'blue', false, 'oi', 'VA');
    drawPath(oiVO, ']', 'blue', true, 'oi', 'VO');
}

// --- Generación de Informes ---
function displayReports() {
    if (window.currentAudiometryResults) {
        document.getElementById('basic-report-content').textContent = generateBasicReport();
        document.getElementById('detailed-report-content').textContent = generateDetailedReport();
    }
}

function getDisabilityGrade(pabc) {
    if (pabc >= 96) return { grade: "Grado 4 (Total o Completa)", range: "96% al 100%" };
    if (pabc >= 50) return { grade: "Grado 3 (Grave)", range: "50% al 95%" };
    if (pabc >= 25) return { grade: "Grado 2 (Moderada)", range: "25% al 49%" };
    if (pabc >= 5) return { grade: "Grado 1 (Leve)", range: "5% al 24%" };
    return { grade: "Grado 0 (No hay discapacidad)", range: "0% al 4%" };
}

function generateBasicReport() {
    const { od, oi, pabc } = window.currentAudiometryResults;
    const disability = getDisabilityGrade(pabc);
    return `--- INFORME BÁSICO DE AUDIOMETRÍA ---

Nº de Historia: ${document.getElementById('history-number').value || 'N/D'}
Fecha de Audiometría: ${document.getElementById('audiometry-date').value || 'N/D'}

Resultados Globales de Pérdida Auditiva (según fórmulas internas de cálculo):
   - Oído Derecho (OD): ${od.avgVA.toFixed(1)} dB HL
   - Oído Izquierdo (OI): ${oi.avgVA.toFixed(1)} dB HL
   - Pérdida Auditiva Bilateral Combinada (PABC): ${pabc.toFixed(2)} %

Diagnóstico del Tipo de Hipoacusia:
   - Oído Derecho (OD): ${od.diagnosis}
   - Oído Izquierdo (OI): ${oi.diagnosis}

Valoración del Grado de Discapacidad Auditiva (según Real Decreto 888/2022):
   - Grado de Discapacidad Estimado: ${disability.grade}
     (Corresponde a un rango del ${disability.range} de la PABC según el baremo actualizado).

Observaciones:
${document.getElementById('observations').value || 'Sin observaciones.'}

--- FIN INFORME BÁSICO ---`;
}

function generateDetailedReport() {
    const { od, oi, pabc } = window.currentAudiometryResults;
    const disability = getDisabilityGrade(pabc);
    const getFormattedValues = (data) => FREQUENCIES.map(freq => `${freq}Hz: ${!isNaN(data[freq]) ? data[freq] : '-'}`).join(' | ');
    return `--- INFORME DETALLADO DE AUDIOMETRÍA ---

**1. Datos del Paciente y Evaluación**
   - Nº de Historia: ${document.getElementById('history-number').value || 'N/D'}
   - Fecha de Audiometría: ${document.getElementById('audiometry-date').value || 'N/D'}

**2. Umbrales Auditivos por Frecuencia (dB HL)**

   **Oído Derecho (OD):**
     - Vía Aérea (VA):
       ${getFormattedValues(od.va)}
     - Vía Ósea (VO):
       ${getFormattedValues(od.vo)}
     - Diagnóstico del Tipo de Hipoacusia: ${od.diagnosis}

   **Oído Izquierdo (OI):**
     - Vía Aérea (VA):
       ${getFormattedValues(oi.va)}
     - Vía Ósea (VO):
       ${getFormattedValues(oi.vo)}
     - Diagnóstico del Tipo de Hipoacusia: ${oi.diagnosis}

   **Pérdida Auditiva Bilateral Combinada (PABC):** ${pabc.toFixed(2)}%

**3. Grado de Discapacidad Auditiva (según Real Decreto 888/2022)**

   - El porcentaje de la Pérdida Auditiva Bilateral Combinada (PABC) calculada, ${pabc.toFixed(2)}%, se correlaciona con el **${disability.grade}** de discapacidad auditiva.

**4. Observaciones Adicionales**
${document.getElementById('observations').value || 'Sin observaciones adicionales.'}

--- FIN INFORME DETALLADO ---`;
}

// --- Acciones de UI ---
function copyTable() {
    const table = document.getElementById('audiometry-table');
    let tableText = '';
    table.querySelectorAll('tr').forEach(tr => {
        tr.querySelectorAll('th, td').forEach(td => { tableText += td.textContent + '\t'; });
        tableText = tableText.trim() + '\n';
    });
    navigator.clipboard.writeText(tableText)
        .then(() => showToast('Tabla copiada.', 'success'))
        .catch(() => showToast('Error al copiar tabla.', 'error'));
}
function copyBasicReport() { navigator.clipboard.writeText(document.getElementById('basic-report-content').textContent).then(() => showToast('Informe básico copiado.', 'success'));}
function copyDetailedReport() { navigator.clipboard.writeText(document.getElementById('detailed-report-content').textContent).then(() => showToast('Informe detallado copiado.', 'success'));}
function copyComparisonReport() { navigator.clipboard.writeText(document.getElementById('comparison-report-content').textContent).then(() => showToast('Informe comparativo copiado.', 'success'));}

function resetApplication() {
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => input.value = '');
    document.querySelectorAll('input[type="number"]').forEach(input => input.value = '0');
    initializeDate();
    ['audiometry-table tbody', 'audiogram-container', 'basic-report-content', 'detailed-report-content', 'comparison-report-content'].forEach(id => {
        const el = document.getElementById(id) || document.querySelector(id);
        if (el) el.innerHTML = '';
    });
    document.getElementById('saved-audiometries').value = '';
    showToast('Aplicación reiniciada.', 'info');
}

function printAudiometry() {
    // Simplemente llama a la función de impresión del navegador.
    // Los estilos de @media print en CSS se encargarán del resto.
    window.print();
}

// --- Comparación ---
function generateComparisonReport(aud1, aud2) {
    const avgOD1 = calculateAverage(aud1.va.od, KEY_FREQUENCIES_FOR_AVG);
    const avgOI1 = calculateAverage(aud1.va.oi, KEY_FREQUENCIES_FOR_AVG);
    const pabc1 = calculatePABC(avgOD1, avgOI1);
    const disability1 = getDisabilityGrade(pabc1);
    const diagnosisOD1 = diagnoseHipoacusia(aud1.va.od, aud1.vo.od);
    const diagnosisOI1 = diagnoseHipoacusia(aud1.va.oi, aud1.vo.oi);

    const avgOD2 = calculateAverage(aud2.va.od, KEY_FREQUENCIES_FOR_AVG);
    const avgOI2 = calculateAverage(aud2.va.oi, KEY_FREQUENCIES_FOR_AVG);
    const pabc2 = calculatePABC(avgOD2, avgOI2);
    const disability2 = getDisabilityGrade(pabc2);
    const diagnosisOD2 = diagnoseHipoacusia(aud2.va.od, aud2.vo.od);
    const diagnosisOI2 = diagnoseHipoacusia(aud2.va.oi, aud2.vo.oi);

    let report = `--- INFORME DE COMPARACIÓN DE AUDIOMETRÍAS ---

**Audiometría 1 (Basal):**
   - Fecha: ${aud1.audiometryDate}
   - Promedio OD (VA): ${avgOD1.toFixed(1)} dB HL | OI (VA): ${avgOI1.toFixed(1)} dB HL
   - PABC: ${pabc1.toFixed(2)}%
   - Grado: ${disability1.grade}
   - Diagnóstico OD: ${diagnosisOD1} | OI: ${diagnosisOI1}

**Audiometría 2 (Seguimiento):**
   - Fecha: ${aud2.audiometryDate}
   - Promedio OD (VA): ${avgOD2.toFixed(1)} dB HL | OI (VA): ${avgOI2.toFixed(1)} dB HL
   - PABC: ${pabc2.toFixed(2)}%
   - Grado: ${disability2.grade}
   - Diagnóstico OD: ${diagnosisOD2} | OI: ${diagnosisOI2}

**Análisis Comparativo:**
`;

    const diffOD = avgOD2 - avgOD1;
    if (diffOD > 5) report += `- Empeoramiento en Oído Derecho de ${diffOD.toFixed(1)} dB.\n`;
    else if (diffOD < -5) report += `- Mejora en Oído Derecho de ${Math.abs(diffOD).toFixed(1)} dB.\n`;
    else report += `- Oído Derecho se mantiene estable.\n`;

    const diffOI = avgOI2 - avgOI1;
    if (diffOI > 5) report += `- Empeoramiento en Oído Izquierdo de ${diffOI.toFixed(1)} dB.\n`;
    else if (diffOI < -5) report += `- Mejora en Oído Izquierdo de ${Math.abs(diffOI).toFixed(1)} dB.\n`;
    else report += `- Oído Izquierdo se mantiene estable.\n`;

    if (disability1.grade !== disability2.grade) {
        report += `- El grado de discapacidad ha cambiado de ${disability1.grade} a ${disability2.grade}.\n`;
    } else {
        report += `- El grado de discapacidad se mantiene en ${disability2.grade}.\n`;
    }
    
    report += `--- FIN DEL INFORME ---`;
    return report;
}

function compareAudiometries() {
    const id1 = document.getElementById('select-audiometry-compare-1').value;
    const id2 = document.getElementById('select-audiometry-compare-2').value;
    if (!id1 || !id2) {
        showToast('Seleccione dos audiometrías para comparar.', 'info');
        return;
    }
    const record1 = audiometryRecords.find(r => r.id === id1);
    const record2 = audiometryRecords.find(r => r.id === id2);
    
    if (record1 && record2) {
        drawAudiogram(record1.va.od, record1.vo.od, record1.va.oi, record1.vo.oi, 'comparison-audiogram-1-container');
        drawAudiogram(record2.va.od, record2.vo.od, record2.va.oi, record2.vo.oi, 'comparison-audiogram-2-container');
        
        const comparisonReport = generateComparisonReport(record1, record2);
        document.getElementById('comparison-report-content').textContent = comparisonReport;
        showToast('Comparación generada.', 'success');
    } else {
        showToast('No se encontraron los registros para comparar.', 'error');
    }
}
