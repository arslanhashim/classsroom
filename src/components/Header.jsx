import React, { useState } from 'react';
import { User, X, Code2, GraduationCap, Mail, ShieldCheck } from 'lucide-react';

export default function Header() {
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  return (
    <>
      <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white sticky top-0 z-40 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            
            {/* Logo Container */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-md border border-orange-200 flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="Thal University Bhakkar Logo" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }} 
              />
              <div className="w-full h-full bg-orange-600 rounded-lg hidden items-center justify-center text-white font-black text-xs">
                TUB
              </div>
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-wide uppercase leading-tight">
                Classroom
              </h1>
              <p className="text-xs text-orange-100 font-medium tracking-wider">
                Thal University Bhakkar • Attendance Portal
              </p>
            </div>
          </div>

          {/* Developer Profile Trigger Button with Photo */}
          <button
            onClick={() => setIsDevModalOpen(true)}
            className="p-1.5 sm:px-3 sm:py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-all duration-150 flex items-center gap-2 active:scale-95 border border-white/20 shadow-sm"
            title="Developer Info"
          >
            <div className="w-7 h-7 rounded-full bg-white text-orange-600 overflow-hidden flex items-center justify-center font-black text-xs shadow-sm border border-white/40 flex-shrink-0">
              <img 
                src="/arsalan.jpg" 
                alt="Arsalan Hashim" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <span className="hidden items-center justify-center w-full h-full bg-orange-600 text-white text-[10px]">AH</span>
            </div>
            <span className="hidden sm:inline font-semibold">Developer</span>
          </button>
        </div>
      </header>

      {/* Developer Info Modal */}
      {isDevModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white p-6 relative">
              <button 
                onClick={() => setIsDevModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white text-orange-600 overflow-hidden flex items-center justify-center font-black text-2xl shadow-lg border-2 border-white/40 flex-shrink-0">
                  <img 
                    src="/arsalan.jpg" 
                    alt="Arsalan Hashim" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <span className="hidden items-center justify-center w-full h-full bg-orange-600 text-white text-lg">AH</span>
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-wide">Arsalan Hashim</h3>
                  <p className="text-xs text-orange-100 font-medium">Full Stack Web and Developer</p>
                </div>
              </div>
            </div>

            {/* Body Info */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800">University Student</span>
                    <span>BS Information Technology • Thal University Bhakkar</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800">Specialization</span>
                    <span>React, Node.js, TypeScript, Supabase & Flutter</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800">Project Status</span>
                    <span>Production Grade Smart Classroom Portal v2.0</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <p className="text-[11px] text-slate-400 font-medium">
                  Designed & Developed with precision for Thal University Bhakkar academic operations.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDevModalOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}