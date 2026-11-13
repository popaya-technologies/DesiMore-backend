import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { SystemLanguage } from "../entities/system-language.entity";
import { ApiError } from "../utils/api-error";

export async function getDefaultSystemLanguage(
  manager: EntityManager = AppDataSource.manager,
) {
  const language = await manager.getRepository(SystemLanguage).findOne({
    where: { isDefault: true, status: true },
  });

  if (!language) {
    throw new ApiError(400, "Create an enabled default language first");
  }

  return language;
}
