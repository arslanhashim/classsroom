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

export const isValidUuid = (str) =>
  Boolean(str) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());

// Standard UUID v4 Generator for Database Primary Keys
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
      name: s.full_name || '',
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

export const fetchStudentsByDepartment = fetchStudentsByClass;

/**
 * Inserts or updates a single student record with explicit UUID & unique constraint handling.
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

    const payload = {
      id: isValidUuid(id) ? id : generateUUID(),
      roll_no: cleanRollNo,
      full_name: cleanName,
      email: email ? String(email).trim().toLowerCase() : null,
      department_id: isValidUuid(departmentId) ? departmentId : null,
      class_id: classId,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('students')
      .upsert([payload], { onConflict: 'user_id, roll_no' })
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
 * Inserts multiple students in robust chunks with auto-generated UUIDs and conflict handling.
 */
export async function addStudentsBulkToSupabase(studentsList, classId, departmentId = null) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, error: 'Authentication required.' };

    if (!isValidUuid(classId)) {
      return { success: false, error: 'Valid Class ID is required for bulk import.' };
    }

    const rows = studentsList.map((s) => ({
      id: isValidUuid(s.id) ? s.id : generateUUID(), // Guarantees valid UUID and satisfies NOT NULL constraint
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

    // Chunking: Send 10 students at a time to prevent network drop / ERR_CONNECTION_CLOSED
    const CHUNK_SIZE = 10;
    let totalInserted = 0;
    let allData = [];

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);

      const { data, error } = await supabase
        .from('students')
        .upsert(chunk, { onConflict: 'user_id, roll_no' })
        .select();

      if (error) {
        console.error(`[Bulk Chunk Error at index ${i}]:`, error.message);
        throw error;
      }

      if (data) {
        allData = allData.concat(data);
        totalInserted += chunk.length;
      }
    }

    return { success: true, count: totalInserted, data: allData };
  } catch (err) {
    console.error('[Bulk Import Error]: addStudentsBulkToSupabase failed:', err.message || err);
    return { success: false, error: err.message || 'Bulk operation failed.' };
  }
}

// Course & Timetable Services

export async function fetchCourses(classId = null) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return [];

    let query = supabase
      .from('courses')
      .select('id, course_code, course_name, instructor_name, department_id, class_id')
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