import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase, SUPABASE_FUNCTIONS_URL } from "../../integrations/supabase/client";

interface SequenceFileEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  fileName: string;
  onSaved?: (info: { size: number; uploadedAt: string }) => void;
}

type SheetCell = { v?: string | number | boolean | null };
type WorkbookSnapshot = {
  sheetOrder?: string[];
  sheets: Record<
    string,
    {
      id: string;
      name: string;
      cellData?: Record<string, Record<string, SheetCell>>;
      rowCount?: number;
      columnCount?: number;
    }
  >;
};

const SequenceFileEditor: React.FC<SequenceFileEditorProps> = ({
  open,
  onOpenChange,
  bookingId,
  fileName,
  onSaved,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Holds the Univer instance + API + library refs so we can clean up + export
  const univerRef = useRef<{
    univer: { dispose: () => void };
    api: any;
    XLSX: any;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileExt = (() => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".xlsx")) return "xlsx";
    if (lower.endsWith(".xls")) return "xls";
    if (lower.endsWith(".csv")) return "csv";
    return "xlsx";
  })();

  // Convert SheetJS workbook → Univer IWorkbookData
  const buildUniverData = (XLSX: any, wb: any) => {
    const sheets: WorkbookSnapshot["sheets"] = {};
    const sheetOrder: string[] = [];
    wb.SheetNames.forEach((name: string, idx: number) => {
      const ws = wb.Sheets[name];
      const ref = ws["!ref"];
      const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 49, c: 25 } };
      const cellData: Record<string, Record<string, SheetCell>> = {};
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
            if (!cellData[r]) cellData[r] = {};
            cellData[r][c] = { v: cell.v };
          }
        }
      }
      const id = `sheet-${idx}`;
      sheets[id] = {
        id,
        name,
        cellData,
        rowCount: Math.max(range.e.r + 1, 100),
        columnCount: Math.max(range.e.c + 1, 26),
      };
      sheetOrder.push(id);
    });
    if (sheetOrder.length === 0) {
      sheets["sheet-0"] = { id: "sheet-0", name: "Sheet1", cellData: {}, rowCount: 100, columnCount: 26 };
      sheetOrder.push("sheet-0");
    }
    return {
      id: `wb-${bookingId}`,
      sheetOrder,
      sheets,
      name: fileName,
      appVersion: "0.21.1",
      locale: "enUS",
      styles: {},
    };
  };

  // Convert Univer snapshot → SheetJS workbook → Blob in original format
  const exportToBlob = (XLSX: any, snapshot: WorkbookSnapshot): Blob => {
    const wb = XLSX.utils.book_new();
    const order = snapshot.sheetOrder || Object.keys(snapshot.sheets);
    order.forEach((sid) => {
      const sheet = snapshot.sheets[sid];
      if (!sheet) return;
      const aoa: any[][] = [];
      const cellData = sheet.cellData || {};
      Object.keys(cellData).forEach((rStr) => {
        const r = parseInt(rStr, 10);
        const row = cellData[rStr];
        Object.keys(row).forEach((cStr) => {
          const c = parseInt(cStr, 10);
          while (aoa.length <= r) aoa.push([]);
          while (aoa[r].length <= c) aoa[r].push(undefined);
          aoa[r][c] = row[cStr]?.v ?? null;
        });
      });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name || sid);
    });

    if (fileExt === "csv") {
      const firstSheetName = wb.SheetNames[0];
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheetName]);
      return new Blob([csv], { type: "text/csv" });
    }
    const bookType = fileExt === "xls" ? "xls" : "xlsx";
    const out = XLSX.write(wb, { bookType, type: "array" });
    return new Blob([out], {
      type:
        bookType === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/vnd.ms-excel",
    });
  };

  // Load file + boot Univer when dialog opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);

    (async () => {
      try {
        // 1. Fetch file from S3 via existing edge function
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        const resp = await fetch(
          `${SUPABASE_FUNCTIONS_URL}/s3-download-sequence?bookingId=${bookingId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!resp.ok) {
          const errBody = await resp.json().catch(() => ({}));
          throw new Error(errBody.error || `Failed to load file (HTTP ${resp.status})`);
        }
        const arrayBuffer = await resp.arrayBuffer();

        // 2. Dynamic import — keep Univer & SheetJS out of the main bundle
        const [{ createUniver, LocaleType, merge }, { UniverSheetsCorePreset }, sheetsCoreLocale, XLSXmod] =
          await Promise.all([
            import("@univerjs/presets"),
            import("@univerjs/presets/preset-sheets-core"),
            import("@univerjs/presets/preset-sheets-core/locales/en-US"),
            import("xlsx"),
            import("@univerjs/presets/lib/styles/preset-sheets-core.css"),
          ]);

        if (cancelled) return;

        const XLSX = (XLSXmod as any).default ?? XLSXmod;
        const wb = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
        const univerData = buildUniverData(XLSX, wb);

        if (!containerRef.current) return;

        const { univer, univerAPI } = createUniver({
          locale: LocaleType.EN_US,
          locales: {
            [LocaleType.EN_US]: merge({}, (sheetsCoreLocale as any).default ?? sheetsCoreLocale),
          },
          presets: [
            UniverSheetsCorePreset({
              container: containerRef.current,
            }),
          ],
        });

        univerAPI.createWorkbook(univerData as any);
        univerRef.current = { univer, api: univerAPI, XLSX };
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to open file";
        setErrorMsg(msg);
        setLoading(false);
        toast.error(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookingId]);

  // Dispose Univer when the dialog closes
  useEffect(() => {
    if (open) return;
    if (univerRef.current) {
      try {
        univerRef.current.univer.dispose();
      } catch {
        // ignore
      }
      univerRef.current = null;
    }
  }, [open]);

  const handleSave = async (closeAfter: boolean) => {
    if (!univerRef.current) return;
    setSaving(true);
    try {
      const { api, XLSX } = univerRef.current;
      const workbook = api.getActiveWorkbook();
      if (!workbook) throw new Error("No active workbook");
      const snapshot = workbook.getSnapshot() as WorkbookSnapshot;
      const blob = exportToBlob(XLSX, snapshot);

      const file = new File([blob], fileName, { type: blob.type });
      const form = new FormData();
      form.append("file", file);
      form.append("bookingId", bookingId);

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const resp = await fetch(
        `${SUPABASE_FUNCTIONS_URL}/s3-replace-sequence`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Save failed");

      toast.success("Sequence file saved");
      onSaved?.({ size: json.size, uploadedAt: json.uploadedAt });
      if (closeAfter) onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[98vw] w-[98vw] h-[95vh] p-0 flex flex-col gap-0 sm:rounded-lg overflow-hidden"
      >
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base">Editing: {fileName}</DialogTitle>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving || loading || !!errorMsg}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              onClick={() => handleSave(true)}
              disabled={saving || loading || !!errorMsg}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save & Close
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0 bg-background">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading spreadsheet…
              </div>
            </div>
          )}
          {errorMsg && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-md text-center text-sm text-destructive">{errorMsg}</div>
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SequenceFileEditor;
