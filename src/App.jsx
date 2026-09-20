import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header';
import ClassStats from './components/ClassStats';
import StudentTable from './components/StudentTable';
import SettingsModal from './components/SettingsModal';
import AddStudentModal from './components/AddStudentModal';
import AuthModal from './components/AuthModal';

import { 
  getStoredSettings, 
  saveStoredSettings, 
  getStoredAttendance, 
  saveStoredAttendance 
} from './utils/storage';
import { shareToWhatsApp, exportToCSV } from './utils/exportHelpers';

// Database Services & Supabase Client
import { 
  syncAttendanceToDB, 
  fetchCoursePercentages, 
  fetchAttendanceForCourse 
} from './services/attendanceService';
import { 
  supabase, 
  fetchStudentsByClass,
  addStudentToSupabase 
} from './utils/supabaseClient';
import { 
  getActiveUser, 
  onAuthStateChange, 
  signOutTeacher 
} from './services/authService';

import { 
  Search, 
  UserPlus, 
  Check, 
  Share2, 
  FileSpreadsheet, 
  Printer, 
  Database,
  Loader2,
  LogOut,
  Layers,
  FolderPlus,
  Trash2
} from 'lucide-react';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Hierarchical State: Departments, Classes & Courses management
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  
  const [newDeptName, setNewDeptName] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSemester, setNewClassSemester] = useState('');

  const [settings, setSettings] = useState(() => getStoredSettings(null));
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [dbPercentages, setDbPercentages] = useState([]);
  const [isSavingToDB, setIsSavingToDB] = useState(false);
  const [isFetchingDB, setIsFetchingDB] = useState(false);

  const isOnline = useOnlineStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);

  const attendanceStorageKey = useMemo(() => {
    const classKey = selectedClassId || 'no_class';
    const courseKey = selectedCourseId ? selectedCourseId.trim() : 'no_course';
    return `${classKey}_${selectedDate}_${courseKey}`;
  }, [selectedClassId, selectedDate, selectedCourseId]);

  const [attendance, setAttendance] = useState(() => getStoredAttendance(attendanceStorageKey, user?.id));
  const activeFetchId = useRef(0);

  // Helper storage key for class-wise student caching
  const studentCacheKey = useMemo(() => {
    if (!user?.id || !selectedClassId) return null;
    return `students_${user.id}_${selectedClassId}`;
  }, [user?.id, selectedClassId]);

  // Robust Normalization Function with Ordered Numbering Support
  const normalizeStudentData = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((s, index) => ({
      id: s.id,
      serialNo: index + 1, // Proper sequential number ordering
      rollNo: String(s.rollNo || s.roll_no || '').trim(),
      name: String(s.name || s.full_name || '').trim()
    }));
  };

  // 1. Authentication lifecycle
  useEffect(() => {
    getActiveUser()
      .then((currentUser) => setUser(currentUser))
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));

    const { data: authListener } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 2. Fetch Departments when user logs in
  useEffect(() => {
    if (!user?.id) return;
    
    async function loadDepartments() {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setDepartments(data);
        if (data.length > 0 && !selectedDeptId) {
          setSelectedDeptId(data[0].id);
        }
      }
    }
    loadDepartments();
  }, [user, selectedDeptId]);

  // 3. Fetch Classes when Selected Department changes
  useEffect(() => {
    if (!user?.id || !selectedDeptId) {
      setClasses([]);
      setSelectedClassId('');
      setStudents([]);
      return;
    }

    async function loadClasses() {
      setClasses([]);
      setSelectedClassId('');
      setStudents([]);

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('department_id', selectedDeptId)
        .eq('user_id', user.id);

      if (!error && data) {
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      }
    }
    loadClasses();
  }, [selectedDeptId, user]);

  // 4. Fetch Courses when Selected Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setCourses([]);
      setSelectedCourseId('');
      return;
    }

    async function loadCourses() {
      setCourses([]);
      setSelectedCourseId('');

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('class_id', selectedClassId);

      if (!error && data) {
        setCourses(data);
        if (data.length > 0) {
          setSelectedCourseId(data[0].id);
        }
      }
    }
    loadCourses();
  }, [selectedClassId]);

  // 5. Fetch Students Roster matching Selected Class directly from Supabase Database
  useEffect(() => {
    if (!selectedClassId || !user?.id || !studentCacheKey) {
      setStudents([]);
      return;
    }

    async function loadClassStudents() {
      setStudents([]);

      const localCached = localStorage.getItem(studentCacheKey);
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed)) {
            setStudents(normalizeStudentData(parsed));
          }
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }

      if (isOnline) {
        const roster = await fetchStudentsByClass(selectedClassId);
        if (roster && roster.length > 0) {
          const formatted = normalizeStudentData(roster);
          setStudents(formatted);
          localStorage.setItem(studentCacheKey, JSON.stringify(formatted));
        } else if (!localCached) {
          setStudents([]);
        }
      }
    }
    loadClassStudents();
  }, [selectedClassId, isOnline, user, studentCacheKey]);

  const handleCreateDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim() || !user?.id) return;

    const { data, error } = await supabase
      .from('departments')
      .insert([{ name: newDeptName.trim(), user_id: user.id }])
      .select();

    if (!error && data) {
      setDepartments([...departments, data[0]]);
      setSelectedDeptId(data[0].id);
      setNewDeptName('');
    } else {
      alert('Failed to create department: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department and all its classes?')) return;
    
    const { error } = await supabase.from('departments').delete().eq('id', deptId);
    if (!error) {
      setDepartments(departments.filter(d => d.id !== deptId));
      if (selectedDeptId === deptId) {
        setSelectedDeptId('');
        setClasses([]);
        setStudents([]);
      }
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim() || !selectedDeptId || !user?.id) return;

    const { data, error } = await supabase
      .from('classes')
      .insert([{ 
        department_id: selectedDeptId, 
        name: newClassName.trim(), 
        semester: newClassSemester.trim() || 'Spring', 
        user_id: user.id 
      }])
      .select();

    if (!error && data) {
      setClasses([...classes, data[0]]);
      setSelectedClassId(data[0].id);
      setNewClassName('');
      setNewClassSemester('');
    } else {
      alert('Failed to create class: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleDeleteClass = useCallback(async (classId) => {
    if (!window.confirm('Kya aap waqai is class aur iske tamam related data ko mukammal delete karna chahte hain?')) {
      return;
    }

    setClasses((prev) => prev.filter(c => c.id !== classId));
    if (selectedClassId === classId) {
      setSelectedClassId('');
      setStudents([]);
    }

    if (user?.id) {
      localStorage.removeItem(`students_${user.id}_${classId}`);
    }

    if (isOnline) {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) {
        alert('Class delete karne mein error aa gaya: ' + error.message);
      } else {
        alert('Class aur uska tamam data database se mukammal delete ho chuka hai!');
      }
    }
  }, [isOnline, selectedClassId, user]);

  // Updated handler to accept both courseName and instructorName
  const handleAddCourse = async (courseName, instructorName = '') => {
    if (!selectedClassId || !selectedDeptId) {
      alert('Please select a department and class first.');
      return;
    }

    const generatedCode = courseName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) + '_' + Math.floor(100 + Math.random() * 900);

    const { data, error } = await supabase
      .from('courses')
      .insert([{ 
        class_id: selectedClassId, 
        department_id: selectedDeptId,
        course_name: courseName.trim(),
        instructor_name: instructorName.trim(), // Instructor name saved to database
        course_code: generatedCode,
        user_id: user?.id 
      }])
      .select();

    if (!error && data) {
      setCourses([...courses, data[0]]);
      setSelectedCourseId(data[0].id);
    } else {
      alert('Error adding course: ' + (error?.message || 'Unknown'));
    }
  };

  const handleDeleteCourse = async (courseId) => {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (!error) {
      const updated = courses.filter(c => c.id !== courseId);
      setCourses(updated);
      if (selectedCourseId === courseId) {
        setSelectedCourseId(updated.length > 0 ? updated[0].id : '');
      }
    }
  };

  // Remote Attendance fetching
  useEffect(() => {
    if (!user?.id) return;
    const currentFetchId = ++activeFetchId.current;
    const cachedData = getStoredAttendance(attendanceStorageKey, user.id);
    setAttendance(cachedData);

    if (isOnline && selectedClassId && selectedCourseId && selectedDate) {
      setIsFetchingDB(true);
      fetchAttendanceForCourse(selectedClassId, selectedCourseId, selectedDate)
        .then((dbAttendance) => {
          if (currentFetchId === activeFetchId.current && dbAttendance && Object.keys(dbAttendance).length > 0) {
            const merged = { ...cachedData, ...dbAttendance };
            setAttendance(merged);
            saveStoredAttendance(attendanceStorageKey, merged, user.id);
          }
        })
        .finally(() => {
          if (currentFetchId === activeFetchId.current) setIsFetchingDB(false);
        });
    }
  }, [attendanceStorageKey, isOnline, selectedClassId, selectedCourseId, selectedDate, user]);

  const loadAggregatePercentages = useCallback(async () => {
    if (!selectedClassId || !selectedCourseId || !user?.id) return;
    try {
      const data = await fetchCoursePercentages(selectedClassId, selectedCourseId);
      if (data) setDbPercentages(data);
    } catch (err) {
      console.error('[Analytics Error]:', err);
    }
  }, [selectedClassId, selectedCourseId, user]);

  useEffect(() => {
    if (isOnline && user?.id && selectedClassId && selectedCourseId) {
      loadAggregatePercentages();
    }
  }, [selectedClassId, selectedCourseId, isOnline, loadAggregatePercentages, user]);

  const handleSaveToDatabase = async () => {
    if (!isOnline) {
      alert('You are offline. Changes saved locally.');
      return;
    }
    if (!selectedClassId || !selectedCourseId) {
      alert('Please select both a Class and a Subject before saving.');
      return;
    }

    setIsSavingToDB(true);
    try {
      const result = await syncAttendanceToDB(attendance, selectedClassId, selectedCourseId, selectedDate);
      if (result.success) {
        await loadAggregatePercentages();
        alert('Attendance saved successfully to Database!');
      } else {
        alert('Failed to save: ' + result.error);
      }
    } finally {
      setIsSavingToDB(false);
    }
  };

  const updateAttendanceState = useCallback((newAttendancePayload) => {
    setAttendance(newAttendancePayload);
    if (user?.id) {
      saveStoredAttendance(attendanceStorageKey, newAttendancePayload, user.id);
    }
  }, [attendanceStorageKey, user]);

  const handleStatusChange = useCallback((studentId, status) => {
    setAttendance((prev) => {
      const updated = { ...prev, [studentId]: { ...prev[studentId], status } };
      updateAttendanceState(updated);
      return updated;
    });
  }, [updateAttendanceState]);

  const handleRemarkChange = useCallback((studentId, remark) => {
    setAttendance((prev) => {
      const updated = { ...prev, [studentId]: { ...prev[studentId], remark } };
      updateAttendanceState(updated);
      return updated;
    });
  }, [updateAttendanceState]);

  const handleMarkAllPresent = useCallback(() => {
    const updated = { ...attendance };
    students.forEach((s) => {
      updated[s.id] = { ...updated[s.id], status: 'P' };
    });
    updateAttendanceState(updated);
  }, [attendance, students, updateAttendanceState]);

  // Professional Manual Student Addition
  const handleAddStudent = useCallback(async (newStudent) => {
    if (!user?.id || !selectedDeptId || !selectedClassId || !studentCacheKey) {
      alert('Pehle upar se Department aur Class select karein!');
      return;
    }

    const rollNoStr = String(newStudent.rollNo || '').trim();
    const nameStr = String(newStudent.name || '').trim();

    if (!rollNoStr || !nameStr) {
      alert('Roll Number aur Student Name dono lazmi hain.');
      return;
    }

    const result = await addStudentToSupabase({
      rollNo: rollNoStr,
      name: nameStr,
      departmentId: selectedDeptId,
      classId: selectedClassId
    });

    if (result.success) {
      const freshRoster = await fetchStudentsByClass(selectedClassId);
      const formatted = normalizeStudentData(freshRoster);
      setStudents(formatted);
      localStorage.setItem(studentCacheKey, JSON.stringify(formatted));
      alert('Student kamyabi ke sath manually add ho gaya!');
    } else {
      alert('Failed to add student: ' + result.error);
    }
  }, [user, selectedDeptId, selectedClassId, studentCacheKey]);

  const handleDeleteStudent = useCallback(async (id) => {
    if (!user?.id || !studentCacheKey || !window.confirm('Remove student from roster?')) return;

    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      const reindexed = normalizeStudentData(updated);
      localStorage.setItem(studentCacheKey, JSON.stringify(reindexed));
      return reindexed;
    });

    if (isOnline) {
      await supabase.from('students').delete().eq('id', id);
    }
  }, [isOnline, user, studentCacheKey]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return students;
    return students.filter(
      (s) => (s.name && s.name.toLowerCase().includes(query)) || (s.rollNo && s.rollNo.toLowerCase().includes(query))
    );
  }, [students, searchQuery]);

  const stats = useMemo(() => {
    const total = students.length;
    let present = 0;
    let absent = 0;
    students.forEach((s) => {
      const st = attendance[s.id]?.status || 'P';
      if (st === 'P' || st === 'L') present++;
      if (st === 'A') absent++;
    });
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, rate };
  }, [students, attendance]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <p className="text-sm font-medium text-slate-400">Loading university portal...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthModal onLoginSuccess={(loggedUser) => setUser(loggedUser)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 antialiased">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* User Session Bar */}
        <section className="no-print flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Teacher Account: <strong className="text-slate-900">{user.email}</strong></span>
          </div>
          <button
            onClick={signOutTeacher}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </section>

        {/* Dynamic Department & Class Setup Panel */}
        <section className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 no-print">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Department Selection & Creation */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-orange-500" /> Select / Create Department
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedDeptId || ''}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {selectedDeptId && (
                  <button
                    onClick={() => handleDeleteDepartment(selectedDeptId)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                    title="Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateDepartment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="New Dept (e.g., Information Tech)"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
                <button type="submit" className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5" /> Add
                </button>
              </form>
            </div>

            {/* Class Selection & Creation */}
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-500" /> Select / Create Class
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedClassId || ''}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  disabled={!selectedDeptId}
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.semester ? `(${c.semester})` : ''}</option>
                  ))}
                </select>
                {selectedClassId && (
                  <button
                    onClick={() => handleDeleteClass(selectedClassId)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                    title="Delete Class"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateClass} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Class Name (e.g., IT 6th Regular)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  disabled={!selectedDeptId}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none disabled:opacity-50"
                />
                <button type="submit" disabled={!selectedDeptId} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50">
                  <FolderPlus className="w-3.5 h-3.5" /> Add Class
                </button>
              </form>
            </div>

          </div>
        </section>

        {/* Statistics & Subject Toolbar */}
        <ClassStats 
          settings={settings}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedCourse={selectedCourseId}
          setSelectedCourse={setSelectedCourseId}
          stats={stats}
          courses={courses}
          selectedClassId={selectedClassId}
          onAddCourse={handleAddCourse}
          onDeleteCourse={handleDeleteCourse}
        />

        {/* Action Toolbar */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-4 no-print">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by roll no or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 focus:border-orange-500 rounded-xl text-sm focus:outline-none shadow-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleSaveToDatabase}
              disabled={isSavingToDB || !isOnline}
              className="px-3.5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSavingToDB ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Save Attendance to DB
            </button>

            <button
              onClick={handleMarkAllPresent}
              className="px-3.5 py-2.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" /> Mark All Present
            </button>

            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-3.5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" /> Add Student
            </button>

            <button
              onClick={() => shareToWhatsApp({ course: selectedCourseId }, selectedDate, students, attendance)}
              className="px-3.5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" /> WhatsApp
            </button>

            <button
              onClick={() => exportToCSV(`class_${selectedClassId}_${selectedCourseId}`, selectedDate, students, attendance)}
              className="px-3.5 py-2.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export CSV
            </button>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Print
            </button>
          </div>
        </section>

        {/* Student Matrix Table */}
        <StudentTable
          students={filteredStudents}
          attendance={attendance}
          dbPercentages={dbPercentages}
          onStatusChange={handleStatusChange}
          onRemarkChange={handleRemarkChange}
          onDeleteStudent={handleDeleteStudent}
        />
      </main>

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {isAddStudentOpen && (
        <AddStudentModal
          isOpen={isAddStudentOpen}
          onClose={() => setIsAddStudentOpen(false)}
          onAdd={handleAddStudent}
          onAddStudent={handleAddStudent}
        />
      )}
    </div>
  );
}