/**
 * EVOX Frontend Jest — assignRoleReducers (admin)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/assignRoleReducer.test.js
 * Pure reducer: one assertion per switch case + initial state + unknown action.
 */
import assignRoleReducers from '../../../../store/reducers/admin/assignRoleReducers';

const initState = {
    isRolesLoaded: false,
    roles: null,
    isUserRolesPermissionsLoaded: false,
    userRole: null,
    payroll: '',
    isUserListLoaded: false,
    userLists: {},
};

describe('assignRoleReducers', () => {
    it('returns the initial state when called with undefined + unknown action', () => {
        expect(assignRoleReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action type', () => {
        const prev = { ...initState, roles: ['admin'] };
        expect(assignRoleReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_ROLES', () => {
        const next = assignRoleReducers(initState, { type: 'FETCH_ROLES', roles: ['a', 'b'] });
        expect(next).toEqual({ roles: ['a', 'b'], isRolesLoaded: true });
    });

    it('handles FETCH_USER', () => {
        const next = assignRoleReducers(initState, { type: 'FETCH_USER', userLists: [{ id: 1 }] });
        expect(next).toEqual({ userLists: [{ id: 1 }], isUserListLoaded: true });
    });

    it('handles FETCH_PAYROLL_PERIOD', () => {
        const next = assignRoleReducers(initState, { type: 'FETCH_PAYROLL_PERIOD', payroll: 'JAN' });
        expect(next).toEqual({ payroll: 'JAN' });
    });

    it('FETCH_USER_ROLE_AND_PERMISSION — case removed from reducer, returns unchanged state', () => {
        // Role/permission tracking removed from Redux when Spatie laravel-permission was
        // dropped. The action now falls through to default and the state is returned unchanged.
        const next = assignRoleReducers(initState, {
            type: 'FETCH_USER_ROLE_AND_PERMISSION',
            userRole: ['admin'],
            userPermission: ['full_access'],
        });
        expect(next).toBe(initState);
        expect(next.userRole).toBeNull();
        expect(next.isUserRolesPermissionsLoaded).toBe(false);
    });

    it('handles FETCH_USER_FEATURES', () => {
        const next = assignRoleReducers(initState, {
            type: 'FETCH_USER_FEATURES',
            userLevel: 3,
            userFeatures: ['f1'],
        });
        expect(next).toEqual({
            userLevel: 3,
            userFeatures: ['f1'],
            isUserRolesPermissionsLoaded: true,
        });
    });
});
