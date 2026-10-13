import { SUPPLIER_ROUTES } from './supplier.routes';

describe('SUPPLIER_ROUTES', () => {
  it('protects list, create, and detail routes with their intended permissions', () => {
    const permissions = new Map(
      SUPPLIER_ROUTES.map(route => [route.path, route.data?.['permissionKey'] as string])
    );

    expect(permissions.get('suppliers')).toBe('SUPPLIER_VIEW');
    expect(permissions.get('suppliers/new')).toBe('SUPPLIER_CREATE');
    expect(permissions.get('suppliers/:supplierCode')).toBe('SUPPLIER_VIEW');
    expect(SUPPLIER_ROUTES.every(route => (route.canActivate?.length ?? 0) > 0)).toBeTrue();
  });

  it('places the literal new route before the supplier-code parameter route', () => {
    expect(SUPPLIER_ROUTES.findIndex(route => route.path === 'suppliers/new'))
      .toBeLessThan(SUPPLIER_ROUTES.findIndex(route => route.path === 'suppliers/:supplierCode'));
  });
});
