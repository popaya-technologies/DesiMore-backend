"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installErrorLogger = installErrorLogger;
const error_log_service_1 = require("../services/error-log.service");
let installed = false;
// Preserve normal console output while recording the backend's existing error/warn calls.
function installErrorLogger(service = error_log_service_1.errorLogService) {
    if (installed)
        return () => { };
    installed = true;
    const error = console.error;
    const warn = console.warn;
    const capture = (level, original) => (...args) => {
        original.apply(console, args);
        try {
            void service.append(level, args).catch(() => error.call(console, "Could not write the error log"));
        }
        catch (_a) {
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
