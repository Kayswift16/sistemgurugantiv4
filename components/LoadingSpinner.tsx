
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div
        className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-sky-500 border-t-transparent"
        role="status"
      >
        <span className="sr-only">Memuatkan...</span>
      </div>
      <p className="text-slate-500 font-medium">AI sedang menganalisis jadual...</p>
    </div>
  );
};

export default LoadingSpinner;
