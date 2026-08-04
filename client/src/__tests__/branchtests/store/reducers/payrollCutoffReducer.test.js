/**
 * EVOX Frontend Jest — payrollCutoffReducers (admin)
 * COPY TO (client tree): client/src/__tests__/branchtests/store/reducers/payrollCutoffReducer.test.js
 */
import payrollCutoffReducers from '../../../../store/reducers/admin/payrollCutoffReducers';

const initState = {
    isListInstanceLoaded: false,
    listInstance: {},
    isInstanceLoaded: false,
    instance: {},
};

describe('payrollCutoffReducers', () => {
    it('returns the initial state', () => {
        expect(payrollCutoffReducers(undefined, { type: '@@INIT' })).toEqual(initState);
    });

    it('returns previous state on an unknown action', () => {
        const prev = { ...initState, isInstanceLoaded: true };
        expect(payrollCutoffReducers(prev, { type: 'NOPE' })).toBe(prev);
    });

    it('handles FETCH_PAYROLL_CUTOFF_LIST_SUCCESS', () => {
        const list = [{ id: 1 }];
        const next = payrollCutoffReducers(initState, { type: 'FETCH_PAYROLL_CUTOFF_LIST_SUCCESS', list });
        expect(next.listInstance).toEqual(list);
        expect(next.isListInstanceLoaded).toBe(true);
    });

    it('handles FETCH_PAYROLL_CUTOFF_SUCCESS', () => {
        const payrollCutoff = { id: 5 };
        const next = payrollCutoffReducers(initState, { type: 'FETCH_PAYROLL_CUTOFF_SUCCESS', payrollCutoff });
        expect(next.instance).toEqual(payrollCutoff);
        expect(next.isInstanceLoaded).toBe(true);
    });

    it('handles CLEAR_PAYROLL_CUTOFF_INSTANCE', () => {
        const prev = { ...initState, instance: { id: 9 }, isInstanceLoaded: true };
        const next = payrollCutoffReducers(prev, { type: 'CLEAR_PAYROLL_CUTOFF_INSTANCE' });
        expect(next.instance).toEqual({});
        expect(next.isInstanceLoaded).toBe(false);
    });

    it('handles CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE', () => {
        const prev = { ...initState, listInstance: [{ id: 9 }], isListInstanceLoaded: true };
        const next = payrollCutoffReducers(prev, { type: 'CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE' });
        expect(next.listInstance).toEqual({});
        expect(next.isListInstanceLoaded).toBe(false);
    });
});
