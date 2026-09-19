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
 * Synchronous execution avoids listener registration races in Supabase JS v2.
 *
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

// Department & Class Data Services

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
 * Fetches student roster matching public.students schema.
 * @param {string} [departmentId]
 */
export async function fetchStudentsByDepartment(departmentId = null) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    let query = supabase
      .from('students')
      .select('id, roll_no, full_name, email, department_id, created_at')
      .eq('user_id', userId);

    if (departmentId && isValidUuid(departmentId)) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query.order('roll_no', { ascending: true });

    if (error) throw error;

    return (data || []).map((s) => ({
      id: s.id,
      rollNo: s.roll_no,
      name: s.full_name,
      email: s.email || '',
      departmentId: s.department_id,
      createdAt: s.created_at,
    }));
  } catch (err) {
    console.error('[Data Fetch Error]: fetchStudentsByDepartment failed:', err.message || err);
    return [];
  }
}

export const fetchStudentsByClass = fetchStudentsByDepartment;

/**
 * Inserts or updates a student record in public.students.
 */
export async function addStudentToSupabase({ id, rollNo, name, email, departmentId }) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: 'Authentication required.' };

    if (!rollNo || !name) {
      return { success: false, error: 'Roll number and full name are required fields.' };
    }

    const studentId = id ? String(id).trim() : `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const payload = {
      id: studentId,
      roll_no: String(rollNo).trim(),
      full_name: String(name).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      department_id: isValidUuid(departmentId) ? departmentId : null,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('students')
      .upsert([payload], { onConflict: 'id' })
      .select();

    if (error) throw error;

    return { success: true, data: data[0] };
  } catch (err) {
    console.error('[Database Mutation Error]: addStudentToSupabase failed:', err.message || err);
    return { success: false, error: err.message || 'Operation failed.' };
  }
}

// Course & Timetable Services

/**
 * Fetches courses linked to authenticated user and optional department filter.
 * @param {string} [departmentId]
 */
export async function fetchCourses(departmentId = null) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    let query = supabase
      .from('courses')
      .select('id, course_code, course_name, department_id')
      .eq('user_id', userId);

    if (departmentId && isValidUuid(departmentId)) {
      query = query.eq('department_id', departmentId);
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
 *
 * @param {Object} params
 * @param {string} params.courseId - Course UUID
 * @param {string} params.classDate - Date string YYYY-MM-DD
 * @param {Record<string, {status: string, remark?: string}>} params.records - Map of student IDs to status payload
 * @param {string} [params.sessionId] - Attendance session UUID
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