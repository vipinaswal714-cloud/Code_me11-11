import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Export the dashboard container as PNG image
 */
export async function exportDashboardAsPng(containerElement, customName = '') {
  if (!containerElement) throw new Error('Dashboard container not found');

  const canvas = await html2canvas(containerElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: document.documentElement.classList.contains('dark') ? '#020617' : '#f8fafc',
    windowWidth: containerElement.scrollWidth,
    windowHeight: containerElement.scrollHeight
  });

  const link = document.createElement('a');
  const dateStr = getTimestamp();
  link.download = `Metrica_Dashboard_${customName ? customName + '_' : ''}${dateStr}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Export the dashboard container as PDF
 */
export async function exportDashboardAsPdf(containerElement, title = 'Metrica Analytics Report') {
  if (!containerElement) throw new Error('Dashboard container not found');

  const canvas = await html2canvas(containerElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('landscape', 'pt', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Add Metrica header banner
  pdf.setFillColor(2, 111, 199); // Metrica blue
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Metrica - Spreadsheet Analytics Studio', 20, 25);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(220, 240, 255);
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 180, 25);

  // Calculate image proportions within page
  const margin = 20;
  const contentTop = 55;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - contentTop - margin;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

  const printWidth = imgWidth * ratio;
  const printHeight = imgHeight * ratio;
  const printX = margin + (availableWidth - printWidth) / 2;

  pdf.addImage(imgData, 'PNG', printX, contentTop, printWidth, printHeight);

  const dateStr = getTimestamp();
  pdf.save(`Metrica_Dashboard_${dateStr}.pdf`);
}

/**
 * Neutralizes Excel / CSV formula injection (DDE / CSV Injection - CWE-1236)
 * Prefixes cells starting with '=', '+', '-', '@', '\t', '\r' with a single quote
 */
export function sanitizeCellForFormulaInjection(val) {
  if (typeof val === 'string') {
    const trimmed = val.trimStart();
    if (
      trimmed.startsWith('=') ||
      trimmed.startsWith('+') ||
      trimmed.startsWith('-') ||
      trimmed.startsWith('@') ||
      val.startsWith('\t') ||
      val.startsWith('\r')
    ) {
      return `'${val}`;
    }
  }
  return val;
}

/**
 * Sanitizes both column header keys and row cell values against formula injection (CWE-1236)
 * across all export paths (CSV, Excel sheets, JSON, and PDF tables).
 */
export function sanitizeDatasetForExport(data) {
  if (!Array.isArray(data) || data.length === 0) return [];

  return data.map(row => {
    if (!row || typeof row !== 'object') return {};
    const cleanRow = {};
    for (const key of Object.keys(row)) {
      const sanitizedKey = typeof key === 'string' ? sanitizeCellForFormulaInjection(key) : key;
      cleanRow[sanitizedKey] = sanitizeCellForFormulaInjection(row[key]);
    }
    return cleanRow;
  });
}

/**
 * Export cleaned data as CSV with Formula Injection Neutralization on headers and cells
 */
export function exportCleanedDataAsCsv(data, baseName = 'Data') {
  if (!data || data.length === 0) {
    if (typeof alert === 'function') alert('No data available to export.');
    return;
  }

  // Sanitize both header keys and cell values
  const sanitizedData = sanitizeDatasetForExport(data);

  const worksheet = XLSX.utils.json_to_sheet(sanitizedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Metrica Cleaned');

  const dateStr = getTimestamp();
  const safeBase = (baseName || 'Data').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Metrica_Cleaned_${safeBase}_${dateStr}.csv`;
  XLSX.writeFile(workbook, filename, { bookType: 'csv' });
}
