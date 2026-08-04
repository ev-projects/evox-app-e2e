/**
 * evoxtest_MultiQuickpunchDeep2.test.js
 * Wave-3 coverage for components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch.js
 * (29 Jul: 76 unc / 38.7%). Arms: onSubmitHandler in/continue direct-dispatch vs
 * out→confirmation-modal, on_date confirm accept/decline, handleModalSubmit
 * warn/dispatch/close arms, remark+project setters, clock tick (offset vs fallback)
 * and unmount timer cleanup. Handlers driven via instance ref; the self-rescheduling
 * setTimeout is contained with fake timers.
 * ADDITIVE ONLY. Menu: Dashboard → Quick punch (multi-login users).
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));
jest.mock('react-datepicker', () => () => <input type="date" />);
jest.mock('../../store/actions/dtr/quickpunchActions', () => ({ biometrixLogMulti: jest.fn() }));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const passthrough = ({ children }) => <div>{children}</div>;
    const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
    Modal.Header = passthrough; Modal.Body = passthrough; Modal.Footer = passthrough; Modal.Title = passthrough;
    const Form = passthrough;
    Form.Group = passthrough; Form.Label = passthrough;
    // Form.Control may receive `as`/children (select options) — never render a void input
    Form.Control = ({ children, as, onChange, value }) => (
        <select onChange={onChange} value={value}>{children}</select>
    );
    const Dropdown = passthrough;
    Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;
    return {
        Container: passthrough, Row: passthrough, Col: passthrough,
        Table: ({ children }) => <table>{children}</table>,
        Image: () => <img alt="" />, Spinner: () => <div data-testid="spinner" />,
        Button: ({ children, onClick, type, disabled }) => (
            <button onClick={onClick} type={type} disabled={disabled}>{children}</button>
        ),
        Badge: ({ children }) => <span>{children}</span>,
        Modal, ModalHeader: passthrough, ModalBody: passthrough, ModalFooter: passthrough,
        Form, Group: passthrough, Label: passthrough, Control: (props) => <input {...props} />,
        FormSelect: (props) => <select {...props} />,
        Dropdown,
    };
});

const MultiQuickpunch =
    require('../../components/Dashboard/PunchComponents/MultiQuickpunch/MultiQuickpunch').default;

const baseProps = {
    user: { id: 42, user_server_timestamp_mils: null },
    constant: {},
    dashboard: { recent_punch: [], isRecentPunchLoaded: false },
};

function renderMQP(props = {}) {
    const ref = React.createRef();
    const biometrixLogMulti = jest.fn();
    const utils = render(
        <MultiQuickpunch ref={ref} {...baseProps} biometrixLogMulti={biometrixLogMulti} {...props} />
    );
    return { ...utils, ref, biometrixLogMulti };
}

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
});
afterEach(() => {
    jest.useRealTimers();
});

describe('MultiQuickpunch — onSubmitHandler routing', () => {
    test('punch-in dispatches immediately with the serialized values', () => {
        const { ref, biometrixLogMulti } = renderMQP();
        ref.current.onSubmitHandler({ quickpunch: 'in', on_date: false, project_name: 'EVOX' });

        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        const [fd, userId] = biometrixLogMulti.mock.calls[0];
        expect(fd.get('quickpunch')).toBe('in');
        expect(fd.get('project_name')).toBe('EVOX');
        expect(userId).toBe(42);
    });

    test('continue also dispatches directly; on_date=true asks for confirmation first', () => {
        const confirmSpy = jest.spyOn(window, 'confirm');
        const { ref, biometrixLogMulti } = renderMQP();

        confirmSpy.mockReturnValueOnce(true);
        ref.current.onSubmitHandler({ quickpunch: 'continue', on_date: true });
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);

        confirmSpy.mockReturnValueOnce(false);
        ref.current.onSubmitHandler({ quickpunch: 'continue', on_date: true });
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1); // declined → unchanged
        confirmSpy.mockRestore();
    });

    test('punch-out routes to the confirmation modal instead of dispatching', () => {
        const { ref, biometrixLogMulti, getByTestId } = renderMQP();
        ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false });

        expect(biometrixLogMulti).not.toHaveBeenCalled();
        expect(ref.current.state.showModal).toBe(true);
        expect(ref.current.state.temp_values_formdata).toEqual({ quickpunch: 'out', on_date: false });
        getByTestId('modal');
    });
});

describe('MultiQuickpunch — confirmation modal flow', () => {
    function openModal(ref) {
        ref.current.onSubmitHandler({ quickpunch: 'out', on_date: false });
    }

    test('submitting without remarks or project warns and keeps the modal open', () => {
        const { ref, biometrixLogMulti } = renderMQP();
        openModal(ref);
        ref.current.handleModalSubmit();

        expect(ref.current.state.modal_warn).toBe(true);
        expect(ref.current.state.showModal).toBe(true);
        expect(biometrixLogMulti).not.toHaveBeenCalled();
    });

    test('filled remarks + project dispatch the punch-out and close the modal', () => {
        const { ref, biometrixLogMulti } = renderMQP();
        openModal(ref);
        ref.current.handleRemarkChange('end of shift');
        ref.current.handleProjectNameChange('EVOX');
        ref.current.handleModalSubmit();

        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);
        const fd = biometrixLogMulti.mock.calls[0][0];
        expect(fd.get('remarks')).toBe('end of shift');
        expect(fd.get('project_name')).toBe('EVOX');
        expect(fd.get('quickpunch')).toBe('out');
        expect(ref.current.state.showModal).toBe(false);
    });

    test('modal on_date=true asks for confirmation; close handler hides the modal', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const { ref, biometrixLogMulti } = renderMQP();
        ref.current.onSubmitHandler({ quickpunch: 'out', on_date: true });
        ref.current.handleRemarkChange('r');
        ref.current.handleProjectNameChange('p');
        ref.current.handleModalSubmit();
        expect(confirmSpy).toHaveBeenCalled();
        expect(biometrixLogMulti).toHaveBeenCalledTimes(1);

        ref.current.setState({ showModal: true });
        ref.current.handleModalClose();
        expect(ref.current.state.showModal).toBe(false);
        confirmSpy.mockRestore();
    });
});

describe('MultiQuickpunch — clock tick and cleanup', () => {
    test('tick without a server timestamp falls back to local time; with it, syncs then increments', () => {
        const { ref } = renderMQP();
        jest.advanceTimersByTime(1100); // first tick: fallback arm (no server ts)
        expect(ref.current.state.offsetHasLoaded).toBe(false);

        const withTs = renderMQP({ user: { id: 42, user_server_timestamp_mils: Date.now() } });
        jest.advanceTimersByTime(1100); // sync arm
        expect(withTs.ref.current.state.offsetHasLoaded).toBe(true);
        const t1 = withTs.ref.current.state.time.getTime();
        jest.advanceTimersByTime(1000); // increment arm (addSeconds)
        expect(withTs.ref.current.state.time.getTime()).toBeGreaterThan(t1);
    });

    test('unmount clears the self-rescheduling timer', () => {
        const clearSpy = jest.spyOn(window, 'clearTimeout');
        const { unmount } = renderMQP();
        unmount();
        expect(clearSpy).toHaveBeenCalled();
        clearSpy.mockRestore();
    });
});
