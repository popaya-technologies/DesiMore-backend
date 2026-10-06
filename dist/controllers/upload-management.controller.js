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
exports.UploadManagementController = void 0;
const upload_management_service_1 = require("../services/upload-management.service");
const api_error_1 = require("../utils/api-error");
exports.UploadManagementController = {
    list: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield upload_management_service_1.uploadManagementService.list(req.query));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    remove: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.json(yield upload_management_service_1.uploadManagementService.remove(req.body));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
