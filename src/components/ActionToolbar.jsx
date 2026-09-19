import React from 'react';
import { Search, UserPlus, Check, Share2, FileSpreadsheet, Printer } from 'lucide-react';
import { shareToWhatsApp, exportToCSV, triggerPDFPrint } from '../utils/exportHelpers';

export default function ActionToolbar({
  searchQuery,
  setSearchQuery,
  onMarkAllPresent,
  onOpenAddStudent,
  settings,
  selectedDate,
  students,
  attendance
}) {
  return (
    <section className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 no-print">
      {/* Search Bar */}
      <div className="relative w-full sm:w-72">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search roll no or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
        <button
          onClick={onMarkAllPresent}
          className="px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1.5 shadow-sm"
        >
          <Check className="w-4 h-4" /> Mark All Present
        </button>

        <button
          onClick={onOpenAddStudent}
          className="px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" /> Add Student
        </button>

        <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block"></div>

        {/* WhatsApp Share Button */}
        <button
          onClick={() => shareToWhatsApp(settings, selectedDate, students, attendance)}
          className="px-3 py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition flex items-center gap-1.5 shadow-sm"
        >
          <Share2 className="w-4 h-4" /> WhatsApp
        </button>

        {/* CSV Export Button */}
        <button
          onClick={() => exportToCSV(settings?.className || "Class", selectedDate, students, attendance)}
          className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV
        </button>

        {/* PDF / Print Button */}
        <button
          onClick={triggerPDFPrint}
          className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4 text-slate-600" /> Print / PDF
        </button>
      </div>
    </section>
  );
}