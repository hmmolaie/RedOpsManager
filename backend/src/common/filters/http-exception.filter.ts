import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body && 'message' in body) {
        message = (body as { message: string | string[] }).message;
      }
      code = 'HTTP_ERROR';
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'A record with this unique value already exists';
        code = 'UNIQUE_CONSTRAINT';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
        code = 'NOT_FOUND';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = 'Database request failed';
        code = exception.code;
      }
    } else if (exception instanceof Error && (exception as Error & { status?: number }).status === 403) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
      code = 'FORBIDDEN';
    }

    if (status >= 500) {
      this.logger.error(exception);
    }

    res.status(status).json({
      statusCode: status,
      code,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
