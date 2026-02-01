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

    const binauralDeficiency = calculateBinauralDeficiency(results.od.va, results.oi.va);
    window.currentAudiometryResults = { ...results, binauralDeficiency };

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

function calculateBinauralDeficiency(vaOD, vaOI) {
    const freqs = KEY_FREQUENCIES_FOR_AVG; // [500, 1000, 2000, 4000]

    const sumOD = freqs.reduce((acc, f) => acc + (vaOD[f] || 0), 0);
    const sumOI = freqs.reduce((acc, f) => acc + (vaOI[f] || 0), 0);

    // Calculate monaural impairment for each ear. Formula: ((Sum / 4) - 25) * 1.5
    // This is equivalent to (Suma - 100) * 0.375, capped between 0% and 100%.
    let impairmentOD = Math.max(0, (sumOD / 4) - 25) * 1.5;
    let impairmentOI = Math.max(0, (sumOI / 4) - 25) * 1.5;

    impairmentOD = Math.min(100, impairmentOD);
    impairmentOI = Math.min(100, impairmentOI);

    const betterEarImpairment = Math.min(impairmentOD, impairmentOI);
    const worseEarImpairment = Math.max(impairmentOD, impairmentOI);

    // ASHA Formula for Binaural Deficiency, as per Orden DSA/934/2023
    const binauralDeficiency = ((betterEarImpairment * 5) + worseEarImpairment) / 6;

    return {
        binauralDeficiency: binauralDeficiency,
        impairmentOD: impairmentOD,
        impairmentOI: impairmentOI,
        sumOD: sumOD,
        sumOI: sumOI
    };
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
        gridHtml += `<text x="${x}" y="${height - padding + 20}" text-anchor="middle" font-size="12" fill="var(--text-color)">${freq >= 1000 ? `${freq / 1000}K` : freq}</text>`;
    });
    gridHtml += `<text x="${padding / 2}" y="${height / 2}" transform="rotate(-90, ${padding / 2}, ${height / 2})" text-anchor="middle" font-weight="bold" fill="var(--text-color)">Intensidad (dB HL)</text>`;
    gridHtml += `<text x="${width / 2}" y="${height - padding / 2.5}" text-anchor="middle" font-weight="bold" fill="var(--text-color)">Frecuencia (Hz)</text>`;
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
        document.getElementById('basic-report-content').innerHTML = generateBasicReport();
        document.getElementById('detailed-report-content').innerHTML = generateDetailedReport();
    }
}

function getDisabilityFromTableA(deficiency) {
    // Tabla 5.3A - Hipoacusias de percepción (neurosensoriales) y mixtas
    // Correspondencia entre deficiencia binaural y porcentaje de deficiencia total persona
    // Fuente: Orden DSA/934/2023 (BOE-A-2023-17875), que modifica el RD 888/2022
    if (deficiency <= 1.6) return 1;
    if (deficiency <= 3.2) return 2;
    if (deficiency <= 4.8) return 3;
    if (deficiency <= 6.4) return 4;
    if (deficiency <= 8.0) return 5;
    if (deficiency <= 9.6) return 6;
    if (deficiency <= 11.2) return 7;
    if (deficiency <= 12.8) return 8;
    if (deficiency <= 14.4) return 9;
    if (deficiency <= 16.0) return 10;
    if (deficiency <= 17.6) return 11;
    if (deficiency <= 19.2) return 12;
    if (deficiency <= 20.8) return 13;
    if (deficiency <= 22.4) return 14;
    if (deficiency <= 23.9) return 15;
    if (deficiency <= 25.4) return 16;
    if (deficiency <= 26.9) return 17;
    if (deficiency <= 28.4) return 18;
    if (deficiency <= 29.9) return 19;
    if (deficiency <= 32.5) return 20;
    if (deficiency <= 35.0) return 21;
    if (deficiency <= 37.5) return 22;
    if (deficiency <= 40.0) return 23;
    if (deficiency <= 42.5) return 24;
    if (deficiency <= 45.0) return 25;
    if (deficiency <= 47.5) return 26;
    if (deficiency <= 50.0) return 27;
    if (deficiency <= 52.5) return 28;
    if (deficiency <= 54.9) return 29;
    if (deficiency <= 59.5) return 30;
    if (deficiency <= 64.0) return 31;
    if (deficiency <= 68.5) return 32;
    if (deficiency <= 73.0) return 33;
    if (deficiency <= 77.5) return 34;
    if (deficiency <= 81.9) return 35;
    if (deficiency <= 85.6) return 36;
    if (deficiency <= 89.2) return 37;
    if (deficiency <= 92.8) return 38;
    if (deficiency <= 96.4) return 39;
    if (deficiency <= 100) return 40;
    return 40; // Máximo valor
}

function getDisabilityFromTableB(deficiency) {
    // Tabla 5.3B - Hipoacusias EXCLUSIVAMENTE conductivas
    // Correspondencia entre deficiencia binaural y porcentaje de deficiencia total persona
    // Fuente: Orden DSA/934/2023 (BOE-A-2023-17875), que modifica el RD 888/2022
    if (deficiency <= 1.4) return 0;
    if (deficiency <= 4.2) return 1;
    if (deficiency <= 7.1) return 2;
    if (deficiency <= 9.9) return 3;
    if (deficiency <= 12.8) return 4;
    if (deficiency <= 15.7) return 5;
    if (deficiency <= 18.5) return 6;
    if (deficiency <= 21.4) return 7;
    if (deficiency <= 24.2) return 8;
    if (deficiency <= 27.1) return 9;
    if (deficiency <= 29.9) return 10;
    if (deficiency <= 32.8) return 11;
    if (deficiency <= 35.7) return 12;
    if (deficiency <= 38.5) return 13;
    if (deficiency <= 41.4) return 14;
    if (deficiency <= 44.2) return 15;
    if (deficiency <= 47.1) return 16;
    if (deficiency <= 49.9) return 17;
    if (deficiency <= 52.8) return 18;
    if (deficiency <= 55.7) return 19;
    if (deficiency <= 58.5) return 20;
    if (deficiency <= 61.4) return 21;
    if (deficiency <= 64.2) return 22;
    if (deficiency <= 67.1) return 23;
    if (deficiency <= 69.9) return 24;
    if (deficiency <= 72.8) return 25;
    if (deficiency <= 75.7) return 26;
    if (deficiency <= 78.5) return 27;
    if (deficiency <= 81.4) return 28;
    if (deficiency <= 84.2) return 29;
    if (deficiency <= 87.1) return 30;
    if (deficiency <= 89.9) return 31;
    if (deficiency <= 92.8) return 32;
    if (deficiency <= 95.7) return 33;
    if (deficiency <= 98.5) return 34;
    if (deficiency <= 100) return 35;
    return 35; // Máximo valor
}

function getDisabilityPercentage(binauralDeficiency, diagnosisOD, diagnosisOI) {
    // RD 888/2022, Capítulo 5:
    // - Tabla 5.3A: Sorderas perceptivas (neurosensoriales) y mixtas
    // - Tabla 5.3B: Sorderas EXCLUSIVAMENTE conductivas (ambos oídos)
    // "Para valoración de las sorderas perceptivas y mixtas, se considerarán los
    //  valores de puntuación de la tabla 5.3A y para la valoración de las sorderas
    //  exclusivamente conductivas, la tabla 5.3B."
    const useTableB = diagnosisOD === "De Transmisión (Conductiva)" && diagnosisOI === "De Transmisión (Conductiva)";

    // Round the deficiency to one decimal place to avoid floating point issues with table boundaries
    const roundedDeficiency = parseFloat(binauralDeficiency.toFixed(1));

    if (useTableB) {
        return getDisabilityFromTableB(roundedDeficiency);
    } else {
        return getDisabilityFromTableA(roundedDeficiency);
    }
}

function getDisabilityClass(disabilityPercentage) {
    // Based on RD 888/2022, Table 5.4
    if (disabilityPercentage > 95) return { class: "Clase 5 (Absoluta)", range: "> 95%" };
    if (disabilityPercentage >= 75) return { class: "Clase 4 (Total)", range: "75% - 95%" };
    if (disabilityPercentage >= 50) return { class: "Clase 3 (Grave)", range: "50% - 74%" };
    if (disabilityPercentage >= 25) return { class: "Clase 2 (Moderada)", range: "25% - 49%" };
    if (disabilityPercentage >= 5) return { class: "Clase 1 (Leve)", range: "5% - 24%" };
    return { class: "Clase 0 (Sin discapacidad)", range: "0% - 4%" };
}

function generateBasicReport() {
    const { od, oi, binauralDeficiency } = window.currentAudiometryResults;

    const finalDisabilityPercentage = getDisabilityPercentage(binauralDeficiency.binauralDeficiency, od.diagnosis, oi.diagnosis);
    const disabilityClass = getDisabilityClass(finalDisabilityPercentage);

    return `
        <h3>Datos Generales</h3>
        <ul>
            <li><strong>Nº de Historia:</strong> ${document.getElementById('history-number').value || 'N/D'}</li>
            <li><strong>Fecha de Audiometría:</strong> ${document.getElementById('audiometry-date').value || 'N/D'}</li>
        </ul>

        <h3>Resultados según Orden DSA/934/2023</h3>
        <ul>
            <li><strong>Deficiencia Monoaural OD:</strong> ${binauralDeficiency.impairmentOD.toFixed(2)}% (Suma: ${binauralDeficiency.sumOD} dB)</li>
            <li><strong>Deficiencia Monoaural OI:</strong> ${binauralDeficiency.impairmentOI.toFixed(2)}% (Suma: ${binauralDeficiency.sumOI} dB)</li>
            <li><strong>Deficiencia Auditiva Binaural:</strong> ${binauralDeficiency.binauralDeficiency.toFixed(2)}%</li>
        </ul>

        <h3>Diagnóstico del Tipo de Hipoacusia</h3>
        <ul>
            <li><strong>Oído Derecho (OD):</strong> ${od.diagnosis}</li>
            <li><strong>Oído Izquierdo (OI):</strong> ${oi.diagnosis}</li>
        </ul>

        <h3>Valoración de la Discapacidad Auditiva (RD 888/2022)</h3>
        <ul>
            <li><strong>Porcentaje de Discapacidad:</strong> ${finalDisabilityPercentage.toFixed(2)}%</li>
            <li><strong>Clase de Discapacidad:</strong> ${disabilityClass.class} (Rango: ${disabilityClass.range})</li>
        </ul>

        <h3>Observaciones</h3>
        <p>${(document.getElementById('observations').value || 'Sin observaciones.').replace(/\n/g, '<br>')}</p>
    `;
}

function generateDetailedReport() {
    const { od, oi, binauralDeficiency } = window.currentAudiometryResults;
    const finalDisabilityPercentage = getDisabilityPercentage(binauralDeficiency.binauralDeficiency, od.diagnosis, oi.diagnosis);
    const disabilityClass = getDisabilityClass(finalDisabilityPercentage);

    // Función auxiliar para generar filas de la tabla de frecuencias
    const generateFreqRow = (label, data) => {
        let cells = `<td>${label}</td>`;
        FREQUENCIES.forEach(freq => {
            cells += `<td>${!isNaN(data[freq]) ? data[freq] : '-'}</td>`;
        });
        return `<tr>${cells}</tr>`;
    };

    return `
        <h3>1. Datos del Paciente y Evaluación</h3>
        <ul>
            <li><strong>Nº de Historia:</strong> ${document.getElementById('history-number').value || 'N/D'}</li>
            <li><strong>Fecha de Audiometría:</strong> ${document.getElementById('audiometry-date').value || 'N/D'}</li>
        </ul>

        <h3>2. Umbrales Auditivos y Diagnóstico por Oído (dB HL)</h3>
        <div class="report-grid-2-col">
            <div class="report-box">
                <h4>Oído Derecho (OD)</h4>
                <table class="report-data-table">
                    <thead><tr><th>Hz</th>${FREQUENCIES.map(f => `<th>${f}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${generateFreqRow('VA', od.va)}
                        ${generateFreqRow('VO', od.vo)}
                    </tbody>
                </table>
                <p style="margin-top:10px;"><strong>Diagnóstico:</strong> ${od.diagnosis}</p>
            </div>
            
            <div class="report-box">
                <h4>Oído Izquierdo (OI)</h4>
                <table class="report-data-table">
                    <thead><tr><th>Hz</th>${FREQUENCIES.map(f => `<th>${f}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${generateFreqRow('VA', oi.va)}
                        ${generateFreqRow('VO', oi.vo)}
                    </tbody>
                </table>
                <p style="margin-top:10px;"><strong>Diagnóstico:</strong> ${oi.diagnosis}</p>
            </div>
        </div>

        <h3>3. Cálculo de Deficiencia y Discapacidad (Orden DSA/934/2023 y RD 888/2022)</h3>
        
        <h4>Paso 1: Cálculo de Deficiencias Monoaurales</h4>
        <ul>
            <li><strong>Oído Derecho:</strong> Suma de umbrales (500-4k Hz): <strong>${binauralDeficiency.sumOD} dB</strong> → Deficiencia: <strong>${binauralDeficiency.impairmentOD.toFixed(2)}%</strong></li>
            <li><strong>Oído Izquierdo:</strong> Suma de umbrales (500-4k Hz): <strong>${binauralDeficiency.sumOI} dB</strong> → Deficiencia: <strong>${binauralDeficiency.impairmentOI.toFixed(2)}%</strong></li>
        </ul>

        <h4>Paso 2: Cálculo de Deficiencia Binaural (Fórmula ASHA)</h4>
        <ul>
            <li><strong>Deficiencia Auditiva Binaural:</strong> ${binauralDeficiency.binauralDeficiency.toFixed(2)}%</li>
        </ul>

        <h4>Paso 3: Conversión a Porcentaje de Discapacidad</h4>
        <ul>
            <li><strong>Porcentaje de Discapacidad Final:</strong> ${finalDisabilityPercentage.toFixed(2)}%</li>
            <li style="font-size:0.9em; color:#666;">(Cálculo basado en Tabla ${od.diagnosis === "De Transmisión (Conductiva)" && oi.diagnosis === "De Transmisión (Conductiva)" ? '5.3.B - Hipoacusias Exclusivamente Conductivas' : '5.3.A - Hipoacusias Neurosensoriales o Mixtas'})</li>
        </ul>

        <h4>Paso 4: Determinación de la Clase de Discapacidad</h4>
        <ul>
            <li><strong>Clase de Discapacidad:</strong> ${disabilityClass.class} (Rango ${disabilityClass.range})</li>
        </ul>

        <h3>4. Observaciones Adicionales</h3>
        <p>${(document.getElementById('observations').value || 'Sin observaciones adicionales.').replace(/\n/g, '<br>')}</p>
    `;
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
function copyBasicReport() {
    navigator.clipboard.writeText(document.getElementById('basic-report-content').innerText)
        .then(() => showToast('Informe básico copiado.', 'success'));
}
function copyDetailedReport() {
    navigator.clipboard.writeText(document.getElementById('detailed-report-content').innerText)
        .then(() => showToast('Informe detallado copiado.', 'success'));
}
function copyComparisonReport() {
    navigator.clipboard.writeText(document.getElementById('comparison-report-content').innerText)
        .then(() => showToast('Informe comparativo copiado.', 'success'));
}

function copyAudiogram() {
    const audiogramContainer = document.getElementById('audiogram-container');
    html2canvas(audiogramContainer).then(canvas => {
        canvas.toBlob(blob => {
            navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
                .then(() => showToast('Gráfica copiada.', 'success'))
                .catch(() => showToast('Error al copiar gráfica.', 'error'));
        });
    });
}

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
    const modal = document.getElementById('print-modal');
    modal.style.display = 'flex';

    document.getElementById('confirm-print-btn').onclick = () => {
        const printSections = {
            patientInfo: document.getElementById('print-patient-info').checked,
            observations: document.getElementById('print-observations').checked,
            resultsTable: document.getElementById('print-results-table').checked,
            audiogram: document.getElementById('print-audiogram').checked,
            basicReport: document.getElementById('print-basic-report').checked,
            detailedReport: document.getElementById('print-detailed-report').checked,
        };

        const style = document.createElement('style');
        style.textContent = `
            @media print {
                .patient-info-section { display: ${printSections.patientInfo ? 'block' : 'none'}; }
                .observations-section { display: ${printSections.observations ? 'block' : 'none'}; }
                .results-section { display: ${printSections.resultsTable ? 'block' : 'none'}; }
                .audiogram-section { display: ${printSections.audiogram ? 'block' : 'none'}; }
                .report-section[data-report-type="basic"] { display: ${printSections.basicReport ? 'block' : 'none'}; }
                .report-section[data-report-type="detailed"] { display: ${printSections.detailedReport ? 'block' : 'none'}; }
            }
        `;
        document.head.appendChild(style);

        window.print();

        document.head.removeChild(style);
        modal.style.display = 'none';
    };

    document.getElementById('cancel-print-btn').onclick = () => {
        modal.style.display = 'none';
    };
}

// --- Comparación ---
function generateComparisonReport(aud1, aud2) {
    // --- Audiometry 1 Calculations ---
    const diagnosisOD1 = diagnoseHipoacusia(aud1.va.od, aud1.vo.od);
    const diagnosisOI1 = diagnoseHipoacusia(aud1.va.oi, aud1.vo.oi);
    const binauralDeficiency1 = calculateBinauralDeficiency(aud1.va.od, aud1.va.oi);
    const disabilityPercentage1 = getDisabilityPercentage(binauralDeficiency1.binauralDeficiency, diagnosisOD1, diagnosisOI1);
    const disabilityClass1 = getDisabilityClass(disabilityPercentage1);

    // --- Audiometry 2 Calculations ---
    const diagnosisOD2 = diagnoseHipoacusia(aud2.va.od, aud2.vo.od);
    const diagnosisOI2 = diagnoseHipoacusia(aud2.va.oi, aud2.vo.oi);
    const binauralDeficiency2 = calculateBinauralDeficiency(aud2.va.od, aud2.va.oi);
    const disabilityPercentage2 = getDisabilityPercentage(binauralDeficiency2.binauralDeficiency, diagnosisOD2, diagnosisOI2);
    const disabilityClass2 = getDisabilityClass(disabilityPercentage2);

    let report = `
        <h3>Audiometría 1 (Basal)</h3>
        <ul>
            <li><strong>Fecha:</strong> ${aud1.audiometryDate}</li>
            <li><strong>Def. Binaural:</strong> ${binauralDeficiency1.binauralDeficiency.toFixed(2)}% | <strong>Discapacidad:</strong> ${disabilityPercentage1.toFixed(2)}%</li>
            <li><strong>Clase:</strong> ${disabilityClass1.class}</li>
            <li><strong>Diagnóstico OD:</strong> ${diagnosisOD1} | <strong>OI:</strong> ${diagnosisOI1}</li>
        </ul>

        <h3>Audiometría 2 (Seguimiento)</h3>
        <ul>
            <li><strong>Fecha:</strong> ${aud2.audiometryDate}</li>
            <li><strong>Def. Binaural:</strong> ${binauralDeficiency2.binauralDeficiency.toFixed(2)}% | <strong>Discapacidad:</strong> ${disabilityPercentage2.toFixed(2)}%</li>
            <li><strong>Clase:</strong> ${disabilityClass2.class}</li>
            <li><strong>Diagnóstico OD:</strong> ${diagnosisOD2} | <strong>OI:</strong> ${diagnosisOI2}</li>
        </ul>

        <h3>Análisis Comparativo</h3>
        <ul>
    `;

    const diffDisability = disabilityPercentage2 - disabilityPercentage1;
    if (diffDisability > 2) {
        report += `<li>Empeoramiento global, con un aumento de <strong>${diffDisability.toFixed(2)}</strong> puntos en el porcentaje de discapacidad.</li>`;
    } else if (diffDisability < -2) {
        report += `<li>Mejora global, con una reducción de <strong>${Math.abs(diffDisability).toFixed(2)}</strong> puntos en el porcentaje de discapacidad.</li>`;
    } else {
        report += `<li>El porcentaje de discapacidad se mantiene relativamente estable.</li>`;
    }

    if (disabilityClass1.class !== disabilityClass2.class) {
        report += `<li>La clase de discapacidad ha cambiado de <strong>${disabilityClass1.class}</strong> a <strong>${disabilityClass2.class}</strong>.</li>`;
    } else {
        report += `<li>La clase de discapacidad se mantiene en <strong>${disabilityClass2.class}</strong>.</li>`;
    }

    report += `</ul>`;

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
        document.getElementById('comparison-report-content').innerHTML = comparisonReport;
        showToast('Comparación generada.', 'success');
    } else {
        showToast('No se encontraron los registros para comparar.', 'error');
    }
}