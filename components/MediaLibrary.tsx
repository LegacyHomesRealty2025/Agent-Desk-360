import React, { useState } from 'react';
import { User } from '../types.ts';

interface MediaLibraryProps {
  user: User;
  isDarkMode: boolean;
}

interface MediaFile {
  id: string;
  name: string;
  type: 'IMAGE' | 'PDF' | 'VIDEO';
  url: string;
  size: string;
  uploadedAt: string;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ user, isDarkMode }) => {
  const [files, setFiles] = useState<MediaFile[]>([
    {
      id: '1',
      name: 'Modern Home Flyer.pdf',
      type: 'PDF',
      url: '#',
      size: '2.4 MB',
      uploadedAt: '2026-01-05'
    },
    {
      id: '2',
      name: 'Property Showcase.jpg',
      type: 'IMAGE',
      url: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400',
      size: '1.8 MB',
      uploadedAt: '2026-01-04'
    },
    {
      id: '3',
      name: 'Luxury Estate.jpg',
      type: 'IMAGE',
      url: 'https://images.pexels.com/photos/1115804/pexels-photo-1115804.jpeg?auto=compress&cs=tinysrgb&w=400',
      size: '2.1 MB',
      uploadedAt: '2026-01-03'
    }
  ]);

  const [uploadProgress, setUploadProgress] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    setUploadProgress(true);

    setTimeout(() => {
      const newFiles: MediaFile[] = Array.from(uploadedFiles).map((file, index) => ({
        id: `${Date.now()}_${index}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'IMAGE' : file.type === 'application/pdf' ? 'PDF' : 'VIDEO',
        url: URL.createObjectURL(file),
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        uploadedAt: new Date().toISOString().split('T')[0]
      }));

      setFiles(prev => [...newFiles, ...prev]);
      setUploadProgress(false);
    }, 1000);
  };

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return 'fa-file-pdf text-rose-500';
      case 'IMAGE':
        return 'fa-image text-blue-500';
      case 'VIDEO':
        return 'fa-video text-purple-500';
      default:
        return 'fa-file text-slate-500';
    }
  };

  return (
    <div className={`rounded-3xl border-2 p-8 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
            <i className="fas fa-folder-open text-white text-xl"></i>
          </div>
          <div>
            <h3 className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Media Library
            </h3>
            <p className="text-xs text-slate-500 font-medium">Manage your flyers and images</p>
          </div>
        </div>

        <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
          <i className="fas fa-upload mr-2"></i>
          Upload
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {uploadProgress && (
        <div className={`mb-4 p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center space-x-3">
            <i className="fas fa-spinner fa-spin text-blue-500"></i>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Uploading files...
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {files.length === 0 ? (
          <div className="text-center py-12 opacity-50">
            <i className="fas fa-folder-open text-4xl text-slate-400 mb-4"></i>
            <p className="text-sm text-slate-500 font-medium">No files uploaded yet</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center space-x-4 p-4 rounded-xl border transition-all group hover:shadow-md ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {file.type === 'IMAGE' ? (
                <img src={file.url} alt={file.name} className="w-12 h-12 rounded-lg object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                  <i className={`fas ${getFileIcon(file.type)} text-xl`}></i>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {file.size} • Uploaded {file.uploadedAt}
                </p>
              </div>

              <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => window.open(file.url, '_blank')}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    isDarkMode
                      ? 'hover:bg-slate-700 text-slate-400'
                      : 'hover:bg-slate-200 text-slate-600'
                  }`}
                  title="View"
                >
                  <i className="fas fa-eye text-sm"></i>
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-100 text-rose-500 transition-all"
                  title="Delete"
                >
                  <i className="fas fa-trash text-sm"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
