import { CheckCircle, File } from 'lucide-react';

import type { FileItem } from '../types';
import { formatFileSize } from '../utils/formatters.ts';

interface FileListProps {
  files: FileItem[];
}

export function FileList({ files }: FileListProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Files</h2>
        <p className="text-sm text-gray-500">
          {files.length} file{files.length !== 1 ? 's' : ''} uploaded
        </p>
      </div>
      <div className="space-y-3">
        {files.map((file, key) => (
          <div
            key={key}
            className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm"
          >
            <div className="flex items-center space-x-3">
              <File className="w-5 h-5 text-gray-400" />
              <div>
                <p
                  className="text-sm font-medium text-gray-700 cursor-pointer hover:underline"
                  onClick={() =>
                    open(`https://ipfs.io/ipfs/${file.cid}`, '_blank')
                  }
                >
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {file.status === 'uploading' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
