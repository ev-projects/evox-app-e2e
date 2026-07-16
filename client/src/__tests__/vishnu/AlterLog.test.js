/**
 * EVOX-36 — Jest P0: AlterLog Container Tests
 * Source: src/container/Request/AlterLog/AlterLog.js
 * Business case: Time correction form — employee submits a request to change
 * their clock-in/clock-out time after the fact (e.g. forgot to clock in).
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate:     ({ name }) => <input name={name} type="date" />,
    InputTime:     ({ name }) => <input name={name} type="time" />,
    InputDateTime: ({ name }) => <input name={name} type="datetime-local" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:   ({ children }) => <div>{children}</div>,
    Content:           ({ children }) => <div>{children}</div>,
    ContainerWrapper:  ({ children }) => <div>{children}</div>,
    ContainerBody:     ({ children }) => <div>{children}</div>,
    Row:               ({ children }) => <div>{children}</div>,
    Col:               ({ children }) => <div>{children}</div>,
}));

const mockClearAlterLogInstance = jest.fn();
const mockFetchAlterLog        = jest.fn();
const mockAddAlterLog          = jest.fn();
const mockUpdateAlterLog       = jest.fn();

const defaultProps = {
    user:     { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila' },
    instance: {},
    constant: {},
    settings: { current_payroll_cutoff: { start_date: null, end_date: null } },
    params:   {},
    alter_log: { isLoading: false },
    addAlterLog:             mockAddAlterLog,
    updateAlterLog:          mockUpdateAlterLog,
    updateAlterLogStatus:    jest.fn(),
    fetchAlterLog:           mockFetchAlterLog,
    clearAlterLogInstance:   mockClearAlterLogInstance,
    resetAlterLogInstance:   jest.fn(),
    setRedirect:             jest.fn(),
    dispatch:                jest.fn(),
    // AlterLog only renders the form when initialValue.date is defined.
    // Pass date via location.date to trigger store mode render.
    location: { search: '', date: '2026-05-01' },
    history:  { push: jest.fn() },
    match:    { params: {} },
};

let AlterLogComponent;
try {
    const m = require('../../container/Request/AlterLog/AlterLog');
    AlterLogComponent = m.AlterLog || m.default;
} catch {
    AlterLogComponent = require('../../container/Request/AlterLog/AlterLog').default;
}

function renderAlterLog(props = {}) {
    return render(
        <MemoryRouter>
            <AlterLogComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AlterLog time-correction form', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderAlterLog()).not.toThrow();
    });

    test('calls clearAlterLogInstance on mount', () => {
        renderAlterLog();
        expect(mockClearAlterLogInstance).toHaveBeenCalled();
    });

    test('renders Current Time-In label', () => {
        const { getByText } = renderAlterLog();
        expect(getByText(/Current Time-In/i)).toBeInTheDocument();
    });

    test('renders Current Time-Out label', () => {
        const { getByText } = renderAlterLog();
        expect(getByText(/Current Time-Out/i)).toBeInTheDocument();
    });

    test('renders New Time-In label', () => {
        const { getByText } = renderAlterLog();
        expect(getByText(/New Time-In/i)).toBeInTheDocument();
    });

    test('renders New Time-Out label', () => {
        const { getByText } = renderAlterLog();
        expect(getByText(/New Time-Out/i)).toBeInTheDocument();
    });

    test('renders Note textarea with placeholder', () => {
        const { getByPlaceholderText } = renderAlterLog();
        expect(getByPlaceholderText(/Enter Note/i)).toBeInTheDocument();
    });

    test('does not crash when instance is empty', () => {
        expect(() => renderAlterLog({ instance: {} })).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() => renderAlterLog({ alter_log: { isLoading: true } })).not.toThrow();
    });
});
