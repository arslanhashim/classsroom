import { supabase } from './supabaseClient';

// Function to handle WhatsApp Sharing
export const shareToWhatsApp = (settings, selectedDate, students, attendance) => {
  const className = settings?.className || "BS IT 6th Semester";
  const courseName = settings?.courseName || "General Session";
  const teacherName = settings?.teacherName || "Instructor";

  let presentCount = 0;
  let absentCount = 0;
  const absentStudents = [];

  students.forEach(s => {
    const status = attendance[s.id]?.status || 'P';
    if (status === 'P' || status === 'L') {
      presentCount++;
    } else if (status === 'A') {
      absentCount++;
      absentStudents.push(`${s.rollNo} - ${s.name}`);
    }
  });

  const total = students.length;
  const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;

  let message = `*ATTENDANCE REPORT*\n`;
  message += `-------------------------\n`;
  message += `*Class:* ${className}\n`;
  message += `*Course:* ${courseName}\n`;
  message += `*Date:* ${selectedDate}\n`;
  message += `*Instructor:* ${teacherName}\n`;
  message += `-------------------------\n`;
  message += `*Total Students:* ${total}\n`;
  message += `*Present:* ${presentCount}\n`;
  message += `*Absent:* ${absentCount}\n`;
  message += `*Attendance Rate:* ${rate}%\n`;
  message += `-------------------------\n`;

  if (absentStudents.length > 0) {
    message += `*ABSENT STUDENTS LIST:*\n`;
    absentStudents.forEach((st, idx) => {
      message += `${idx + 1}. ${st}\n`;
    });
  } else {
    message += `*All students were present today! 🎉*\n`;
  }

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
};

/**
 * Robust Multi-Date Master Attendance Register CSV Export
 * Fully dynamic: Pulls all historical date records from Supabase, handling fallbacks gracefully.
 */
export const exportToCSV = async (className, courseId, students, currentAttendance, currentSelectedDate) => {
  if (!students || students.length === 0) {
    alert("No student data available to export.");
    return;
  }

  try {
    let allAttendanceRecords = [];
    const datesSet = new Set();

    if (currentSelectedDate) {
      datesSet.add(currentSelectedDate);
    }

    // Helper to check if a value is formatted like a date string (YYYY-MM-DD)
    const isDateString = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
    let validCourseId = (courseId && !isDateString(courseId)) ? courseId : null;

    // Smart Fallback: If courseId was passed as a date or missing, try fetching recent records globally or by student IDs
    if (!validCourseId) {
      console.info('[CSV Export Info]: Course ID was a date or missing. Attempting broad historical lookup...');
      const studentIds = students.map(s => s.id).filter(Boolean);
      
      if (studentIds.length > 0) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('attendance_records')
          .select('student_id, class_date, status, course_id')
          .in('student_id', studentIds)
          .limit(1000);

        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          allAttendanceRecords = fallbackData;
          fallbackData.forEach(row => {
            if (row.class_date) {
              datesSet.add(row.class_date);
            }
          });
        }
      }
    } else {
      // Standard fetch by course UUID
      const { data, error } = await supabase
        .from('attendance_records')
        .select('student_id, class_date, status')
        .eq('course_id', validCourseId);

      if (error) {
        console.warn('[CSV Export Warning]: Direct course record fetch failed, falling back to local state.', error.message);
      } else if (data && Array.isArray(data)) {
        allAttendanceRecords = data;
        data.forEach(row => {
          if (row.class_date) {
            datesSet.add(row.class_date);
          }
        });
      }
    }

    const sortedDates = Array.from(datesSet).sort((a, b) => new Date(a) - new Date(b));

    if (sortedDates.length === 0) {
      sortedDates.push(currentSelectedDate || new Date().toISOString().split('T')[0]);
    }

    const attendanceMap = {};

    // 1. Populate map with fetched historical database records
    allAttendanceRecords.forEach(rec => {
      if (!rec || !rec.student_id || !rec.class_date) return;
      if (!attendanceMap[rec.student_id]) {
        attendanceMap[rec.student_id] = {};
      }
      attendanceMap[rec.student_id][rec.class_date] = rec.status || 'P';
    });

    // 2. Merge/Override with active session state
    if (currentSelectedDate && currentAttendance) {
      Object.entries(currentAttendance).forEach(([studentId, val]) => {
        if (!attendanceMap[studentId]) {
          attendanceMap[studentId] = {};
        }
        const statusVal = typeof val === 'string' ? val : (val?.status || 'P');
        attendanceMap[studentId][currentSelectedDate] = statusVal;
      });
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    const headerRow = ["Roll No", "Student Name", ...sortedDates];
    csvContent += headerRow.map(h => `"${String(h).replace(/"/g, '""')}"`).join(",") + "\n";

    students.forEach(s => {
      const cleanRollNo = `"${String(s.rollNo || '').replace(/"/g, '""')}"`;
      const cleanName = `"${String(s.name || '').replace(/"/g, '""')}"`;
      
      const rowData = [cleanRollNo, cleanName];

      sortedDates.forEach(date => {
        const studentRecord = attendanceMap[s.id];
        const status = (studentRecord && studentRecord[date]) ? studentRecord[date] : '-';
        rowData.push(`"${status}"`);
      });

      csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Attendance_${String(className || 'Class').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    console.error('[CSV Export Critical Error]:', err);
    alert('Failed to export attendance sheet. Please check console for details.');
  }
};

// Dedicated Function for Triggering Printable PDF Window
export const triggerPDFPrint = () => {
  window.print();
};