// Function to handle WhatsApp Sharing
export const shareToWhatsApp = (settings, selectedDate, students, attendance) => {
  const className = settings?.className || "BS IT 6th Semester";
  const courseName = settings?.courseName || "General Session";
  const teacherName = settings?.teacherName || "Instructor";

  // Calculate quick stats
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

  // Format WhatsApp Text Report
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

  // Encode text for web URL
  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

  // Open in new window
  window.open(whatsappUrl, '_blank');
};

// Function to handle CSV Export
export const exportToCSV = (className, selectedDate, students, attendance) => {
  if (!students || students.length === 0) {
    alert("No student data available to export.");
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Roll No,Student Name,Status,Remarks\n";

  students.forEach(s => {
    const status = attendance[s.id]?.status || 'P';
    const remark = attendance[s.id]?.remark || '';
    const statusText = status === 'P' ? 'Present' : status === 'A' ? 'Absent' : 'Late';
    
    // Clean string values for CSV
    const cleanName = `"${s.name.replace(/"/g, '""')}"`;
    const cleanRemark = `"${remark.replace(/"/g, '""')}"`;
    
    csvContent += `${s.rollNo},${cleanName},${statusText},${cleanRemark}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Attendance_${className.replace(/\s+/g, '_')}_${selectedDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Dedicated Function for Triggering Printable PDF Window
export const triggerPDFPrint = () => {
  window.print();
};