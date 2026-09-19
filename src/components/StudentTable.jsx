import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';

export default function StudentTable({
  students = [],
  attendance = {},
  dbPercentages = [],
  onStatusChange,
  onRemarkChange,
  onDeleteStudent,
}) {
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

  if (!students || students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
        No students found. Add students to begin taking attendance.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
              <th className="py-3 px-4 w-12 text-center">#</th>
              <th className="py-3 px-4 w-32">Roll No</th>
              <th className="py-3 px-4">Student Name</th>
              <th className="py-3 px-4 w-28 text-center">Overall %</th>
              <th className="py-3 px-4 text-center w-60">Attendance Status</th>
              <th className="py-3 px-4">Remarks / Note</th>
              <th className="py-3 px-4 text-right w-16 no-print">Actions</th>
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
                  <td className="py-3 px-4 text-center text-xs font-semibold text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-4 font-mono text-xs font-bold text-indigo-900">{student.rollNo}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{student.name}</td>
                  
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

                  {/* Interactive Status Selector */}
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 gap-1">
                      <button
                        title="Present"
                        onClick={() => onStatusChange(student.id, 'P')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${status === 'P' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        P
                      </button>
                      <button
                        title="Absent"
                        onClick={() => onStatusChange(student.id, 'A')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${status === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        A
                      </button>
                      <button
                        title="Late"
                        onClick={() => onStatusChange(student.id, 'L')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${status === 'L' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        L
                      </button>
                      <button
                        title="Excused"
                        onClick={() => onStatusChange(student.id, 'E')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition ${status === 'E' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
                      >
                        E
                      </button>
                    </div>
                  </td>

                  {/* Remarks Input Column */}
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={remark}
                      onChange={(e) => onRemarkChange(student.id, e.target.value)}
                      placeholder="Add note..."
                      className="w-full bg-transparent border-b border-slate-200 focus:border-indigo-600 text-xs py-1 px-1 focus:outline-none placeholder:text-slate-300"
                    />
                  </td>

                  {/* Actions Column */}
                  <td className="py-3 px-4 text-right no-print">
                    <button
                      title="Remove Student"
                      onClick={() => onDeleteStudent(student.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1 rounded-md"
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
  );
}