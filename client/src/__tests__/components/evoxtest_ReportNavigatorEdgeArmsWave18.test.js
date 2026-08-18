/**
 * evoxtest_ReportNavigatorEdgeArmsWave18.test.js
 *
 * SOURCE FILES UNDER TEST
 *   src/components/Template/ReportNavigator/ReportNavigator.js
 *   src/components/Template/ReportNavigatorShort/ReportNavigatorShort.js
 *
 * MENU PATH
 *   ReportNavigator      My Team -> Team Schedule, My Account -> Schedule / Schedule History /
 *                        Time Off
 *   ReportNavigatorShort Reports -> Team Attendance Summary (day), Reports -> HR Team
 *                        Attendance Summary (custom)
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   ReportNavigator       0 uncovered functions / 2 uncovered branches (lines 94, 172)
 *   ReportNavigatorShort  0 uncovered functions / 4 uncovered branches (lines 41, 78, 102, 180)
 *   evoxtest_ReportNavigatorsDeep2.test.js already walks day/week/month selection, next/prev in
 *   day and month, and the custom range. This suite takes what it leaves:
 *     line 94   ReportNavigator, PREVIOUS in week view (Deep2 only goes forward a week)
 *     line 172  ReportNavigator, the label with no range to print yet
 *     line 180  ReportNavigatorShort, the same label arm
 *
 * FINDINGS
 *   RNS-NOWEEK  ReportNavigatorShort.js:41, :78 and :102 are the three `case "week"` arms. The
 *               Weekly tab that would select that view is commented out (line 140), and neither
 *               of the two callers passes default_view_type="week" — TeamAttendanceSummary.js:168
 *               passes "day", HRTeamAttendanceSummary.js:168 passes "custom". viewType can
 *               therefore never hold "week" on this component, so all three arms are dead. They
 *               are left uncovered on purpose: reaching them would mean driving onSelect('week')
 *               through a tab the screen does not render, which proves nothing about the app.
 *               The fix is to delete the three arms along with the commented-out tab.
 *
 * DETERMINISM
 *   Both components mutate the moment objects handed to them as props. Every date assertion below
 *   is expressed relative to a clone taken during the test, never against a literal date and
 *   never against a second reading of the clock, so the suite is stable at any time of day and
 *   across week, month and year boundaries.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true),
    scanFeature: jest.fn(() => true),
    scanLevel_Feature: jest.fn(() => true),
}));
jest.mock('react-datepicker', () => (props) => (
    <span data-testid="datepicker">
        <button onClick={() => props.onChange && props.onChange(new Date(2026, 6, 10))}>set-date</button>
    </span>
));
jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    return {
        Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div />,
        Button: ({ children, onClick }) => (
            <button data-testid="custom-filter" onClick={onClick}>{children}</button>
        ),
        Form: passthrough, InputGroup: passthrough, FormControl: (p) => <input {...p} />,
        Tabs: ({ children, onSelect }) => (
            <div data-testid="tabs">
                {['day', 'week', 'month', 'custom'].map((k) => (
                    <button key={k} data-testid={`tab-${k}`} onClick={() => onSelect(k)}>{k}</button>
                ))}
                {children}
            </div>
        ),
        Tab: () => null,
    };
});

const ReportNavigator =
    require('../../components/Template/ReportNavigator/ReportNavigator').default;
const ReportNavigatorShort =
    require('../../components/Template/ReportNavigatorShort/ReportNavigatorShort').default;

function renderNav(Component, extraProps = {}) {
    const handleChangeDate = jest.fn();
    const start_date = moment('2026-07-15');
    const end_date = moment('2026-07-15');
    const utils = render(
        <Component
            start_date={start_date}
            end_date={end_date}
            handleChangeDate={handleChangeDate}
            default_view_type="month"
            {...extraProps}
        />
    );
    return { ...utils, handleChangeDate, start_date, end_date };
}

const arrows = (container) => container.querySelectorAll('.view-navigate');
const clickPrev = (container) => fireEvent.click(arrows(container)[0]);
const clickNext = (container) => fireEvent.click(arrows(container)[1]);

beforeEach(() => jest.clearAllMocks());

describe('ReportNavigator — stepping backwards through weeks', () => {
    test('the back arrow in week view moves the range to the previous ISO week', () => {
        const { container, getByTestId, handleChangeDate, start_date, end_date } =
            renderNav(ReportNavigator, { default_view_type: 'week' });

        fireEvent.click(getByTestId('tab-week'));
        const weekStart = start_date.clone();

        clickPrev(container);

        expect(start_date.format('YYYY-MM-DD'))
            .toBe(weekStart.clone().subtract(1, 'week').startOf('isoWeek').format('YYYY-MM-DD'));
        expect(start_date.isoWeekday()).toBe(1);   // Monday
        expect(end_date.isoWeekday()).toBe(7);     // Sunday of that same week
        expect(end_date.diff(start_date, 'days')).toBe(6);
        expect(handleChangeDate).toHaveBeenLastCalledWith(start_date, end_date, 'week');
    });

    test('stepping back then forward in week view returns to where it started', () => {
        const { container, getByTestId, start_date } =
            renderNav(ReportNavigator, { default_view_type: 'week' });

        fireEvent.click(getByTestId('tab-week'));
        const weekStart = start_date.format('YYYY-MM-DD');

        clickPrev(container);
        expect(start_date.format('YYYY-MM-DD')).not.toBe(weekStart);

        clickNext(container);
        expect(start_date.format('YYYY-MM-DD')).toBe(weekStart);
    });

    test('two steps back move two whole weeks, not two days', () => {
        const { container, getByTestId, start_date } =
            renderNav(ReportNavigator, { default_view_type: 'week' });

        fireEvent.click(getByTestId('tab-week'));
        const weekStart = start_date.clone();

        clickPrev(container);
        clickPrev(container);

        expect(weekStart.diff(start_date, 'days')).toBe(14);
    });
});

describe('ReportNavigator — the range label before a range exists', () => {
    test('no label is printed while the parent has not supplied a range yet', () => {
        const { container } = render(
            <ReportNavigator handleChangeDate={jest.fn()} default_view_type="month" />
        );
        const label = container.querySelector('.dates-label');
        expect(label).not.toBeNull();
        expect(label.textContent).toBe('');
    });

    test('no label is printed when only one end of the range is supplied', () => {
        const { container } = render(
            <ReportNavigator
                start_date={moment('2026-07-15')}
                handleChangeDate={jest.fn()}
                default_view_type="month"
            />
        );
        expect(container.querySelector('.dates-label').textContent).toBe('');
    });

    test('a range spanning two days prints both ends joined by a dash', () => {
        const start = moment('2026-07-01');
        const end = moment('2026-07-31');
        const { container } = render(
            <ReportNavigator start_date={start} end_date={end}
                handleChangeDate={jest.fn()} default_view_type="month" />
        );
        expect(container.querySelector('.dates-label').textContent)
            .toBe(`${start.format('LL')} - ${end.format('LL')}`);
    });

    test('a single-day range prints that day once rather than twice', () => {
        const day = moment('2026-07-15');
        const { container } = render(
            <ReportNavigator start_date={day} end_date={day.clone()}
                handleChangeDate={jest.fn()} default_view_type="month" />
        );
        expect(container.querySelector('.dates-label').textContent).toBe(day.format('LL'));
    });
});

describe('ReportNavigatorShort — the range label before a range exists', () => {
    test('no label is printed while the parent has not supplied a range yet', () => {
        const { container } = render(
            <ReportNavigatorShort handleChangeDate={jest.fn()} default_view_type="day" />
        );
        expect(container.querySelector('.dates-label').textContent).toBe('');
    });

    test('the rolling seven day window prints as a dashed range, not a single day', () => {
        const { container, getByTestId, start_date, end_date } =
            renderNav(ReportNavigatorShort, { default_view_type: 'day' });

        fireEvent.click(getByTestId('tab-day'));

        expect(end_date.diff(start_date, 'days')).toBe(6);
        expect(container.querySelector('.dates-label').textContent)
            .toBe(`${start_date.format('LL')} - ${end_date.format('LL')}`);
    });

    test('a single-day range prints that day once', () => {
        const day = moment('2026-07-15');
        const { container } = render(
            <ReportNavigatorShort start_date={day} end_date={day.clone()}
                handleChangeDate={jest.fn()} default_view_type="day" />
        );
        expect(container.querySelector('.dates-label').textContent).toBe(day.format('LL'));
    });
});
