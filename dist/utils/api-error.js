"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respondError = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(status, message, errors) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}
exports.ApiError = ApiError;
const respondError = (res, error) => {
    if (error instanceof ApiError) {
        res
            .status(error.status)
            .json(Object.assign({ message: error.message }, (error.errors ? { errors: error.errors } : {})));
        return;
    }
    if (["23505", "23503"].includes(error.code)) {
        res.status(409).json({ message: "Conflicting or referenced data" });
        return;
    }
    if (error.code === "22P02") {
        res.status(400).json({ message: "Invalid identifier or value" });
        return;
    }
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
};
exports.respondError = respondError;
