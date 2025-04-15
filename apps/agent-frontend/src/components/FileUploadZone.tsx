import { Upload } from 'lucide-react';
import type React from 'react';

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
}

export function FileUploadZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}: FileUploadZoneProps) {
  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
        transition-all duration-200 ease-in-out
        ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }
      `}
    >
      <div className="flex flex-col items-center justify-center">
        <Upload
          className={`w-16 h-16 mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`}
        />
        <p className="text-lg text-gray-700 mb-2">Drop your files here</p>
        <p className="text-sm text-gray-500">or click to select files</p>
      </div>
    </div>
  );
}
