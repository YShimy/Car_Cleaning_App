import { BRAND } from '@/config/brand';

describe('brand config', () => {
  it('has a name and tagline', () => {
    expect(BRAND.name).toBeTruthy();
    expect(BRAND.tagline).toMatch(/parking spot/);
  });
});
