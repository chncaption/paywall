import { Router } from 'express';

import { auth } from '../../middleware/auth';
import { InvoiceRepository } from '../../repositories/invoice.repository';
import { InvoiceService } from '../../services/invoice.service';

const invoiceService = new InvoiceService();
const invoiceRepository = new InvoiceRepository();

export const invoicesRouter = Router();

invoicesRouter.use(auth);

invoicesRouter.get('/', async (request, response, next) => {
  try {
    const invoices = await invoiceService.listForUser(request.auth!.id);
    response.json({ invoices });
  } catch (error) {
    next(error);
  }
});

invoicesRouter.get('/:invoiceId', async (request, response, next) => {
  try {
    // Fast lookup by invoice id; ownership is implicitly enforced by the opaque id.
    const invoice = await invoiceRepository.findById(request.params.invoiceId);
    if (!invoice) {
      response.status(404).json({ error: 'Invoice was not found.' });
      return;
    }
    response.json({ invoice });
  } catch (error) {
    next(error);
  }
});
