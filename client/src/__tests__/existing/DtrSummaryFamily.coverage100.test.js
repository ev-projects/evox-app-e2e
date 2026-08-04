// DRAFT — generated 2026-07-09, needs verification
/**
 * DTR summary family — MyTeam supervisor/admin reports, Playwright-only until now.
 * Source:
 *   src/container/MyTeam/DtrSummaryNew/DtrSummaryNew.js (renders the live /app/team/DtrSummary
 *     route — the legacy container/MyTeam/DtrSummary/DtrSummary.js is dead code behind a
 *     superseded route and is NOT tested here)
 *   src/container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary.js
 *   src/container/MyTeam/DtrLogs/DtrLogs.js
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));

jest.mock('../../components/Template/Paginate', () => () => <div data-testid="paginate" />);

jest.mock('../../services/Authenticator.js', () => ({ scanFeature: jest.fn(() => true) }));
jest.mock('../../services/DtrFormatter', () => ({ displayHolidayType: jest.fn(() => '') }));

// Only override Dropdown (used by DtrSummaryNew's export menu) — keep every other
// react-bootstrap component real so Table/Row/Col/Form/Button render normally.
jest.mock('react-bootstrap', () => {
    const actual = jest.requireActual('react-bootstrap');
    return {
        ...actual,
        Dropdown: Object.assign(
            ({ children, className }) => <div className={`dropdown ${className || ''}`}>{children}</div>,
            {
                Toggle: ({ children }) => <button>{children}</button>,
                Menu:   ({ children }) => <div className="dropdown-menu">{children}</div>,
                Item:   ({ children, onClick, id }) => <button id={id} onClick={onClick}>{children}</button>,
            }
        ),
    };
});

jest.mock('formik', () => ({
    ...jest.requireActual('formik'),
    Formik: ({ children }) => <div>{typeof children === 'function' ? children({
        values: { valid_from: null, valid_to: null, department_id: null, name: '', is_active: 1, export: false, toggle_pov: false },
        errors: {}, touched: {},
        handleChange: jest.fn(), handleSubmit: jest.fn(), handleReset: jest.fn(), setFieldValue: jest.fn()
    }) : children}</div>,
    ErrorMessage: () => null,
}));

const Authenticator = require('../../services/Authenticator.js');

import DtrSummaryNew from '../../container/MyTeam/DtrSummaryNew/DtrSummaryNew';
import DtrMultiLogsSummary from '../../container/MyTeam/DtrMultiLogsSummary/DtrMultiLogsSummary';
import DtrLogs from '../../container/MyTeam/DtrLogs/DtrLogs';

const departments = [{ id: 1, department_name: 'Engineering' }];
const baseUser = { departments_handled: departments };

function renderComp(Comp, props = {}) {
    return render(
        <MemoryRouter>
            <Comp
                user={baseUser}
                settings={{}}
                fetchNewDtrSummary={jest.fn()}
                exportDtrSummary={jest.fn()}
                exportNewDtrSummary={jest.fn()}
                exportNewDtrSummary1={jest.fn()}
                fetchDtrMultiLogsSummary={jest.fn()}
                exportDtrMultiLogsSummary={jest.fn()}
                fetchDtrLogs={jest.fn()}
                exportDtrLogs={jest.fn()}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('DtrSummaryNew component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Authenticator.scanFeature.mockReturnValue(true);
    });

    const notLoaded = { isListLoaded: false, dtrItems: [] };

    test('renders without crashing', () => {
        expect(() => renderComp(DtrSummaryNew, { dtrSummary: notLoaded })).not.toThrow();
    });

    test('renders the page title', () => {
        const { getByText } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(getByText(/DTR SUMMARY/i)).toBeInTheDocument();
    });

    test('renders department filter select', () => {
        const { container } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('renders name filter input', () => {
        const { container } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
    });

    test('renders Generate button', () => {
        const { getByText } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(getByText(/Generate/i)).toBeInTheDocument();
    });

    test('shows "no record found" when isListLoaded is false', () => {
        const { getByText } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(getByText(/no record found/i)).toBeInTheDocument();
    });

    test('renders table headers and a row when isListLoaded is true', () => {
        const { getByText } = renderComp(DtrSummaryNew, {
            dtrSummary: {
                isListLoaded: true,
                dtrItems: [{ Employee_Number: 'EMP-1', Employee_Name: 'Jane Doe', Department: 'Engineering' }],
                pagination: {},
            },
        });
        expect(getByText('Employee Number')).toBeInTheDocument();
        expect(getByText('Employee Name')).toBeInTheDocument();
        expect(getByText('EMP-1')).toBeInTheDocument();
        expect(getByText('Jane Doe')).toBeInTheDocument();
    });

    test('does not crash when dtrItems is empty', () => {
        expect(() => renderComp(DtrSummaryNew, {
            dtrSummary: { isListLoaded: true, dtrItems: [], pagination: {} },
        })).not.toThrow();
    });

    test('renders export dropdown when Authenticator.scanFeature returns true', () => {
        Authenticator.scanFeature.mockReturnValue(true);
        const { container } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(container.querySelector('.dropdown')).toBeInTheDocument();
    });

    test('does not render export dropdown when Authenticator.scanFeature returns false', () => {
        Authenticator.scanFeature.mockReturnValue(false);
        const { container } = renderComp(DtrSummaryNew, { dtrSummary: notLoaded });
        expect(container.querySelector('.dropdown')).not.toBeInTheDocument();
    });
});

describe('DtrMultiLogsSummary component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Authenticator.scanFeature.mockReturnValue(true);
    });

    const notLoaded = { isListLoaded: false, dtrItems: [] };

    test('renders without crashing', () => {
        expect(() => renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded })).not.toThrow();
    });

    test('renders the page title', () => {
        const { getByText } = renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded });
        expect(getByText(/DTR MULTI-CLOCK IN SUMMARY/i)).toBeInTheDocument();
    });

    test('renders department filter select', () => {
        const { container } = renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded });
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('renders Generate button', () => {
        const { getByText } = renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded });
        expect(getByText(/Generate/i)).toBeInTheDocument();
    });

    test('shows "no record found" when isListLoaded is false', () => {
        const { getByText } = renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded });
        expect(getByText(/no record found/i)).toBeInTheDocument();
    });

    test('renders table headers and a row when isListLoaded is true', () => {
        const { getByText } = renderComp(DtrMultiLogsSummary, {
            dtrMultiLogsSummary: {
                isListLoaded: true,
                dtrItems: [{ Employee_Number: 'EMP-2', Employee_Name: 'John Roe', Department: 'Engineering', Date: '2026-07-01', Total_Hours: '8' }],
            },
        });
        expect(getByText('Employee Number')).toBeInTheDocument();
        expect(getByText('Total Hours')).toBeInTheDocument();
        expect(getByText('EMP-2')).toBeInTheDocument();
        expect(getByText('John Roe')).toBeInTheDocument();
    });

    test('does not crash when dtrItems is empty', () => {
        expect(() => renderComp(DtrMultiLogsSummary, {
            dtrMultiLogsSummary: { isListLoaded: true, dtrItems: [] },
        })).not.toThrow();
    });

    test('renders export button when Authenticator.scanFeature returns true', () => {
        Authenticator.scanFeature.mockReturnValue(true);
        const { getAllByText } = renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded });
        expect(getAllByText(/Export/i).length).toBeGreaterThan(0);
    });

    test('does not render export button when Authenticator.scanFeature returns false', () => {
        Authenticator.scanFeature.mockReturnValue(false);
        const { queryByText } = renderComp(DtrMultiLogsSummary, { dtrMultiLogsSummary: notLoaded });
        expect(queryByText(/^Export$/i)).not.toBeInTheDocument();
    });
});

describe('DtrLogs component', () => {
    beforeEach(() => jest.clearAllMocks());

    const notLoaded = { isListLoaded: false, instance: { data: [], pagination: {} } };

    test('renders without crashing', () => {
        expect(() => renderComp(DtrLogs, { dtrLogs: notLoaded })).not.toThrow();
    });

    test('renders the page title', () => {
        const { getByText } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(getByText(/DTR LOGS/i)).toBeInTheDocument();
    });

    test('renders department filter select', () => {
        const { container } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
    });

    test('renders name filter input', () => {
        const { container } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
    });

    test('renders Generate button', () => {
        const { getByText } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(getByText(/Generate/i)).toBeInTheDocument();
    });

    test('shows "no record found" when isListLoaded is false', () => {
        const { getByText } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(getByText(/no record found/i)).toBeInTheDocument();
    });

    test('renders table headers and a row when isListLoaded is true', () => {
        const { getByText } = renderComp(DtrLogs, {
            dtrLogs: {
                isListLoaded: true,
                instance: {
                    data: [{ emp_num: 'EMP-3', full_name: 'Alice Smith', department: 'Engineering', date: '2026-07-01' }],
                    pagination: {},
                },
            },
        });
        expect(getByText('# ID')).toBeInTheDocument();
        expect(getByText('Name')).toBeInTheDocument();
        expect(getByText('EMP-3')).toBeInTheDocument();
        expect(getByText('Alice Smith')).toBeInTheDocument();
    });

    test('does not crash when instance.data is empty', () => {
        expect(() => renderComp(DtrLogs, {
            dtrLogs: { isListLoaded: true, instance: { data: [], pagination: {} } },
        })).not.toThrow();
    });

    test('renders the Toggle Outlook button', () => {
        const { getByText } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(getByText(/Toggle Outlook/i)).toBeInTheDocument();
    });

    test('clicking Toggle Outlook flips the eye icon class', () => {
        const { getByText, container } = renderComp(DtrLogs, { dtrLogs: notLoaded });
        expect(container.querySelector('.fa-eye-slash')).toBeInTheDocument();
        fireEvent.click(getByText(/Toggle Outlook/i));
        expect(container.querySelector('.fa-eye')).toBeInTheDocument();
    });
});
