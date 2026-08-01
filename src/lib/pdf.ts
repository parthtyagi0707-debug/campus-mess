import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const BRAND = [46, 92, 52] as [number, number, number];
const ACCENT = [124, 179, 66] as [number, number, number];

export interface ChartBar {
  label: string;
  value: number;
}

function header(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, 210, 30, "F");
  doc.setFillColor(...ACCENT);
  doc.circle(20, 15, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("SMU", 20, 16.5, { align: "center" });
  doc.setFontSize(15);
  doc.text(title, 32, 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, 32, 20);
  doc.setFontSize(8);
  doc.text(`Generated ${new Date().toLocaleString()}`, 200, 20, { align: "right" });
  doc.setTextColor(30, 30, 30);
}

function footer(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Smart Mess Management System — University Hostel", 14, 290);
    doc.text(`Page ${i} of ${pages}`, 196, 290, { align: "right" });
  }
}

function drawBarChart(doc: jsPDF, bars: ChartBar[], startY: number, max?: number) {
  if (bars.length === 0) return startY;
  const chartX = 16;
  const chartWidth = 178;
  const chartHeight = 46;
  const peak = max ?? Math.max(...bars.map((b) => b.value), 1);
  doc.setDrawColor(210, 210, 210);
  doc.line(chartX, startY + chartHeight, chartX + chartWidth, startY + chartHeight);
  const slot = chartWidth / bars.length;
  const barWidth = Math.min(18, slot * 0.55);
  bars.forEach((bar, i) => {
    const h = peak === 0 ? 0 : (bar.value / peak) * chartHeight;
    const x = chartX + slot * i + (slot - barWidth) / 2;
    doc.setFillColor(...ACCENT);
    doc.rect(x, startY + chartHeight - h, barWidth, h, "F");
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text(String(Math.round(bar.value * 100) / 100), x + barWidth / 2, startY + chartHeight - h - 2, {
      align: "center",
    });
    doc.text(bar.label.slice(0, 14), x + barWidth / 2, startY + chartHeight + 5, { align: "center" });
  });
  return startY + chartHeight + 12;
}

export interface ReportSpec {
  title: string;
  subtitle: string;
  summary?: string[];
  chart?: { caption: string; bars: ChartBar[] };
  tables: { caption?: string; head: string[]; rows: (string | number)[][] }[];
  fileName: string;
}

export function buildReport(spec: ReportSpec) {
  const doc = new jsPDF();
  header(doc, spec.title, spec.subtitle);
  let y = 40;

  if (spec.summary?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Summary", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    y += 6;
    spec.summary.forEach((line) => {
      const wrapped = doc.splitTextToSize(`• ${line}`, 180) as string[];
      doc.text(wrapped, 16, y);
      y += wrapped.length * 4.6;
    });
    y += 4;
  }

  if (spec.chart && spec.chart.bars.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(spec.chart.caption, 14, y);
    y += 6;
    y = drawBarChart(doc, spec.chart.bars, y);
  }

  spec.tables.forEach((table) => {
    if (table.caption) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(table.caption, 14, y);
      y += 4;
    }
    autoTable(doc, {
      head: [table.head],
      body: table.rows.length ? table.rows : [table.head.map(() => "—")],
      startY: y,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: BRAND, textColor: 255 },
      alternateRowStyles: { fillColor: [244, 248, 240] },
      margin: { left: 14, right: 14 },
    });
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    y = (finalY ?? y) + 10;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
  });

  footer(doc);
  doc.save(spec.fileName);
}
