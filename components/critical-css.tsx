"use client";

export function CriticalCSS() {
    return (
        <style dangerouslySetInnerHTML={{
            __html: `
        /* Critical CSS for immediate rendering */
        * { box-sizing: border-box; }
        
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Above-the-fold styles */
        .min-h-screen { min-height: 100vh; }
        .bg-\\[\\#81a8f8\\] { background-color: #81a8f8; }
        .p-2 { padding: 0.5rem; }
        .sm\\:p-4 { padding: 1rem; }
        .max-w-4xl { max-width: 56rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .sm\\:space-y-6 > * + * { margin-top: 1.5rem; }
        
        /* Typography */
        .text-center { text-align: center; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .sm\\:text-base { font-size: 1rem; line-height: 1.5rem; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .sm\\:text-\\[32px\\] { font-size: 2rem; line-height: 2.5rem; }
        .font-bold { font-weight: 700; }
        .text-black { color: rgb(0 0 0); }
        .text-slate-800 { color: rgb(30 41 59); }
        .text-slate-900 { color: rgb(15 23 42); }
        
        /* Layout */
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .gap-2 { gap: 0.5rem; }
        .sm\\:gap-4 { gap: 1rem; }
        .w-full { width: 100%; }
        .h-full { height: 100%; }
        
        /* Cards and containers */
        .border-black { border-color: rgb(0 0 0); }
        .border-2 { border-width: 2px; border-style: solid; }
        .rounded-md { border-radius: 0.375rem; }
        .bg-white { background-color: rgb(255 255 255); }
        .p-3 { padding: 0.75rem; }
        .sm\\:p-6 { padding: 1.5rem; }
        .p-4 { padding: 1rem; }
        
        /* Stats colors */
        .text-purple-700 { color: rgb(126 34 206); }
        .text-cyan-600 { color: rgb(8 145 178); }
        .text-blue-600 { color: rgb(37 99 235); }
        .text-gray-600 { color: rgb(75 85 99); }
        
        /* Buttons */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .sm\\:flex-row { flex-direction: row; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .flex-1 { flex: 1 1 0%; }
        .h-14 { height: 3.5rem; }
        .sm\\:h-12 { height: 3rem; }
        .p-2\\.5 { padding: 0.625rem; }
        .font-medium { font-weight: 500; }
        .bg-\\[\\#A4FCF6\\] { background-color: #A4FCF6; }
        .shadow-\\[4px_4px_0px_rgba\\(0\\,0\\,0\\,1\\)\\] { box-shadow: 4px 4px 0px rgba(0,0,0,1); }
        .hover\\:bg-\\[\\#A4FCF6\\]:hover { background-color: #A4FCF6; }
        .hover\\:shadow-\\[2px_2px_0px_rgba\\(0\\,0\\,0\\,1\\)\\]:hover { box-shadow: 2px 2px 0px rgba(0,0,0,1); }
        .hover\\:bg-\\[\\#81a8f8\\]:hover { background-color: #81a8f8; }
        .active\\:bg-\\[\\#D0C4fB\\]:active { background-color: #D0C4fB; }
        .disabled\\:opacity-50:disabled { opacity: 0.5; }
        .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
        
        /* Transitions */
        .transition-all { 
          transition-property: all; 
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); 
          transition-duration: 150ms; 
        }
        
        /* Responsive utilities */
        @media (min-width: 640px) {
          .sm\\:p-4 { padding: 1rem; }
          .sm\\:space-y-6 > * + * { margin-top: 1.5rem; }
          .sm\\:text-base { font-size: 1rem; line-height: 1.5rem; }
          .sm\\:text-\\[32px\\] { font-size: 2rem; line-height: 2.5rem; }
          .sm\\:gap-4 { gap: 1rem; }
          .sm\\:p-6 { padding: 1.5rem; }
          .sm\\:flex-row { flex-direction: row; }
          .sm\\:h-12 { height: 3rem; }
        }
        
        @media (min-width: 768px) {
          .md\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
      `
        }} />
    );
} 