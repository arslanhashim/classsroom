// Dynamic Key Generator for Multi-Tenant Isolation
const getScopedKey = (baseKey, userId) => {
  if (!userId) return null;
  return `${baseKey}_${userId}`;
};

const BASE_KEYS = {
  SETTINGS: 'classroom_settings_v2',
  STUDENTS: 'classroom_students_v2',
  ATTENDANCE: 'classroom_attendance_records_v2',
};

export const defaultSettings = {
  className: '',
  classId: '',
  departmentId: '',
  teacherName: '',
  teacherPhone: '',
};

/**
 * Safely parses JSON string with fallback default value.
 */
function safeJsonParse(jsonString, fallback) {
  try {
    return jsonString ? JSON.parse(jsonString) : fallback;
  } catch (err) {
    console.error('Failed parsing stored local JSON key:', err);
    return fallback;
  }
}

/**
 * Retrieves persisted classroom settings scoped to active user.
 */
export const getStoredSettings = (userId) => {
  if (typeof window === 'undefined' || !userId) return defaultSettings;
  const key = getScopedKey(BASE_KEYS.SETTINGS, userId);
  const data = localStorage.getItem(key);
  return safeJsonParse(data, defaultSettings);
};

/**
 * Persists user configuration settings to local storage under user ID.
 */
export const saveStoredSettings = (settings, userId) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = getScopedKey(BASE_KEYS.SETTINGS, userId);
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (err) {
    console.error('Error saving settings to storage:', err);
  }
};

/**
 * Retrieves cached student list scoped to active user (defaults to empty array for new users).
 */
export const getStoredStudents = (userId) => {
  if (typeof window === 'undefined' || !userId) return [];
  const key = getScopedKey(BASE_KEYS.STUDENTS, userId);
  const data = localStorage.getItem(key);
  return safeJsonParse(data, []);
};

/**
 * Saves current student roster locally under active user ID.
 */
export const saveStoredStudents = (students, userId) => {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = getScopedKey(BASE_KEYS.STUDENTS, userId);
    localStorage.setItem(key, JSON.stringify(students));
  } catch (err) {
    console.error('Error saving students to storage:', err);
  }
};

/**
 * Retrieves cached attendance records for a given date/course key scoped to active user.
 */
export const getStoredAttendance = (storageKey, userId) => {
  if (typeof window === 'undefined' || !storageKey || !userId) return {};
  const userAttendanceKey = getScopedKey(BASE_KEYS.ATTENDANCE, userId);
  const all = safeJsonParse(localStorage.getItem(userAttendanceKey), {});
  return all[storageKey] || {};
};

/**
 * Saves attendance records locally under a date/course key scoped to active user.
 */
export const saveStoredAttendance = (storageKey, records, userId) => {
  if (typeof window === 'undefined' || !storageKey || !userId) return;
  try {
    const userAttendanceKey = getScopedKey(BASE_KEYS.ATTENDANCE, userId);
    const all = safeJsonParse(localStorage.getItem(userAttendanceKey), {});
    all[storageKey] = records;
    localStorage.setItem(userAttendanceKey, JSON.stringify(all));
  } catch (err) {
    console.error('Error saving attendance records:', err);
  }
};