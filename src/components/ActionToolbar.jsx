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
    <>
      {/* Main Top Section: Search & Desktop Toolbar */}
      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 mb-20 sm:mb-6 no-print">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by roll no or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
          />
        </div>

        {/* Desktop Action Buttons Container (Hidden on Mobile) */}
        <div className="hidden sm:flex flex-wrap items-center gap-2.5 justify-end">
          <button
            onClick={onMarkAllPresent}
            className="px-3.5 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <Check className="w-3.5 h-3.5" /> Mark All Present
          </button>

          <button
            onClick={onOpenAddStudent}
            className="px-3.5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all duration-200 flex items-center gap-2 shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Student
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => shareToWhatsApp(settings, selectedDate, students, attendance)}
            className="px-3.5 py-2.5 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl transition-all flex items-center gap-2"
            title="Share via WhatsApp"
          >
            <Share2 className="w-4 h-4 text-emerald-600" /> WhatsApp
          </button>

          <button
            onClick={() => exportToCSV(settings?.className || "Class", selectedDate, students, attendance)}
            className="px-3.5 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all flex items-center gap-2"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> CSV
          </button>

          <button
            onClick={triggerPDFPrint}
            className="px-3.5 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all flex items-center gap-2"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Print
          </button>
        </div>
      </section>

      {/* Mobile Floating Bottom Navigation Bar */}
      <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden no-print">
        <div className="bg-slate-900/95 backdrop-blur-md text-white px-2 py-2 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-around gap-1">
          
          {/* Mark Present */}
          <button
            onClick={onMarkAllPresent}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-800 text-emerald-400 transition flex-1"
            title="Mark All Present"
          >
            <Check className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-medium tracking-tight">Present</span>
          </button>

          <div className="w-px h-6 bg-slate-800"></div>

          {/* Add Student */}
          <button
            onClick={onOpenAddStudent}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-800 text-orange-400 transition flex-1"
            title="Add Student"
          >
            <UserPlus className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-medium tracking-tight">Add</span>
          </button>

          <div className="w-px h-6 bg-slate-800"></div>

          {/* WhatsApp */}
          <button
            onClick={() => shareToWhatsApp(settings, selectedDate, students, attendance)}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-800 text-emerald-300 transition flex-1"
            title="Share WhatsApp"
          >
            <Share2 className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-medium tracking-tight">WhatsApp</span>
          </button>

          <div className="w-px h-6 bg-slate-800"></div>

          {/* CSV */}
          <button
            onClick={() => exportToCSV(settings?.className || "Class", selectedDate, students, attendance)}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-800 text-teal-300 transition flex-1"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-medium tracking-tight">CSV</span>
          </button>

          <div className="w-px h-6 bg-slate-800"></div>

          {/* Print / PDF */}
          <button
            onClick={triggerPDFPrint}
            className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-slate-800 text-slate-300 transition flex-1"
            title="Print / PDF"
          >
            <Printer className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-medium tracking-tight">Print</span>
          </button>

        </div>
      </div>
    </>
  );
}