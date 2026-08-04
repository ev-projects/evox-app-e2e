/**
 * evoxtest_DailyTimeRecordIndiaMoroccoDeep2.test.js
 * Wave-6 coverage for container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco.js
 * (fresh: 61 unc / 27.4%). Sibling of DailyTimeRecordPuncher using viewEmployeeDtr:
 * mount filter fetch, year/month cascade resets, cutoff select fetch, hydrate flow,
 * cWRP stored-vs-default arms, and the POV toggle render arm. Ref-driven. ADDITIVE ONLY.
 * Menu: DTR (India/Morocco) (route: dtr_in_mar+':id').
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-select', () => () => <select data-testid="react-select" />);
jest.mock('../../services/DtrFormatter', () => ({
    displaySchedule: jest.fn(() => 'sched'), displayLog: jest.fn(() => 'log'),
    displayDate: jest.fn(() => 'date'), displayHoliday: jest.fn(() => null),
    displayTotalHours: jest.fn(() => '8'),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeeDtr: jest.fn(), getFilterForDtr: jest.fn(), getUserDtrSummary: jest.fn(),
    setSelectedPayrollCutoff: jest.fn(), viewEmployeePunch: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/userActions', () => ({ fetchUser: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}/` });

const DailyTimeRecordIndiaMorocco =
    require('../../container/DailyTimeRecordIndiaMorocco/DailyTimeRecordIndiaMorocco').default;

const cutoff = {
    id: 9, name: 'JUL 16 - AUG 15', year: 2026, month: 7, month_label: 'July',
    start_date: '2026-07-16', end_date: '2026-08-15',
};

function makeActions() {
    return {
        viewEmployeeDtr: jest.fn(() => Promise.resolve()),
        getFilterForDtr: jest.fn(),
        getUserDtrSummary: jest.fn(() => Promise.resolve()),
        setSelectedPayrollCutoff: jest.fn(() => Promise.resolve()),
        fetchUser: jest.fn(), setRedirect: jest.fn(),
    };
}

const baseProps = {
    user: { id: 42 },
    params: { id: '42' },
    location: {},
    settings: { current_payroll_cutoff: cutoff },
    dtr: {
        filter: { 2026: { 7: { label: 'July', data: { 9: cutoff } } } },
        selectedPayrollCutoff: {},
        list: [], dtr_list: [], dtr_summary: {}, employeeInfo: { timezone: 'IST' },
    },
};

function renderIM(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DailyTimeRecordIndiaMorocco ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('DailyTimeRecordIndiaMorocco', () => {
    test('mount fetches the DTR filters; year/month cascade resets downstream selections', () => {
        const { ref, actions } = renderIM();
        expect(actions.getFilterForDtr).toHaveBeenCalledWith('42');

        ref.current.setState({ selectedMonth: { value: 7 }, selectedPayrollCutoff: { value: 9 } });
        ref.current.handleSelectYear({ label: '2026', value: 2026 });
        expect(ref.current.state.selectedMonth).toEqual({});
        ref.current.handleSelectMonth({ label: 'July', value: 7 });
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});
    });

    test('cutoff select resolves the cutoff and fetches the employee DTR + summary', () => {
        const { ref, actions } = renderIM();
        ref.current.setState({
            selectedYear: { label: '2026', value: 2026 },
            selectedMonth: { label: 'July', value: 7 },
        });
        ref.current.handleSelectPayrollCutoff({ label: 'JUL 16 - AUG 15', value: 9 });

        expect(actions.viewEmployeeDtr).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');
        // getUserDtrSummary is commented out in this variant — only the DTR fetch fires
        expect(actions.getUserDtrSummary).not.toHaveBeenCalled();
        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(cutoff);
    });

    test('setPayrollCutoffInstance hydrates and fetches; cWRP falls back to the settings default', async () => {
        const utils = renderIM();
        await utils.ref.current.setPayrollCutoffInstance(cutoff);
        expect(utils.ref.current.state.isCurrentPayrollCutoffLoaded).toBe(true);
        expect(utils.actions.viewEmployeeDtr).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');

        // cWRP default arm: no stored cutoff → hydrate from the India/Morocco settings key
        // (this variant reads settings.current_payroll_cutoff_in_mar, not current_payroll_cutoff)
        const fresh = renderIM();
        fresh.rerender(
            <MemoryRouter>
                <DailyTimeRecordIndiaMorocco ref={fresh.ref} {...fresh.props}
                    settings={{ current_payroll_cutoff_in_mar: { ...cutoff } }} />
            </MemoryRouter>
        );
        await flush();
        expect(fresh.ref.current.state.selectedPayrollCutoff.label).toBe('JUL 16 - AUG 15');
    });

    test('POV toggle flips the outlook state through the rendered button', () => {
        // Button renders only when viewing ANOTHER user's loaded DTR with full selections
        const { ref, getByText } = renderIM({
            params: { id: '43' },
            dtr: { ...baseProps.dtr, isDtrLoaded: true },
        });
        ref.current.setState({
            selectedYear: { label: '2026', value: 2026 },
            selectedMonth: { label: 'July', value: 7 },
            selectedPayrollCutoff: { label: 'JUL 16 - AUG 15', value: 9 },
        });
        expect(ref.current.state.toggle_pov).toBe(false);
        fireEvent.click(getByText(/Toggle Outlook/));
        expect(ref.current.state.toggle_pov).toBe(true);
        fireEvent.click(getByText(/Toggle Outlook/));
        expect(ref.current.state.toggle_pov).toBe(false);
    });
});
