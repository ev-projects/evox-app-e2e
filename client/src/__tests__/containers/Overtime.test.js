/**
 * EVOX-36 — Jest P0: Overtime Container Tests
 * Source: src/container/Request/Overtime/Overtime.js
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

// Mock complex date picker components to avoid rendering issues
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="text" />,
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

const defaultProps = {
    user: { id: 1, full_name: 'Test Employee' },
    instance: {},
    constant: { OVERTIME_TYPE: { POST: 'post_overtime', PRE: 'pre_overtime' } },
    settings: { current_payroll_cutoff: { start_date: null, end_date: null } },
    params: {},
    overtime: { isLoading: false },
    addOvertime: jest.fn(),
    updateOvertime: jest.fn(),
    updateOvertimeStatus: jest.fn(),
    fetchOvertime: jest.fn(),
    clearOvertimeInstance: jest.fn(),
    resetOvertimeInstance: jest.fn(),
    setRedirect: jest.fn(),
    dispatch: jest.fn(),
    location: { search: '' },
    history: { push: jest.fn() },
    match: { params: {} },
};

let OvertimeComponent;
try {
    const m = require('../../container/Request/Overtime/Overtime');
    OvertimeComponent = m.Overtime || m.default;
} catch {
    OvertimeComponent = require('../../container/Request/Overtime/Overtime').default;
}

function renderOvertime(props = {}) {
    return render(
        <MemoryRouter>
            <OvertimeComponent {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('Overtime request form', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderOvertime()).not.toThrow();
    });

    test('calls clearOvertimeInstance on mount', () => {
        renderOvertime();
        expect(defaultProps.clearOvertimeInstance).toHaveBeenCalled();
    });

    test('renders Date label', () => {
        const { getByText } = renderOvertime();
        expect(getByText(/Date:/i)).toBeInTheDocument();
    });

    test('renders Amount label', () => {
        const { getByText } = renderOvertime();
        expect(getByText(/Amount/i)).toBeInTheDocument();
    });

    test('renders Type label', () => {
        const { getByText } = renderOvertime();
        expect(getByText(/Type:/i)).toBeInTheDocument();
    });

    test('does not crash when instance is empty object', () => {
        expect(() => renderOvertime({ instance: {} })).not.toThrow();
    });
});
