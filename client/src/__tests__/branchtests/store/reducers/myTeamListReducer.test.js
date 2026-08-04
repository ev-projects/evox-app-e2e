/**
 * EVOX Frontend Jest — myTeamListReducers (team / filters)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/myTeamListReducer.test.js
 */
import myTeamListReducers from '../../../../store/reducers/filters/myTeamListReducers';

const initState = {
    list: null,
    team_list: [],
    sub_department: [],
    team_schedule: { data: [], date_list: [], week_list: [] },
    filters: {},
    current_page: 0,
    last_page: 0,
};

describe('myTeamListReducers', () => {
    it('returns the initial state', () => {
        expect(myTeamListReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, list: [{ id: 1 }] };
        expect(myTeamListReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_MY_TEAM_LIST_SUCCESS', () => {
        const next = myTeamListReducers(initState, { type: 'FETCH_MY_TEAM_LIST_SUCCESS', list: [{ id: 1 }] });
        expect(next.list).toEqual([{ id: 1 }]);
    });

    it('handles FETCH_TEAM_LIST_SUCCESS', () => {
        const next = myTeamListReducers(initState, { type: 'FETCH_TEAM_LIST_SUCCESS', list: [{ id: 2 }] });
        expect(next.team_list).toEqual([{ id: 2 }]);
    });

    it('handles SET_MY_TEAM_LIST_FILTERS', () => {
        const next = myTeamListReducers(initState, { type: 'SET_MY_TEAM_LIST_FILTERS', filters: { dept: 3 } });
        expect(next.filters).toEqual({ dept: 3 });
    });

    it('handles FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', () => {
        const next = myTeamListReducers(initState, {
            type: 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS',
            list: [{ id: 4 }],
        });
        expect(next.team_list).toEqual([{ id: 4 }]);
    });

    it('handles FETCH_SUB_DEPARTMENT_LIST_SUCCESS', () => {
        const next = myTeamListReducers(initState, {
            type: 'FETCH_SUB_DEPARTMENT_LIST_SUCCESS',
            list: [{ id: 5 }],
        });
        expect(next.sub_department).toEqual([{ id: 5 }]);
    });
});
