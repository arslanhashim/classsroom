import React, { useState, useEffect } from 'react';

/**
 * AddStudentModal component for manually adding new students to the roster.
 *
 * @param {Object} props
 * @param {Function} props.onAdd - Callback triggered with the new student object
 * @param {Function} props.onClose - Callback triggered to close the modal
 */
export default function AddStudentModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [error, setError] = useState('');

  // Close modal when pressing the Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedRoll = rollNo.trim();

    if (!trimmedName || !trimmedRoll) {
      setError('Please fill in all required fields.');
      return;
    }

    onAdd({
      id: crypto.randomUUID(), // Generates a clean UUID v4 for database compatibility
      name: trimmedName,
      rollNo: trimmedRoll
    });

    setName('');
    setRollNo('');
    setError('');
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
      aria-labelledby="add-student-title"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 id="add-student-title" className="text-lg font-bold text-slate-900">
            Add New Student
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

        {error && (
          <div className="mb-4 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. John Doe"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Roll / ID Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={rollNo}
              onChange={(e) => {
                setRollNo(e.target.value);
                setError('');
              }}
              placeholder="e.g. BSIT-F22-01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition-shadow"
            />
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
              className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-lg shadow-sm transition-colors"
            >
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}