import { supabase } from '../utils/supabaseClient';

/**
 * Validates whether a string matches standard UUID v4 formatting.
 */
const isValidUuid = (str) => {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
};

/**
 * Generates a deterministic course code slug to prevent database conflicts.
 */
function generateCourseCode(courseName) {
  const baseSlug = String(courseName)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 10);

  let hash = 0;
  for (let i = 0; i < courseName.length; i++) {
    hash = (hash << 5) - hash + courseName.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).toUpperCase().slice(0, 4);

  return `${baseSlug || 'COURSE'}-${hexHash}`;
}

/**
 * Resolves a course name or UUID string into a verified Supabase UUID safely.
 */
export async function getOrCreateCourseId(courseIdentifier) {
  if (!courseIdentifier) return null;
  const cleanInput = String(courseIdentifier).trim();

  if (isValidUuid(cleanInput)) return cleanInput;

  try {
    const { data: existing, error: findError } = await supabase
      .from('courses')
      .select('id')
      .ilike('course_name', cleanInput)
      .maybeSingle();

    if (!findError && existing?.id) return existing.id;

    const generatedCode = generateCourseCode(cleanInput);

    const { data: upserted, error: upsertError } = await supabase
      .from('courses')
      .upsert(
        [{ course_code: generatedCode, course_name: cleanInput }],
        { onConflict: 'course_code' }
      )
      .select('id')
      .single();

    if (!upsertError && upserted?.id) return upserted.id;

    const { data: fallback } = await supabase
      .from('courses')
      .select('id')
      .eq('course_code', generatedCode)
      .maybeSingle();

    if (fallback?.id) return fallback.id;

  } catch (err) {
    console.error('Critical failure resolving course ID:', err);
  }

  return null;
}

/**
 * Gets or creates an attendance session for a specific course and date.
 */
async function getOrCreateSessionId(courseId, date) {
  if (!courseId || !date) return null;
  try {
    const { data: existingSession, error: fetchErr } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('course_id', courseId)
      .eq('session_date', date)
      .maybeSingle();

    if (!fetchErr && existingSession?.id) {
      return existingSession.id;
    }

    const { data: newSession, error: createErr } = await supabase
      .from('attendance_sessions')
      .insert([{ course_id: courseId, session_date: date }])
      .select('id')
      .single();

    if (!createErr && newSession?.id) {
      return newSession.id;
    }

    const { data: fallback } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('course_id', courseId)
      .eq('session_date', date)
      .maybeSingle();

    return fallback?.id || null;
  } catch (err) {
    console.error('Failed resolving attendance session:', err);
    return null;
  }
}

/**
 * Synchronizes student attendance state directly to Supabase.
 */
export async function syncAttendanceToDB(attendanceMap, classOrCourse, courseOrDate, dateParam) {
  let courseInput = null;
  let date = null;

  if (dateParam !== undefined) {
    courseInput = courseOrDate;
    date = dateParam;
  } else {
    courseInput = classOrCourse;
    date = courseOrDate;
  }

  if (!attendanceMap || !courseInput || !date) {
    return { success: false, error: 'Missing or invalid parameters (attendanceMap, course, or date).' };
  }

  const studentEntries = Object.entries(attendanceMap);
  if (studentEntries.length === 0) return { success: true, data: [] };

  try {
    const courseId = await getOrCreateCourseId(courseInput);
    if (!courseId) throw new Error(`Failed to resolve system UUID for course: "${courseInput}"`);

    const sessionId = await getOrCreateSessionId(courseId, date);

    const studentIdentifiers = studentEntries.map(([id]) => String(id).trim());

    const { data: dbStudents, error: fetchStudentsErr } = await supabase
      .from('students')
      .select('id, roll_no')
      .in('roll_no', studentIdentifiers);

    if (fetchStudentsErr) throw fetchStudentsErr;

    const rollNoToUuidMap = {};
    dbStudents?.forEach((s) => {
      rollNoToUuidMap[s.roll_no] = s.id;
      rollNoToUuidMap[s.id] = s.id;
    });

    const attendancePayload = studentEntries.map(([studentId, record]) => {
      const cleanKey = String(studentId).trim();
      const resolvedStudentUuid = rollNoToUuidMap[cleanKey] || cleanKey;
      const isObj = typeof record === 'object' && record !== null;

      return {
        student_id: resolvedStudentUuid,
        course_id: courseId,
        session_id: sessionId,
        class_date: date,
        status: isObj ? record.status || 'P' : record || 'P',
        remark: isObj ? record.remark || '' : '',
        updated_at: new Date().toISOString()
      };
    });

    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(attendancePayload, { onConflict: 'student_id, course_id, class_date' })
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Database sync failure:', error);
    return { success: false, error: error.message || 'Unknown database error occurred.' };
  }
}

/**
 * Retrieves attendance records for a course on a given date.
 */
export async function fetchAttendanceForCourse(classOrCourse, courseOrDate, dateParam) {
  let courseInput = null;
  let date = null;

  if (dateParam !== undefined) {
    courseInput = courseOrDate;
    date = dateParam;
  } else {
    courseInput = classOrCourse;
    date = courseOrDate;
  }

  if (!courseInput || !date) {
    return {};
  }

  try {
    const courseId = await getOrCreateCourseId(courseInput);
    if (!courseId) return {};

    const { data, error } = await supabase
      .from('attendance_records')
      .select('student_id, status, remark')
      .eq('course_id', courseId)
      .eq('class_date', date);

    if (error) throw error;

    const map = {};
    if (Array.isArray(data)) {
      data.forEach((row) => {
        map[row.student_id] = {
          status: row.status,
          remark: row.remark || ''
        };
      });
    }
    return map;
  } catch (error) {
    console.error('Failed to fetch attendance records:', error);
    return {};
  }
}

/**
 * Fetches the list of registered students for a specific course/class.
 */
export async function fetchStudentsForCourseList(courseInput) {
  try {
    const { data: students, error: studError } = await supabase
      .from('students')
      .select('*');

    if (studError) throw studError;
    return students || [];
  } catch (error) {
    console.error('Failed to fetch students list:', error);
    return [];
  }
}

/**
 * Fetches students filtered by specific class/department ID (Added for App.jsx sync).
 */
export async function fetchStudentsByClass(classId) {
  if (!classId) return [];
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('department_id', classId);

    if (error) throw error;
    return students || [];
  } catch (error) {
    console.error('Failed to fetch students by class:', error);
    return [];
  }
}

/**
 * Computes historical aggregate attendance percentages per student.
 */
export async function fetchCoursePercentages(classId, courseInput) {
  const targetCourse = courseInput || classId;
  if (!targetCourse) return [];

  try {
    const courseId = await getOrCreateCourseId(targetCourse);
    if (!courseId) return [];

    const { data: viewData, error: viewError } = await supabase
      .from('student_attendance_summary')
      .select('student_id, total_classes, percentage')
      .eq('course_id', courseId);

    if (!viewError && Array.isArray(viewData) && viewData.length > 0) {
      return viewData.map((row) => ({
        student_id: String(row.student_id),
        total_classes: Number(row.total_classes) || 0,
        percentage: Number(row.percentage) || 0
      }));
    }

    const { data: rawData, error: rawError } = await supabase
      .from('attendance_records')
      .select('student_id, status')
      .eq('course_id', courseId);

    if (rawError || !Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    const studentStats = rawData.reduce((acc, record) => {
      const id = String(record.student_id);
      if (!acc[id]) acc[id] = { total: 0, present: 0 };

      acc[id].total += 1;
      if (record.status === 'P' || record.status === 'L') {
        acc[id].present += 1;
      }

      return acc;
    }, {});

    return Object.entries(studentStats).map(([studentId, stats]) => ({
      student_id: studentId,
      total_classes: stats.total,
      percentage: stats.total > 0 ? Number(((stats.present / stats.total) * 100).toFixed(2)) : 100
    }));

  } catch (error) {
    console.error('Failed to fetch course percentages:', error);
    return [];
  }
}

/**
 * Imports multiple students from a CSV text content. 
 */
export async function importStudentsFromCSV(csvText, courseInput) {
  if (!csvText || !courseInput) {
    return { success: false, error: 'CSV file text and course are required.' };
  }

  try {
    const courseId = await getOrCreateCourseId(courseInput);
    if (!courseId) throw new Error('Could not resolve course for import.');

    const lines = csvText.split(/\r?\n/);
    const studentsToInsert = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map((p) => p.trim());
      const rollNo = parts[0];
      const fullName = parts[1] || `Student ${rollNo}`;

      if (i === 0 && (rollNo.toLowerCase() === 'roll_no' || rollNo.toLowerCase() === 'roll no' || rollNo.toLowerCase() === 'rollno')) {
        continue;
      }

      if (rollNo) {
        studentsToInsert.push({
          roll_no: rollNo,
          full_name: fullName
        });
      }
    }

    if (studentsToInsert.length === 0) {
      return { success: false, error: 'No valid student records found in the CSV file.' };
    }

    const { data, error } = await supabase
      .from('students')
      .upsert(studentsToInsert, { onConflict: 'roll_no', ignoreDuplicates: false })
      .select('id, roll_no');

    if (error) throw error;

    return { success: true, count: data?.length || studentsToInsert.length };
  } catch (error) {
    console.error('CSV import failure:', error);
    return { success: false, error: error.message || 'Failed to import students from CSV.' };
  }
}