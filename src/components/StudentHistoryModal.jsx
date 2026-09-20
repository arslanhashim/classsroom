import React from 'react';
import { X, Calendar, CheckCircle2, XCircle, AlertCircle, Award } from 'lucide-react';

export default function StudentHistoryModal({ isOpen, onClose, student, attendanceHistory = [] }) {
  if (!isOpen || !student) return null;

  // Calculate statistics for this specific student from records
  const totalClasses = attendanceHistory.length;
  const presentCount = attendanceHistory.filter(h => h.status === 'P' || h.status === 'L').length;
  const absentCount = attendanceHistory.filter(h => h.status === 'A').length;
  const percentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">{student.name}</h3>
            <p className="text-xs text-slate-400">Roll No: <span className="font-mono text-orange-400">{student.rollNo}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Quick Stat Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <span className="block text-xs font-semibold text-slate-500 uppercase">Total Classes</span>
              <span className="text-xl font-bold text-slate-800">{totalClasses}</span>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
              <span className="block text-xs font-semibold text-emerald-600 uppercase">Present</span>
              <span className="text-xl font-bold text-emerald-700">{presentCount}</span>
            </div>
            <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 text-center">
              <span className="block text-xs font-semibold text-rose-600 uppercase">Absent</span>
              <span className="text-xl font-bold text-rose-700">{absentCount}</span>
            </div>
          </div>

          {/* Overall Percentage Bar */}
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">Attendance Ratio</h4>
                <p className="text-xs text-indigo-600">Overall academic consistency</p>
              </div>
            </div>
            <span className={`text-2xl font-extrabold ${percentage >= 75 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {percentage}%
            </span>
          </div>

          {/* Date-wise Attendance Logs */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" /> Recent Attendance History
            </h4>
            
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {attendanceHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No attendance logs found for this student yet.
                </p>
              ) : (
                attendanceHistory.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      {record.date}
                    </span>
                    <div className="flex items-center gap-3">
                      {record.remark && <span className="text-slate-400 italic">"{record.remark}"</span>}
                      <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 ${
                        record.status === 'P' ? 'bg-emerald-100 text-emerald-700' :
                        record.status === 'L' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {record.status === 'P' && <CheckCircle2 className="w-3 h-3" />}
                        {record.status === 'A' && <XCircle className="w-3 h-3" />}
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Close History
          </button>
        </div>

      </div>
    </div>
  );
}