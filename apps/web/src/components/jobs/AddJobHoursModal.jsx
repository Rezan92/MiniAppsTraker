import React from 'react';

export const AddJobHoursModal = ({ open, onClose, onSubmit, hoursData, setHoursData }) => {
  if (!open) return null;

  const calculateHours = (start, end) => {
    if (!start || !end) return '';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let diff = (endH + endM / 60) - (startH + startM / 60);
    // Handle overnight (e.g. 11 PM to 2 AM)
    if (diff < 0) diff += 24;
    return diff.toFixed(2);
  };

  const handleTimeChange = (field, value) => {
    const newData = { ...hoursData, [field]: value };
    
    if (newData.start_time && newData.end_time) {
      newData.hours = calculateHours(newData.start_time, newData.end_time);
    }
    
    setHoursData(newData);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/40 backdrop-blur-sm p-4"
      onMouseDown={onClose}
    >
      <div 
        className="bg-surface-container-lowest rounded-xl shadow-lg w-full max-w-[28rem] overflow-hidden flex flex-col"
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center">
          <h2 className="font-title-md text-title-md font-bold text-primary">Log Hours</h2>
          <button 
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <form className="space-y-5" id="add-hours-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            {/* Date */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Date *</label>
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
                type="date" 
                value={hoursData.date}
                onChange={e => setHoursData({...hoursData, date: e.target.value})}
                required
              />
            </div>

            {/* Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Start Time</label>
                <input 
                  className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
                  type="time" 
                  value={hoursData.start_time || ''}
                  onChange={e => handleTimeChange('start_time', e.target.value)}
                />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">End Time</label>
                <input 
                  className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow" 
                  type="time" 
                  value={hoursData.end_time || ''}
                  onChange={e => handleTimeChange('end_time', e.target.value)}
                />
              </div>
            </div>
            
            {/* Hours */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Total Hours *</label>
              <input 
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow placeholder:text-on-surface-variant/50" 
                placeholder="e.g. 2.5" 
                type="number" 
                min="0"
                step="0.01"
                value={hoursData.hours}
                onChange={e => setHoursData({...hoursData, hours: e.target.value})}
                required
              />
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-outline-variant bg-surface flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors rounded-md font-title-md text-sm"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="add-hours-form"
            disabled={!hoursData.date || !hoursData.hours}
            className="px-5 py-2 bg-primary-container text-on-primary hover:bg-primary transition-colors rounded-md font-title-md text-sm flex items-center justify-center shadow-sm disabled:opacity-50"
          >
            Log Hours
          </button>
        </div>
      </div>
    </div>
  );
};
