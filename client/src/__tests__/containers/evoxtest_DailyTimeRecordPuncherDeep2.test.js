/**
 * evoxtest_DailyTimeRecordPuncherDeep2.test.js
 * Wave-6 coverage for container/DailyTimeRecordPuncher/DailyTimeRecordPuncher.js
 * (fresh: 47 unc / 32.9%). Arms: mount filter fetch, year/month cascade resets,
 * cutoff select fetching the punch list + summary from the nested filter map,
 * setPayrollCutoffInstance hydrate flow, cWRP default-vs-selected-cutoff arms
 * (incl. location.resetInitialState). Driven via instance ref. ADDITIVE ONLY.
 * Menu: DTR → Punch list (route: dtr_punchlist+':id').
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
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('react-select', () => (props) => <select data-testid="react-select" />);
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/dtr/dtrActions', () => ({
    viewEmployeePunch: jest.fn(), getFilterForDtr: jest.fn(), getUserDtrSummary: jest.fn(),
    setSelectedPayrollCutoff: jest.fn(), viewEmployeeDtr: jest.fn(),
}), { virtual: true });
jest.mock('../../store/actions/userActions', () => ({ fetchUser: jest.fn() }));
jest.mock('../../store/actions/redirectActions', () => ({ setRedirect: jest.fn() }));
// DEAD IMPORT in the component: `import { s } from '@fullcalendar/core/internal-common'`
// (accidental IDE auto-import, `s` unused) — ESM that Jest can't parse; stubbed here.
jest.mock('@fullcalendar/core/internal-common', () => ({ s: {} }), { virtual: true });
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}/` });

const DailyTimeRecordPuncher =
    require('../../container/DailyTimeRecordPuncher/DailyTimeRecordPuncher').default;

const cutoff = {
    id: 9, name: 'JUL 16 - AUG 15', year: 2026, month: 7, month_label: 'July',
    start_date: '2026-07-16', end_date: '2026-08-15',
};

function makeActions() {
    return {
        viewEmployeePunch: jest.fn(() => Promise.resolve()),
        getFilterForDtr: jest.fn(),
        getUserDtrSummary: jest.fn(() => Promise.resolve()),
        setSelectedPayrollCutoff: jest.fn(() => Promise.resolve()),
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
        punch_list: [], dtr_summary: {},
    },
};

function renderDTRP(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <DailyTimeRecordPuncher ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions, props: { ...baseProps, ...actions, ...props } };
}

function rerenderDTRP(utils, nextProps) {
    utils.rerender(
        <MemoryRouter>
            <DailyTimeRecordPuncher ref={utils.ref} {...utils.props} {...nextProps} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => jest.clearAllMocks());

describe('DailyTimeRecordPuncher', () => {
    test('mount fetches the DTR filters for the route user', () => {
        const { actions } = renderDTRP();
        expect(actions.getFilterForDtr).toHaveBeenCalledWith('42');
    });

    test('year select resets month + cutoff; month select resets cutoff', () => {
        const { ref } = renderDTRP();
        ref.current.setState({ selectedMonth: { value: 7 }, selectedPayrollCutoff: { value: 9 } });

        ref.current.handleSelectYear({ label: '2026', value: 2026 });
        expect(ref.current.state.selectedYear).toEqual({ label: '2026', value: 2026 });
        expect(ref.current.state.selectedMonth).toEqual({});
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});

        ref.current.handleSelectMonth({ label: 'July', value: 7 });
        expect(ref.current.state.selectedPayrollCutoff).toEqual({});
    });

    test('cutoff select with year+month resolves the cutoff and fetches punches + summary', () => {
        const { ref, actions } = renderDTRP();
        ref.current.setState({
            selectedYear: { label: '2026', value: 2026 },
            selectedMonth: { label: 'July', value: 7 },
        });
        ref.current.handleSelectPayrollCutoff({ label: 'JUL 16 - AUG 15', value: 9 });

        expect(actions.viewEmployeePunch).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');
        expect(actions.getUserDtrSummary).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');
        expect(actions.setSelectedPayrollCutoff).toHaveBeenCalledWith(cutoff);
        expect(ref.current.state.payrollCutoff_start).toBe('2026-07-16');
    });

    test('FINDING DTR-PNC-1: the year/month guard is ineffective — empty selections throw', () => {
        // The guard uses Validator.isValid on the initial {} selections, which is TRUE
        // for empty objects, so the code walks filter[undefined][undefined] and throws
        // a TypeError. Latent today (the cutoff dropdown is empty until month is chosen)
        // but the guard clearly intends to block this and doesn't. Fix: check .value.
        const { ref, actions } = renderDTRP();
        expect(() => ref.current.handleSelectPayrollCutoff({ label: 'X', value: 9 })).toThrow(TypeError);
        expect(actions.viewEmployeePunch).not.toHaveBeenCalled();
    });

    test('setPayrollCutoffInstance hydrates selection and fetches everything', async () => {
        const { ref, actions } = renderDTRP();
        await ref.current.setPayrollCutoffInstance(cutoff);

        expect(ref.current.state.selectedYear).toEqual({ label: 2026, value: 2026 });
        expect(ref.current.state.selectedPayrollCutoff).toEqual({ label: 'JUL 16 - AUG 15', value: 9 });
        expect(ref.current.state.isCurrentPayrollCutoffLoaded).toBe(true);
        expect(actions.viewEmployeePunch).toHaveBeenCalledWith('42', '2026-07-16', '2026-08-15');
    });

    test('cWRP uses the stored cutoff when present, else falls back to the settings default', async () => {
        // stored cutoff present → hydrates from it
        const stored = { ...cutoff, id: 11, name: 'STORED' };
        const a = renderDTRP({ dtr: { ...baseProps.dtr, selectedPayrollCutoff: stored } });
        rerenderDTRP(a, { settings: { current_payroll_cutoff: { ...cutoff } } });
        await flush();
        expect(a.ref.current.state.selectedPayrollCutoff.label).toBe('STORED');

        // resetInitialState forces the default instead
        const b = renderDTRP({
            dtr: { ...baseProps.dtr, selectedPayrollCutoff: stored },
            location: { resetInitialState: true },
        });
        rerenderDTRP(b, { settings: { current_payroll_cutoff: { ...cutoff } } });
        await flush();
        expect(b.ref.current.state.selectedPayrollCutoff.label).toBe('JUL 16 - AUG 15');
    });
});
