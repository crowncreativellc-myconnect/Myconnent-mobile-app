import { runLocalModeration, normaliseInput } from '../moderationPatterns';

describe('normaliseInput', () => {
  it('lowercases and strips leet-speak', () => {
    expect(normaliseInput('C0c@1n3')).toBe('cocaine');
  });

  it('collapses repeated chars (zaaaaaa → zaa)', () => {
    expect(normaliseInput('zaaaaaa')).toBe('zaa');
  });

  it('removes dot-masking (c.o.c.a.i.n.e → cocaine)', () => {
    expect(normaliseInput('c.o.c.a.i.n.e')).toBe('cocaine');
  });
});

describe('runLocalModeration — drug services', () => {
  it.each(['weed', 'cocaine', 'zaa', 'zaza', 'zaaaaaa', 'C0c@1n3'])(
    'blocks standalone hit: %s',
    (input) => {
      const result = runLocalModeration(normaliseInput(input));
      expect(result.passed).toBe(false);
      expect(result.category).toBe('drug_services');
    },
  );

  it.each(['pizza party', 'plaza', 'Liza', 'I need a python developer', 'lawn mowing service'])(
    'allows benign input: %s',
    (input) => {
      const result = runLocalModeration(normaliseInput(input));
      expect(result.passed).toBe(true);
    },
  );
});
