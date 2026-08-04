/**
 * EVOX Frontend Jest — teamSchedule reducer (team / schedule)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/teamScheduleReducer.test.js
 */
import teamSchedule from '../../../../store/reducers/schedule/teamSchedule';

const initState = {
    list: null,
    team_list: [],
    team_schedule: { data: [], date_list: [], week_list: [], holiday_list: [] },
    filters: {},
};

describe('teamSchedule reducer', () => {
    it('returns the initial state', () => {
        expect(teamSchedule(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, list: [{ id: 1 }] };
        expect(teamSchedule(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_MY_TEAM_LIST_SUCCESS', () => {
        const next = teamSchedule(initState, { type: 'FETCH_MY_TEAM_LIST_SUCCESS', list: [{ id: 1 }] });
        expect(next.list).toEqual([{ id: 1 }]);
    });

    it('handles FETCH_TEAM_LIST_SUCCESS', () => {
        const next = teamSchedule(initState, { type: 'FETCH_TEAM_LIST_SUCCESS', list: [{ id: 2 }] });
        expect(next.team_list).toEqual([{ id: 2 }]);
    });

    it('handles FETCH_DAILY_TEAM_SCHEDULE_SUCCESS', () => {
        const next = teamSchedule(initState, {
            type: 'FETCH_DAILY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: { data: [{ shift: 'AM' }] },
        });
        expect(next.team_schedule).toEqual({ data: [{ shift: 'AM' }], date_list: [], week_list: [] });
    });

    it('handles FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS (merges a single date)', () => {
        const prev = {
            ...initState,
            team_schedule: { data: {}, date_list: {}, week_list: [], holiday_list: [] },
        };
        const next = teamSchedule(prev, {
            type: 'FETCH_DAILY_TEAM_SCHEDULE_MORE_SUCCESS',
            date: '2026-01-05',
            team_schedule: { data: { '2026-01-05': [{ shift: 'PM' }] } },
        });
        expect(next.team_schedule.data['2026-01-05']).toEqual([{ shift: 'PM' }]);
        expect(next.team_schedule.date_list['2026-01-05']).toBe(false);
    });

    it('handles FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS', () => {
        const next = teamSchedule(initState, {
            type: 'FETCH_WEEKLY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: { data: [1], date_list: [2], holiday_list: [3] },
        });
        expect(next.team_schedule).toEqual({ data: [1], date_list: [2], holiday_list: [3], week_list: [] });
    });

    it('handles FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS', () => {
        const next = teamSchedule(initState, {
            type: 'FETCH_MONTHLY_TEAM_SCHEDULE_SUCCESS',
            team_schedule: { data: [1], date_list: [2], holiday_list: [3], week_list: [4] },
        });
        expect(next.team_schedule).toEqual({ data: [1], date_list: [2], holiday_list: [3], week_list: [4] });
    });

    it('handles SET_MY_TEAM_LIST_FILTERS', () => {
        const next = teamSchedule(initState, { type: 'SET_MY_TEAM_LIST_FILTERS', filters: { week: 1 } });
        expect(next.filters).toEqual({ week: 1 });
    });

    it('handles FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS', () => {
        const next = teamSchedule(initState, {
            type: 'FETCH_TEAM_UNDER_DEPARTMENT_LIST_SUCCESS',
            list: [{ id: 5 }],
        });
        expect(next.team_list).toEqual([{ id: 5 }]);
    });
});
