"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Upload, FileText } from "lucide-react";

interface UploadFormProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export function UploadForm({ onUpload, isUploading }: UploadFormProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (file.type !== "application/pdf") {
      return "Please select a PDF file";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const err = validateFile(file);
      if (err) {
        setError(err);
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    },
    [validateFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleSubmit = () => {
    if (selectedFile && !isUploading) {
      onUpload(selectedFile);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all ${
          dragOver
            ? "border-[var(--accent-gold)] bg-[var(--accent-gold)]/10"
            : "border-white/20 hover:border-white/40 hover:bg-white/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {selectedFile ? (
          <>
            <FileText className="size-10 text-[var(--accent-gold)]" />
            <div className="text-center">
              <p className="font-medium text-[var(--text-primary)]">{selectedFile.name}</p>
              <p className="text-sm text-[var(--text-secondary)]">
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </>
        ) : (
          <>
            <Upload className="size-10 text-[var(--text-secondary)]" />
            <div className="text-center">
              <p className="font-medium text-[var(--text-primary)]">
                Drop a patent PDF here
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                or click to browse (max 20MB)
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        disabled={!selectedFile || isUploading}
        loading={isUploading}
        onClick={handleSubmit}
      >
        {isUploading ? "Uploading..." : "Analyze Patent"}
      </Button>
    </div>
  );
}
