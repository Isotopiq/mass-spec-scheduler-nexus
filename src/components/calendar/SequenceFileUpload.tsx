import React, { useContext, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Loader2, Paperclip, X, Download, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase, SUPABASE_FUNCTIONS_URL } from "../../integrations/supabase/client";
import { AuthContext } from "../../contexts/AuthContext";
import SequenceFileEditor from "./SequenceFileEditor";

interface SequenceFileUploadProps {
  bookingId: string | null; // null when creating — upload deferred until after submit
  /** Owner of the booking (user_id). Used to gate edit/replace/remove to admin or owner. */
  bookingOwnerId?: string | null;
  existingFileName?: string | null;
  existingFileSize?: number | null;
  onUploaded?: (info: { key: string; name: string; size: number }) => void;
  onRemoved?: () => void;
  /** When set, this picker just stores the File locally; the parent uploads after creating the booking */
  onLocalFilePicked?: (file: File | null) => void;
  disabled?: boolean;
}

const MAX_SIZE = 25 * 1024 * 1024;
const ALLOWED = [".xlsx", ".xls", ".csv"];

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

/** Safely parse a Response that should be JSON; returns a clear error if it's HTML/text. */
const parseJsonOrThrow = async (resp: Response, fallbackMsg: string) => {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    // Server returned HTML (e.g. 404 page from the platform when the function isn't deployed)
    const snippet = text.slice(0, 80).replace(/\s+/g, " ");
    throw new Error(
      `${fallbackMsg} (server returned non-JSON ${resp.status}: ${snippet}…)`,
    );
  }
};

const SequenceFileUpload: React.FC<SequenceFileUploadProps> = ({
  bookingId,
  bookingOwnerId,
  existingFileName,
  existingFileSize,
  onUploaded,
  onRemoved,
  onLocalFilePicked,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  // Read context directly so this component can be rendered outside AuthProvider
  // (e.g. inside auth modals) without throwing.
  const auth = useContext(AuthContext);
  const user = auth?.user ?? null;

  // Permission: only the booking's owner or an admin may edit/replace/remove the file.
  // When creating a new booking (bookingId == null) the current user is implicitly the owner.
  const isAdmin = user?.role === "admin";
  const isOwner = !bookingOwnerId || (user?.id && user.id === bookingOwnerId);
  const canModify = !!user && (isAdmin || isOwner);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE) return `File too large (max ${MAX_SIZE / 1024 / 1024} MB)`;
    const lower = file.name.toLowerCase();
    if (!ALLOWED.some((ext) => lower.endsWith(ext))) {
      return `File type not allowed. Allowed: ${ALLOWED.join(", ")}`;
    }
    return null;
  };

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) {
      toast.error(err);
      e.target.value = "";
      return;
    }

    if (!bookingId) {
      // Create flow — defer upload to parent
      setPendingFile(file);
      onLocalFilePicked?.(file);
      return;
    }

    if (!canModify) {
      toast.error("You don't have permission to modify this booking's sequence file.");
      e.target.value = "";
      return;
    }

    // Edit flow — upload immediately
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("bookingId", bookingId);
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/s3-upload-sequence`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const json = await parseJsonOrThrow(resp, "Upload failed");
      if (!resp.ok) throw new Error(json.error || "Upload failed");
      toast.success("Sequence file uploaded");
      onUploaded?.({ key: json.key, name: json.name, size: json.size });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    if (pendingFile) {
      setPendingFile(null);
      onLocalFilePicked?.(null);
      return;
    }
    if (!bookingId) return;
    if (!canModify) {
      toast.error("You don't have permission to remove this booking's sequence file.");
      return;
    }
    if (!confirm("Remove the uploaded sequence file?")) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/s3-delete-sequence`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookingId }),
        },
      );
      const json = await parseJsonOrThrow(resp, "Delete failed");
      if (!resp.ok) throw new Error(json.error || "Delete failed");
      toast.success("Sequence file removed");
      onRemoved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!bookingId) return;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/s3-download-sequence?bookingId=${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) {
        const err = await parseJsonOrThrow(resp, "Download failed").catch(
          (e) => ({ error: e instanceof Error ? e.message : "Download failed" }),
        );
        throw new Error(err.error || "Download failed");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = existingFileName || "sequence-file";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const hasExisting = !!existingFileName && !pendingFile;
  const hasPending = !!pendingFile;

  return (
    <div className="space-y-2">
      <Label>Sequence File (Optional)</Label>
      {hasExisting && (
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <Paperclip className="h-4 w-4 shrink-0" />
          <div className="min-w-0 overflow-hidden">
            <div className="truncate font-medium" title={existingFileName || undefined}>
              {existingFileName}
            </div>
            {existingFileSize ? (
              <div className="text-xs text-muted-foreground">{formatSize(existingFileSize)}</div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleDownload}
              disabled={busy || disabled}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            {bookingId && canModify && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setEditorOpen(true)}
                disabled={busy || disabled}
                title="Edit in browser"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {bookingId && canModify && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => inputRef.current?.click()}
                disabled={busy || disabled}
                title="Replace"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {canModify && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={handleRemove}
                disabled={busy || disabled}
                title="Remove"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      {hasPending && (
        <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
          <Paperclip className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 overflow-hidden">
            <div className="truncate font-medium" title={pendingFile!.name}>
              {pendingFile!.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {formatSize(pendingFile!.size)} · will upload after booking is created
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              title="Replace"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={handleRemove}
              disabled={disabled}
              title="Remove"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* Always render the hidden input so Replace works from any state */}
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handlePick}
        disabled={busy || disabled}
      />
      {!hasExisting && !hasPending && canModify && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy || disabled}
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
            </>
          ) : (
            <>
              <Paperclip className="h-4 w-4 mr-2" /> Upload LCMS Sequence (.xlsx, .xls, .csv)
            </>
          )}
        </Button>
      )}
      {!hasExisting && !hasPending && !canModify && (
        <p className="text-xs text-muted-foreground">
          Only the booking owner or an admin can attach a sequence file.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Optional — attach your LCMS sequence file. Max 25 MB.
      </p>
      {bookingId && existingFileName && editorOpen && canModify && (
        <SequenceFileEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          bookingId={bookingId}
          fileName={existingFileName}
          onSaved={(info) => {
            onUploaded?.({
              key: "",
              name: existingFileName,
              size: info.size,
            });
          }}
        />
      )}
    </div>
  );
};

export default SequenceFileUpload;
