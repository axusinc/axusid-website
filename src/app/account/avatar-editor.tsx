"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormError } from "@/components/ui/form-message";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import {
  clearAvatarAction,
  confirmAvatarUploadAction,
  requestAvatarUploadAction,
} from "@/app/account/variation-actions";
import {
  MAX_AVATAR_SIZE_BYTES,
  validateAvatarFile,
} from "@/lib/avatar";
import { cn } from "@/lib/utils";

const CROP_PX = 288;
const PREVIEW_PX = 96;
const EXPORT_PX = 512;

type Variation = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type LoadedImage = {
  url: string;
  element: HTMLImageElement;
  name: string;
  type: string;
};

function clampOffset(value: number, display: number, size: number): number {
  if (display <= size) return (size - display) / 2;
  return Math.min(0, Math.max(size - display, value));
}

function loadImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => resolve({ url, element, name: file.name, type: file.type });
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    element.src = url;
  });
}

function exportCroppedBlob(
  image: HTMLImageElement,
  sourceType: string,
  cropSize: number,
  offsetX: number,
  offsetY: number,
  zoom: number,
): Promise<Blob> {
  const base = Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight);
  const scale = base * zoom;
  const sourceSize = cropSize / scale;
  const sourceX = -offsetX / scale;
  const sourceY = -offsetY / scale;
  const canvas = document.createElement("canvas");
  canvas.width = EXPORT_PX;
  canvas.height = EXPORT_PX;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas-unsupported");
  }
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, EXPORT_PX, EXPORT_PX);
  // Canvas WebP export is unreliable in some browsers; JPEG is universally supported.
  // PNG sources stay PNG unless the result would exceed the upload cap.
  const jpegLadder: { type: string; quality: number }[] = [
    { type: "image/jpeg", quality: 0.92 },
    { type: "image/jpeg", quality: 0.8 },
    { type: "image/jpeg", quality: 0.65 },
  ];
  const attempts: { type: string; quality: number }[] =
    sourceType === "image/png"
      ? [{ type: "image/png", quality: 1 }, ...jpegLadder]
      : jpegLadder;
  return new Promise((resolve, reject) => {
    const attempt = (index: number) => {
      const { type, quality } = attempts[index];
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("encode-failed"));
            return;
          }
          if (blob.size > MAX_AVATAR_SIZE_BYTES && index < attempts.length - 1) {
            attempt(index + 1);
            return;
          }
          resolve(blob);
        },
        type,
        quality,
      );
    };
    attempt(0);
  });
}

function useMeasuredCropSize(max: number): { ref: React.RefObject<HTMLDivElement | null>; size: number } {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(max);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observe = () => {
      const width = Math.floor(element.getBoundingClientRect().width);
      if (width > 0) {
        setSize((current) => (current === width ? current : width));
      }
    };
    observe();
    const observer = new ResizeObserver(observe);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, size };
}

function AvatarCropEditor({
  image,
  onCancel,
  onSave,
  isSaving,
}: {
  image: LoadedImage;
  onCancel: () => void;
  onSave: (blob: Blob) => void;
  isSaving: boolean;
}) {
  const { ref: cropRef, size: cropSize } = useMeasuredCropSize(CROP_PX);
  const [zoom, setZoom] = useState(1);
  const base = Math.max(
    cropSize / image.element.naturalWidth,
    cropSize / image.element.naturalHeight,
  );
  const displaySize = (currentZoom: number) => ({
    width: image.element.naturalWidth * base * currentZoom,
    height: image.element.naturalHeight * base * currentZoom,
  });
  const initialSize = displaySize(1);
  const [offset, setOffset] = useState({
    x: clampOffset(0, initialSize.width, cropSize),
    y: clampOffset(0, initialSize.height, cropSize),
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const { width: displayWidth, height: displayHeight } = displaySize(zoom);

  function handleZoom(next: number) {
    const ratio = next / zoom;
    const size = displaySize(next);
    setZoom(next);
    // Anchor the zoom to the center so the content under the
    // middle of the circle stays put instead of drifting away.
    setOffset((current) => ({
      x: clampOffset(cropSize / 2 - (cropSize / 2 - current.x) * ratio, size.width, cropSize),
      y: clampOffset(cropSize / 2 - (cropSize / 2 - current.y) * ratio, size.height, cropSize),
    }));
  }

  function handlePointerDown(event: React.PointerEvent) {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
  }

  function handlePointerMove(event: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: clampOffset(event.clientX - drag.x, displayWidth, cropSize),
      y: clampOffset(event.clientY - drag.y, displayHeight, cropSize),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleSave() {
    setSaveError(null);
    try {
      const blob = await exportCroppedBlob(
        image.element,
        image.type,
        cropSize,
        offset.x,
        offset.y,
        zoom,
      );
      onSave(blob);
    } catch {
      setSaveError("Couldn’t process that image. Try another file.");
    }
  }

  const previewScale = PREVIEW_PX / cropSize;

  return (
    <div className="mx-auto flex w-full max-w-[340px] flex-col items-center gap-4">
      <div
        ref={cropRef}
        className="relative w-full cursor-grab touch-none overflow-hidden rounded-2xl bg-neutral-950 active:cursor-grabbing"
        style={{ aspectRatio: "1 / 1" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="application"
        aria-label="Drag to reposition your photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            width: displayWidth,
            height: displayHeight,
            left: offset.x,
            top: offset.y,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, transparent ${cropSize / 2 - 1}px, rgba(0,0,0,0.55) ${cropSize / 2 + 1}px)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="rounded-full border-2 border-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.2)]"
            style={{ width: cropSize - 8, height: cropSize - 8 }}
          />
        </div>
      </div>

      <div className="flex w-full items-center gap-3">
        <div
          className="shrink-0 overflow-hidden rounded-full ring-1 ring-black/10"
          style={{ width: PREVIEW_PX, height: PREVIEW_PX }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.url}
            alt="Preview"
            draggable={false}
            className="pointer-events-none max-w-none select-none"
            style={{
              width: displayWidth * previewScale,
              height: displayHeight * previewScale,
              marginLeft: offset.x * previewScale,
              marginTop: offset.y * previewScale,
            }}
          />
        </div>
        <p className="min-w-0 text-sm text-neutral-500">
          Drag to reposition.
          <br />
          Use the slider to zoom.
        </p>
      </div>

      <label className="w-full text-sm font-medium text-neutral-700">
        Zoom
        <input
          type="range"
          min={100}
          max={300}
          step={1}
          value={Math.round(zoom * 100)}
          onChange={(event) => handleZoom(Number(event.target.value) / 100)}
          className="mt-1 w-full accent-neutral-950"
          aria-label="Zoom photo"
        />
      </label>

      {saveError ? (
        <FormError className="w-full">{saveError}</FormError>
      ) : null}

      <div className="flex w-full gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1"
        >
          <Undo2 aria-hidden className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          loading={isSaving}
          className="flex-1"
        >
          Save photo
        </Button>
      </div>
    </div>
  );
}

export function AvatarPhotoField({
  variation,
  displayName,
  onDone,
}: {
  variation: Variation;
  displayName: string;
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<"view" | "crop">("view");
  const [loadedImage, setLoadedImage] = useState<LoadedImage | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function openDialog() {
    setError(null);
    setDialogView("view");
    setDialogOpen(true);
  }

  function closeDialog() {
    if (isWorking) return;
    setDialogOpen(false);
    setDialogView("view");
    if (loadedImage) {
      URL.revokeObjectURL(loadedImage.url);
      setLoadedImage(null);
    }
  }

  useEffect(() => {
    if (!dialogOpen) return;
    panelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, isWorking]);

  async function handleFile(file: File) {
    const invalid = validateAvatarFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    try {
      const loaded = await loadImageFile(file);
      if (loadedImage) {
        URL.revokeObjectURL(loadedImage.url);
      }
      setLoadedImage(loaded);
      setDialogView("crop");
      setDialogOpen(true);
    } catch {
      setError("Couldn’t read that file. Try another image.");
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  async function handleSaveBlob(blob: Blob) {
    if (!loadedImage) return;
    setIsWorking(true);
    setError(null);
    try {
      const prepared = await requestAvatarUploadAction(
        variation.id,
        blob.type || loadedImage.type,
        blob.size,
      );
      if ("error" in prepared) {
        setError(prepared.error);
        return;
      }
      const upload = await fetch(prepared.data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": prepared.data.contentType },
        body: blob,
      });
      if (!upload.ok) {
        setError("The upload did not finish. Try again.");
        return;
      }
      const confirmed = await confirmAvatarUploadAction(variation.id, prepared.data.objectKey);
      if (confirmed.error) {
        setError(confirmed.error);
        return;
      }
      closeDialog();
      onDone(confirmed.success ?? "Profile photo updated.");
      router.refresh();
    } catch {
      setError("The upload did not finish. Try again.");
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRemove() {
    setIsWorking(true);
    setError(null);
    try {
      const result = await clearAvatarAction(variation.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      closeDialog();
      onDone(result.success ?? "Profile photo removed.");
      router.refresh();
    } catch {
      setError("Unable to remove your profile photo. Try again.");
    } finally {
      setIsWorking(false);
    }
  }

  const dialog = dialogOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={closeDialog}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edit profile photo"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl outline-none sm:p-6"
      >
        <h3 className="text-base font-semibold tracking-tight text-neutral-950">
          Profile photo
        </h3>

        {dialogView === "crop" && loadedImage ? (
          <div className="mt-4">
            <AvatarCropEditor
              key={loadedImage.url}
              image={loadedImage}
              isSaving={isWorking}
              onCancel={() => {
                URL.revokeObjectURL(loadedImage.url);
                setLoadedImage(null);
                setDialogView("view");
              }}
              onSave={(blob) => void handleSaveBlob(blob)}
            />
            {error ? <FormError className="mt-3">{error}</FormError> : null}
          </div>
        ) : (
          <div
            className={cn(
              "mt-4 flex flex-col items-center gap-4 rounded-xl border border-dashed p-6 text-center",
              isDraggingFile ? "border-neutral-950 bg-neutral-50" : "border-black/15",
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingFile(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
          >
            <ProfileAvatar
              imageUrl={variation.avatarUrl}
              alt={displayName || "Profile photo"}
              firstName={variation.firstName}
              lastName={variation.lastName}
              displayName={variation.displayName}
              size="xl"
            />
            <p className="text-sm text-neutral-500">
              {variation.avatarUrl
                ? "Drag a new image here, or choose a file."
                : "Drag an image here, or choose a file."}
              <br />
              PNG, JPEG, or WebP up to 2 MB.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={isWorking}
              >
                {variation.avatarUrl ? "Choose new photo" : "Choose photo"}
              </Button>
              {variation.avatarUrl ? (
                <ConfirmButton
                  confirmLabel="Confirm remove"
                  variant="danger-ghost"
                  size="sm"
                  loading={isWorking}
                  disabled={isWorking}
                  onConfirm={() => void handleRemove()}
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Remove
                </ConfirmButton>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeDialog}
                disabled={isWorking}
              >
                Close
              </Button>
            </div>
            {error ? <FormError>{error}</FormError> : null}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          aria-label="Choose a profile photo"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
    </div>
  ) : null;

  return (
    <div className="border-b border-black/[0.05] py-5 first:pt-0">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={openDialog}
          aria-label={variation.avatarUrl ? "Edit profile photo" : "Add profile photo"}
          className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        >
          <ProfileAvatar
            imageUrl={variation.avatarUrl}
            alt={displayName || "Profile photo"}
            firstName={variation.firstName}
            lastName={variation.lastName}
            displayName={variation.displayName}
            size="lg"
          />
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <Pencil className="h-5 w-5 text-white" />
          </span>
        </button>
        <div className="min-w-0">
          <p className="text-sm font-medium text-neutral-900">Profile photo</p>
          <p className="mt-0.5 text-[13px] text-neutral-500">Shown across your account</p>
        </div>
      </div>
      {typeof document !== "undefined" && dialog ? createPortal(dialog, document.body) : dialog}
    </div>
  );
}
