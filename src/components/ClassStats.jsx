import React, { useState } from 'react';
import { Calendar, UserCheck, UserX, Clock, Users, BookOpen, Plus, Trash2, Check, Loader2 } from 'lucide-react';

export default function ClassStats({ 
  settings = {}, 
  selectedDate, 
  setSelectedDate, 
  selectedCourse, 
  setSelectedCourse, 
  stats = {},
  courses = [],          
  onAddCourse,           
  onDeleteCourse,        
  selectedClassId        
}) {
  const [newCourseInput, setNewCourseInput] = useState('');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCourseSubmit = async () => {
    const trimmed = newCourseInput.trim();
    if (!trimmed) return;

    if (!selectedClassId) {
      alert('Please select a class first before adding a subject.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (onAddCourse) {
        await onAddCourse(trimmed);
      }
      setNewCourseInput('');
      setIsAddingCourse(false);
    } catch (err) {
      console.error('Failed to add course:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourseClick = (courseId, courseName, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${courseName}" from database?`)) {
      if (onDeleteCourse) {
        onDeleteCourse(courseId);
      }
    }
  };

  const activeCourseObj = courses.find(c => c.id === selectedCourse);

  const totalStudents = stats.total ?? 0;
  const presentStudents = stats.present ?? 0;
  const absentStudents = stats.absent ?? 0;
  const attendanceRate = stats.rate ?? (totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0);

  return (
    <section className="bg-white rounded-2xl border border-orange-100 shadow-sm p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-orange-100 pb-5 mb-5 gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold text-orange-700 bg-orange-100/80 rounded-full uppercase tracking-wider mb-2">
            {settings.className || "Classroom"}
          </span>
          
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
            {activeCourseObj ? activeCourseObj.course_name : (selectedCourse || "No Subject Selected")}
          </h2>
          <p className="text-sm font-semibold text-slate-500 mt-2">
            Instructor: <strong className="text-slate-800 font-bold">{settings.teacherName || "Instructor"}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
            <BookOpen className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div className="w-full sm:w-52">
              <label className="block text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                Active Subject
              </label>
              {courses.length > 0 ? (
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="">-- Choose Subject --</option>
                  {courses.map((crs) => (
                    <option key={crs.id} value={crs.id}>
                      {crs.course_name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-slate-400 block">Add a subject below</span>
              )}
            </div>
          </div>

          <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-2.5 flex items-center gap-2.5 shadow-sm">
            <Calendar className="w-5 h-5 text-orange-600 flex-shrink-0" />
            <div>
              <label className="block text-[10px] font-bold text-orange-800 uppercase tracking-wider">
                Session Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Your Class Subjects (Database Linked)
          </span>

          {!isAddingCourse && (
            <button
              onClick={() => setIsAddingCourse(true)}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Subject
            </button>
          )}
        </div>

        {isAddingCourse && (
          <div className="flex items-center gap-2 mb-3 bg-orange-50/60 p-2 rounded-xl border border-orange-200">
            <input
              type="text"
              autoFocus
              placeholder="Type subject name (e.g. Mobile Apps)..."
              value={newCourseInput}
              onChange={(e) => setNewCourseInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCourseSubmit()}
              className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={handleAddCourseSubmit}
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
            </button>
            <button
              onClick={() => setIsAddingCourse(false)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {courses.map((crs) => {
            const isActive = selectedCourse === crs.id;
            return (
              <div
                key={crs.id}
                onClick={() => setSelectedCourse(crs.id)}
                className={`group cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
                  isActive
                    ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-200'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:bg-orange-50'
                }`}
              >
                <span>{crs.course_name}</span>
                <button
                  onClick={(e) => handleDeleteCourseClick(crs.id, crs.course_name, e)}
                  className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                    isActive ? 'hover:bg-orange-700 text-white' : 'hover:bg-slate-200 text-slate-500'
                  }`}
                  title="Remove subject"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {courses.length === 0 && !isAddingCourse && (
            <p className="text-xs text-slate-400 font-medium italic">
              No subjects added for this class yet. Click "+ Add Subject" to save one to the database.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900">{totalStudents}</span>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Present</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-700">{presentStudents}</span>
        </div>

        <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
            <UserX className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-rose-700">{absentStudents}</span>
        </div>

        <div className="bg-orange-50/80 border border-orange-200/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-orange-800 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Rate</span>
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-orange-600">{attendanceRate}%</span>
        </div>
      </div>
    </section>
  );
}