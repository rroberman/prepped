"use client";

import { useState, useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejected: FileRejection[]) => {
    setError(null);
    if (rejected.length > 0) {
      const err = rejected[0].errors[0];
      if (err.code === "file-too-large") {
        setError("File is too large. Maximum size is 10MB.");
      } else if (err.code === "file-invalid-type") {
        setError("Only PDF files are accepted.");
      } else {
        setError(err.message);
      }
      return;
    }
    if (accepted.length > 0) {
      setFile(accepted[0]);
    }
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
    multiple: false,
  });

  const clear = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return { file, error, clear, ...dropzone };
}
