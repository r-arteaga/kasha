import { routes } from './app.routes';

describe('routes', () => {
  it('uses English paths', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '',
      'listen',
      'lesson/new',
      'lesson/:id',
      'lesson/:id/edit',
      'lesson/:id/kasha/new',
      'kasha/:id',
      'settings',
      '**',
    ]);
  });
});
