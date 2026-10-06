import { errorLogService, ErrorLogService } from "../services/error-log.service";

let installed = false;

// Preserve normal console output while recording the backend's existing error/warn calls.
export function installErrorLogger(service: ErrorLogService = errorLogService) {
  if (installed) return () => {};
  installed = true;
  const error = console.error;
  const warn = console.warn;
  const capture = (level: "ERROR" | "WARN", original: (...args: unknown[]) => void) => (...args: unknown[]) => {
    original.apply(console, args);
    try {
      void service.append(level, args).catch(() => error.call(console, "Could not write the error log"));
    } catch {
      error.call(console, "Could not format the error log entry");
    }
  };
  console.error = capture("ERROR", error);
  console.warn = capture("WARN", warn);
  return () => {
    console.error = error;
    console.warn = warn;
    installed = false;
  };
}
