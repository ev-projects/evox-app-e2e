// DRAFT — generated 2026-07-08, needs verification
/**
 * PayrollDispute/DisputeReport — the payroll dispute listing/report page.
 * On mount it seeds the date filter from settings.current_payroll_cutoff and
 * dispatches fecthdispute/fecthdepartment. Data-layer deps stubbed.
 * Source: src/components/PayrollDispute/DisputeReport.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

jest.mock('../../components/PayrollDispute/Disouteapi.js', () => ({
    fecthdepartment: jest.fn(() => ({ type: 'FETCH_DEPT' })),
    fecthdispute: jest.fn(() => ({ type: 'FETCH_DISPUTE' })),
}));

jest.mock('../../services/API', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: jest.fn(() => Promise.resolve({ data: {} })) } }));
jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(() => Promise.resolve({ data: {} })), post: jest.fn(() => Promise.resolve({ data: {} })) } }));
jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel: jest.fn(() => true), scanLevel_Feature: jest.fn(() => true) },
}));
jest.mock('../../services/Formatter', () => ({
    __esModule: true,
    default: { title_to_slug: jest.fn((s) => String(s || '')), toReadableDateTime: jest.fn((d) => d) },
}));

import DisputeReport from '../../components/PayrollDispute/DisputeReport';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DisputeReport
                settings={{ current_payroll_cutoff: null, countries: [] }}
                userdepartment={[]}
                dispute={[]}
                geos={[]}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('DisputeReport component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Payroll Dispute Report heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Payroll Dispute Report/i)).toBeInTheDocument();
    });

    test('does not crash when a payroll cutoff is set', () => {
        expect(() => renderComponent({
            settings: {
                current_payroll_cutoff: { start_date: '2026-07-01', end_date: '2026-07-15' },
                countries: [],
            },
        })).not.toThrow();
    });
});
