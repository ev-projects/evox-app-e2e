/**
 * evoxtest_ReportNavigatorsDeep2.test.js
 * Wave-5 coverage for components/Template/ReportNavigator/ReportNavigator.js (49 unc /
 * 12.5%) and ReportNavigatorShort/ReportNavigatorShort.js (52 unc / 11.9%) — the
 * date-scope navigators on every report page. Arms: view-type tab select
 * (day/week/month ranges; Short's day = rolling 7-day window), prev/next navigation
 * per view type, the custom view (datepickers + filter button), and the single-date
 * vs range label arms. ADDITIVE ONLY.
 */

import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('../../services/Authenticator', () => ({
    scanLevel: jest.fn(() => true), scanFeature: jest.fn(() => true),
    scanLevel_Feature: jest.fn(() => true), // Short gates its Custom tab on this
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
        Button: ({ children, onClick }) => <button data-testid="custom-filter" onClick={onClick}>{children}</button>,
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

const ReportNavigator = require('../../components/Template/ReportNavigator/ReportNavigator').default;
const ReportNavigatorShort = require('../../components/Template/ReportNavigatorShort/ReportNavigatorShort').default;

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

beforeEach(() => jest.clearAllMocks());

describe('ReportNavigator', () => {
    test('day/week/month tabs set the matching ranges and report the type', () => {
        const { getByTestId, handleChangeDate, start_date, end_date } = renderNav(ReportNavigator);

        fireEvent.click(getByTestId('tab-day'));
        expect(handleChangeDate).toHaveBeenLastCalledWith(start_date, end_date, 'day');
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().format('YYYY-MM-DD'));
        expect(end_date.format('YYYY-MM-DD')).toBe(moment().format('YYYY-MM-DD'));

        fireEvent.click(getByTestId('tab-week'));
        expect(handleChangeDate).toHaveBeenLastCalledWith(start_date, end_date, 'week');
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().startOf('isoWeek').format('YYYY-MM-DD'));

        fireEvent.click(getByTestId('tab-month'));
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().startOf('month').format('YYYY-MM-DD'));
        expect(end_date.format('YYYY-MM-DD')).toBe(moment().endOf('month').format('YYYY-MM-DD'));
    });

    test('prev/next navigate by the active view type (month default, then day)', () => {
        const { container, getByTestId, handleChangeDate, start_date } = renderNav(ReportNavigator);
        const arrows = () => container.querySelectorAll('.view-navigate');

        fireEvent.click(arrows()[1]); // next month
        expect(start_date.format('YYYY-MM')).toBe(moment('2026-07-15').add(1, 'month').format('YYYY-MM'));
        fireEvent.click(arrows()[0]); // prev month
        expect(handleChangeDate).toHaveBeenCalledTimes(2);

        fireEvent.click(getByTestId('tab-day'));
        fireEvent.click(arrows()[1]); // next day
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().add(1, 'day').format('YYYY-MM-DD'));
        fireEvent.click(arrows()[0]); // prev day → back to today
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().format('YYYY-MM-DD'));
        // single-date label arm (start == end)
        expect(container.querySelector('.dates-label').textContent).toBe(start_date.format('LL'));
    });

    test('week prev/next move by iso weeks', () => {
        const { container, getByTestId, start_date } = renderNav(ReportNavigator, { default_view_type: 'week' });
        fireEvent.click(getByTestId('tab-week'));
        const before = start_date.format('YYYY-MM-DD');
        fireEvent.click(container.querySelectorAll('.view-navigate')[1]);
        expect(start_date.format('YYYY-MM-DD')).toBe(moment(before).add(1, 'week').format('YYYY-MM-DD'));
    });

    test('custom tab shows datepickers; setting dates + filter reports a custom range', () => {
        const { container, getByTestId, getAllByText, handleChangeDate, start_date, end_date } = renderNav(ReportNavigator);
        fireEvent.click(getByTestId('tab-custom'));

        expect(container.querySelectorAll('[data-testid="datepicker"]').length).toBe(2);
        getAllByText('set-date').forEach((b) => fireEvent.click(b)); // both pickers → Jul 10
        fireEvent.click(getByTestId('custom-filter'));

        expect(handleChangeDate).toHaveBeenLastCalledWith(start_date, end_date, 'custom');
        expect(start_date.format('YYYY-MM-DD')).toBe('2026-07-10');
        expect(end_date.format('YYYY-MM-DD')).toBe('2026-07-10');
    });
});

describe('ReportNavigatorShort', () => {
    test("the 'day' tab produces the rolling 7-day window", () => {
        const { getByTestId, handleChangeDate, start_date, end_date } = renderNav(ReportNavigatorShort);
        fireEvent.click(getByTestId('tab-day'));

        expect(handleChangeDate).toHaveBeenLastCalledWith(start_date, end_date, 'day');
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().subtract(6, 'day').format('YYYY-MM-DD'));
        expect(end_date.format('YYYY-MM-DD')).toBe(moment().format('YYYY-MM-DD'));
    });

    test('day prev/next shift the window by 7 days; month tabs and custom work like the long form', () => {
        const { container, getByTestId, getAllByText, handleChangeDate, start_date } =
            renderNav(ReportNavigatorShort, { default_view_type: 'day' });

        fireEvent.click(getByTestId('tab-day'));
        const before = start_date.format('YYYY-MM-DD');
        fireEvent.click(container.querySelectorAll('.view-navigate')[1]); // next: +7d
        expect(start_date.format('YYYY-MM-DD')).toBe(moment(before).add(7, 'day').format('YYYY-MM-DD'));
        fireEvent.click(container.querySelectorAll('.view-navigate')[0]); // prev: -7d
        expect(start_date.format('YYYY-MM-DD')).toBe(before);

        fireEvent.click(getByTestId('tab-month'));
        expect(start_date.format('YYYY-MM-DD')).toBe(moment().startOf('month').format('YYYY-MM-DD'));

        fireEvent.click(getByTestId('tab-custom'));
        getAllByText('set-date').forEach((b) => fireEvent.click(b));
        fireEvent.click(getByTestId('custom-filter'));
        expect(handleChangeDate).toHaveBeenLastCalledWith(expect.anything(), expect.anything(), 'custom');
    });
});
