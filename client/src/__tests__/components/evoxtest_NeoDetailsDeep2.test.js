/**
 * evoxtest_NeoDetailsDeep2.test.js
 * Wave-3 coverage for components/NeoReport/NeoDetails.js (29 Jul: 71 unc / 26%).
 * Arms: mount fetch, row render variants (guid-skip, plain value, Not Provided,
 * Approved label, Master-Data-disabled, View File button, date format), HR
 * approve/resubmit marking incl. re-index removal, submit validations (unmarked
 * fields alert, required note), approve-all vs resubmission API paths with
 * confirm accept/decline, viewFile image/non-image/failure arms, viewer close.
 * ADDITIVE ONLY. Menu: NEO Report → Submission Details (route: neo_report_submissions+':guid?').
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../components/GridComponent/AdminLte', () => ({
    ContainerBody: ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    Content: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('react-file-viewer', () => () => <div />);
jest.mock('react-bootstrap', () => ({
    Table: ({ children }) => <table>{children}</table>,
    Button: ({ children, onClick, type, style }) => <button onClick={onClick} type={type} style={style}>{children}</button>,
    Container: ({ children }) => <div>{children}</div>,
}));
jest.mock('react-bootstrap/Modal', () => {
    const React = require('react');
    const Modal = ({ children, show, onHide }) => (show ? (
        <div data-testid="viewer-modal">
            <button data-testid="viewer-close" onClick={onHide}>x</button>
            {children}
        </div>
    ) : null);
    Modal.Header = ({ children }) => <div>{children}</div>;
    Modal.Title = ({ children }) => <div>{children}</div>;
    Modal.Body = ({ children }) => <div>{children}</div>;
    return Modal;
});
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
    alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
    alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));
jest.mock('../../store/actions/neo/neoActions', () => ({
    fetchNeoSubmissionData: jest.fn((guid) => ({ type: 'STUB_FETCH_NEO', guid })),
}));

import API from '../../services/API';
import Formatter from '../../services/Formatter';
import { fetchNeoSubmissionData } from '../../store/actions/neo/neoActions';

global.links = new Proxy({}, { get: () => '/x/' });
window.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

const NeoDetails = require('../../components/NeoReport/NeoDetails').default;

const FILE_GUID = '123e4567-e89b-12d3-a456-426614174000';

const submissionRows = [
    // real data carries the guid row WITHOUT the boolean flags — the strict === false
    // checks in handleSubmit exclude it from validation only because they're undefined
    { fieldName: 'guid', fieldValue: 'skip-me' },
    { fieldName: 'firstName', fieldValue: 'Juan', submittedAt: '2026-07-01', isApproved: false, isDisabled: false },
    { fieldName: 'validId', fieldValue: FILE_GUID, submittedAt: '2026-07-02', isApproved: false, isDisabled: false },
    { fieldName: 'address', fieldValue: '', isApproved: false, isDisabled: false },
    { fieldName: 'email', fieldValue: 'j@x.com', isApproved: true, isDisabled: false },
    { fieldName: 'tin', fieldValue: '123', isApproved: false, isDisabled: true },
];

const baseProps = {
    user: { full_name: 'HR Person', country: 'Philippines' },
    bhr_num: 42734,
    submission_data: submissionRows,
    params: { guid: 'g-777' },
    history: { goBack: jest.fn() },
};

function renderNeo(props = {}) {
    return render(<NeoDetails {...baseProps} {...props} />);
}

const flush = () => new Promise((r) => setTimeout(r, 10));

beforeEach(() => {
    jest.clearAllMocks();
    API.call.mockImplementation(() => Promise.resolve({ status: 200, data: {} }));
});

describe('NeoDetails — mount and row variants', () => {
    test('mount fetches the submission by guid; rows render every display arm', () => {
        const { getByText, queryByText, container } = renderNeo();

        expect(fetchNeoSubmissionData).toHaveBeenCalledWith('g-777');
        expect(queryByText(/SKIP-ME/i)).toBeNull();          // guid row skipped
        getByText('FIRST NAME');                              // camelCase → spaced upper
        getByText('Juan');                                    // plain value arm
        getByText('Not Provided');                            // empty value arm
        getByText('Approved');                                // isApproved label
        getByText('Master Data already updated');             // isDisabled label
        getByText(/View File/);                               // GUID value → file button
        getByText('Jul 01, 2026');                            // date format arm
        // address row (empty, not approved/disabled) still gets action buttons
        expect(container.querySelectorAll('button').length).toBeGreaterThan(4);
    });
});

describe('NeoDetails — submit validations and API paths', () => {
    test('Save with unmarked actionable fields alerts and stops', () => {
        const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
        const { getByText } = renderNeo();
        fireEvent.click(getByText(/Save/));
        expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/Approved or Resubmitted/));
        expect(API.call).not.toHaveBeenCalled();
        alertSpy.mockRestore();
    });

    function markAll(utils) {
        // firstName, validId, address are the actionable rows ('Approved' label ends in
        // 'd' so /Approve$/ matches only the buttons)
        utils.getAllByText(/Approve$/).forEach((b) => fireEvent.click(b));
    }

    test('all approved + missing note → required-note error; with note → approve API + redirect', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const utils = renderNeo();
        markAll(utils);

        fireEvent.click(utils.getByText(/Save/));
        utils.getByText('This field is required');
        expect(API.call).not.toHaveBeenCalled();

        fireEvent.change(utils.container.querySelector('textarea[name="hr_note"]'), { target: { value: 'All good' } });
        fireEvent.click(utils.getByText(/Save/));
        await flush();

        expect(API.call).toHaveBeenCalledTimes(1);
        const req = API.call.mock.calls[0][0];
        expect(req.url).toBe('/approve_submissions/');
        expect(req.params.guid).toBe('g-777');
        expect(req.params.approvedBy).toBe('HR Person');
        expect(req.params.notes).toBe('All good');
        expect(Formatter.alert_success).toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'SET_REDIRECT' }));
        confirmSpy.mockRestore();
    });

    test('resubmission-marked fields go to the resubmission API with the marked map', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const utils = renderNeo();
        // mark firstName for resubmission, approve the other two actionable rows
        const resubmitButtons = utils.getAllByText(/Resubmit/);
        fireEvent.click(resubmitButtons[0]); // firstName
        const approveButtons = utils.getAllByText(/Approve$/);
        fireEvent.click(approveButtons[1]);  // validId
        fireEvent.click(approveButtons[2]);  // address

        fireEvent.change(utils.container.querySelector('textarea[name="hr_note"]'), { target: { value: 'Blurry ID' } });
        fireEvent.click(utils.getByText(/Save/));
        await flush();

        const req = API.call.mock.calls[0][0];
        expect(req.url).toBe('/request_for_resubmission/');
        expect(req.params.fieldsToResubmit).toEqual({ 0: 'firstName' });
        expect(req.params.reason).toBe('Blurry ID');
        confirmSpy.mockRestore();
    });

    test('approving a previously-resubmitted field removes it from the marked map (reindex arm)', async () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
        const utils = renderNeo();
        const resubmitButtons = utils.getAllByText(/Resubmit/);
        fireEvent.click(resubmitButtons[0]); // mark firstName
        fireEvent.click(resubmitButtons[1]); // mark validId
        const approveButtons = utils.getAllByText(/Approve$/);
        fireEvent.click(approveButtons[0]);  // unmark firstName → reindex
        fireEvent.click(approveButtons[2]);  // approve address

        fireEvent.change(utils.container.querySelector('textarea[name="hr_note"]'), { target: { value: 'note' } });
        fireEvent.click(utils.getByText(/Save/));
        await flush();

        const req = API.call.mock.calls[0][0];
        expect(req.url).toBe('/request_for_resubmission/');
        expect(req.params.fieldsToResubmit).toEqual({ 0: 'validId' }); // reindexed to 0
        confirmSpy.mockRestore();
    });

    test('declined confirmation sends nothing', () => {
        const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
        const utils = renderNeo();
        utils.getAllByText(/Approve$/).forEach((b) => fireEvent.click(b));
        fireEvent.change(utils.container.querySelector('textarea[name="hr_note"]'), { target: { value: 'n' } });
        fireEvent.click(utils.getByText(/Save/));
        expect(API.call).not.toHaveBeenCalled();
        confirmSpy.mockRestore();
    });
});

describe('NeoDetails — file viewer arms', () => {
    test('image file opens the viewer through the wrapped-HTML arm', async () => {
        API.call.mockImplementation(() => Promise.resolve({
            status: 200,
            data: { content: { success: true, data: { fileContent: btoa('img-bytes'), mimeType: 'image/png' } } },
        }));
        const utils = renderNeo();
        fireEvent.click(utils.getByText(/View File/));
        await flush();

        expect(API.call.mock.calls[0][0].url).toBe('/get_neo_file/42734/' + FILE_GUID);
        utils.getByTestId('viewer-modal');
        expect(window.URL.createObjectURL).toHaveBeenCalledTimes(2); // file blob + html wrapper

        fireEvent.click(utils.getByTestId('viewer-close'));
        expect(utils.queryByTestId('viewer-modal')).toBeNull();
    });

    test('non-image file uses the direct blob arm; unsuccessful payload keeps the viewer closed', async () => {
        API.call.mockImplementationOnce(() => Promise.resolve({
            status: 200,
            data: { content: { success: true, data: { fileContent: btoa('pdf-bytes'), mimeType: 'application/pdf' } } },
        }));
        const utils = renderNeo();
        fireEvent.click(utils.getByText(/View File/));
        await flush();
        utils.getByTestId('viewer-modal');
        fireEvent.click(utils.getByTestId('viewer-close'));

        API.call.mockImplementationOnce(() => Promise.resolve({
            status: 200, data: { content: { success: false } },
        }));
        fireEvent.click(utils.getByText(/View File/));
        await flush();
        expect(utils.queryByTestId('viewer-modal')).toBeNull();
    });

    test('file fetch failure dispatches alert_error', async () => {
        API.call.mockImplementation(() => Promise.reject(new Error('HTTP 500')));
        const utils = renderNeo();
        fireEvent.click(utils.getByText(/View File/));
        await flush();
        expect(Formatter.alert_error).toHaveBeenCalled();
    });
});
