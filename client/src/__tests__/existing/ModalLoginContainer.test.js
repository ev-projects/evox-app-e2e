// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/ModalLoginContainer — re-auth modal that shows on any route except
 * "/" and "/login". Uses useLocation, so it is rendered inside MemoryRouter
 * with a chosen initialEntries path. The heavy ModalLogin child is stubbed.
 * Source: src/components/Template/ModalLoginContainer/ModalLoginContainer.js
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

jest.mock('react-bootstrap', () => ({
    Modal: Object.assign(
        ({ children, show }) => (show ? <div data-testid="login-modal">{children}</div> : null),
        {
            Header: ({ children }) => <div>{children}</div>,
            Title: ({ children }) => <div>{children}</div>,
            Body: ({ children }) => <div>{children}</div>,
        }
    ),
    Button: ({ children }) => <button>{children}</button>,
}));

jest.mock('../../container/ModalLogin/ModalLogin', () =>
    () => <div data-testid="modal-login">ModalLogin</div>);

import ModalLoginContainer from '../../components/Template/ModalLoginContainer/ModalLoginContainer';

function renderAt(path, modalLogin = { onShow: true }) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <ModalLoginContainer modalLogin={modalLogin} />
        </MemoryRouter>
    );
}

describe('ModalLoginContainer component', () => {
    test('renders without crashing on an app route', () => {
        expect(() => renderAt('/app/Dashboard')).not.toThrow();
    });

    test('shows the login modal on a protected route when onShow is true', () => {
        const { getByTestId, getByText } = renderAt('/app/Dashboard');
        expect(getByTestId('login-modal')).toBeInTheDocument();
        expect(getByText(/Login to Continue/i)).toBeInTheDocument();
        expect(getByTestId('modal-login')).toBeInTheDocument();
    });

    test('renders nothing on the login route', () => {
        const { container } = renderAt('/login');
        expect(container.firstChild).toBeNull();
    });

    test('renders nothing on the root route', () => {
        const { container } = renderAt('/');
        expect(container.firstChild).toBeNull();
    });

    test('does not show the modal when onShow is false', () => {
        const { queryByTestId } = renderAt('/app/Dashboard', { onShow: false });
        expect(queryByTestId('login-modal')).not.toBeInTheDocument();
    });
});
