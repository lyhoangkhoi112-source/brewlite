import { getNextSequentialCode } from './sequential-code.js';

describe('getNextSequentialCode', () => {
  it('starts numbering at one', () => {
    expect(getNextSequentialCode('HD', [])).toBe('HD00000001');
  });

  it('uses the smallest available number after hard deletion', () => {
    expect(
      getNextSequentialCode('HD', ['HD00000002', 'HD00000003']),
    ).toBe('HD00000001');
  });

  it('does not reuse a number that is still present, including soft-deleted records', () => {
    expect(
      getNextSequentialCode('HD', [
        'HD00000001',
        'HD00000003',
      ]),
    ).toBe('HD00000002');
  });

  it('ignores codes from another role prefix', () => {
    expect(
      getNextSequentialCode('NV', ['KH00000001', 'NV00000002']),
    ).toBe('NV00000001');
  });
});
