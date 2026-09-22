import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from './components/Header';
import ClassStats from './components/ClassStats';
import StudentTable from './components/StudentTable';
import SettingsModal from './components/SettingsModal';
import AddStudentModal from './components/AddStudentModal';

import AuthModal from './components/AuthModal';

import { 
  getStoredSettings, 
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
  addStudentToSupabase ,
  addStudentsBulkToSupabase
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
  Trash2,
  WifiOff,
  MoreVertical,
  X,
  CheckCircle2,
  AlertCircle,
  Info
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

// ---------------------------------------------------------------------------
// Lightweight toast/notification system.
// Replaces blocking window.alert() calls with a non-blocking, dismissable
// banner so a teacher marking attendance mid-class isn't interrupted by a
// modal dialog they have to click through.
// ---------------------------------------------------------------------------
function useToast() {
  const [toast, setToast] = useState(null); // { message, type } | null
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type });
    timeoutRef.current = setTimeout(() => setToast(null), duration);
  }, []);

  const dismissToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  return { toast, showToast, dismissToast };
}

function ToastBanner({ toast, onDismiss }) {
  if (!toast) return null;

  const styles = {
    success: { bg: 'bg-emerald-600', icon: CheckCircle2 },
    error: { bg: 'bg-rose-600', icon: AlertCircle },
    info: { bg: 'bg-slate-800', icon: Info },
  };
  const { bg, icon: Icon } = styles[toast.type] || styles.info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-50 ${bg} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2.5 max-w-[92vw] sm:max-w-md`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-medium leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 -mr-1 p-1 rounded-full hover:bg-white/15 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
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

  const [settings, setSettings] = useState(() => getStoredSettings(null));
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [dbPercentages, setDbPercentages] = useState([]);
  const [isSavingToDB, setIsSavingToDB] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isOnline = useOnlineStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const { toast, showToast, dismissToast } = useToast();

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
      serialNo: index + 1,
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

  // Let the teacher know the moment connectivity drops or returns —
  // this is the visible half of "offline-first"; the actual local-first
  // queue/sync layer still needs to live in storage.js (see notes below).
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (prevOnlineRef.current !== isOnline) {
      if (!isOnline) {
        showToast('You are offline. Attendance is being saved on this device and will sync when you reconnect.', 'info', 5000);
      } else {
        showToast('Back online.', 'success', 2000);
      }
      prevOnlineRef.current = isOnline;
    }
  }, [isOnline, showToast]);

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
      showToast(`Department "${data[0].name}" created.`, 'success');
    } else {
      showToast('Failed to create department: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  const handleDeleteDepartment = async (deptId) => {
    const dept = departments.find((d) => d.id === deptId);
    const label = dept?.name || 'this department';
    if (!window.confirm(`Delete "${label}"?\n\nThis will also delete every class, subject, and attendance record under it. This cannot be undone.`)) {
      return;
    }
    
    const { error } = await supabase.from('departments').delete().eq('id', deptId);
    if (!error) {
      setDepartments(departments.filter(d => d.id !== deptId));
      if (selectedDeptId === deptId) {
        setSelectedDeptId('');
        setClasses([]);
        setStudents([]);
      }
      showToast(`"${label}" deleted.`, 'info');
    } else {
      showToast('Failed to delete department: ' + error.message, 'error');
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
        semester: 'Spring', 
        user_id: user.id 
      }])
      .select();

    if (!error && data) {
      setClasses([...classes, data[0]]);
      setSelectedClassId(data[0].id);
      setNewClassName('');
      showToast(`Class "${data[0].name}" created.`, 'success');
    } else {
      showToast('Failed to create class: ' + (error?.message || 'Unknown error'), 'error');
    }
  };

  const handleDeleteClass = useCallback(async (classId) => {
    const cls = classes.find((c) => c.id === classId);
    const label = cls?.name || 'this class';
    if (!window.confirm(`Delete "${label}"?\n\nThis will also delete its subjects, roster, and attendance history. This cannot be undone.`)) {
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
        showToast('Error deleting class: ' + error.message, 'error');
        return;
      }
    }
    showToast(`"${label}" deleted.`, 'info');
  }, [isOnline, selectedClassId, user, classes, showToast]);

  const handleAddCourse = async (courseName, instructorName = '') => {
    if (!selectedClassId || !selectedDeptId) {
      showToast('Please select a department and class first.', 'error');
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
        instructor_name: instructorName.trim(),
        course_code: generatedCode,
        user_id: user?.id 
      }])
      .select();

    if (!error && data) {
      setCourses([...courses, data[0]]);
      setSelectedCourseId(data[0].id);
      showToast(`Subject "${data[0].course_name}" added.`, 'success');
    } else {
      showToast('Error adding course: ' + (error?.message || 'Unknown'), 'error');
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
    } else {
      showToast('Error deleting subject: ' + error.message, 'error');
    }
  };

  // Remote Attendance fetching
  useEffect(() => {
    if (!user?.id) return;
    const currentFetchId = ++activeFetchId.current;
    const cachedData = getStoredAttendance(attendanceStorageKey, user.id);
    setAttendance(cachedData);
    setHasUnsavedChanges(false);

    if (isOnline && selectedClassId && selectedCourseId && selectedDate) {
      fetchAttendanceForCourse(selectedClassId, selectedCourseId, selectedDate)
        .then((dbAttendance) => {
          if (currentFetchId === activeFetchId.current && dbAttendance && Object.keys(dbAttendance).length > 0) {
            const merged = { ...cachedData, ...dbAttendance };
            setAttendance(merged);
            saveStoredAttendance(attendanceStorageKey, merged, user.id);
          }
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
      showToast('You are offline — attendance is saved on this device and will sync automatically once you reconnect.', 'info', 5000);
      return;
    }
    if (!selectedClassId || !selectedCourseId) {
      showToast('Please select both a Class and a Subject before saving.', 'error');
      return;
    }

    setIsSavingToDB(true);
    try {
      const result = await syncAttendanceToDB(attendance, selectedClassId, selectedCourseId, selectedDate);
      if (result.success) {
        await loadAggregatePercentages();
        setHasUnsavedChanges(false);
        showToast('Attendance saved successfully.', 'success');
      } else {
        showToast('Failed to save: ' + result.error, 'error');
      }
    } finally {
      setIsSavingToDB(false);
    }
  };

  const updateAttendanceState = useCallback((newAttendancePayload) => {
    setAttendance(newAttendancePayload);
    setHasUnsavedChanges(true);
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
    showToast('All students marked present. Remember to save.', 'info', 2500);
  }, [attendance, students, updateAttendanceState, showToast]);

  // Single Student Addition
  const handleAddStudent = useCallback(async (newStudent) => {
    if (!user?.id || !selectedDeptId || !selectedClassId || !studentCacheKey) {
      showToast('Please select a Department and Class first!', 'error');
      return;
    }

    const rollNoStr = String(newStudent.rollNo || '').trim();
    const nameStr = String(newStudent.name || '').trim();

    if (!rollNoStr || !nameStr) {
      showToast('Roll Number and Student Name are required.', 'error');
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
      showToast(`${nameStr} added to the roster.`, 'success');
    } else {
      showToast('Failed to add student: ' + result.error, 'error');
    }
  }, [user, selectedDeptId, selectedClassId, studentCacheKey, showToast]);

  // Bulk Students Addition using Chunked Batch Upsert
  const handleBulkAddStudents = useCallback(async (studentsArray) => {
    if (!user?.id || !selectedDeptId || !selectedClassId || !studentCacheKey) {
      showToast('Please select a Department and Class first!', 'error');
      return 0;
    }

    // Call the optimized batch helper
    const result = await addStudentsBulkToSupabase(studentsArray, selectedClassId, selectedDeptId);

    if (result.success) {
      const freshRoster = await fetchStudentsByClass(selectedClassId);
      const formatted = normalizeStudentData(freshRoster);
      setStudents(formatted);
      localStorage.setItem(studentCacheKey, JSON.stringify(formatted));
      showToast(`${result.count} student(s) imported.`, 'success');
      return result.count;
    } else {
      showToast('Bulk import failed: ' + result.error, 'error');
      return 0;
    }
  }, [user, selectedDeptId, selectedClassId, studentCacheKey, showToast]);

  const handleDeleteStudent = useCallback(async (id) => {
    if (!user?.id || !studentCacheKey) return;
    const student = students.find((s) => s.id === id);
    const label = student ? `${student.name} (${student.rollNo})` : 'this student';
    if (!window.confirm(`Remove ${label} from the roster?\n\nTheir past attendance records will remain, but they'll no longer appear in this class.`)) {
      return;
    }

    setStudents((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      const reindexed = normalizeStudentData(updated);
      localStorage.setItem(studentCacheKey, JSON.stringify(reindexed));
      return reindexed;
    });

    if (isOnline) {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) {
        showToast('Error removing student: ' + error.message, 'error');
        return;
      }
    }
    showToast(`${label} removed.`, 'info');
  }, [isOnline, user, studentCacheKey, students, showToast]);

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

  // Secondary/utility actions, shared between the desktop row and the
  // mobile "More" menu so they never drift out of sync.
  const secondaryActions = [
    {
      key: 'mark-all',
      label: 'Mark All Present',
      icon: Check,
      onClick: handleMarkAllPresent,
      classNameDesktop: 'border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700',
    },
    {
      key: 'add-student',
      label: 'Add Student',
      icon: UserPlus,
      onClick: () => setIsAddStudentOpen(true),
      classNameDesktop: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    },
    {
      key: 'whatsapp',
      label: 'Share to WhatsApp',
      icon: Share2,
      onClick: () => shareToWhatsApp({ course: selectedCourseId }, selectedDate, students, attendance),
      classNameDesktop: 'border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700',
    },
    {
      key: 'export-csv',
      label: 'Export CSV',
      icon: FileSpreadsheet,
      onClick: () => exportToCSV(`class_${selectedClassId}_${selectedCourseId}`, selectedDate, students, attendance),
      classNameDesktop: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    },
    {
      key: 'print',
      label: 'Print',
      icon: Printer,
      onClick: () => window.print(),
      classNameDesktop: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 antialiased">
      <Header onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Offline banner — always visible while disconnected, never silent */}
      {!isOnline && (
        <div className="no-print bg-amber-500 text-white text-xs sm:text-sm font-semibold text-center py-2 px-4 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>You're offline. Attendance is being saved on this device and will sync when you're back online.</span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* User Session Bar */}
        <section className="no-print flex justify-between items-center bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-600 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span className="truncate">Teacher Account: <strong className="text-slate-900">{user.email}</strong></span>
          </div>
          <button
            onClick={signOutTeacher}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 flex-shrink-0"
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
                  className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">-- Choose Department --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {selectedDeptId && (
                  <button
                    onClick={() => handleDeleteDepartment(selectedDeptId)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors flex-shrink-0"
                    title="Delete Department"
                    aria-label="Delete selected department"
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
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                />
                <button type="submit" className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1 flex-shrink-0">
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
                  className="flex-1 min-w-0 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.semester ? `(${c.semester})` : ''}</option>
                  ))}
                </select>
                {selectedClassId && (
                  <button
                    onClick={() => handleDeleteClass(selectedClassId)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors flex-shrink-0"
                    title="Delete Class"
                    aria-label="Delete selected class"
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
                  className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none disabled:opacity-50"
                />
                <button type="submit" disabled={!selectedDeptId} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50 flex-shrink-0">
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

        {/* Search */}
        <section className="no-print">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student by roll no or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 focus:border-orange-500 rounded-xl text-sm focus:outline-none shadow-sm"
            />
          </div>
        </section>

        {/* Action Toolbar — one clear primary action, secondary actions
            demoted to outline style, collapsed into a "More" menu on mobile
            so the row never wraps into a wall of buttons on a phone. */}
        <section className="no-print flex flex-col md:flex-row md:items-center md:justify-end gap-2">
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={handleSaveToDatabase}
              disabled={isSavingToDB}
              className="flex-1 md:flex-none justify-center px-4 py-3 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingToDB ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              {isSavingToDB ? 'Saving...' : 'Save Attendance to DB'}
              {hasUnsavedChanges && !isSavingToDB && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300" aria-label="Unsaved changes" />
              )}
            </button>

            {/* Mobile-only "More" trigger */}
            <button
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              className="md:hidden px-3.5 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-600 flex-shrink-0"
              aria-label="More actions"
              aria-expanded={isMoreMenuOpen}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop/tablet: full row of secondary actions */}
          <div className="hidden md:flex flex-wrap items-center gap-2 justify-end">
            {secondaryActions.map(({ key, label, icon: Icon, onClick, classNameDesktop }) => (
              <button
                key={key}
                onClick={onClick}
                className={`px-3.5 py-2.5 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-colors ${classNameDesktop}`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {/* Mobile: collapsible list, larger tap targets, one per row */}
          {isMoreMenuOpen && (
            <div className="md:hidden bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
              {secondaryActions.map(({ key, label, icon: Icon, onClick }) => (
                <button
                  key={key}
                  onClick={() => {
                    onClick();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full px-4 py-3.5 text-sm font-semibold text-slate-700 flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100"
                >
                  <Icon className="w-4 h-4 text-slate-500" /> {label}
                </button>
              ))}
            </div>
          )}
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
          onAddStudent={handleAddStudent}
          onBulkAdd={handleBulkAddStudents}
        />
      )}

      <ToastBanner toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
