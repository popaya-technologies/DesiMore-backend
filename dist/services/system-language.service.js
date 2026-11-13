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
exports.getDefaultSystemLanguage = getDefaultSystemLanguage;
const data_source_1 = require("../data-source");
const system_language_entity_1 = require("../entities/system-language.entity");
const api_error_1 = require("../utils/api-error");
function getDefaultSystemLanguage() {
    return __awaiter(this, arguments, void 0, function* (manager = data_source_1.AppDataSource.manager) {
        const language = yield manager.getRepository(system_language_entity_1.SystemLanguage).findOne({
            where: { isDefault: true, status: true },
        });
        if (!language) {
            throw new api_error_1.ApiError(400, "Create an enabled default language first");
        }
        return language;
    });
}
