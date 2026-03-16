import { toast } from "sonner";
import { getErrorMessage, logError } from "@/lib/firebase-error";

export function showActionError(context: string, error: unknown, fallback: string) {
  logError(context, error);
  toast.error(getErrorMessage(error, fallback), {
    duration: 7000,
  });
}
