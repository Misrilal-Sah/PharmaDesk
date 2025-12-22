import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateInvoice(sale) {
  const doc = new jsPDF();
  
  // Company Details
  const companyName = 'PharmaDesk';
  const companyTagline = 'Your Trusted Pharmacy Partner';
  const companyAddress = 'Mumbai, Maharashtra, India';
  const companyPhone = '+91 98765 43210';
  const companyEmail = 'contact@pharmadesk.com';
  
  // Colors - Blue theme
  const primaryColor = [21, 101, 192]; // #1565C0
  const accentColor = [0, 191, 165]; // #00BFA5
  const textColor = [33, 33, 33];
  const mutedColor = [117, 117, 117];
  const lightBg = [248, 250, 252];
  const white = [255, 255, 255];

  // ===== HEADER SECTION =====
  // Main header bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 45, 'F');
  
  // Accent stripe
  doc.setFillColor(...accentColor);
  doc.rect(0, 45, 210, 3, 'F');
  
  // Company name
  doc.setTextColor(...white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 20, 22);
  
  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(companyTagline, 20, 32);
  
  // Invoice badge
  doc.setFillColor(...white);
  doc.roundedRect(145, 12, 50, 22, 4, 4, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 170, 26, { align: 'center' });
  
  // ===== INFO SECTION =====
  doc.setTextColor(...textColor);
  let y = 60;
  
  // Left side - Company contact
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  doc.text(companyAddress, 20, y);
  doc.text(`📞 ${companyPhone}`, 20, y + 5);
  doc.text(`✉ ${companyEmail}`, 20, y + 10);
  
  // Right side - Invoice details in a card
  doc.setFillColor(...lightBg);
  doc.roundedRect(120, y - 5, 75, 35, 3, 3, 'F');
  
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  
  let infoY = y + 2;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #:', 125, infoY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...primaryColor);
  doc.text(sale.invoice_number || 'N/A', 155, infoY);
  
  infoY += 8;
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 125, infoY);
  doc.setFont('helvetica', 'normal');
  const saleDate = sale.sale_date ? new Date(sale.sale_date).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric'
  }) : new Date().toLocaleDateString('en-IN');
  doc.text(saleDate, 155, infoY);
  
  infoY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', 125, infoY);
  if (sale.payment_status === 'Paid') {
    doc.setTextColor(76, 175, 80); // Green
  } else {
    doc.setTextColor(255, 152, 0); // Orange
  }
  doc.setFont('helvetica', 'bold');
  doc.text(sale.payment_status || 'Pending', 155, infoY);
  doc.setTextColor(...textColor);
  
  // ===== BILL TO SECTION =====
  y = 100;
  doc.setFillColor(...primaryColor);
  doc.rect(15, y, 4, 28, 'F'); // Accent bar
  
  doc.setFillColor(...lightBg);
  doc.rect(19, y, 81, 28, 'F');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('BILL TO', 24, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.text(sale.patient_name || 'Walk-in Customer', 24, y + 15);
  
  doc.setFontSize(8);
  doc.setTextColor(...mutedColor);
  if (sale.patient_phone) doc.text(sale.patient_phone, 24, y + 21);
  if (sale.patient_code) doc.text(`ID: ${sale.patient_code}`, 24, y + 26);
  
  // ===== ITEMS TABLE =====
  y = 140;
  
  const tableColumns = ['#', 'Item Description', 'Qty', 'Unit Price', 'Amount'];
  const tableRows = (sale.items || []).map((item, idx) => {
    const unitPrice = parseFloat(item.unit_price || item.price || 0);
    const qty = parseInt(item.quantity || 1);
    const amount = qty * unitPrice;
    return [
      (idx + 1).toString(),
      item.medicine_name || item.name || 'Unknown Item',
      qty.toString(),
      `Rs. ${unitPrice.toFixed(2)}`,
      `Rs. ${amount.toFixed(2)}`
    ];
  });
  
  autoTable(doc, {
    startY: y,
    head: [tableColumns],
    body: tableRows.length > 0 ? tableRows : [['1', 'No items', '-', '-', '-']],
    theme: 'plain',
    headStyles: { 
      fillColor: primaryColor, 
      textColor: white,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4
    },
    bodyStyles: { 
      fontSize: 9,
      textColor: textColor,
      cellPadding: 4
    },
    alternateRowStyles: { 
      fillColor: [245, 247, 250]
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 15, right: 15 },
    tableLineColor: [230, 230, 230],
    tableLineWidth: 0.1,
    styles: {
      font: 'helvetica'
    }
  });
  
  // ===== TOTALS SECTION =====
  const finalY = doc.lastAutoTable.finalY + 15;
  
  // Totals card
  doc.setFillColor(...lightBg);
  doc.roundedRect(115, finalY - 5, 80, 50, 4, 4, 'F');
  
  // Accent line
  doc.setFillColor(...primaryColor);
  doc.rect(115, finalY - 5, 4, 50, 'F');
  
  let totalsY = finalY + 5;
  doc.setFontSize(9);
  
  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedColor);
  doc.text('Subtotal:', 125, totalsY);
  doc.setTextColor(...textColor);
  doc.text(`Rs. ${parseFloat(sale.subtotal || sale.total_amount || 0).toFixed(2)}`, 190, totalsY, { align: 'right' });
  
  // Discount
  if (sale.discount_amount && parseFloat(sale.discount_amount) > 0) {
    totalsY += 8;
    doc.setTextColor(...mutedColor);
    doc.text('Discount:', 125, totalsY);
    doc.setTextColor(...accentColor);
    doc.text(`-Rs. ${parseFloat(sale.discount_amount).toFixed(2)}`, 190, totalsY, { align: 'right' });
  }
  
  // Divider line
  totalsY += 10;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(125, totalsY, 190, totalsY);
  
  // Total
  totalsY += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL:', 125, totalsY);
  doc.text(`Rs. ${parseFloat(sale.total_amount || 0).toFixed(2)}`, 190, totalsY, { align: 'right' });
  
  // Payment method badge
  if (sale.payment_method) {
    doc.setFillColor(...accentColor);
    doc.roundedRect(15, finalY, 55, 14, 3, 3, 'F');
    doc.setTextColor(...white);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Paid via ${sale.payment_method}`, 42.5, finalY + 9.5, { align: 'center' });
  }
  
  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.height;
  
  // Footer bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, pageHeight - 25, 210, 25, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for your business!', 105, pageHeight - 16, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`This is a computer generated invoice • Generated on ${new Date().toLocaleString('en-IN')}`, 105, pageHeight - 8, { align: 'center' });
  
  return doc;
}

export function downloadInvoice(sale) {
  const doc = generateInvoice(sale);
  const filename = `Invoice_${sale.invoice_number || 'DRAFT'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function printInvoice(sale) {
  const doc = generateInvoice(sale);
  doc.autoPrint();
  doc.output('dataurlnewwindow');
}
