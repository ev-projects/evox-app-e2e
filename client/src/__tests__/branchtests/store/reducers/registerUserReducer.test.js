/**
 * EVOX Frontend Jest — registerUserReducers (admin)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/registerUserReducer.test.js
 */
import registerUserReducers from '../../../../store/reducers/admin/registerUserReducers';

describe('registerUserReducers', () => {
    it('returns the initial state', () => {
        expect(registerUserReducers(undefined, { type: '@@INIT' })).toEqual({ isSuccessful: false });
    });

    it('returns previous state on an unknown action', () => {
        const prev = { isSuccessful: false };
        expect(registerUserReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles REGISTER_USER_SUCCESSFUL', () => {
        const next = registerUserReducers({ isSuccessful: false }, { type: 'REGISTER_USER_SUCCESSFUL' });
        expect(next).toEqual({ isSuccessful: true });
    });
});
