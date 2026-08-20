import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'redops-api', time: new Date().toISOString() };
  }
}
