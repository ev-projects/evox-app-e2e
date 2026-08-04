// DRAFT — generated 2026-07-08, needs verification
/**
 * Dashboard/Holiday — this-month holiday list widget. Reads holidays from the
 * `holiday` prop (mapped from state.dashboard) and fetches on mount.
 * Source: src/components/Dashboard/Holiday/Holiday.js
 */
import React from 'react';
import { render } from '@testing-library/react';
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
}));

import Holiday from '../../components/Dashboard/Holiday/Holiday';

const holidays = [
    { holiday_date: '2026-07-12', holiday_name: 'Independence Day' },
    { holiday_date: '2026-07-25', holiday_name: 'Founders Day' },
];

function renderComponent(props = {}) {
    return render(
        <Holiday
            user={{ id: 1 }}
            holiday={{ holidays }}
            getThisMonthHoliday={jest.fn()}
            {...props}
        />
    );
}

describe('Holiday component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('fetches this-month holidays on mount', () => {
        const getThisMonthHoliday = jest.fn();
        renderComponent({ getThisMonthHoliday });
        expect(getThisMonthHoliday).toHaveBeenCalled();
    });

    test('lists each holiday name and date', () => {
        const { getByText } = renderComponent();
        expect(getByText('Independence Day')).toBeInTheDocument();
        expect(getByText('2026-07-12')).toBeInTheDocument();
    });

    test('shows an empty message when there are no holidays', () => {
        const { getByText } = renderComponent({ holiday: { holidays: [] } });
        expect(getByText(/No holidays to be displayed/i)).toBeInTheDocument();
    });
});
