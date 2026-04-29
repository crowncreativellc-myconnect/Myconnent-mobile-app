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

describe('runLocalModeration — sexual exploitation solicitation', () => {
  it.each([
    'I need hoes',
    'I need a pimp',
    'looking for some hoes',
    'find me a hoe',
    'get me a pimp',
    'gimme some hoes',
    'pimping out girls',
    'pimping women for money',
  ])('blocks solicitation phrase: %s', (input) => {
    const result = runLocalModeration(normaliseInput(input));
    expect(result.passed).toBe(false);
    expect(result.category).toBe('sexual_exploitation');
  });
});

describe('runLocalModeration — profanity', () => {
  it.each([
    'this is fucking ridiculous',
    'what a bitch',
    'shit happens',
    'you asshole',
    'goddamn it',
    'piss off',
    'bullshit deadline',
    'crappy code',
    'damn that hurts',
    'motherfucker',
  ])('blocks profanity: %s', (input) => {
    const result = runLocalModeration(normaliseInput(input));
    expect(result.passed).toBe(false);
    expect(result.category).toBe('profanity');
  });

  it.each([
    'class action lawsuit',
    'passport renewal help',
    'compass design review',
    'Hello there, need a designer',
    'shellfish allergy compliance',
    'cocktail party planner',
    'peacock graphic illustrator',
    'Michelle from accounting',
    'embassy visa appointment',
  ])('does not false-positive on benign substring: %s', (input) => {
    const result = runLocalModeration(normaliseInput(input));
    expect(result.passed).toBe(true);
  });
});
