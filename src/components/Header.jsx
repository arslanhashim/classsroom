import React from 'react';
import { Sliders } from 'lucide-react';

export default function Header({ onOpenSettings }) {
  return (
    <header className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white sticky top-0 z-40 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          
          {/* Logo Container loading directly from public/logo.png */}
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-md border border-orange-200 flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="Thal University Bhakkar Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                // Fallback seal if image is missing
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

        <button
          onClick={onOpenSettings}
          className="px-3.5 py-2 text-xs font-bold bg-white text-orange-600 hover:bg-orange-50 rounded-xl shadow-sm transition-all duration-150 flex items-center gap-2 active:scale-95"
        >
          <Sliders className="w-4 h-4 text-orange-600" />
          <span className="hidden sm:inline">Class Setup</span>
        </button>
      </div>
    </header>
  );
}