// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/ReportNavigatorShort — a trimmed range switcher (Today/Monthly, plus
 * a Custom tab gated by the HR view_attendance_report feature). Same moment
 * props/handleChangeDate contract as ReportNavigator.
 * Source: src/components/Template/ReportNavigatorShort/ReportNavigatorShort.js
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
    Tabs: ({ children }) => <div className="tabs">{children}</div>,
    Tab: ({ title }) => <div className="tab">{title}</div>,
}));

jest.mock('react-datepicker', () => (props) => <input data-testid="datepicker" {...props} />);

jest.mock('../../services/Validator', () => ({
    __esModule: true,
    default: { isValid: jest.fn(() => true) },
}));

jest.mock('../../services/Authenticator', () => ({
    __esModule: true,
    default: { scanLevel_Feature: jest.fn(() => true) },
}));

import ReportNavigatorShort from '../../components/Template/ReportNavigatorShort/ReportNavigatorShort';

function renderComponent(props = {}) {
    return render(
        <ReportNavigatorShort
            start_date={moment('2026-01-01')}
            end_date={moment('2026-01-31')}
            handleChangeDate={jest.fn()}
            {...props}
        />
    );
}

describe('ReportNavigatorShort component', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Today and Monthly tabs', () => {
        const { getByText } = renderComponent();
        expect(getByText('Today')).toBeInTheDocument();
        expect(getByText('Monthly')).toBeInTheDocument();
    });

    test('shows the Custom tab when the HR attendance feature is granted', () => {
        const { getByText } = renderComponent();
        expect(getByText('Custom')).toBeInTheDocument();
    });

    test('hides the Custom tab when the feature is denied', () => {
        // eslint-disable-next-line global-require
        const Authenticator = require('../../services/Authenticator').default;
        Authenticator.scanLevel_Feature.mockReturnValue(false);
        const { queryByText } = renderComponent();
        expect(queryByText('Custom')).not.toBeInTheDocument();
    });
});
