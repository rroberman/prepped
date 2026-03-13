"use client";

import { motion } from "framer-motion";
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isInterviewer = message.role === "interviewer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isInterviewer ? "justify-start" : "justify-end")}
    >
      {isInterviewer && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[75%] rounded-xl px-4 py-3 text-sm",
          isInterviewer
            ? "bg-surface border border-border text-foreground"
            : "bg-foreground text-background"
        )}
      >
        {isInterviewer ? (
          <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      {!isInterviewer && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-light flex items-center justify-center">
          <User className="w-4 h-4 text-muted" />
        </div>
      )}
    </motion.div>
  );
}
