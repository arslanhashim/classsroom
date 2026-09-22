import React, { useState, useMemo } from 'react';
import { Trash2, History, X, Calendar, CheckCircle2, XCircle, Award } from 'lucide-react';

export default function StudentTable({
  students = [],
  attendance = {},
  dbPercentages = [],
  onStatusChange,
  onRemarkChange,
  onDeleteStudent,
}) {
  // 1. ALL HOOKS MUST BE DECLARED AT THE VERY TOP (Unconditional)
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState(null);

  // O(1) lookup map for student aggregate attendance percentages
  const percentageMap = useMemo(() => {
    if (!Array.isArray(dbPercentages)) return {};
    return dbPercentages.reduce((acc, item) => {
      const id = item.student_id || item.studentId || item.id;
      if (id) {
        acc[String(id).trim()] = item.percentage ?? item.pct ?? 0;
      }
      return acc;
    }, {});
  }, [dbPercentages]);

  // Calculate stats for the active modal student safely
  const activeStudent = selectedStudentForHistory;
  const studentStats = useMemo(() => {
    if (!activeStudent) return { present: 0, absent: 0, total: 0 };
    const activeStatus = attendance[String(activeStudent.id).trim()]?.status || 'P';
    return {
      present: activeStatus === 'P' ? 1 : 0,
      absent: activeStatus === 'A' ? 1 : 0,
      total: 1
    };
  }, [activeStudent, attendance]);

  // 2. EARLY RETURN CAN ONLY HAPPEN AFTER ALL HOOKS ARE CALLED
  if (!students || students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        No students found. Add students to begin taking attendance.
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-36">Roll No / Student</th>
                <th className="py-3 px-4 hidden sm:table-cell">Student Name</th>
                <th className="py-3 px-4 w-28 text-center">Overall %</th>
                <th className="py-3 px-4 text-center sm:w-60">Attendance Status</th>
                <th className="py-3 px-4 hidden md:table-cell">Remarks / Note</th>
                <th className="py-3 px-4 text-right w-20 no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {students.map((student, idx) => {
                const studentId = String(student.id).trim();
                const status = attendance[studentId]?.status || attendance[student.rollNo]?.status || 'P';
                const remark = attendance[studentId]?.remark || attendance[student.rollNo]?.remark || '';

                // Retrieve overall aggregate percentage using multi-key fallback
                const rawPercentage = percentageMap[studentId] ?? percentageMap[student.rollNo];
                const hasPercentage = typeof rawPercentage === 'number';
                const overallPct = hasPercentage ? Math.round(rawPercentage) : null;

                // Visual styling thresholds for percentages
                let badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (hasPercentage && overallPct < 75) {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                } else if (hasPercentage && overallPct < 85) {
                  badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                }

                return (
                  <tr key={student.id || student.rollNo || idx} className="hover:bg-slate-50 transition border-b border-slate-100">
                    <td className="py-3 px-4 text-center text-xs font-semibold text-slate-400">{student.serialNo || idx + 1}</td>
                    
                    {/* Roll No Column (Mobile par name iske neeche compact show hoga) */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <button 
                          type="button"
                          onClick={() => setSelectedStudentForHistory(student)}
                          className="font-mono text-xs sm:text-sm font-bold text-indigo-900 hover:underline hover:text-indigo-600 text-left focus:outline-none"
                          title="View Student History"
                        >
                          {student.rollNo || '—'}
                        </button>
                        {/* Mobile-only Name Display under Roll No */}
                        <span 
                          onClick={() => setSelectedStudentForHistory(student)}
                          className="sm:hidden text-xs text-slate-500 font-medium truncate max-w-[120px] mt-0.5 cursor-pointer hover:text-orange-600"
                        >
                          {student.name || '—'}
                        </span>
                      </div>
                    </td>

                    {/* Student Name Column (Desktop View) */}
                    <td className="py-3 px-4 font-medium text-slate-900 hidden sm:table-cell">
                      <button 
                        type="button"
                        onClick={() => setSelectedStudentForHistory(student)}
                        className="hover:underline hover:text-orange-600 text-left focus:outline-none flex items-center gap-1.5"
                        title="View Student History"
                      >
                        {student.name || '—'}
                      </button>
                    </td>
                    
                    {/* Overall DB Percentage Badge Column */}
                    <td className="py-3 px-4 text-center">
                      {hasPercentage ? (
                        <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full border ${badgeColor}`}>
                          {overallPct}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">—</span>
                      )}
                    </td>

                    {/* Interactive Status Selector (Roll Number ke sath properly aligned) */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 gap-1">
                        <button
                          type="button"
                          title="Present"
                          onClick={() => onStatusChange(student.id, 'P')}
                          className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-md transition ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          title="Absent"
                          onClick={() => onStatusChange(student.id, 'A')}
                          className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-md transition ${status === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          A
                        </button>
                        <button
                          type="button"
                          title="Late"
                          onClick={() => onStatusChange(student.id, 'L')}
                          className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-md transition ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          title="Excused"
                          onClick={() => onStatusChange(student.id, 'E')}
                          className={`px-2.5 sm:px-3 py-1 text-xs font-bold rounded-md transition ${status === 'E' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                        >
                          E
                        </button>
                      </div>
                    </td>

                    {/* Remarks Input Column (Desktop) */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      <input
                        type="text"
                        value={remark}
                        onChange={(e) => onRemarkChange(student.id, e.target.value)}
                        placeholder="Add note..."
                        className="w-full bg-transparent border-b border-slate-200 focus:border-indigo-600 text-xs py-1 px-1 focus:outline-none placeholder:text-slate-300"
                      />
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-4 text-right no-print flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="View Individual History"
                        onClick={() => setSelectedStudentForHistory(student)}
                        className="text-slate-400 hover:text-indigo-600 transition p-1 rounded-md bg-slate-50 hover:bg-indigo-50"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        title="Remove Student"
                        onClick={() => onDeleteStudent(student.id)}
                        className="text-slate-400 hover:text-rose-600 transition p-1 rounded-md bg-slate-50 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Individual History Modal */}
      {selectedStudentForHistory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{selectedStudentForHistory.name}</h3>
                <p className="text-xs text-slate-400">Roll No: <span className="font-mono text-orange-400">{selectedStudentForHistory.rollNo}</span></p>
              </div>
              <button 
                onClick={() => setSelectedStudentForHistory(null)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Total Present & Absent Summary Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Present</span>
                  <span className="text-xl font-black text-emerald-700 flex items-center justify-center gap-1 mt-1">
                    <CheckCircle2 className="w-4 h-4" /> {studentStats.present}
                  </span>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Absent</span>
                  <span className="text-xl font-black text-rose-700 flex items-center justify-center gap-1 mt-1">
                    <XCircle className="w-4 h-4" /> {studentStats.absent}
                  </span>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-center">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600">Overall %</span>
                  <span className="text-xl font-black text-indigo-700 flex items-center justify-center gap-1 mt-1">
                    <Award className="w-4 h-4" /> {percentageMap[String(selectedStudentForHistory.id).trim()] ?? percentageMap[selectedStudentForHistory.rollNo] ? `${Math.round(percentageMap[String(selectedStudentForHistory.id).trim()] ?? percentageMap[selectedStudentForHistory.rollNo])}%` : '0%'}
                  </span>
                </div>
              </div>

              {/* Session Activity Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" /> Active Session Details
                </h4>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between text-xs font-medium text-slate-600 border-b border-slate-200 pb-2">
                    <span>Status in Current Date:</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      (attendance[String(selectedStudentForHistory.id).trim()]?.status || 'P') === 'P' ? 'bg-emerald-100 text-emerald-700' :
                      (attendance[String(selectedStudentForHistory.id).trim()]?.status) === 'A' ? 'bg-rose-100 text-rose-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {attendance[String(selectedStudentForHistory.id).trim()]?.status || 'Present (P)'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Session Note / Remark:</span>
                    <span className="italic text-slate-700">
                      {attendance[String(selectedStudentForHistory.id).trim()]?.remark || 'No special remarks.'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStudentForHistory(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close History
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}