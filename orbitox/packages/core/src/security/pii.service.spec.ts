/// <reference types="jest" />
import { PiiService } from './pii.service';
describe('PiiService', () => {
  let service: PiiService;

  beforeEach(() => {
    service = new PiiService();
  });

  describe('maskEmail', () => {
    it('should mask standard email addresses', () => {
      expect(service.maskEmail('john.doe@example.com')).toBe('j***e@example.com');
    });

    it('should handle short usernames', () => {
      expect(service.maskEmail('ab@example.com')).toBe('*b@example.com');
    });

    it('should return fallback for invalid email', () => {
      expect(service.maskEmail('invalid-email')).toBe('***@***.***');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone numbers keeping country code and last digits', () => {
      expect(service.maskPhone('+1234567890')).toBe('+1*****7890');
    });
  });

  describe('maskCreditCard', () => {
    it('should mask credit cards keeping last 4 digits', () => {
      expect(service.maskCreditCard('4111222233334444')).toBe('************4444');
    });
  });
});
