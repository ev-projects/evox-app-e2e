/**
 * evoxtest_COEHRDeep2.test.js
 * Wave-5 coverage for container/Request/COEHR/COEHR.js (fresh: 41 unc / 29.3%).
 * Arms: mount fetch, onSubmitHandler FormData + session_id + addCOE dispatch,
 * the 1s-debounced employee search (short-query clear, success suggestions,
 * failure alert), setAction. Driven via instance ref + fake timers. ADDITIVE ONLY.
 * Menu: Requests → COE (HR view) (route: coe_hr+':id?').
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
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../container/PageLoading', () => () => <div data-testid="page-loading" />);
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
    slug_to_title: jest.fn((s) => s),
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
}));
jest.mock('../../store/actions/request/coeActions', () => ({
    addCOE: jest.fn(), fetchCOE: jest.fn(), updateCOEStatus: jest.fn(),
}), { virtual: true });

import API from '../../services/API';
import Formatter from '../../services/Formatter';

const COEHR = require('../../container/Request/COEHR/COEHR').default;

function makeActions() {
    return { addCOE: jest.fn(), fetchCOE: jest.fn(), updateCOEStatus: jest.fn(), dispatch: jest.fn() };
}

const baseProps = {
    user: { id: 42 },
    constant: { COE_PURPOSES: ['Visa application'] },
    instance: {},
    isInstanceLoaded: false,
    coe_list: [],
    settings: {},
    params: {},
    onApproval: false,
};

function renderCOEHR(props = {}, actions = makeActions()) {
    const ref = React.createRef();
    const utils = render(
        <MemoryRouter>
            <COEHR ref={ref} {...baseProps} {...actions} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, actions };
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('session_id', 'sess-coe');
    jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('COEHR', () => {
    test('mount fetches the COE list; setAction stores the approval action', () => {
        const { ref, actions } = renderCOEHR();
        expect(actions.fetchCOE).toHaveBeenCalled();
        ref.current.setAction('approve');
        expect(ref.current.state.action).toBe('approve');
    });

    test('submit builds FormData with the session id and dispatches addCOE', () => {
        const { ref, actions } = renderCOEHR();
        ref.current.onSubmitHandler({ purpose: 'Visa application', purpose_note: 'For embassy', show_compensation: 'yes' });

        const fd = actions.addCOE.mock.calls[0][0];
        expect(fd.get('purpose')).toBe('Visa application');
        expect(fd.get('session_id')).toBe('sess-coe');
    });

    test('employee search debounces 1s; short query clears; success stores suggestions', async () => {
        API.call.mockResolvedValue({ data: [{ id: 9, full_name: 'Juan' }] });
        const { ref } = renderCOEHR();

        ref.current.searchEmployees('J'); // <2 chars → clear arm
        jest.advanceTimersByTime(1100);
        expect(API.call).not.toHaveBeenCalled();
        expect(ref.current.state.employeeSuggestions).toEqual([]);

        ref.current.searchEmployees('Ju');
        ref.current.searchEmployees('Jua'); // debounce reset — only ONE call
        jest.advanceTimersByTime(1100);
        for (let i = 0; i < 8; i++) await Promise.resolve(); // flush the async callback chain

        expect(API.call).toHaveBeenCalledTimes(1);
        expect(API.call.mock.calls[0][0].params.keyword).toBe('Jua');
        expect(ref.current.state.employeeSuggestions).toEqual([{ id: 9, full_name: 'Juan' }]);
        expect(ref.current.state.loadingEmployees).toBe(false);
    });

    test('search failure alerts and clears the suggestions', async () => {
        API.call.mockRejectedValue(new Error('HTTP 500'));
        const { ref } = renderCOEHR();

        ref.current.searchEmployees('Gary');
        jest.advanceTimersByTime(1100);
        await Promise.resolve(); await Promise.resolve(); await Promise.resolve();

        expect(Formatter.alert_error).toHaveBeenCalled();
        expect(ref.current.state.employeeSuggestions).toEqual([]);
        expect(ref.current.state.loadingEmployees).toBe(false);
    });
});
