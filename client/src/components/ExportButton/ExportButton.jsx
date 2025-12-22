import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useToast } from '../Toast/Toast';
import './ExportButton.css';

export default function ExportButton({ data, filename = 'export', columns }) {
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const toast = useToast();

  const exportToCSV = () => {
    if (!data || data.length === 0) {
      toast.warning('No data to export');
      return;
    }

    setIsExporting(true);
    
    try {
      // Get column headers
      const headers = columns 
        ? columns.map(c => c.label || c.key) 
        : Object.keys(data[0]);
      
      const keys = columns 
        ? columns.map(c => c.key) 
        : Object.keys(data[0]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          keys.map(key => {
            let value = row[key] ?? '';
            // Escape quotes and wrap in quotes if contains comma
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${data.length} rows to CSV`);
    } catch (error) {
      toast.error('Export failed');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  const exportToExcel = async () => {
    if (!data || data.length === 0) {
      toast.warning('No data to export');
      return;
    }

    setIsExporting(true);
    
    try {
      // For Excel, we'll use a simple HTML table approach that Excel can open
      const headers = columns 
        ? columns.map(c => c.label || c.key) 
        : Object.keys(data[0]);
      
      const keys = columns 
        ? columns.map(c => c.key) 
        : Object.keys(data[0]);

      const tableContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head><meta charset="UTF-8"></head>
        <body>
          <table border="1" style="border-collapse: collapse;">
            <thead>
              <tr style="background-color: #1565C0; color: white; font-weight: bold;">
                ${headers.map(h => `<th style="padding: 8px;">${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${keys.map(key => `<td style="padding: 8px;">${row[key] ?? ''}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([tableContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success(`Exported ${data.length} rows to Excel`);
    } catch (error) {
      toast.error('Export failed');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="export-button-wrapper">
      <button 
        className="btn btn-secondary export-trigger"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
      >
        {isExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
        Export
      </button>

      {isOpen && (
        <>
          <div className="export-overlay" onClick={() => setIsOpen(false)} />
          <div className="export-dropdown">
            <button className="export-option" onClick={exportToCSV}>
              <FileText size={18} />
              <div>
                <strong>Export as CSV</strong>
                <span>Compatible with all apps</span>
              </div>
            </button>
            <button className="export-option" onClick={exportToExcel}>
              <FileSpreadsheet size={18} />
              <div>
                <strong>Export as Excel</strong>
                <span>Open in Microsoft Excel</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
