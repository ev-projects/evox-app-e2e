/**
 * EVOX Frontend Jest — jobOpeningReducers (admin)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/jobOpeningReducer.test.js
 */
import jobOpeningReducers from '../../../../store/reducers/admin/jobOpeningReducers';

const initState = { careers: [], isCareerListLoaded: false };

describe('jobOpeningReducers', () => {
    it('returns the initial state', () => {
        expect(jobOpeningReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, careers: [{ id: 1 }] };
        expect(jobOpeningReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_CAREERS_SUCCESS', () => {
        const list = [{ id: 1, title: 'Dev' }];
        const next = jobOpeningReducers(initState, { type: 'FETCH_CAREERS_SUCCESS', list });
        expect(next.careerlist).toEqual(list);
        expect(next.careers).toEqual([]);
        expect(next.isCareerListLoaded).toBe(false);
    });
});
