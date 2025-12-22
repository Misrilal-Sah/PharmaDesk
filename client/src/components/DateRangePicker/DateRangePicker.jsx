import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import './DateRangePicker.css';

const presets = [
  { label: 'Today', days: 0 },
  { label: 'Yesterday', days: 1 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'This Month', days: 'month' },
  { label: 'This Year', days: 'year' },
];

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePreset = (preset) => {
    const end = new Date();
    let start = new Date();
    
    if (preset.days === 'month') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else if (preset.days === 'year') {
      start = new Date(end.getFullYear(), 0, 1);
    } else if (preset.days === 0) {
      start = new Date();
    } else if (preset.days === 1) {
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      end.setTime(start.getTime());
    } else {
      start = new Date(end.getTime() - preset.days * 24 * 60 * 60 * 1000);
    }
    
    onChange({
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
    setIsOpen(false);
  };

  const handleApply = () => {
    onChange({ startDate: tempStart, endDate: tempEnd });
    setIsOpen(false);
  };

  const displayText = startDate && endDate
    ? `${formatDate(startDate)} - ${formatDate(endDate)}`
    : 'Select date range';

  return (
    <div className="date-range-picker">
      <button 
        className="date-range-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Calendar size={18} />
        <span>{displayText}</span>
        <ChevronDown size={16} className={isOpen ? 'rotated' : ''} />
      </button>

      {isOpen && (
        <>
          <div className="date-range-overlay" onClick={() => setIsOpen(false)} />
          <div className="date-range-dropdown">
            <div className="date-range-presets">
              {presets.map(preset => (
                <button 
                  key={preset.label}
                  className="preset-btn"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            <div className="date-range-custom">
              <div className="date-input-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={tempStart || ''}
                  onChange={(e) => setTempStart(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="date-input-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={tempEnd || ''}
                  onChange={(e) => setTempEnd(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="date-range-actions">
              <button className="btn btn-ghost" onClick={() => setIsOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
