/**
 * EVOX Frontend Jest — departmentAnnouncementReducers (announcements)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/departmentAnnouncementReducer.test.js
 */
import departmentAnnouncementReducers from '../../../../store/reducers/announcements/departmentAnnouncementReducers';

const initState = {
    department: [],
    isDepartmentAnnouncementListLoaded: false,
    hideShowMore: false,
};

describe('departmentAnnouncementReducers', () => {
    it('returns the initial state', () => {
        expect(departmentAnnouncementReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, hideShowMore: true };
        expect(departmentAnnouncementReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS', () => {
        const list = [{ id: 1 }];
        const next = departmentAnnouncementReducers(initState, {
            type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            list,
        });
        expect(next.depAnnouncementlist).toEqual(list);
        expect(next.isDepartmentAnnouncementListLoaded).toBe(true);
        expect(next.hideShowMore).toBe(false);
    });

    it('handles INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS (concats + hideShowMore when < 3)', () => {
        const prev = { ...initState, depAnnouncementlist: [{ id: 1 }] };
        const next = departmentAnnouncementReducers(prev, {
            type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            list: [{ id: 2 }],
        });
        expect(next.depAnnouncementlist).toEqual([{ id: 1 }, { id: 2 }]);
        expect(next.hideShowMore).toBe(true); // length 1 (< 3)
    });

    it('INCREMENT keeps hideShowMore false when a full page (>= 3) is returned', () => {
        const prev = { ...initState, depAnnouncementlist: [] };
        const next = departmentAnnouncementReducers(prev, {
            type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
            list: [{ id: 1 }, { id: 2 }, { id: 3 }],
        });
        expect(next.hideShowMore).toBe(false);
    });

    it('handles FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS', () => {
        const next = departmentAnnouncementReducers(initState, {
            type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_SUCCESS',
            announcement: { id: 7 },
        });
        expect(next).toEqual({ instance: { id: 7 }, isInstanceLoaded: true });
    });

    it('handles CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE', () => {
        const next = departmentAnnouncementReducers(initState, {
            type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_INSTANCE',
        });
        expect(next).toEqual({ instance: {}, isInstanceLoaded: false });
    });

    it('handles CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE', () => {
        const next = departmentAnnouncementReducers(initState, {
            type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE',
        });
        expect(next).toEqual({
            depAnnouncementlist: {},
            isDepartmentAnnouncementListLoaded: false,
            hideShowMore: false,
        });
    });
});
