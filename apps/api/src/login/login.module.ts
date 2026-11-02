import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { LoginController } from './login.controller.js';
import { LoginService } from './login.service.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET must be configured');
        }

        return {
          secret,
          signOptions: { expiresIn: 60 * 60 },
        };
      },
    }),
  ],
  controllers: [LoginController],
  providers: [LoginService],
})
export class LoginModule {}