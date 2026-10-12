import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface POItem {
  name: string
  quantity: number
  unit: string
}

export interface PurchaseOrderData {
  poNumber: string
  supplierName: string
  supplierEmail: string
  salonName: string
  stylistName: string
  items: POItem[]
  notes?: string
}

// Dark-themed professional palette
const PALETTE = {
  headerBg: [30, 30, 40] as [number, number, number],
  headerText: [255, 255, 255] as [number, number, number],
  accent: [0, 180, 216] as [number, number, number], // Monaco Blue cyan
  tableHeaderBg: [45, 45, 60] as [number, number, number],
  tableHeaderText: [255, 255, 255] as [number, number, number],
  tableRowAlt: [248, 248, 252] as [number, number, number],
  textDark: [30, 30, 40] as [number, number, number],
  textMuted: [100, 100, 120] as [number, number, number],
  border: [220, 220, 230] as [number, number, number],
}

/**
 * Generate a professional dark-themed PDF purchase order.
 * Returns a Uint8Array (Buffer equivalent) ready for download or storage.
 */
export function generatePurchaseOrderPDF(data: PurchaseOrderData): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40

  // --- Header Bar ---
  doc.setFillColor(...PALETTE.headerBg)
  doc.rect(0, 0, pageW, 100, 'F')

  // ColorIq logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(...PALETTE.accent)
  doc.text('ColorIq', margin, 55)

  // PO label
  doc.setFontSize(11)
  doc.setTextColor(...PALETTE.headerText)
  doc.text('PURCHASE ORDER', pageW - margin, 45, { align: 'right' })

  // PO Number
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(data.poNumber, pageW - margin, 65, { align: 'right' })

  // Date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`, pageW - margin, 82, { align: 'right' })

  // --- From / To Section ---
  let y = 125

  // From (Salon)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...PALETTE.textMuted)
  doc.text('FROM', margin, y)

  doc.setFontSize(11)
  doc.setTextColor(...PALETTE.textDark)
  doc.text(data.salonName, margin, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Stylist: ${data.stylistName}`, margin, y + 32)

  // To (Supplier)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PALETTE.textMuted)
  doc.text('TO', pageW / 2 + 20, y)

  doc.setFontSize(11)
  doc.setTextColor(...PALETTE.textDark)
  doc.text(data.supplierName, pageW / 2 + 20, y + 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(data.supplierEmail, pageW / 2 + 20, y + 32)

  y += 65

  // --- Items Table ---
  const tableHeaders = [['#', 'Product', 'Quantity', 'Unit']]
  const tableBody = data.items.map((item, i) => [
    (i + 1).toString(),
    item.name,
    item.quantity.toString(),
    item.unit,
  ])

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: PALETTE.tableHeaderBg,
      textColor: PALETTE.tableHeaderText,
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
      cellPadding: 8,
    },
    bodyStyles: {
      fontSize: 10,
      textColor: PALETTE.textDark,
      cellPadding: 8,
    },
    alternateRowStyles: {
      fillColor: PALETTE.tableRowAlt,
    },
    columnStyles: {
      0: { cellWidth: 40, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 80, halign: 'center' },
      3: { cellWidth: 80, halign: 'center' },
    },
    styles: {
      lineColor: PALETTE.border,
      lineWidth: 0.5,
    },
    margin: { left: margin, right: margin },
    didDrawPage: (dataArg) => {
      // Footer on every page
      const pageH = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(...PALETTE.textMuted)
      doc.text(
        `ColorIq Auto-Order  •  Page ${dataArg.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`,
        margin,
        pageH - 20
      )
    },
  })

  // Get final Y after table
  const finalY = (doc as any).lastAutoTable?.finalY ?? y + 40

  // --- Notes Section ---
  if (data.notes && data.notes.trim()) {
    const notesY = finalY + 25
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...PALETTE.textMuted)
    doc.text('NOTES', margin, notesY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...PALETTE.textDark)
    const notesLines = doc.splitTextToSize(data.notes, pageW - margin * 2)
    doc.text(notesLines, margin, notesY + 16)
  }

  // --- Signature Block ---
  const sigY = (doc as any).lastAutoTable?.finalY
    ? (doc as any).lastAutoTable.finalY + (data.notes ? 60 : 30)
    : y + 40

  if (sigY < doc.internal.pageSize.getHeight() - 80) {
    doc.setDrawColor(...PALETTE.textMuted)
    doc.setLineWidth(0.5)
    doc.line(margin, sigY, margin + 180, sigY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...PALETTE.textMuted)
    doc.text('Authorized Signature / Date', margin, sigY + 14)
  }

  // Return as Uint8Array for Buffer conversion
  return new Uint8Array(doc.output('arraybuffer'))
}
