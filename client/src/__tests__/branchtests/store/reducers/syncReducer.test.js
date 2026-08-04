/**
 * EVOX Frontend Jest — syncReducers (admin)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/syncReducer.test.js
 */
import syncReducers from '../../../../store/reducers/admin/syncReducers';

const initState = { leaves: [], users: [], biometrics: [] };

describe('syncReducers', () => {
    it('returns the initial state', () => {
        expect(syncReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, users: [{ id: 1 }] };
        expect(syncReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles SYNC_BHR_LEAVES', () => {
        const next = syncReducers(initState, { type: 'SYNC_BHR_LEAVES', content: [1, 2] });
        expect(next.leaves).toEqual([1, 2]);
    });

    it('handles SYNC_UTC_ADJUST (also writes to leaves)', () => {
        const next = syncReducers(initState, { type: 'SYNC_UTC_ADJUST', content: [3] });
        expect(next.leaves).toEqual([3]);
    });

    it('handles SYNC_USER_UPDATES', () => {
        const next = syncReducers(initState, { type: 'SYNC_USER_UPDATES', content: [{ id: 1 }] });
        expect(next.users).toEqual([{ id: 1 }]);
    });

    it('handles SYNC_BIOMETRICS', () => {
        const next = syncReducers(initState, { type: 'SYNC_BIOMETRICS', content: [{ id: 9 }] });
        expect(next.biometrics).toEqual([{ id: 9 }]);
    });
});
