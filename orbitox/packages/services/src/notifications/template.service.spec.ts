import { TemplateService } from './template.service';

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  it('should interpolate template variables correctly', () => {
    const template = 'Hello {{ name }}, welcome to {{ company }}!';
    const variables = { name: 'John', company: 'OrbitoX' };

    const result = service.render(template, variables);
    expect(result).toBe('Hello John, welcome to OrbitoX!');
  });

  it('should handle missing variables by replacing with empty string', () => {
    const template = 'Hello {{ name }}, your score is {{ score }}';
    const variables = { name: 'Alice' };

    const result = service.render(template, variables);
    expect(result).toBe('Hello Alice, your score is ');
  });
});
