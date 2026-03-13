"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Link, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFileUpload } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";

export function UploadForm() {
  const router = useRouter();
  const { file, error: fileError, clear, getRootProps, getInputProps, isDragActive } = useFileUpload();
  const [jobUrl, setJobUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !jobUrl) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("cv", file);
      formData.append("jobUrl", jobUrl);

      const res = await fetch("/api/sessions", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create session");
      }

      router.push(`/session/${data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
      {/* PDF Upload */}
      <div>
        <label className="block text-sm text-muted mb-2">Your CV / Resume</label>
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="dropzone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                {...getRootProps()}
                className={cn(
                  "border border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                  isDragActive
                    ? "border-accent/50 bg-accent/5"
                    : "border-border-light hover:border-muted"
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-5 h-5 text-muted mx-auto mb-3" />
                <p className="text-sm text-foreground mb-1">
                  {isDragActive ? "Drop your CV here" : "Drag & drop your CV here"}
                </p>
                <p className="text-xs text-muted">or click to browse (PDF, max 10MB)</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="file"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border"
            >
              <FileText className="w-5 h-5 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clear(); }}
                className="p-1 hover:bg-surface-light rounded-md transition-colors text-muted hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {fileError && <p className="text-xs text-danger mt-2">{fileError}</p>}
      </div>

      {/* Job URL */}
      <div>
        <label className="block text-sm text-muted mb-2">Job Listing URL</label>
        <div className="relative">
          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <Input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://company.com/careers/role"
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg p-3"
        >
          {error}
        </motion.p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        loading={loading}
        disabled={!file || !jobUrl}
        className="w-full"
      >
        Start Preparation
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </form>
  );
}
