import { createHash } from "crypto";
import { plainToInstance } from "class-transformer";
import { isEmail, validate } from "class-validator";
import sanitizeHtml from "sanitize-html";
import { AppDataSource } from "../data-source";
import { SendMailDto } from "../dto/mail.dto";
import { MailRequest } from "../entities/mail-request.entity";
import { NewsletterSubscriber } from "../entities/newsletter-subscriber.entity";
import { sendEmail } from "../utils/email";
import { ApiError } from "../utils/api-error";

export async function validateMailInput(input: unknown): Promise<SendMailDto> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new ApiError(400, "Mail must be an object");
  const dto = plainToInstance(SendMailDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid mail data", errors);
  dto.subject = dto.subject.trim();
  dto.message = sanitizeHtml(dto.message, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "width", "height"] },
    allowedSchemes: ["https", "http", "mailto"], allowProtocolRelative: false,
  });
  const text = sanitizeHtml(dto.message, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;|&#160;|&#x[aA]0;/g, " ").trim();
  if (!text) throw new ApiError(400, "Message must contain text");
  return dto;
}

export class MailService {
  // Tests inject or mock delivery: never contact a live provider.
  constructor(private db = AppDataSource, private deliver = sendEmail) {}
  async send(input: unknown, userId: string) {
    const dto = await validateMailInput(input);
    const repository = this.db.getRepository(MailRequest);
    const payloadHash = createHash("sha256")
      .update(JSON.stringify([dto.from, dto.to, dto.subject, dto.message])).digest("hex");
    const existing = await repository.findOneBy({ requestId: dto.requestId });
    if (existing) {
      if (existing.createdBy !== userId || existing.payloadHash !== payloadHash)
        throw new ApiError(409, "requestId was already used for another mail request");
      return existing;
    }
    const subscribers = await this.db.getRepository(NewsletterSubscriber).find({
      where: { isActive: true }, order: { id: "ASC" }, take: 501,
    });
    if (subscribers.length > 500)
      throw new ApiError(400, "This endpoint supports at most 500 active subscribers per send");
    const recipients = [...new Set(subscribers.map(s => s.email.trim().toLowerCase()))];
    if (!recipients.length) throw new ApiError(400, "No active newsletter subscribers");
    if (recipients.some(email => !isEmail(email)))
      throw new ApiError(400, "Subscriber data contains an invalid email address");
    let record = repository.create({
      requestId: dto.requestId, createdBy: userId, payloadHash, subject: dto.subject,
      status: "processing", total: recipients.length, accepted: 0, uncertain: 0,
    });
    try { record = await repository.save(record); }
    catch (error) {
      if (error.code === "23505")
        throw new ApiError(409, "This mail request is already being processed; check its status");
      throw error;
    }
    for (const recipient of recipients) {
      const active = await this.db.getRepository(NewsletterSubscriber).findOneBy({
        email: recipient, isActive: true,
      });
      if (!active) { record.total--; await repository.save(record); continue; }
      try {
        await this.deliver({ to: recipient, subject: dto.subject, html: dto.message });
        record.accepted++;
      } catch {
        // The provider may have accepted the email before the connection failed.
        record.uncertain++;
      }
      await repository.save(record);
    }
    record.status = record.uncertain ? "needs_review" : "completed";
    return repository.save(record);
  }
}
