import * as React from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';

export interface UploadedFileItem {
  id: string;
  file: File;
  progress?: number; // 0 - 100
  error?: string;
}

export interface FileUploadProps {
  accept?: string;
  maxSizeMb?: number;
  maxFiles?: number;
  onFilesSelected: (files: File[]) => void;
  files?: UploadedFileItem[];
  onRemoveFile?: (id: string) => void;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  accept,
  maxSizeMb = 10,
  maxFiles = 5,
  onFilesSelected,
  files = [],
  onRemoveFile,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMb * 1024 * 1024;

  const validateAndAddFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (!file) continue;

      if (file.size > maxSizeBytes) {
        setErrorMessage(`File "${file.name}" exceeds maximum allowed size of ${maxSizeMb} MB`);
        return;
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
        const fileType = file.type.toLowerCase();
        const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

        const isMatch = acceptedTypes.some((type) => {
          if (type.startsWith('.')) return fileExt === type;
          if (type.endsWith('/*')) return fileType.startsWith(type.replace('/*', ''));
          return fileType === type;
        });

        if (!isMatch) {
          setErrorMessage(`File "${file.name}" has an unsupported format. Allowed: ${accept}`);
          return;
        }
      }

      validFiles.push(file);
    }

    if (files.length + validFiles.length > maxFiles) {
      setErrorMessage(`Cannot upload more than ${maxFiles} files`);
      return;
    }

    onFilesSelected(validFiles);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload files dropzone"
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]',
          isDragOver
            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)]',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          disabled={disabled}
          onChange={(e) => validateAndAddFiles(e.target.files)}
          className="hidden"
        />

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] mb-3">
          <UploadCloud className="h-5 w-5" />
        </div>

        <p className="text-xs font-semibold text-[var(--color-text)]">
          Click to upload or drag and drop
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">
          {accept ? `Supported formats: ${accept}` : 'Any supported file'} (max {maxSizeMb} MB)
        </p>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-danger)] bg-[var(--color-danger-subtle)] p-2.5 rounded-md border border-[var(--color-danger)]/30">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 text-xs"
            >
              <div className="flex items-center gap-2.5 truncate">
                <File className="h-4 w-4 text-[var(--color-text-muted)] shrink-0" />
                <div className="truncate">
                  <span className="font-medium text-[var(--color-text)] truncate block">{item.file.name}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>

              {/* Progress bar or delete */}
              <div className="flex items-center gap-3">
                {typeof item.progress === 'number' && item.progress < 100 && (
                  <progress
                    value={item.progress}
                    max={100}
                    className="w-20 h-1.5 rounded-full overflow-hidden accent-[var(--color-primary)] bg-[var(--color-border)]"
                    aria-label={`Upload progress for ${item.file.name}`}
                  />
                )}

                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(item.id)}
                    className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] cursor-pointer"
                    aria-label={`Remove file ${item.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
