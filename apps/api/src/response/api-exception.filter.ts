import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { responseData } from './globalClass.js';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      status >= HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : 'Request failed';

    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'string') {
  message = body;
} else if (
  typeof body === 'object' &&
  body !== null &&
  'message' in body
) {
  const bodyMessage = body.message;

  if (typeof bodyMessage === 'string') {
    message = bodyMessage;
  } else if (Array.isArray(bodyMessage)) {
    message = bodyMessage.join(', ');
  }
}

    response
      .status(status)
      .json(new responseData<null>(null, status, message));
  }
}

}