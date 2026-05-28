/**
 * EVOX-36 — Jest P0: ChangeSchedule Container Tests
 * Source: src/container/Request/ChangeSchedule/ChangeSchedule.js
 * Business case: Employee requests a temporary schedule change for a date range
 * (e.g. different shift times, work-from-home arrangement).
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
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
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

const mockClearChangeScheduleInstance = jest.fn();
const mockFetchChangeSchedule         = jest.fn();
const mockAddChangeSchedule           = jest.fn();

const defaultProps = {
    user:     { id: 1, full_name: 'Test Employee' },
    instance: {},
    constant: { SCHEDULE_TYPE: { STANDARD: 'standard', FLEXIBLE: 'flexible' } },
    settings: { current_payroll_cutoff: { start_date: null, end_date: null } },
    params:   {},
    change_schedule: { isLoading: false },
    addChangeSchedule:             mockAddChangeSchedule,
    updateChangeSchedule:          jest.fn(),
    updateChangeScheduleStatus:    jest.fn(),
    fetchChangeSchedule:           mockFetchChangeSchedule,
    clearChangeScheduleInstance:   mockClearChangeScheduleInstance,
    resetChangeScheduleInstance:   jest.fn(),
    setRedirect:                   jest.fn(),
    dispatch:                      jest.fn(),
    location: { search: '' },
    history:  { push: jest.fn() },
    match:    { params: {} },
};

let ChangeScheduleComponent;
try {
    const m = require('../../container/Request/ChangeSchedule/ChangeSchedule');
    ChangeScheduleComponent = m.ChangeSchedule || m.default;
} catch {
    ChangeScheduleComponent = require('../../container/Request/ChangeSchedule/ChangeSchedule').default;
}

function renderChangeSchedule(props = {}) {
    return render(
        <MemoryRouter>
            <ChangeScheduleComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('ChangeSchedule request form', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderChangeSchedule()).not.toThrow();
    });

    test('calls clearChangeScheduleInstance on mount', () => {
        renderChangeSchedule();
        expect(mockClearChangeScheduleInstance).toHaveBeenCalled();
    });

    test('renders Valid From label', () => {
        const { getByText } = renderChangeSchedule();
        expect(getByText(/Valid From/i)).toBeInTheDocument();
    });

    test('renders Valid To label', () => {
        const { getByText } = renderChangeSchedule();
        expect(getByText(/Valid To/i)).toBeInTheDocument();
    });

    test('renders Note textarea with placeholder', () => {
        const { getByPlaceholderText } = renderChangeSchedule();
        expect(getByPlaceholderText(/Enter Note/i)).toBeInTheDocument();
    });

    test('does not crash when instance is empty', () => {
        expect(() => renderChangeSchedule({ instance: {} })).not.toThrow();
    });

    test('does not crash during loading state', () => {
        expect(() => renderChangeSchedule({ change_schedule: { isLoading: true } })).not.toThrow();
    });
});
