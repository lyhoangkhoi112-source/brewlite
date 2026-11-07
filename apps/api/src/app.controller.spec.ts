
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  const appService = {
    getHello: vi.fn(() => 'BrewLite API is running!'),
  };

  beforeEach(async () => {
    const app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return the API status message', () => {
      expect(appController.getHello()).toBe('BrewLite API is running!');
      expect(appService.getHello).toHaveBeenCalled();
    });
  });
});
