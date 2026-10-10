import { DataSource } from "typeorm";
import { AppDataSource } from "../data-source";
import { NewsletterSubscriber } from "../entities/newsletter-subscriber.entity";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export class NewsletterService {
  constructor(private db: DataSource = AppDataSource) {}

  async setPreference(email: string, subscribed: boolean) {
    const normalizedEmail = normalizeEmail(email);
    const repository = this.db.getRepository(NewsletterSubscriber);
    await repository.upsert(
      { email: normalizedEmail, isActive: subscribed },
      { conflictPaths: ["email"] },
    );
    return { email: normalizedEmail, subscribed };
  }

  async getPreference(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const subscriber = await this.db
      .getRepository(NewsletterSubscriber)
      .findOneBy({ email: normalizedEmail });
    return { email: normalizedEmail, subscribed: subscriber?.isActive === true };
  }
}
