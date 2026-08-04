// DRAFT — generated 2026-07-08, needs verification
/**
 * Admin/SyncBiometrics — admin tool to pull biometric punches for a date range.
 * Formik form + a results table over `sync.biometrics`. connect stripped;
 * Wrapper/AdminLte/BackButton/DatePicker stubbed.
 * Source: src/container/Admin/SyncBiometrics/SyncBiometrics.js
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
jest.mock('../../components/Template/BackButton', () => () => <button>Back</button>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => ({
    InputDate: ({ name }) => <input name={name} type="date" />,
    InputTime: ({ name }) => <input name={name} type="time" />,
}));

import SyncBiometrics from '../../container/Admin/SyncBiometrics/SyncBiometrics';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <SyncBiometrics
                sync={{ biometrics: [] }}
                syncBiometrics={jest.fn()}
                history={{ push: jest.fn() }}
                match={{ params: {} }}
                location={{ search: '' }}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('SyncBiometrics container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Sync Biometrics title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Sync Biometrics/i)).toBeInTheDocument();
    });

    test('renders a submit button', () => {
        const { container } = renderComponent();
        expect(container.querySelector('button[type="submit"], form button')).toBeInTheDocument();
    });

    test('does not crash when the sync result set is populated', () => {
        expect(() => renderComponent({
            sync: { biometrics: [{ id: 1, name: 'Emp One', log: '2026-07-01 09:00' }] },
        })).not.toThrow();
    });
});
