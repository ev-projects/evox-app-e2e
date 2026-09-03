/**
 * evoxtest_RequestButtonsActionsWave18.test.js
 *
 * SOURCE FILE UNDER TEST
 *   src/components/RequestComponent/RequestButtons/RequestButtons.js
 *
 * MENU PATH
 *   Not a screen of its own — the action bar at the foot of every request form. Thirteen
 *   containers mount it: Request -> Overtime / Rest Day Work / Change Schedule / Alter Log /
 *   Alter Log Punch / COE, My Team -> the approval view of each of those, Dashboard (store
 *   mode, no back button), Ops Schedule -> Schedule Form, and Admin -> Job Openings Update.
 *
 * CURRENT MEASURED COVERAGE (17 Aug run)
 *   5 uncovered functions / 2 uncovered branches. Every one of the thirteen importers mocks
 *   this component out (see the mock in RequestScreensDeepLifecycle.test.js and its siblings),
 *   so the button onClick handlers — the things that decide whether a request is approved,
 *   declined, cancelled or reopened — have never been executed by a test. Uncovered:
 *     line 41  "Update and Reopen"  (update mode on an already-approved request)
 *     line 50  "Decline"            (approval mode, request currently approved)
 *     line 57  "Approve"            (approval mode, request currently declined)
 *     line 64  "Approve"            (approval mode, request pending)
 *     line 65  "Decline"            (approval mode, request pending)
 *     line 17  the noBackBtn arm    (Dashboard is the only caller that sets it)
 *     line 75  the unknown-method arm
 *
 * WHAT THE ASSERTIONS ARE ON
 *   Each button writes a value into the Formik field `action` and then submits. That value is
 *   the entire contract between this bar and every request container's onSubmitHandler — it is
 *   what turns one submit into an approve, a decline, a cancel or a plain save. So every test
 *   below asserts the exact `action` that reaches the form's onSubmit, not that a button exists.
 *
 * NOTE ON THE BUTTON STUB
 *   react-bootstrap's Button is stubbed as a type="button" element. In the real screen these are
 *   type="submit" inside the form, so a click both runs onClick AND submits natively — the
 *   double-submit that AttendanceSummaryPanelsLifecycle records as _FINDING_DOUBLE_SUBMIT for
 *   AssetReport. Stubbing it to type="button" keeps exactly one submit per click here so the
 *   `action` payload can be read unambiguously; it is not a claim that production submits once.
 *
 * ADDITIVE ONLY — no existing test file touched, no application source changed.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { Formik } from 'formik';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
}));

jest.mock('../../components/Template/BackButton', () => () => (
    <button data-testid="back-button" type="button">Back</button>
));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    return {
        Form: ({ children }) => <div>{children}</div>,
        InputGroup: ({ children }) => <div>{children}</div>,
        FormControl: (p) => <input {...p} />,
        Button: ({ children, onClick, className }) => (
            <button type="button" className={className} onClick={onClick}>{children}</button>
        ),
    };
});

const RequestButtons =
    require('../../components/RequestComponent/RequestButtons/RequestButtons').default;

function renderBar(context) {
    const onSubmit = jest.fn();
    const utils = render(
        <Formik initialValues={{ action: 'untouched', id: 12 }} onSubmit={onSubmit}>
            {({ handleSubmit }) => (
                <form onSubmit={handleSubmit}>
                    <RequestButtons {...context} />
                </form>
            )}
        </Formik>
    );
    return { ...utils, onSubmit };
}

// The labels carry a leading icon element, so match on contained text.
const buttonLabels = (container) =>
    Array.from(container.querySelectorAll('button'))
        .map((b) => b.textContent.trim())
        .filter((t) => t !== 'Back');

const clickLabel = async (container, label) => {
    const target = Array.from(container.querySelectorAll('button'))
        .find((b) => b.textContent.trim() === label);
    if (!target) throw new Error(`no button labelled "${label}" — found: ${buttonLabels(container).join(' | ')}`);
    await act(async () => { fireEvent.click(target); });
};

const submittedAction = (onSubmit) => {
    expect(onSubmit).toHaveBeenCalledTimes(1);
    return onSubmit.mock.calls[0][0].action;
};

const ctx = (method, status, extra = {}) => ({
    method,
    props: { instance: { id: 12, status } },
    ...extra,
});

beforeEach(() => jest.clearAllMocks());

describe('RequestButtons — filing a new request', () => {
    test('store mode offers Submit alone and files with no action verb', async () => {
        const { container, onSubmit } = renderBar(ctx('store', 'pending'));
        expect(buttonLabels(container)).toEqual(['Submit']);

        await clickLabel(container, 'Submit');
        expect(submittedAction(onSubmit)).toBeNull();
    });
});

describe('RequestButtons — the requester editing their own request', () => {
    test('a pending request can be updated or cancelled, and each sends its own verb', async () => {
        const first = renderBar(ctx('update', 'pending'));
        expect(buttonLabels(first.container)).toEqual(['Update', 'Cancel']);

        await clickLabel(first.container, 'Update');
        expect(submittedAction(first.onSubmit)).toBeNull();
        first.unmount();

        const second = renderBar(ctx('update', 'pending'));
        await clickLabel(second.container, 'Cancel');
        expect(submittedAction(second.onSubmit)).toBe('cancel');
    });

    test('an already-cancelled request can still be updated but offers no second Cancel', async () => {
        const { container, onSubmit } = renderBar(ctx('update', 'canceled'));
        expect(buttonLabels(container)).toEqual(['Update']);

        await clickLabel(container, 'Update');
        expect(submittedAction(onSubmit)).toBeNull();
    });

    test('an approved request offers Update and Reopen instead of a plain Update', async () => {
        const { container, onSubmit } = renderBar(ctx('update', 'approved'));
        expect(buttonLabels(container)).toEqual(['Update and Reopen']);

        await clickLabel(container, 'Update and Reopen');
        // reopening rides on the same empty action as a plain update — the backend infers the
        // reopen from the request's current approved status, not from a distinct verb
        expect(submittedAction(onSubmit)).toBeNull();
    });

    test('a declined request is treated like a pending one — Update plus Cancel', async () => {
        const { container } = renderBar(ctx('update', 'declined'));
        expect(buttonLabels(container)).toEqual(['Update', 'Cancel']);
    });
});

describe('RequestButtons — the approver acting on someone else request', () => {
    test('a pending request offers both Approve and Decline', async () => {
        const approve = renderBar(ctx('approval', 'pending'));
        expect(buttonLabels(approve.container)).toEqual(['Approve', 'Decline']);

        await clickLabel(approve.container, 'Approve');
        expect(submittedAction(approve.onSubmit)).toBe('approve');
        approve.unmount();

        const decline = renderBar(ctx('approval', 'pending'));
        await clickLabel(decline.container, 'Decline');
        expect(submittedAction(decline.onSubmit)).toBe('decline');
    });

    test('an approved request offers only the reversal — Decline', async () => {
        const { container, onSubmit } = renderBar(ctx('approval', 'approved'));
        expect(buttonLabels(container)).toEqual(['Decline']);

        await clickLabel(container, 'Decline');
        expect(submittedAction(onSubmit)).toBe('decline');
    });

    test('a declined request offers only the reversal — Approve', async () => {
        const { container, onSubmit } = renderBar(ctx('approval', 'declined'));
        expect(buttonLabels(container)).toEqual(['Approve']);

        await clickLabel(container, 'Approve');
        expect(submittedAction(onSubmit)).toBe('approve');
    });

    test('a cancelled request is final — the approver gets no action at all', () => {
        const { container } = renderBar(ctx('approval', 'canceled'));
        expect(buttonLabels(container)).toEqual([]);
    });
});

describe('RequestButtons — the surrounding chrome', () => {
    test('an unrecognised mode renders the back button and nothing else', () => {
        // JobOpeningsUpdate and OpsScheduleForm pass `method` straight through from their own
        // state, so a mode the bar does not know about falls through to the empty arm.
        const { container, getByTestId } = renderBar(ctx('view', 'pending'));
        expect(buttonLabels(container)).toEqual([]);
        expect(getByTestId('back-button')).toBeInTheDocument();
    });

    test('the back button is present by default', () => {
        const { getByTestId } = renderBar(ctx('approval', 'pending'));
        expect(getByTestId('back-button')).toBeInTheDocument();
    });

    test('Dashboard suppresses the back button with noBackBtn while keeping Submit', () => {
        const { container, queryByTestId } = renderBar(ctx('store', 'pending', { noBackBtn: true }));
        expect(queryByTestId('back-button')).toBeNull();
        expect(buttonLabels(container)).toEqual(['Submit']);
    });
});
