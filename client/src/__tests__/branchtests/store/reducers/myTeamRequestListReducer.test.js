/**
 * EVOX Frontend Jest — myTeamRequestListReducers (team / filters)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/myTeamRequestListReducer.test.js
 */
import myTeamRequestListReducers from '../../../../store/reducers/filters/myTeamRequestListReducers';

const initState = {
    isListLoaded: false,
    isNumbersLoaded: false,
    stored_departments: {},
    instance: {},
    statusNumbers: null,
    filters: {},
    requesttype: null,
    overrallstatusNumbers: null,
};

describe('myTeamRequestListReducers', () => {
    it('returns the initial state', () => {
        expect(myTeamRequestListReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, isListLoaded: true };
        expect(myTeamRequestListReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_MY_TEAM_REQUEST_LIST_SUCCESS', () => {
        const next = myTeamRequestListReducers(initState, {
            type: 'FETCH_MY_TEAM_REQUEST_LIST_SUCCESS',
            requestList: { rows: [1] },
        });
        expect(next.instance).toEqual({ rows: [1] });
        expect(next.isListLoaded).toBe(true);
    });

    it('handles FETCH_MY_TEAM_REFRESH_DEP_LIST with departments present', () => {
        const next = myTeamRequestListReducers(initState, {
            type: 'FETCH_MY_TEAM_REFRESH_DEP_LIST',
            content: { result: { department: [{ id: 1 }] } },
        });
        expect(next.stored_departments).toEqual([{ id: 1 }]);
    });

    it('handles FETCH_MY_TEAM_REFRESH_DEP_LIST with no departments (returns unchanged copy)', () => {
        const next = myTeamRequestListReducers(initState, {
            type: 'FETCH_MY_TEAM_REFRESH_DEP_LIST',
            content: { result: { department: [] } },
        });
        expect(next.stored_departments).toEqual({});
        expect(next).toEqual(initState);
    });

    it('handles FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS', () => {
        const next = myTeamRequestListReducers(initState, {
            type: 'FETCH_MY_TEAM_REQUEST_STATUS_NUMBERS',
            statusNumbers: { pending: 2 },
        });
        expect(next.statusNumbers).toEqual({ pending: 2 });
        expect(next.isNumbersLoaded).toBe(true);
    });

    it('handles SET_MY_TEAM_REQUEST_LIST_FILTERS', () => {
        const next = myTeamRequestListReducers(initState, {
            type: 'SET_MY_TEAM_REQUEST_LIST_FILTERS',
            filters: { status: 'open' },
        });
        expect(next.filters).toEqual({ status: 'open' });
    });

    it('handles EVENT_CLICK', () => {
        const next = myTeamRequestListReducers(initState, { type: 'EVENT_CLICK', requesttype: 'leave' });
        expect(next.requesttype).toBe('leave');
    });

    it('handles OVERRALL_REQUEST', () => {
        const next = myTeamRequestListReducers(initState, {
            type: 'OVERRALL_REQUEST',
            overrallstatusNumbers: { total: 10 },
        });
        expect(next.overrallstatusNumbers).toEqual({ total: 10 });
    });
});
