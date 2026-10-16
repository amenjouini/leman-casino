"use client";

import { useEffect, useRef } from "react";
import { Upload } from "lucide-react";
import { uploadImageAction } from "@/lib/admin/actions/settings";
import { FormMessage, SubmitButton, useFormAction } from "./ActionForm";

/** Standalone upload form (must not be nested in another form). Calls onUploaded with the new URL. */
export function ImageUpload({ onUploaded, label = "Importer une image" }: { onUploaded: (url: string) => void; label?: string }) {
  const [state, onSubmit, pending] = useFormAction(uploadImageAction);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && state.message?.startsWith("/api/media/")) {
      onUploaded(state.message);
      ref.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.at]);
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <label className="field-label" htmlFor="upload-file">
        {label}
      </label>
      <input id="upload-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required className="block w-full text-sm text-mist file:mr-3 file:rounded-full file:border-0 file:bg-night-700 file:px-4 file:py-2 file:text-sm file:text-ivory hover:file:bg-night-600" />
      <p className="text-xs text-fog">JPEG, PNG, WebP ou AVIF · 3 Mo max.</p>
      <SubmitButton className="btn btn-outline btn-sm" pendingLabel="Import…" pending={pending}>
        <Upload className="h-3.5 w-3.5" aria-hidden /> Importer
      </SubmitButton>
      {state.at && !state.ok && <FormMessage state={state} />}
      {state.ok && <p className="text-sm text-ok">Image importée et insérée dans le champ.</p>}
    </form>
  );
}
