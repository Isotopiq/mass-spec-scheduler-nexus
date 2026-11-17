import React, { useState } from "react";
import { Button } from "../ui/button";
import { Paperclip, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase, SUPABASE_FUNCTIONS_URL } from "../../integrations/supabase/client";
import SequenceFileEditor from "./SequenceFileEditor";

interface SequenceFileLinkProps {
  bookingId: string;
  fileName: string;
  /** Whether the current viewer can edit this file (owner or admin) */
  canEdit?: boolean;
  /** Called after a successful save so parent can refresh data */
  onSaved?: () => void;
}

const SequenceFileLink: React.FC<SequenceFileLinkProps> = ({
  bookingId,
  fileName,
  canEdit = false,
  onSaved,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);

  const handleDownload = async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/s3-download-sequence?bookingId=${bookingId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Download failed");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <div className="inline-flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="h-7"
      >
        <Paperclip className="h-3.5 w-3.5 mr-1" />
        <span className="truncate max-w-[200px]">{fileName}</span>
        <Download className="h-3.5 w-3.5 ml-1" />
      </Button>
      {canEdit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7"
          onClick={() => setEditorOpen(true)}
          title="Edit in browser"
        >
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
      )}
      {canEdit && editorOpen && (
        <SequenceFileEditor
          open={editorOpen}
          onOpenChange={setEditorOpen}
          bookingId={bookingId}
          fileName={fileName}
          onSaved={() => onSaved?.()}
        />
      )}
    </div>
  );
};

export default SequenceFileLink;
