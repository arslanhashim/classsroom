import React, { useState } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { importStudentsFromCSV } from '../services/attendanceService';

export default function ImportStudentsModal({ isOpen, onClose, course, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage({ type: '', text: '' });
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a CSV file first.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvText = event.target.result;
      const result = await importStudentsFromCSV(csvText, course);
      
      setLoading(false);
      if (result.success) {
        setMessage({ type: 'success', text: `Successfully imported ${result.count} students!` });
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to import students.' });
      }
    };

    reader.onerror = () => {
      setLoading(false);
      setMessage({ type: 'error', text: 'Failed to read the file.' });
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center space-x-2 text-gray-800 font-semibold">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Import Students via CSV</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-gray-600">
            Upload a CSV file containing student roll numbers and names. Format should be:
            <pre className="bg-gray-100 p-2 rounded mt-1 text-xs text-gray-700">roll_no,full_name<br/>IT-01,Ali Ahmed<br/>IT-02,Fatima Noor</pre>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-emerald-500 transition-colors cursor-pointer">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange} 
              className="hidden" 
              id="csvFileinput"
            />
            <label htmlFor="csvFileinput" className="cursor-pointer flex flex-col items-center">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-700">
                {file ? file.name : 'Click to select CSV file'}
              </span>
              <span className="text-xs text-gray-400 mt-1">(.csv files only)</span>
            </label>
          </div>

          {message.text && (
            <div className={`p-3 rounded-lg text-sm flex items-center space-x-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={handleUpload}
              disabled={loading || !file}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}