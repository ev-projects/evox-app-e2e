/**
 * EVOX Frontend Jest — departmentListReducers (admin)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/departmentListReducer.test.js
 */
import departmentListReducers from '../../../../store/reducers/admin/departmentListReducers';

const initState = { department: [], isDepartmentListLoaded: false };

describe('departmentListReducers', () => {
    it('returns the initial state', () => {
        expect(departmentListReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, department: [{ id: 1 }] };
        expect(departmentListReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_DEPARTMENT_LIST_LOAD_SUCCESS', () => {
        const list = [{ id: 1 }, { id: 2 }];
        const next = departmentListReducers(initState, {
            type: 'FETCH_DEPARTMENT_LIST_LOAD_SUCCESS',
            list,
        });
        expect(next.Deplist).toEqual(list);
        expect(next.isDepartmentListLoaded).toBe(true);
        expect(next.department).toEqual([]);
    });
});
