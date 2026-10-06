"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorLogController = void 0;
const error_log_service_1 = require("../services/error-log.service");
const api_error_1 = require("../utils/api-error");
// Do not log log-storage failures through the logger itself.
function failure(res, error) {
    res.status(error instanceof api_error_1.ApiError ? error.status : 500).json({ message: error instanceof api_error_1.ApiError ? error.message : "Could not access the error log" });
}
exports.ErrorLogController = {
    read: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield error_log_service_1.errorLogService.read());
        }
        catch (error) {
            failure(res, error);
        }
    }),
    download: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const content = yield error_log_service_1.errorLogService.download();
            res.attachment(`error-log-${new Date().toISOString().slice(0, 10)}.log`);
            res.type("text/plain").send(content);
        }
        catch (error) {
            failure(res, error);
        }
    }),
    clear: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            if (((_a = req.body) === null || _a === void 0 ? void 0 : _a.confirm) !== "CLEAR")
                throw new api_error_1.ApiError(400, "Confirm clearing the error log");
            res.json(yield error_log_service_1.errorLogService.clear());
        }
        catch (error) {
            failure(res, error);
        }
    }),
};
