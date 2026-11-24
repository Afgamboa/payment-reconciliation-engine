import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../common/guards/admin-key.guard.js';
import { ReconciliationService } from './reconciliation.service.js';

@Controller('admin/reconciliation')
@UseGuards(AdminKeyGuard)
export class ReconciliationController {
  constructor(private readonly reconciliation: ReconciliationService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  run() {
    return this.reconciliation.run();
  }
}
