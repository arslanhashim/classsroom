import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase Initialization Warning]: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Helper Utilities

/**
 * Validates standard UUID v4 strings.
 * @param {string|null|undefined} str
 * @returns {boolean}
 */
export const isValidUuid = (str) =>
  Boolean(str) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());

/**
 * Retrieves active authenticated user ID from local session cache or remote auth API.
 * @returns {Promise<string|null>}
 */
export async function getAuthenticatedUserId() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth Error]: Failed to retrieve user session:', error.message);
      return null;
    }
    return session?.user?.id || null;
  } catch (err) {
    console.error('[Auth Exception]: Unexpected auth extraction failure:', err);
    return null;
  }
}

// Realtime Subscriptions

/**
 * Realtime Subscription Helper.
 * @param {string} userId - Authenticated user ID to filter scope.
 * @param {Function} onUpdate - Callback payload dispatch handler.
 * @returns {import('@supabase/supabase-js').RealtimeChannel | null}
 */
export function subscribeToAttendanceUpdates(userId, onUpdate) {
  if (!userId) {
    console.warn('[Realtime Skip]: Skipping channel creation - unauthenticated user scope.');
    return null;
  }

  const channelName = `realtime_user_${userId}_${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance_records',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate({ type: 'ATTENDANCE', payload })
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'students',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate({ type: 'STUDENTS', payload })
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime Connected]: Isolated channel active for user ${userId}.`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime Error]: Failed joining realtime channel:', err);
      }
    });

  return channel;
}

/**
 * Safely removes active realtime subscription channel.
 * @param {import('@supabase/supabase-js').RealtimeChannel} channel
 */
export async function unsubscribeChannel(channel) {
  if (channel) {
    try {
      await supabase.removeChannel(channel);
    } catch (err) {
      console.error('[Realtime Cleanup Error]: Failed removing channel:', err);
    }
  }
}

// Department, Class & Student Data Services

/**
 * Fetches departments associated with the user session.
 */
export async function fetchDepartments() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    const { data, error } = await supabase
      .from('departments')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Data Fetch Error]: fetchDepartments failed:', err.message || err);
    return [];
  }
}

/**
 * Fetches classes associated with a department.
 * @param {string} departmentId
 */
export async function fetchClassesByDepartment(departmentId) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId || !isValidUuid(departmentId)) return [];

    const { data, error } = await supabase
      .from('classes')
      .select('id, name, semester, section, session_years, department_id, created_at')
      .eq('department_id', departmentId)
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Data Fetch Error]: fetchClassesByDepartment failed:', err.message || err);
    return [];
  }
}

/**
 * Fetches student roster strictly filtered by Class ID and User ID.
 * Maps database 'full_name' -> frontend 'name' & 'roll_no' -> 'rollNo'.
 * @param {string} classId
 */
export async function fetchStudentsByClass(classId) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId || !isValidUuid(classId)) return [];

    const { data, error } = await supabase
      .from('students')
      .select('id, roll_no, full_name, email, department_id, class_id, created_at')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .order('roll_no', { ascending: true });

    if (error) throw error;

    return (data || []).map((s) => ({
      id: s.id,
      rollNo: s.roll_no || '',
      name: s.full_name || '', // Explicit mapping prevents UUID issue
      email: s.email || '',
      departmentId: s.department_id,
      classId: s.class_id,
      createdAt: s.created_at,
    }));
  } catch (err) {
    console.error('[Data Fetch Error]: fetchStudentsByClass failed:', err.message || err);
    return [];
  }
}

// Backward compatibility alias
export const fetchStudentsByDepartment = fetchStudentsByClass;

/**
 * Inserts or updates a single student record ensuring proper class_id and user_id binding.
 */
export async function addStudentToSupabase({ id, rollNo, name, email, departmentId, classId }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: 'Authentication required.' };

    const cleanRollNo = String(rollNo || '').trim();
    const cleanName = String(name || '').trim();

    if (!cleanRollNo || !cleanName) {
      return { success: false, error: 'Roll number and full name are required fields.' };
    }

    if (!isValidUuid(classId)) {
      return { success: false, error: 'Valid Class selection is required to link the student.' };
    }

    const studentId = id ? String(id).trim() : `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = {
      id: studentId,
      roll_no: cleanRollNo,
      full_name: cleanName,
      email: email ? String(email).trim().toLowerCase() : null,
      department_id: isValidUuid(departmentId) ? departmentId : null,
      class_id: classId,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('students')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) throw error;

    return { 
      success: true, 
      data: {
        id: data[0].id,
        rollNo: data[0].roll_no,
        name: data[0].full_name,
        email: data[0].email,
        departmentId: data[0].department_id,
        classId: data[0].class_id
      } 
    };
  } catch (err) {
    console.error('[Database Mutation Error]: addStudentToSupabase failed:', err.message || err);
    return { success: false, error: err.message || 'Operation failed.' };
  }
}

/**
 * Inserts multiple students in batch (for CSV import) linked to a specific class and user.
 */
export async function addStudentsBulkToSupabase(studentsList, classId, departmentId = null) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: 'Authentication required.' };

    if (!isValidUuid(classId)) {
      return { success: false, error: 'Valid Class ID is required for bulk import.' };
    }

    const rows = studentsList.map((s, index) => ({
      id: s.id || `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${index}`,
      roll_no: String(s.rollNo || s.roll_no || '').trim(),
      full_name: String(s.name || s.full_name || '').trim(),
      email: s.email ? String(s.email).trim().toLowerCase() : null,
      department_id: isValidUuid(departmentId) ? departmentId : null,
      class_id: classId,
      user_id: userId,
    })).filter(s => s.roll_no && s.full_name);

    if (rows.length === 0) {
      return { success: false, error: 'No valid student records found to import.' };
    }

    const { data, error } = await supabase
      .from('students')
      .upsert(rows, { onConflict: 'id' })
      .select();

    if (error) throw error;

    return { success: true, count: rows.length, data };
  } catch (err) {
    console.error('[Bulk Import Error]: addStudentsBulkToSupabase failed:', err.message || err);
    return { success: false, error: err.message || 'Bulk operation failed.' };
  }
}

// Course & Timetable Services

/**
 * Fetches courses linked to authenticated user and optional class filter.
 * @param {string} [classId]
 */
export async function fetchCourses(classId = null) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    let query = supabase
      .from('courses')
      .select('id, course_code, course_name, department_id, class_id')
      .eq('user_id', userId);

    if (classId && isValidUuid(classId)) {
      query = query.eq('class_id', classId);
    }

    const { data, error } = await query.order('course_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Data Fetch Error]: fetchCourses failed:', err.message || err);
    return [];
  }
}

/**
 * Fetches class timetable schedules.
 * @param {string} classId
 */
export async function fetchClassTimetable(classId) {
  if (!classId || !isValidUuid(classId)) return [];

  try {
    const { data, error } = await supabase
      .from('timetable_slots')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        classes:class_id (
          id,
          semester,
          section,
          session_years,
          departments ( id, name )
        ),
        courses:course_id ( id, course_code, course_name ),
        instructors:instructor_id ( id, full_name, email )
      `)
      .eq('class_id', classId);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[Data Fetch Error]: fetchClassTimetable failed:', err.message || err);
    return [];
  }
}

// Attendance Management Services

/**
 * Fetches attendance records for a course on a given class date.
 * @param {string} courseId
 * @param {string} classDate - ISO date string (YYYY-MM-DD)
 */
export async function fetchAttendanceForSession(courseId, classDate) {
  if (!courseId || !classDate) return {};

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return {};

    let query = supabase
      .from('attendance_records')
      .select('student_id, status, remark')
      .eq('class_date', classDate)
      .eq('user_id', userId);

    if (isValidUuid(courseId)) {
      query = query.eq('course_id', courseId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).reduce((acc, curr) => {
      acc[curr.student_id] = {
        status: curr.status,
        remark: curr.remark || '',
      };
      return acc;
    }, {});
  } catch (err) {
    console.error('[Data Fetch Error]: fetchAttendanceForSession failed:', err.message || err);
    return {};
  }
}

/**
 * Syncs attendance records in batch into public.attendance_records.
 */
export async function syncAttendanceToSupabase({ courseId, classDate, records, sessionId = null }) {
  if (!records || Object.keys(records).length === 0) return { success: true };

  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: 'User is not authenticated.' };

    if (!isValidUuid(courseId)) {
      return { success: false, error: 'Valid UUID courseId is required for attendance operations.' };
    }

    const validStatuses = new Set(['P', 'A', 'L', 'E']);

    const rows = Object.entries(records).map(([studentId, record]) => ({
      student_id: String(studentId),
      course_id: courseId,
      class_date: classDate,
      status: validStatuses.has(record.status) ? record.status : 'P',
      remark: record.remark ? String(record.remark).trim() : null,
      session_id: isValidUuid(sessionId) ? sessionId : null,
      updated_at: new Date().toISOString(),
      user_id: userId,
    }));

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(rows, { onConflict: 'student_id,course_id,class_date' })
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (err) {
    console.error('[Sync Error]: syncAttendanceToSupabase failed:', err.message || err);
    return { success: false, error: err.message || 'Attendance sync failed.' };
  }
}