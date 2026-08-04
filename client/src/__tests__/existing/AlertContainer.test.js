// DRAFT — generated 2026-07-08, needs verification
/**
 * Template/AlertContainer — global toast/alert popup driven by the `alert`
 * redux slice. connect is stripped so we drive it via props directly.
 * Source: src/components/Template/AlertContainer/AlertContainer.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('react-bootstrap', () => ({
    Alert: Object.assign(
        ({ children, variant }) => <div className={`alert alert-${variant}`}>{children}</div>,
        { Heading: ({ children }) => <div className="alert-heading">{children}</div> }
    ),
    Fade: ({ children }) => <div>{children}</div>,
}));

import AlertContainer from '../../components/Template/AlertContainer/AlertContainer';

const baseAlert = {
    onShow: true,
    timeOut: 0,
    header: 'Success',
    body: 'Your request was saved.',
    variant: 'success',
};

function renderComponent(alert = {}) {
    return render(<AlertContainer alert={{ ...baseAlert, ...alert }} hideAlert={jest.fn()} />);
}

describe('AlertContainer component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the alert header text', () => {
        const { getByText } = renderComponent();
        expect(getByText('Success')).toBeInTheDocument();
    });

    test('renders a string body as a message', () => {
        const { getByText } = renderComponent();
        expect(getByText('Your request was saved.')).toBeInTheDocument();
    });

    test('renders an array body as multiple list items', () => {
        const { getByText } = renderComponent({ body: ['Line one', 'Line two'] });
        expect(getByText('Line one')).toBeInTheDocument();
        expect(getByText('Line two')).toBeInTheDocument();
    });

    test('applies fadeOut class when alert is hidden', () => {
        const { container } = renderComponent({ onShow: false });
        expect(container.querySelector('.fadeOut')).toBeInTheDocument();
    });

    test('applies fadeIn class when alert is shown', () => {
        const { container } = renderComponent({ onShow: true });
        expect(container.querySelector('.fadeIn')).toBeInTheDocument();
    });

    test('does not crash when body is empty', () => {
        expect(() => renderComponent({ body: '', header: '' })).not.toThrow();
    });
});
