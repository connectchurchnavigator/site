import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { uploadAPI, utilityAPI } from '../lib/api';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import axios from 'axios';

const compressToWebP = async (file, maxMB = 1) => {
  if (!file.type.startsWith('image/')) return file;
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = async () => {
        let quality = 0.8;
        let scale = 1.0;
        let maxWidth = 1600;
        let maxHeight = 1600;
        
        const compress = (q, mw, mh) => {
          return new Promise((res) => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > mw || height > mh) {
              if (width > height) {
                height = (height * mw) / width;
                width = mw;
              } else {
                width = (width * mh) / height;
                height = mh;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
              res(new File([blob], newName, { type: 'image/webp' }));
            }, 'image/webp', q);
          });
        };

        let compressedFile = await compress(quality, maxWidth, maxHeight);
        
        // Iterative reduction loop
        let attempts = 0;
        while (compressedFile.size > maxMB * 1024 * 1024 && attempts < 5) {
          attempts++;
          quality -= 0.15;
          maxWidth *= 0.8;
          maxHeight *= 0.8;
          compressedFile = await compress(Math.max(0.1, quality), maxWidth, maxHeight);
        }

        resolve(compressedFile);
      };
    };
  });
};

const FileUpload = ({
  label,
  category = 'general',
  accept = 'image/*',
  multiple = false,
  maxFiles = 10,
  maxSize = 1,  // MB
  value = multiple ? [] : '',
  onChange,
  placeholder = 'Click or drag files to upload',
  hint,
  className = '',
  previewType = 'thumbnail', // 'thumbnail', 'list', 'none'
  variant = 'default', // 'default' or 'simple'
}) => {
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('https')) return url;
    return `${backendUrl}${url}`;
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Check max files for multiple
    if (multiple) {
      const currentCount = Array.isArray(value) ? value.length : 0;
      if (currentCount + fileArray.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }
    }

    setCompressing(true);
    const processedFiles = await Promise.all(
      fileArray.map(async (file) => {
        if (file.type.startsWith('image/')) {
          return await compressToWebP(file, maxSize);
        }
        return file;
      })
    );
    setCompressing(false);

    // Validate file sizes after compression
    const oversizedFiles = processedFiles.filter(f => f.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`Some files are still too large (> ${maxSize}MB). Please try different images.`);
      return;
    }

    setUploading(true);

    try {
      const publicKey = process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY;

      const uploadToImageKit = async (file) => {
        // Fetch fresh authentication parameters for EACH file (tokens are single-use)
        const authResponse = await utilityAPI.getImageKitAuth();
        const { signature, expire, token } = authResponse.data;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileName', file.name);
        formData.append('publicKey', publicKey);
        formData.append('signature', signature);
        formData.append('expire', expire);
        formData.append('token', token);
        formData.append('useUniqueFileName', 'true');
        formData.append('folder', `/church_navigator/${category}`);

        const res = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return res.data.url;
      };

      if (multiple) {
        const uploadPromises = processedFiles.map(file => uploadToImageKit(file));
        const newUrls = await Promise.all(uploadPromises);
        const currentUrls = Array.isArray(value) ? value : [];
        onChange([...currentUrls, ...newUrls]);
        toast.success(`${newUrls.length} file(s) uploaded to cloud`);
      } else {
        const url = await uploadToImageKit(processedFiles[0]);
        onChange(url);
        toast.success('File uploaded to cloud');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Cloud upload failed. Please check your connection.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleRemove = async (urlToRemove) => {
    try {
      await uploadAPI.delete(urlToRemove);
      
      if (multiple) {
        const newUrls = value.filter(url => url !== urlToRemove);
        onChange(newUrls);
      } else {
        onChange('');
      }
      toast.success('File removed');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to remove file');
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const renderPreview = () => {
    if (previewType === 'none') return null;

    const urls = multiple ? (Array.isArray(value) ? value : []) : (value ? [value] : []);
    
    if (urls.length === 0) return null;

    if (previewType === 'thumbnail') {
      return (
        <div className="flex flex-wrap gap-3 mt-4">
          {urls.map((url, index) => (
            <div key={index} className="relative group">
              {isImage(url) ? (
                <img
                  src={getFullUrl(url)}
                  alt={`Upload ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                  <FileText className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      );
    }

    // List preview
    return (
      <div className="space-y-2 mt-4">
        {urls.map((url, index) => {
          const filename = url.split('/').pop();
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                {isImage(url) ? (
                  <ImageIcon className="h-5 w-5 text-slate-400" />
                ) : (
                  <FileText className="h-5 w-5 text-slate-400" />
                )}
                <span className="text-sm truncate max-w-[200px]">{filename}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(url)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    );
  };

  const showUploadZone = multiple || !value;
  const isSimple = variant === 'simple';

   return (
    <div className={cn("w-full flex flex-col", className)}>
      {label && (
        <label className="block text-[12px] font-bold tracking-[0.5px] text-black mb-2">
          {label}
        </label>
      )}
      
      {hint && !isSimple && (
        <p className="text-[11px] text-gray-400 mb-3">{hint}</p>
      )}

      {showUploadZone && (
        <div
          className={cn(
            "border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center",
            isSimple ? "p-4 min-h-[100px] w-[200px]" : "p-4 min-h-[110px] w-full",
            dragActive ? 'border-[#6c1cff] bg-[#6c1cff]/5' : 'border-gray-100 bg-gray-50/50 hover:border-[#6c1cff]/30',
            uploading ? 'pointer-events-none opacity-60' : ''
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleInputChange}
            className="hidden"
            data-testid={`file-input-${category}`}
          />
          
          {uploading || compressing ? (
            <div className="flex flex-col items-center">
              <Loader2 className={cn("text-[#6c1cff] animate-spin", isSimple ? "h-6 w-6" : "h-8 w-8 mb-2")} />
              {!isSimple && (
                <p className="text-[13px] font-medium text-gray-500">
                  {compressing ? 'Optimizing images...' : 'Uploading...'}
                </p>
              )}
            </div>
          ) : (
            <>
              {isSimple ? (
                <div className="flex flex-col items-center justify-center py-2">
                   <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                      <Upload className="h-5 w-5 text-[#6c1cff]" />
                   </div>
                   <span className="text-[12px] text-gray-400 font-medium italic">Click to upload</span>
                   <span className="text-[11px] text-gray-400 mt-1.5 font-normal">Maximum file size: {maxSize >= 1 ? `${maxSize} MB` : `${maxSize * 1024} KB`}</span>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm mb-2">
                     <Upload className="h-4 w-4 text-[#6c1cff]" />
                  </div>
                  <p className="text-[14px] font-bold text-gray-900 mb-1">{placeholder}</p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {accept.includes('jpg') || accept.includes('image') ? 'JPG, PNG, WebP' : 'Multiple Formats'} • Max {maxSize}MB
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 h-8 px-5 border-gray-200 text-gray-600 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-white hover:border-[#6c1cff] hover:text-[#6c1cff] transition-all bg-white"
                    data-testid={`upload-btn-${category}`}
                  >
                    Choose File{multiple ? 's' : ''}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {hint && isSimple && (
        <p className="text-[11px] text-gray-500 mt-2 font-normal w-[200px] text-center">{hint}</p>
      )}

      {renderPreview()}
    </div>
  );
};

export default FileUpload;
