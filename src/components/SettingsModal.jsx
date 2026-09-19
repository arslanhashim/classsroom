import React, { useState, useEffect } from 'react';

/**
 * SettingsModal component for configuring class, instructor, and notification details.
 *
 * @param {Object} props
 * @param {Object} props.settings - Existing settings object ({ className, teacherName, teacherPhone })
 * @param {Function} props.onSave - Callback triggered on valid form submission
 * @param {Function} props.onClose - Callback triggered to close modal without saving
 */
export default function SettingsModal({ settings, onSave, onClose }) {
  // Ensure default fallback values to prevent uncontrolled input warnings
  const [formData, setFormData] = useState({
    className: settings?.className || '',
    teacherName: settings?.teacherName || '',
    teacherPhone: settings?.teacherPhone || ''
  });

  const [phoneError, setPhoneError] = useState('');

  // Keep local state in sync if parent settings update
  useEffect(() => {
    if (settings) {
      setFormData({
        className: settings.className || '',
        teacherName: settings.teacherName || '',
        teacherPhone: settings.teacherPhone || ''
      });
    }
  }, [settings]);

  // Handle ESC key to close modal safely
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = (field, value) => {
    if (field === 'teacherPhone') {
      setPhoneError('');
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Clean phone number (strip whitespace, dashes, and standard plus prefix)
    const sanitizedPhone = formData.teacherPhone.replace(/[\s\-\+]/g, '');

    // Optional phone number validation (digits only, typical length 10-15)
    if (sanitizedPhone && !/^\d{10,15}$/.test(sanitizedPhone)) {
      setPhoneError('Please enter a valid international phone number (e.g., 923001234567).');
      return;
    }

    onSave({
      ...formData,
      className: formData.className.trim(),
      teacherName: formData.teacherName.trim(),
      teacherPhone: sanitizedPhone
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 id="modal-title" className="text-lg font-bold text-slate-900">
            Class Setup
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Class Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.className}
              onChange={(e) => handleChange('className', e.target.value)}
              placeholder="e.g. BSIT 4th Semester"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Teacher Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.teacherName}
              onChange={(e) => handleChange('teacherName', e.target.value)}
              placeholder="e.g. Prof. Arsalan Hashim"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Teacher WhatsApp Phone (Optional)
            </label>
            <input
              type="tel"
              placeholder="e.g. 923001234567"
              value={formData.teacherPhone}
              onChange={(e) => handleChange('teacherPhone', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg text-sm text-slate-900 focus:ring-2 focus:outline-none transition-shadow ${
                phoneError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-slate-300 focus:ring-indigo-500 focus:border-indigo-500'
              }`}
            />
            {phoneError ? (
              <p className="mt-1 text-xs text-red-600">{phoneError}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                Include country code without spaces or symbols (e.g. 92 for Pakistan).
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg shadow-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}