/**
 * EVOX Frontend Jest — freshServiceReducers (freshservice)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/freshServiceReducer.test.js
 */
import freshServiceReducers from '../../../../store/reducers/freshservice/freshServiceReducers';

const initState = { isInstanceLoaded: false, instance: {} };

describe('freshServiceReducers', () => {
    it('returns the initial state', () => {
        expect(freshServiceReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, isInstanceLoaded: true };
        expect(freshServiceReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_WORKSPACES_SUCCESS', () => {
        const next = freshServiceReducers(initState, {
            type: 'FETCH_WORKSPACES_SUCCESS',
            workspaces: [{ id: 1 }],
            categories: [{ id: 2 }],
            sub_categories: [{ id: 3 }],
            isLoaded: true,
        });
        expect(next.workspaces).toEqual([{ id: 1 }]);
        expect(next.categories).toEqual([{ id: 2 }]);
        expect(next.sub_categories).toEqual([{ id: 3 }]);
        expect(next.isInstanceLoaded).toBe(true);
    });

    it('handles CLEAR_FRESHSERVICE_INSTANCE', () => {
        const prev = { ...initState, instance: { id: 9 }, isInstanceLoaded: true };
        const next = freshServiceReducers(prev, { type: 'CLEAR_FRESHSERVICE_INSTANCE' });
        expect(next).toEqual({ instance: {}, isInstanceLoaded: false });
    });
});
