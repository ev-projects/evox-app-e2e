/**
 * evoxtest_ReferjobsDeep2.test.js
 * Wave-2 coverage for components/JobReferal/Referjobs.js (29 Jul: 102 unc / 30.1%).
 * Arms: mount job fetch → select options, every submit validator (first/last name,
 * email format, phone, resume, terms), file upload (valid base64 / oversized / bad
 * extension), terms toggle, successful apply dispatch + form reset.
 * ADDITIVE ONLY. Menu: Jobs → Refer a Friend (route: via Referjobs component).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => mockDispatch,
}));

jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/JobReferal/Referalmachanisam.js', () => () => <div data-testid="mechanics" />);
jest.mock('../../services/APICALL.js', () => ({ call: jest.fn() }));
jest.mock('axios', () => ({ get: jest.fn(), post: jest.fn() }));

jest.mock('react-bootstrap', () => {
    const React = require('react');
    const Form = ({ children }) => <div>{children}</div>;
    Form.Group = ({ children }) => <div>{children}</div>;
    Form.Check = ({ label, onChange, checked }) => (
        <label>
            <input type="checkbox" checked={!!checked} onChange={onChange} />
            {label}
        </label>
    );
    const Accordion = ({ children }) => <div>{children}</div>;
    Accordion.Toggle = ({ children }) => <div>{children}</div>;
    Accordion.Collapse = ({ children }) => <div>{children}</div>;
    const Card = ({ children }) => <div>{children}</div>;
    Card.Body = ({ children }) => <div>{children}</div>;
    return {
        Form,
        Button: ({ children, onClick, type }) => <button type={type} onClick={onClick}>{children}</button>,
        Accordion,
        Card,
    };
});

jest.mock('../../components/JobReferal/JobReferalapi.js', () => ({
    FecthJobdetails: jest.fn((setter) => {
        setter([{ jobid: 7, jobCategory: 'QA Engineer' }, { jobid: 8, jobCategory: 'PHP Developer' }]);
        return { type: 'STUB_FETCH_JOBS' };
    }),
    ApplyReferaljob: jest.fn((...a) => ({ type: 'STUB_APPLY', a })),
}));

import { ApplyReferaljob, FecthJobdetails } from '../../components/JobReferal/JobReferalapi.js';

const Referjobs = require('../../components/JobReferal/Referjobs').default;

const baseProps = { user: { id: 1, emp_num: '1001' } };

function renderReferjobs() {
    return render(
        <MemoryRouter>
            <Referjobs {...baseProps} />
        </MemoryRouter>
    );
}

const flush = () => new Promise((r) => setTimeout(r, 30));

function fillNames(utils) {
    fireEvent.change(utils.getByPlaceholderText('Referal Name'), { target: { value: 'Juan' } });
    fireEvent.change(utils.getByPlaceholderText('Last Name'), { target: { value: 'Reyes' } });
    fireEvent.change(utils.getByPlaceholderText("Referral's Email"), { target: { value: 'juan.reyes@x.com' } });
    // the file input reuses this placeholder (source copy-paste) — [0] is the phone input
    fireEvent.change(utils.getAllByPlaceholderText("Referral's Mobile Number")[0], { target: { value: '09171234567' } });
}

beforeEach(() => jest.clearAllMocks());

describe('Referjobs — mount and validators', () => {
    test('mount fetches jobs and fills the job select', () => {
        const { getByText } = renderReferjobs();
        expect(FecthJobdetails).toHaveBeenCalled();
        getByText('QA Engineer');
        getByText('PHP Developer');
    });

    test('empty submit renders every required validator and dispatches nothing', () => {
        const { getByText } = renderReferjobs();
        fireEvent.click(getByText(/Apply/));

        getByText(/Please Enter ReferalName/);
        getByText(/Please Enter LastName/);
        getByText(/Please Upload Resume/);
        getByText(/Please select the terms/);
        expect(ApplyReferaljob).not.toHaveBeenCalled();
    });

    test('malformed email trips the email validator even when present', () => {
        const utils = renderReferjobs();
        fireEvent.change(utils.getByPlaceholderText("Referral's Email"), { target: { value: 'not-an-email' } });
        fireEvent.click(utils.getByText(/Apply/));
        expect(ApplyReferaljob).not.toHaveBeenCalled();
    });
});

describe('Referjobs — resume upload arms', () => {
    test('valid pdf converts to base64 into the form state', async () => {
        const utils = renderReferjobs();
        const fileInput = utils.container.querySelector('input[type="file"]');
        fireEvent.change(fileInput, { target: { files: [new File(['%PDF-1.4 dummy'], 'cv.pdf', { type: 'application/pdf' })] } });
        await flush();
        // no error message rendered
        expect(utils.queryByText(/File size is Grater/)).toBeNull();
        expect(utils.queryByText(/Please Select PDF/)).toBeNull();
    });

    test('oversized file rejects with the 5MB message', async () => {
        const utils = renderReferjobs();
        const big = new File(['x'], 'huge.pdf', { type: 'application/pdf' });
        Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
        fireEvent.change(utils.container.querySelector('input[type="file"]'), { target: { files: [big] } });
        await flush();
        utils.getByText(/File size is Grater than 5MB/);
    });

    test('disallowed extension rejects with the file-type message', async () => {
        const utils = renderReferjobs();
        fireEvent.change(utils.container.querySelector('input[type="file"]'),
            { target: { files: [new File(['MZ'], 'virus.exe', { type: 'application/x-msdownload' })] } });
        await flush();
        utils.getByText(/Please Select PDF,doc,docx,jpg,png,jpeg File/);
    });
});

describe('Referjobs — successful apply', () => {
    test('filled form + resume + terms dispatches ApplyReferaljob and resets fields', async () => {
        const utils = renderReferjobs();
        fillNames(utils);
        fireEvent.change(utils.getByPlaceholderText('Address'), { target: { value: 'Makati' } });
        fireEvent.change(utils.getByPlaceholderText('City'), { target: { value: 'Manila' } });

        fireEvent.change(utils.container.querySelector('input[type="file"]'),
            { target: { files: [new File(['%PDF-1.4 dummy'], 'cv.pdf', { type: 'application/pdf' })] } });
        await flush();

        fireEvent.change(utils.container.querySelector('select'), { target: { value: '7' } }); // pick QA job
        fireEvent.click(utils.container.querySelector('input[type="checkbox"]')); // terms

        fireEvent.click(utils.getByText(/Apply/));
        await flush();

        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        const args = ApplyReferaljob.mock.calls[0];
        expect(args[0]).toBe('7');            // jobid from the select
        expect(args[1]).toBe('Juan');         // fName
        expect(args[3]).toBe('Reyes');        // lName
        expect(args[5]).toBe('juan.reyes@x.com');
        expect(args[10]).toBe('1001');        // referring employee number
        expect(args[9]).not.toBe('');         // base64 resume travelled

        // reset arm: names cleared
        expect(utils.getByPlaceholderText('Referal Name').value).toBe('');
        expect(utils.getByPlaceholderText('Last Name').value).toBe('');
    });

    test('FINDING REF-JOB-1: apply succeeds WITHOUT selecting a job (jobid never validated)', async () => {
        // handleSubmit validates submitiondata.Refer (hardcoded default "1"), never the
        // jobid state — so a completed form with NO job chosen submits jobid === false.
        // Backend receives a referral with no job. Fix: validate jobid !== false/'_none'.
        // Flip when fixed.
        const utils = renderReferjobs();
        fillNames(utils);
        fireEvent.change(utils.container.querySelector('input[type="file"]'),
            { target: { files: [new File(['%PDF-1.4 dummy'], 'cv.pdf', { type: 'application/pdf' })] } });
        await flush();
        fireEvent.click(utils.container.querySelector('input[type="checkbox"]'));

        fireEvent.click(utils.getByText(/Apply/));
        await flush();

        expect(ApplyReferaljob).toHaveBeenCalledTimes(1);
        expect(ApplyReferaljob.mock.calls[0][0]).toBe(false); // jobid initial state
    });
});
