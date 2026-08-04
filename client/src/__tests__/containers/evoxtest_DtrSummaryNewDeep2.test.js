/**
 * evoxtest_DtrSummaryNewDeep2.test.js
 * Wave-6 coverage for container/MyTeam/DtrSummaryNew/DtrSummaryNew.js (fresh: 50 unc / 43.2%).
 * Arms: componentDidMount default-department auto-fetch (with and without cutoff dates),
 * onSubmitHandler's six dispatch modes — default fetch, export department/all/all_new/
 * department_new (each with its own key-filter rules) and dtr_conflict — plus the
 * next-page bump when pagination has_next_page. Driven via instance ref. ADDITIVE ONLY.
 * Menu: My Team → DTR Summary (routes: dtr_summary, dtr_summary_new).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input type="date" name={name} />,
    InputTime: ({ name }) => <input type="time" name={name} />,
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/dtr/dtrSummaryActions', () => ({
    fetchNewDtrSummary: jest.fn(), exportDtrSummary: jest.fn(),
    exportNewDtrSummary: jest.fn(), exportNewDtrSummary1: jest.fn(),
}));

const DtrSummaryNew = require('../../container/MyTeam/DtrSummaryNew/DtrSummaryNew').default;

function makeActions() {
    return {
        fetchNewDtrSummary: jest.fn(), exportDtrSummary: jest.fn(),
        exportNewDtrSummary: jest.fn(), exportNewDtrSummary1: jest.fn(),
    };
}

const baseProps = {
    user: { id: 1, departments_handled: [{ id: 5, department_name: 'Eng' }] },
    settings: { current_payroll_cutoff: { start_date: '2026-07-16', end_date: '2026-08-15' } },
    dtrSummary: { pagination: { current_page: 1, has_next_page: false }, result: [] },
    filters: {},
};

function renderDSN(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DtrSummaryNew ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

const values = (overrides = {}) => ({
    valid_from: new Date(2026, 6, 16), valid_to: new Date(2026, 7, 15),
    department_id: 5, name: 'Alice', is_active: 1, export: false, ...overrides,
});

beforeEach(() => jest.clearAllMocks());

describe('DtrSummaryNew', () => {
    test('mount adopts the first handled department and auto-fetches within the cutoff', () => {
        const { ref, actions } = renderDSN();
        expect(ref.current.state.initialState.department_id).toBe(5);
        expect(actions.fetchNewDtrSummary).toHaveBeenCalledTimes(1);
        const fd = actions.fetchNewDtrSummary.mock.calls[0][0];
        expect(fd.valid_from).toBe('2026-07-16');
        expect(fd.department_id).toBe(5);
        expect(fd.page).toBe(1);
    });

    test('mount without cutoff dates adopts the department but skips the auto-fetch', () => {
        const { actions } = renderDSN({ settings: {} });
        expect(actions.fetchNewDtrSummary).not.toHaveBeenCalled();
    });

    test('default submit fetches; has_next_page bumps the page', () => {
        const { ref, actions } = renderDSN({
            dtrSummary: { pagination: { current_page: 2, has_next_page: true }, result: [] },
        });
        actions.fetchNewDtrSummary.mockClear();
        ref.current.onSubmitHandler(values());
        const fd = actions.fetchNewDtrSummary.mock.calls[0][0];
        expect(fd.page).toBe(3); // 2 + next-page bump
        expect(fd.name).toBe('Alice');
    });

    test('export department keeps filters; export all drops department_id and name', () => {
        const { ref, actions } = renderDSN();
        ref.current.onSubmitHandler(values({ export: 'department' }));
        let fd = actions.exportDtrSummary.mock.calls[0][0];
        expect(fd.export).toBe('department');
        expect(fd.department_id).toBe(5);

        ref.current.onSubmitHandler(values({ export: 'all' }));
        fd = actions.exportDtrSummary.mock.calls[1][0];
        expect(fd.department_id).toBeUndefined();
        expect(fd.name).toBeUndefined();
        expect(fd.valid_from).toBe('2026-07-16');
    });

    test('all_new and department_new route to exportNewDtrSummary with their filter rules', () => {
        const { ref, actions } = renderDSN();
        ref.current.onSubmitHandler(values({ export: 'all_new' }));
        let fd = actions.exportNewDtrSummary.mock.calls[0][0];
        expect(fd.department_id).toBeUndefined(); // dropped in all_new

        ref.current.onSubmitHandler(values({ export: 'department_new' }));
        fd = actions.exportNewDtrSummary.mock.calls[1][0];
        expect(fd.department_id).toBe(5);         // kept in department_new
        expect(fd.name).toBeUndefined();          // name dropped in both
    });

    test('dtr_conflict routes to exportNewDtrSummary1 with the base formData', () => {
        const { ref, actions } = renderDSN();
        ref.current.onSubmitHandler(values({ export: 'dtr_conflict' }));
        expect(actions.exportNewDtrSummary1).toHaveBeenCalledTimes(1);
        expect(actions.exportNewDtrSummary1.mock.calls[0][0].valid_from).toBe('2026-07-16');
    });
});
