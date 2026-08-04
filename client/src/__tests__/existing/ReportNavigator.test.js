// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/ReportNavigator — the day/week/month/custom range switcher used on
 * report pages. Driven by moment start_date/end_date props plus a
 * handleChangeDate callback. react-bootstrap and react-datepicker are stubbed.
 * Source: src/components/Template/ReportNavigator/ReportNavigator.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import moment from 'moment';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('react-bootstrap', () => ({
    Container: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
    Table: ({ children }) => <table>{children}</table>,
    Image: (props) => <img alt="" {...props} />,
    Spinner: () => <div>loading</div>,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Form: Object.assign(({ children }) => <form>{children}</form>, {
        Control: (props) => <input {...props} />,
    }),
    InputGroup: ({ children }) => <div>{children}</div>,
    FormControl: (props) => <input {...props} />,
    Tabs: ({ children, onSelect }) => <div className="tabs" data-onselect={!!onSelect}>{children}</div>,
    Tab: ({ title }) => <div className="tab">{title}</div>,
}));

jest.mock('react-datepicker', () => (props) => <input data-testid="datepicker" {...props} />);

jest.mock('../../services/Validator', () => ({
    __esModule: true,
    default: { isValid: jest.fn(() => true) },
}));

import ReportNavigator from '../../components/Template/ReportNavigator/ReportNavigator';

function renderComponent(props = {}) {
    return render(
        <ReportNavigator
            start_date={moment('2026-01-01')}
            end_date={moment('2026-01-31')}
            handleChangeDate={jest.fn()}
            {...props}
        />
    );
}

describe('ReportNavigator component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the day/week/month/custom tabs', () => {
        const { getByText } = renderComponent();
        expect(getByText('Today')).toBeInTheDocument();
        expect(getByText('Weekly')).toBeInTheDocument();
        expect(getByText('Monthly')).toBeInTheDocument();
        expect(getByText('Custom')).toBeInTheDocument();
    });

    test('renders the prev/next navigate arrows', () => {
        const { container } = renderComponent();
        expect(container.querySelector('.fa-angle-left')).toBeInTheDocument();
        expect(container.querySelector('.fa-angle-right')).toBeInTheDocument();
    });

    test('honours a supplied default_view_type without crashing', () => {
        expect(() => renderComponent({ default_view_type: 'week' })).not.toThrow();
    });
});
