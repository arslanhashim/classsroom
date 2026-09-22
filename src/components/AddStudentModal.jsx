import React, { useState } from 'react';
import { X, UserPlus, Users, FileText, Loader2 } from 'lucide-react';

export default function AddStudentModal({ isOpen, onClose, onAddStudent, onBulkAdd }) {
  const [activeTab, setActiveTab] = useState('single'); // 'single' or 'bulk'
  
  // Single student state
  const [rollNo, setRollNo] = useState('');
  const [name, setName] = useState('');

  // Bulk student state
  const [bulkText, setBulkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSingleSubmit = (e) => {
    e.preventDefault();
    if (!rollNo.trim() || !name.trim()) return;
    onAddStudent({ rollNo: rollNo.trim(), name: name.trim() });
    setRollNo('');
    setName('');
    onClose();
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    setIsSubmitting(true);
    const lines = bulkText.split('\n');
    const studentsArray = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const separator = line.includes('\t') ? '\t' : ',';
      const parts = line.split(separator);

      if (parts.length >= 2) {
        const rNo = parts[0].trim();
        const sName = parts.slice(1).join(' ').trim();
        
        if (rNo && sName) {
          studentsArray.push({ rollNo: rNo, name: sName });
        }
      }
    }

    let addedCount = 0;
    if (studentsArray.length > 0) {
      if (onBulkAdd) {
        // Use optimized bulk handler if provided by parent App component
        addedCount = await onBulkAdd(studentsArray);
      } else {
        // Fallback loop if onBulkAdd is missing
        for (const s of studentsArray) {
          await onAddStudent(s);
          addedCount++;
        }
      }
    }

    setIsSubmitting(false);

    if (addedCount > 0) {
      alert(`Successfully added ${addedCount} students to the roster!`);
    } else {
      alert('No valid student data found. Please check the format (RollNo, Name).');
    }

    setBulkText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" /> Add Students to Roster
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Single Student
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'bulk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" /> Bulk Import
          </button>
        </div>

        {/* Tab 1: Single Student Form */}
        {activeTab === 'single' && (
          <form onSubmit={handleSingleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Roll Number</label>
              <input
                type="text"
                placeholder="e.g., IT-01 or 2026-BSIT-12"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Student Name</label>
              <input
                type="text"
                placeholder="e.g., Muhammad Arsalan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                Add Student
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Bulk Import Form */}
        {activeTab === 'bulk' && (
          <form onSubmit={handleBulkSubmit} className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700">Paste Students List (Excel / CSV)</label>
                <span className="text-[10px] text-slate-400">Format: RollNo [Comma/Tab] Name</span>
              </div>
              <textarea
                rows="6"
                placeholder={`Paste directly from Excel or Notepad:\n\nIT-01, Ali Hassan\nIT-02, Muhammad Ahmad\nIT-03, Zainab Bibi`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
              ></textarea>
            </div>

            <div className="bg-orange-50 border border-orange-100 p-2.5 rounded-xl text-[11px] text-orange-900 flex items-start gap-2">
              <FileText className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <p>Each line should contain one student. Ensure Roll Number and Name are separated by a **Comma (,)** or **Tab**.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Importing...
                  </>
                ) : (
                  'Import All Students'
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}