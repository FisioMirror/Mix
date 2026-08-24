import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFPatientData {
  patientName: string;
  diagnosis?: string;
  evolutionData?: number[];
  sessions: Array<{
    fecha: string;
    ejercicio: string;
    duracion_segundos: number;
    repeticiones: number;
    calidad_ejecucion: number;
  }>;
  globalMetrics?: {
    totalSessions?: number;
    avgQuality?: number;
    streak?: number;
    weeklyMinutes?: number;
  };
  clinicalData?: {
    fechaNacimiento?: string;
    tipoSangre?: string;
    medicamentos?: string;
    alergias?: string;
    extremidad?: string;
    romObjetivo?: string;
    frecuenciaSesiones?: string;
    medicoTratante?: string;
    diagnosticoSecundario?: string;
    enfermedadesCronicas?: string;
    lesionesPrevias?: string;
    estatura?: number;
    peso?: number;
    contactoEmergencia?: string;
    contactoEmergenciaTelefono?: string;
  };
}

const TEAL: [number, number, number] = [0, 80, 77];
const DARK_GRAY: [number, number, number] = [50, 55, 55];
const LIGHT_GRAY: [number, number, number] = [240, 240, 240];

export function exportSimplePDF(data: PDFPatientData, filename: string) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  doc.setFillColor(...TEAL);
  doc.rect(0, 0, pageWidth, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FisioMirror', margin, 36);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Informe de Recuperación del Paciente', margin, 56);
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES', { dateStyle: 'long' })}`, pageWidth - margin, 36, { align: 'right' });

  let y = 110;
  doc.setTextColor(...DARK_GRAY);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Paciente', margin, y);
  y += 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${data.patientName}`, margin, y);
  y += 16;
  if (data.diagnosis) {
    doc.text(`Diagnóstico: ${data.diagnosis}`, margin, y);
    y += 16;
  }

  if (data.clinicalData) {
    const cd = data.clinicalData;
    const fields: Array<[string, string | number | undefined]> = [
      ['Fecha de Nacimiento', cd.fechaNacimiento],
      ['Tipo de Sangre', cd.tipoSangre],
      ['Diagnóstico Secundario', cd.diagnosticoSecundario],
      ['Medicamentos Actuales', cd.medicamentos],
      ['Alergias', cd.alergias],
      ['Enfermedades Crónicas', cd.enfermedadesCronicas],
      ['Lesiones Previas', cd.lesionesPrevias],
      ['Extremidad Afectada', cd.extremidad],
      ['ROM Objetivo', cd.romObjetivo],
      ['Frecuencia de Sesiones', cd.frecuenciaSesiones],
      ['Médico Tratante', cd.medicoTratante],
      ['Estatura (cm)', cd.estatura],
      ['Peso (kg)', cd.peso],
      ['Contacto de Emergencia', cd.contactoEmergencia],
      ['Teléfono de Emergencia', cd.contactoEmergenciaTelefono],
    ];
    for (const [label, value] of fields) {
      if (value != null && value !== '') {
        if (y > pageHeight - 60) { doc.addPage(); y = 50; }
        doc.text(`${label}: ${value}`, margin, y);
        y += 16;
      }
    }
  }

  if (data.globalMetrics) {
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Métricas Globales', margin, y);
    y += 18;
    doc.setFont('helvetica', 'normal');
    if (data.globalMetrics.totalSessions != null) {
      doc.text(`Total de sesiones: ${data.globalMetrics.totalSessions}`, margin, y);
      y += 16;
    }
    if (data.globalMetrics.weeklyMinutes != null) {
      doc.text(`Minutos semanales: ${data.globalMetrics.weeklyMinutes} min`, margin, y);
      y += 16;
    }
    if (data.globalMetrics.avgQuality != null) {
      doc.text(`Calidad promedio: ${data.globalMetrics.avgQuality.toFixed(1)}%`, margin, y);
      y += 16;
    }
    if (data.globalMetrics.streak != null) {
      doc.text(`Racha actual: ${data.globalMetrics.streak} días`, margin, y);
      y += 16;
    }
  }

  // Evolución semanal (gráfico de barras de calidad de ejecución)
  if (data.evolutionData && data.evolutionData.some((v) => v > 0)) {
    if (y > pageHeight - 160) {
      doc.addPage();
      y = 50;
    }
    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...DARK_GRAY);
    doc.text('Evolución Semanal', margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Calidad de ejecución por semana (últimas 6 semanas)', margin, y);
    y += 14;

    const chartW = pageWidth - margin * 2;
    const chartH = 80;
    const maxVal = Math.max(...data.evolutionData, 1);
    const barCount = data.evolutionData.length;
    const gap = 12;
    const barW = (chartW - gap * (barCount - 1)) / barCount;
    const baseY = y + chartH;

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, baseY, margin + chartW, baseY);

    data.evolutionData.forEach((val, i) => {
      const bx = margin + i * (barW + gap);
      const bh = (val / maxVal) * chartH;
      const by = baseY - bh;
      doc.setFillColor(...TEAL);
      doc.rect(bx, by, barW, bh, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...DARK_GRAY);
      doc.text(val > 0 ? `${Math.round(val)}%` : '—', bx + barW / 2, by - 4, { align: 'center' });
      doc.text(`Sem ${i + 1}`, bx + barW / 2, baseY + 12, { align: 'center' });
    });
    y = baseY + 24;
  }

  if (y > pageHeight - 120) {
    doc.addPage();
    y = 50;
  }
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Sesiones Registradas', margin, y);
  y += 10;

  doc.setFillColor(...LIGHT_GRAY);
  doc.rect(margin, y, pageWidth - margin * 2, 24, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK_GRAY);
  doc.text('Fecha', margin + 8, y + 16);
  doc.text('Ejercicio', margin + 100, y + 16);
  doc.text('Duración', margin + 260, y + 16);
  doc.text('Reps', margin + 340, y + 16);
  doc.text('Calidad', margin + 400, y + 16);
  y += 24;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  for (const s of data.sessions) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = 50;
    }
    const fechaStr = new Date(s.fecha).toLocaleDateString('es-ES');
    const duracionStr = `${Math.round(s.duracion_segundos / 60)} min`;
    doc.text(fechaStr, margin + 8, y + 16);
    doc.text(s.ejercicio.slice(0, 25), margin + 100, y + 16);
    doc.text(duracionStr, margin + 260, y + 16);
    doc.text(String(s.repeticiones), margin + 340, y + 16);
    doc.text(`${s.calidad_ejecucion.toFixed(0)}%`, margin + 400, y + 16);
    y += 22;
  }

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text('FisioMirror S.A. | Reporte generado automáticamente', margin, pageHeight - 20);

  doc.save(filename);
}

export function buildPremiumHTML(data: PDFPatientData, aiNarrative?: string): string {
  const cd = data.clinicalData || {};
  const gm = data.globalMetrics || {};
  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };
  const today = new Date().toLocaleDateString('es-ES', { dateStyle: 'long' });

  const qualityColor = (q: number) => q >= 80 ? '#10b981' : q >= 60 ? '#f59e0b' : '#ef4444';
  const adherenceVal = gm.avgQuality ?? 0;
  const adherenceColor = adherenceVal >= 80 ? '#10b981' : adherenceVal >= 60 ? '#f59e0b' : '#ef4444';

  // SVG bar chart for evolution
  const evolutionBars = (data.evolutionData || []).map((val, i) => {
    const maxVal = Math.max(...(data.evolutionData || [1]), 1);
    const h = (val / maxVal) * 120;
    const x = 30 + i * 60;
    const y = 130 - h;
    const color = val >= 80 ? '#00837a' : val >= 60 ? '#f59e0b' : '#ef4444';
    return `
      <rect x="${x}" y="${y}" width="40" height="${h}" rx="4" fill="${color}" opacity="0.85"/>
      <text x="${x + 20}" y="${y - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#323737">${Math.round(val)}%</text>
      <text x="${x + 20}" y="148" text-anchor="middle" font-size="10" fill="#888">Sem ${i + 1}</text>
    `;
  }).join('');

  // Session rows
  const sessionRows = data.sessions.slice(0, 12).map((s, i) => {
    const bg = i % 2 === 0 ? '#f8fafb' : '#ffffff';
    const qc = qualityColor(s.calidad_ejecucion);
    const dur = `${Math.round(s.duracion_segundos / 60)} min`;
    return `
      <tr style="background:${bg}">
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color="#323737">${fmtDate(s.fecha)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color="#323737">${s.ejercicio.slice(0, 28)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color="#323737;text-align:center">${dur}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:11px;color="#323737;text-align:center">${s.repeticiones}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:center">
          <span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;color:#fff;background:${qc}">${Math.round(s.calidad_ejecucion)}%</span>
        </td>
      </tr>
    `;
  }).join('');

  // Clinical data rows
  const clinicalRows: string[] = [];
  const fieldMap: Array<[string, string | number | undefined]> = [
    ['Fecha de Nacimiento', cd.fechaNacimiento],
    ['Diagnóstico Principal', data.diagnosis],
    ['Diagnóstico Secundario', cd.diagnosticoSecundario],
    ['Extremidad Afectada', cd.extremidad],
    ['ROM Objetivo', cd.romObjetivo],
    ['Frecuencia de Sesiones', cd.frecuenciaSesiones],
    ['Médico Tratante', cd.medicoTratante],
    ['Medicamentos', cd.medicamentos],
    ['Alergias', cd.alergias],
    ['Tipo de Sangre', cd.tipoSangre],
    ['Enfermedades Crónicas', cd.enfermedadesCronicas],
    ['Lesiones Previas', cd.lesionesPrevias],
    ['Estatura', cd.estatura ? `${cd.estatura} cm` : undefined],
    ['Peso', cd.peso ? `${cd.peso} kg` : undefined],
    ['Contacto Emergencia', cd.contactoEmergencia],
    ['Teléfono Emergencia', cd.contactoEmergenciaTelefono],
  ];
  for (const [label, value] of fieldMap) {
    if (value != null && value !== '') {
      clinicalRows.push(`
        <tr>
          <td style="padding:6px 14px;font-size:12px;font-weight:600;color="#00504d;background:#f0fdfa;width:40%;border-right:3px solid #00837a">${label}</td>
          <td style="padding:6px 14px;font-size:12px;color="#323737">${value}</td>
        </tr>
      `);
    }
  }

  // Metrics cards
  const totalSessions = gm.totalSessions ?? data.sessions.length;
  const metricCard = (label: string, value: string, color: string, bgColor: string) => `
    <div style="flex:1;background:${bgColor};border-radius:12px;padding:14px 16px;text-align:center;border:1px solid ${color}22">
      <div style="font-size:11px;color="#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${label}</div>
      <div style="font-size:24px;font-weight:800;color:${color};margin-top:4px">${value}</div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#fff;color:#323737}</style></head>
<body>
  <div style="width:754px;padding:0;background:#fff;position:relative">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#00504d 0%,#00837a 100%);padding:28px 40px;display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;background:rgba(255,255,255,0.15);border-radius:12px;display:flex;align-items:center;justify-content:center">
          <span style="font-size:22px">⚕</span>
        </div>
        <div>
          <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px">FisioMirror</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.7);margin-top:1px">Reporte Clínico de Rehabilitación</div>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:1px">Fecha de Generación</div>
        <div style="font-size:13px;color:#fff;font-weight:600;margin-top:2px">${today}</div>
      </div>
    </div>

    <!-- Patient info bar -->
    <div style="padding:20px 40px;background:#f0fdfa;border-bottom:1px solid #00837a22">
      <div style="display:flex;gap:30px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;color="#00837a;text-transform:uppercase;letter-spacing:1px;font-weight:600">Paciente</div>
          <div style="font-size:18px;font-weight:700;color="#00504d;margin-top:2px">${data.patientName}</div>
        </div>
        ${data.diagnosis ? `<div><div style="font-size:10px;color="#00837a;text-transform:uppercase;letter-spacing:1px;font-weight:600">Diagnóstico</div><div style="font-size:14px;color="#323737;margin-top:4px;font-weight:500">${data.diagnosis}</div></div>` : ''}
        ${cd.medicoTratante ? `<div><div style="font-size:10px;color="#00837a;text-transform:uppercase;letter-spacing:1px;font-weight:600">Médico Tratante</div><div style="font-size:14px;color="#323737;margin-top:4px;font-weight:500">${cd.medicoTratante}</div></div>` : ''}
      </div>
    </div>

    <!-- Metrics -->
    <div style="padding:20px 40px">
      <div style="font-size:14px;font-weight:700;color="#00504d;margin-bottom:12px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:4px;height:18px;background:#00837a;border-radius:2px"></span>
        Métricas de Progreso
      </div>
      <div style="display:flex;gap:12px">
        ${metricCard('Sesiones', String(totalSessions), '#00837a', '#f0fdfa')}
        ${metricCard('Adherencia', `${Math.round(adherenceVal)}%`, adherenceColor, adherenceColor === '#10b981' ? '#ecfdf5' : adherenceColor === '#f59e0b' ? '#fffbeb' : '#fef2f2')}
        ${gm.streak != null ? metricCard('Racha', `${gm.streak}d`, '#0ea5e9', '#f0f9ff') : ''}
        ${gm.weeklyMinutes != null ? metricCard('Min/Semana', `${gm.weeklyMinutes}`, '#14b8a6', '#f0fdfa') : ''}
      </div>
    </div>

    <!-- Evolution chart -->
    ${evolutionBars ? `
    <div style="padding:10px 40px 20px">
      <div style="font-size:14px;font-weight:700;color="#00504d;margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:4px;height:18px;background:#00837a;border-radius:2px"></span>
        Evolución de Calidad Semanal
      </div>
      <svg width="674" height="160" style="background:#f8fafb;border-radius:12px;border:1px solid #e2e8f0">
        <line x1="20" y1="130" x2="660" y2="130" stroke="#e2e8f0" stroke-width="1"/>
        ${evolutionBars}
      </svg>
    </div>` : ''}

    <!-- Clinical data table -->
    ${clinicalRows.length > 0 ? `
    <div style="padding:10px 40px 20px">
      <div style="font-size:14px;font-weight:700;color="#00504d;margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:4px;height:18px;background:#00837a;border-radius:2px"></span>
        Datos Clínicos del Paciente
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        ${clinicalRows.join('')}
      </table>
    </div>` : ''}

    <!-- Sessions table -->
    ${sessionRows ? `
    <div style="padding:10px 40px 20px">
      <div style="font-size:14px;font-weight:700;color="#00504d;margin-bottom:8px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:4px;height:18px;background:#00837a;border-radius:2px"></span>
        Sesiones Registradas
      </div>
      <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <thead>
          <tr style="background:#00504d">
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:600">Fecha</th>
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:left;font-weight:600">Ejercicio</th>
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:center;font-weight:600">Duración</th>
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:center;font-weight:600">Reps</th>
            <th style="padding:10px 12px;font-size:11px;color:#fff;text-align:center;font-weight:600">Calidad</th>
          </tr>
        </thead>
        <tbody>${sessionRows}</tbody>
      </table>
    </div>` : ''}

    <!-- AI Narrative -->
    ${aiNarrative ? `
    <div style="padding:10px 40px 20px">
      <div style="font-size:14px;font-weight:700;color="#00504d;margin-bottom:10px;display:flex;align-items:center;gap:8px">
        <span style="display:inline-block;width:4px;height:18px;background:#00837a;border-radius:2px"></span>
        Análisis Clínico IA
      </div>
      <div style="background:linear-gradient(135deg,#f0fdfa 0%,#ecfeff 100%);border-radius:14px;padding:20px 24px;border-left:4px solid #00837a">
        <div style="font-size:13px;line-height:1.7;color="#323737;white-space:pre-wrap">${aiNarrative.replace(/</g, '&lt;')}</div>
      </div>
    </div>` : ''}

    <!-- Footer -->
    <div style="padding:16px 40px;background:#f8fafb;border-top:2px solid #00837a;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:10px;color:#94a3b8">Generado por FisioMirror · Reporte clínico automatizado</div>
      <div style="font-size:10px;color="#94a3b8;font-weight:600">Página 1</div>
    </div>
  </div>
</body>
</html>`;
}

export async function exportPremiumPDF(data: PDFPatientData, filename: string, aiNarrative?: string) {
  const html = buildPremiumHTML(data, aiNarrative);
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      let position = 0;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportAIPDF(htmlContent: string, filename: string) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px';
  container.style.background = '#ffffff';
  container.style.padding = '40px';
  container.style.fontFamily = 'sans-serif';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight <= pdfHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      let position = 0;
      let heightLeft = imgHeight;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}
