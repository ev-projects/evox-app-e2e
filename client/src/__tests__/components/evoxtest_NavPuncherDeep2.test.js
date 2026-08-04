/**
 * evoxtest_NavPuncherDeep2.test.js
 * Wave-3 coverage for components/Template/NavPuncher/NavPuncher.js (29 Jul: 68 unc / 28.4%).
 * Arms: onSubmitHandler's early-out gate (half-timestamp guard, early_clock_out bypass),
 * today-punch dispatch (dtr_id + session_id), yesterday PASS0 arm, both isGenerate arms,
 * canClockOut hour math, handleOnhide, and the clock tick (no-token early return,
 * offset + stored-timestamp arms) with fake timers + unmount cleanup.
 * ADDITIVE ONLY. Menu: top navigation clock/puncher (all authenticated pages).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('jquery', () => jest.fn(() => ({ on: jest.fn() })));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true), check: jest.fn(() => true),
}));
jest.mock('../../store/actions/userActions', () => ({ logOut: jest.fn() }));
jest.mock('../../store/actions/dtr/quickpunchActions', () => ({ biometrixLog: jest.fn() }));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({ getRecentDtr: jest.fn() }));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
    Modal.Header = passthrough; Modal.Body = passthrough; Modal.Footer = passthrough; Modal.Title = passthrough;
    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;
    const Form = passthrough; Form.Group = passthrough; Form.Label = passthrough;
    Form.Control = ({ children, ...p }) => <select {...p}>{children}</select>;
    return {
        Modal, Form, Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div />,
        Button: ({ children, onClick, type }) => <button onClick={onClick} type={type}>{children}</button>,
        Badge: ({ children }) => <span>{children}</span>,
        Tab: passthrough, Tabs: passthrough, Dropdown,
    };
});

const NavPuncher = require('../../components/Template/NavPuncher/NavPuncher').default;

const nowSec = Math.floor(Date.now() / 1000);

function dtrPair(overrides = {}) {
    return [
        {   // yesterday
            id: 100, time_in: '08:00', time_out: null,
            end_datetime: '2026-07-30 17:00:00',
            raw_time: { start_datetime: nowSec - 90000, end_datetime: nowSec - 3600 },
            with_in_time: false,
            ...(overrides.yesterday || {}),
        },
        {   // today
            id: 200, start_datetime: '2026-07-31 08:00:00',
            raw_time: { start_datetime: nowSec + 3600, end_datetime: nowSec + 36000 },
            before_time_in_half: false, user_half_timestamp: nowSec - 7200,
            with_in_time: false,
            ...(overrides.today || {}),
        },
    ];
}

const baseProps = {
    user: { id: 42, first_name: 'Test' },
    settings: {},
    constant: {},
    dashboard: { recent_dtr: dtrPair() },
};

function renderNP(props = {}) {
    const ref = React.createRef();
    const biometrixLog = jest.fn();
    const utils = render(
        <MemoryRouter>
            <NavPuncher ref={ref} {...baseProps} biometrixLog={biometrixLog} getRecentDtr={jest.fn()} logOut={jest.fn()} {...props} />
        </MemoryRouter>
    );
    return { ...utils, ref, biometrixLog };
}

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('session_id', 'sess-1');
    jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('NavPuncher — onSubmitHandler arms', () => {
    test('today punch dispatches with the today dtr_id and the stored session id', async () => {
        const { ref, biometrixLog } = renderNP();
        await ref.current.onSubmitHandler({ quickpunch: 'out', isGenerate: false });

        expect(biometrixLog).toHaveBeenCalledTimes(1);
        const [fd, userId] = biometrixLog.mock.calls[0];
        expect(fd.get('dtr_id')).toBe('200');
        expect(fd.get('session_id')).toBe('sess-1');
        expect(userId).toBe(42);
    });

    test('clock-out before the half mark opens the early-out modal instead of punching', async () => {
        const { ref, biometrixLog } = renderNP({
            dashboard: { recent_dtr: dtrPair({ today: { before_time_in_half: true, user_half_timestamp: nowSec + 7200 } }) },
        });
        await ref.current.onSubmitHandler({ quickpunch: 'out', isGenerate: false });

        expect(ref.current.state.earlyOutShow).toBe(true);
        expect(biometrixLog).not.toHaveBeenCalled();

        ref.current.handleOnhide();
        expect(ref.current.state.earlyOutShow).toBe(false);
    });

    test('early_clock_out flag bypasses the early-out gate and punches', async () => {
        const { ref, biometrixLog } = renderNP({
            dashboard: { recent_dtr: dtrPair({ today: { before_time_in_half: true, user_half_timestamp: nowSec + 7200 } }) },
        });
        await ref.current.onSubmitHandler({ quickpunch: 'out', early_clock_out: 1, isGenerate: false });
        expect(biometrixLog).toHaveBeenCalledTimes(1);
        expect(biometrixLog.mock.calls[0][0].get('dtr_id')).toBe('200');
    });

    test('yesterday within-time (PASS0) punches against the yesterday dtr', async () => {
        const { ref, biometrixLog } = renderNP({
            dashboard: { recent_dtr: dtrPair({ yesterday: { with_in_time: true } }) },
        });
        await ref.current.onSubmitHandler({ quickpunch: 'out', isGenerate: false });

        // today arm fires first (dtr 200), then the PASS0 arm re-dispatches with 100
        const ids = biometrixLog.mock.calls.map((c) => c[0].get('dtr_id'));
        expect(ids).toContain('100');
    });

    test('missing DTRs with isGenerate dispatch the generate punches', async () => {
        const { ref, biometrixLog } = renderNP({
            dashboard: { recent_dtr: [{}, {}] }, // neither day has an id
        });
        await ref.current.onSubmitHandler({ quickpunch: 'in', isGenerate: true });
        expect(biometrixLog).toHaveBeenCalledTimes(2); // yesterday-gen + today-gen arms
    });
});

describe('NavPuncher — clock utilities', () => {
    test('canClockOut returns whole-hour distance from the compare point', () => {
        const { ref } = renderNP();
        const threeHoursAgo = new Date(ref.current.state.compare_to_clock_in.getTime() - 3 * 3600 * 1000);
        expect(ref.current.canClockOut(threeHoursAgo.toISOString())).toBe(3);
    });

    test('tick without an access token leaves the clock untouched; with offsets it advances', () => {
        const { ref } = renderNP();
        const before = ref.current.state.time;
        jest.advanceTimersByTime(1100); // no access_token → early return
        expect(ref.current.state.time).toBe(before);

        localStorage.setItem('access_token', 'tok');
        localStorage.setItem('user_local_offset_mils', String(2 * 3600 * 1000));
        localStorage.setItem('user_local_timestamp_mils', String(Date.now()));
        jest.advanceTimersByTime(1100); // offset + timestamp arms
        expect(ref.current.state.time).not.toBe(before);
    });

    test('unmount clears the interval', () => {
        const clearSpy = jest.spyOn(window, 'clearInterval');
        const { unmount } = renderNP();
        unmount();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });
});
