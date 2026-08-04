// DRAFT — generated 2026-07-08, needs verification
/**
 * Admin/SyncUserUpdates — admin tool to pull BambooHR user updates for a date range.
 * Formik form + a results table over `sync.biometrics`. connect stripped;
 * Wrapper/AdminLte/BackButton/DatePicker stubbed.
 * Source: src/container/Admin/SyncUserUpdates/SyncUserUpdates.js
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

import SyncUserUpdates from '../../container/Admin/SyncUserUpdates/SyncUserUpdates';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <SyncUserUpdates
                sync={{ users: [] }}
                syncBhrUsers={jest.fn()}
                history={{ push: jest.fn() }}
                match={{ params: {} }}
                location={{ search: '' }}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('SyncUserUpdates container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Sync BHR User Updates title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Sync BHR User Updates/i)).toBeInTheDocument();
    });

    test('renders a submit button', () => {
        const { container } = renderComponent();
        expect(container.querySelector('button[type="submit"], form button')).toBeInTheDocument();
    });

    test('does not crash when the sync result set is populated', () => {
        expect(() => renderComponent({
            sync: { users: [{ id: 1, name: 'Emp One', updated: '2026-07-01' }] },
        })).not.toThrow();
    });
});
