"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
export function ConfirmAction({
  title,
  description,
  label,
  trigger,
  onConfirm,
  destructive = false,
  disabled = false,
}: {
  title: string;
  description: string;
  label: string;
  trigger: React.ReactNode;
  onConfirm: () => Promise<void>;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {trigger}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="pr-6 text-lg font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-3 text-sm leading-6 text-slate-500">
          {description}
        </DialogDescription>
        {error && (
          <p role="alert" className="error mt-4">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            Отмена
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Выполняем…" : label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
