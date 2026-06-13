import { InvoiceRepository } from '../repositories/invoice.repository';
import { InvoiceRecord } from '../types/domain';
import { AppError } from '../utils/errors';

export class InvoiceService {
  constructor(private readonly invoiceRepository = new InvoiceRepository()) {}

  async listForUser(userId: string): Promise<InvoiceRecord[]> {
    return this.invoiceRepository.listByUserId(userId);
  }

  async getByIdForUser(userId: string, invoiceId: string): Promise<InvoiceRecord> {
    const invoice = await this.invoiceRepository.findById(invoiceId);
    if (!invoice || invoice.userId !== userId) {
      throw new AppError(404, 'Invoice was not found.', 'invoice_not_found');
    }

    return invoice;
  }
}
