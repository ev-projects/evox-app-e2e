/**
 * EVOX Frontend Jest — opsScheduleReducers (opsschedule)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/opsScheduleReducer.test.js
 */
import opsScheduleReducers from '../../../../store/reducers/opsschedule/opsScheduleReducers';

const initState = { isInstanceLoaded: false, instance: {} };

describe('opsScheduleReducers', () => {
    it('returns the initial state', () => {
        expect(opsScheduleReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, isInstanceLoaded: true };
        expect(opsScheduleReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_OPSSCHEDULES_SUCCESS with a non-empty list', () => {
        const list = [{ id: 1 }];
        const next = opsScheduleReducers(initState, { type: 'FETCH_OPSSCHEDULES_SUCCESS', list });
        expect(next.listInstance).toEqual(list);
        expect(next.isListInstanceLoaded).toBe(true);
    });

    it('handles FETCH_OPSSCHEDULES_SUCCESS with an empty list (not loaded)', () => {
        const next = opsScheduleReducers(initState, { type: 'FETCH_OPSSCHEDULES_SUCCESS', list: [] });
        expect(next.listInstance).toEqual([]);
        expect(next.isListInstanceLoaded).toBe(false);
    });

    it('handles FETCH_OPSSCHEDULE_SUCCESS', () => {
        const next = opsScheduleReducers(initState, { type: 'FETCH_OPSSCHEDULE_SUCCESS', data: { id: 7 } });
        expect(next.instance).toEqual({ id: 7 });
        expect(next.isInstanceLoaded).toBe(true);
    });

    it('handles STORE_OPSSCHEDULE_SUCCESS (returns empty object)', () => {
        const next = opsScheduleReducers(initState, { type: 'STORE_OPSSCHEDULE_SUCCESS' });
        expect(next).toEqual({});
    });

    it('handles CLEAR_OPSSCHEDULE_INSTANCE', () => {
        const prev = { ...initState, instance: { id: 9 }, isInstanceLoaded: true };
        const next = opsScheduleReducers(prev, { type: 'CLEAR_OPSSCHEDULE_INSTANCE' });
        expect(next).toEqual({ instance: {}, isInstanceLoaded: false });
    });
});
