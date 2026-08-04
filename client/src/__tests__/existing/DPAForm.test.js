// DRAFT — generated 2026-07-08, needs verification
/**
 * DPAForm — Data Privacy webinar acknowledgement page. Renders a ReactPlayer
 * video (stubbed) plus a Formik confirmation checkbox that dispatches tickDpa.
 * Source: src/container/DPAForm/DPAForm.js
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

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    Content: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
}));
jest.mock('react-player/lazy', () => () => <div data-testid="react-player">player</div>);

import DPAForm from '../../container/DPAForm/DPAForm';

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <DPAForm
                user={{ id: 1, full_name: 'Jane Doe' }}
                tickDpa={jest.fn()}
                showAlert={jest.fn()}
                history={{ push: jest.fn() }}
                {...props}
            />
        </MemoryRouter>
    );
}

describe('DPAForm container', () => {
    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the Data Privacy webinar title', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Webinar: Data Privacy/i)).toBeInTheDocument();
    });

    test('renders the webinar video player', () => {
        const { getByTestId } = renderComponent();
        expect(getByTestId('react-player')).toBeInTheDocument();
    });

    test('renders the acknowledgement form', () => {
        const { container } = renderComponent();
        expect(container.querySelector('form')).toBeInTheDocument();
    });
});
