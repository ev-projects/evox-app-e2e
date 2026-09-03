// ViewReportCutoffLabelsAndExportGuards.test.js
//
// SOURCE FILES UNDER TEST
//   src/components/DateReport/ViewReport.js         (1 uncovered fn / 4 branch arms)
//   src/components/DateReport/ViewReportMorocco.js  (2 uncovered fns / 4 branch arms)
//
// MENU PATH
//   Reports -> India Payroll   (route: view_report)
//   Reports -> Morocco Payroll (route: view_report_morocco)
//
// WHY THESE WERE UNCOVERED
//   evoxtest_ViewReportsDeep2 drives the Filter button (both validators plus a valid
//   fetch) and the CSV export happy path. What it never reaches is:
//     * the December wrap in the cutoff label — `(month - 1) == 0 ? getMonthName(12) …`
//       (ViewReport.js:64, ViewReportMorocco.js:68). Only a January report takes it, and
//       the existing fixtures always pick July.
//     * the three validation arms inside exporthandlesave (ViewReport.js:104/106,
//       ViewReportMorocco.js:97/99) — the export path has its own copy of the
//       year/month guard and the existing export tests always fill both fields first.
//     * the year select's own clear-to-blank guard (ViewReport.js:195).
//     * the NEW HIRE section of the Morocco report (ViewReportMorocco.js:349 and the row
//       map at :360) — see the finding below.
//
// The cutoff label is the report's headline: "No of Lv availed  <cutoff>". Getting the
// December wrap wrong would mis-label the January payroll report, so it is worth pinning.
//
// Both screens compute the label from the selected month only — never from today's date —
// so these assertions carry no dependency on when the suite runs.
//
// ADD-ONLY: sits beside evoxtest_ViewReportsDeep2 and ReportsParameterLifecycle.
//
// FINDINGS
//   VRM-DEAD-1  ViewReportMorocco declares `datatimeoffnew` with a setter
//               (Setdatatimeoffnew, line 32) that is never called anywhere in the file.
//               The save handler stores only `result.data.content.reports`. The NEW HIRE
//               heading (line 348) and the new-hire row map (line 360) are therefore
//               unreachable: the Morocco payroll report can never show a new-hire block,
//               whatever the API returns. Characterized below.

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
  useDispatch: () => mockDispatch,
}));
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const passthrough = ({ children, onClick }) => <div onClick={onClick}>{children}</div>;
  const Dropdown = ({ children, onClick }) => (
    <div data-testid="export-dropdown" onClick={onClick}>{children}</div>
  );
  Dropdown.Toggle = passthrough; Dropdown.Menu = passthrough; Dropdown.Item = passthrough;
  return {
    Row: passthrough, Col: passthrough,
    Table: ({ children }) => <table>{children}</table>,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Dropdown, Form: passthrough, Container: passthrough,
  };
});
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
  alert_success: jest.fn(() => ({ type: 'STUB_ALERT_SUCCESS' })),
}));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
  fecthUserContry: jest.fn(() => ({ type: 'STUB_FETCH_COUNTRY' })),
  fecthUserDepartment: jest.fn(() => ({ type: 'STUB_FETCH_DEPT' })),
  fecthMoroccoPayrollParams: jest.fn(() => ({ type: 'STUB_FETCH_MA_PARAMS' })),
}), { virtual: true });

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import API from '../../services/API';

const ViewReport = require('../../components/DateReport/ViewReport').default;
const ViewReportMorocco = require('../../components/DateReport/ViewReportMorocco').default;

// Morocco builds its month/year/department options from this prop
// (state.dashboard.morocco_payroll_params).
const YEAR = String(new Date().getFullYear());
const maParams = {
  month: [{ month_number: 1 }, { month_number: 7 }],
  year: [{ year_name: YEAR }],
  department: [{ department_id: 12, department_name: 'Casablanca' }],
};

const newHireRow = {
  Sno: 1, Employee_Name: 'Ana Cruz', Employee_status: 'New Hire',
  Account: 'Client A', startdate: '2026-07-05', presentdays: 18, AvaiPaid: 0,
};

const selects = (container) => container.querySelectorAll('select');
const headerText = (container) =>
  Array.from(container.querySelectorAll('th')).map((th) => th.textContent).join(' | ');

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  jest.clearAllMocks();
  API.call.mockResolvedValue({
    status: 200,
    data: { content: { reports: [], timeoffItems: [], timeoffItemsnew: [newHireRow] } },
  });
  window.URL.createObjectURL = jest.fn(() => 'blob:csv');
});

describe('Reports -> India Payroll: the cutoff label on the report header', () => {
  async function filterFor(container, getByText, month) {
    fireEvent.change(selects(container)[0], { target: { value: month } });
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });
    await act(async () => {
      fireEvent.click(getByText(/Filter/));
      await flush();
    });
  }

  test('a January report labels the leave cutoff as December 21 to January 20', async () => {
    const { container, getByText } = render(<ViewReport user={{ id: 1 }} />);
    await filterFor(container, getByText, '1');

    // getMonthName (ViewReport.js:50) returns the three-letter form.
    expect(headerText(container)).toContain('Dec 21 - Jan 20');
    expect(headerText(container)).toContain('Jan 01 - Jan 31');
  });

  test('a mid-year report labels the cutoff with the preceding month instead', async () => {
    const { container, getByText } = render(<ViewReport user={{ id: 1 }} />);
    await filterFor(container, getByText, '7');

    expect(headerText(container)).toContain('Jun 21 - Jul 20');
    expect(headerText(container)).toContain('Jul 01 - Jul 31');
    expect(headerText(container)).not.toContain('Dec 21');
  });

  test('a February report carries the correct day count for the month', async () => {
    const { container, getByText } = render(<ViewReport user={{ id: 1 }} />);
    await filterFor(container, getByText, '2');

    expect(headerText(container)).toContain('Jan 21 - Feb 20');
    // getDaysInMonth(year, 2) — 28 in a common year, 29 in a leap year
    expect(headerText(container)).toMatch(/Feb 01 - Feb (28|29)/);
  });
});

describe('Reports -> India Payroll: the export has its own year/month guard', () => {
  test('exporting with nothing selected raises both messages and calls no endpoint', () => {
    const { container, getByTestId, getByText } = render(<ViewReport user={{ id: 1 }} />);

    fireEvent.click(getByTestId('export-dropdown'));

    expect(getByText('Please Select Month')).toBeInTheDocument();
    expect(getByText('Please Select Year')).toBeInTheDocument();
    expect(API.call).not.toHaveBeenCalled();
  });

  test('exporting with only the year selected raises the month message alone', () => {
    const { container, getByTestId, getByText, queryByText } = render(<ViewReport user={{ id: 1 }} />);
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });

    fireEvent.click(getByTestId('export-dropdown'));

    expect(getByText('Please Select Month')).toBeInTheDocument();
    expect(queryByText('Please Select Year')).toBeNull();
    expect(API.call).not.toHaveBeenCalled();
  });

  test('exporting with only the month selected raises the year message alone', () => {
    const { container, getByTestId, getByText, queryByText } = render(<ViewReport user={{ id: 1 }} />);
    fireEvent.change(selects(container)[0], { target: { value: '7' } });

    fireEvent.click(getByTestId('export-dropdown'));

    expect(getByText('Please Select Year')).toBeInTheDocument();
    expect(queryByText('Please Select Month')).toBeNull();
    expect(API.call).not.toHaveBeenCalled();
  });

  test('exporting with both selected reaches the export endpoint for India', async () => {
    const { container, getByTestId } = render(<ViewReport user={{ id: 1 }} />);
    fireEvent.change(selects(container)[0], { target: { value: '7' } });
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });

    await act(async () => {
      fireEvent.click(getByTestId('export-dropdown'));
      await flush();
    });

    const url = API.call.mock.calls[0][0].url;
    expect(url).toContain('export=1');
    expect(url).toContain('country=1');
    expect(url).toContain(`timeoff_month=7`);
  });

  test('clearing the year back to blank re-raises the year message on its own', () => {
    const { container, getByText, queryByText } = render(<ViewReport user={{ id: 1 }} />);
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });
    expect(queryByText('Please Select Year')).toBeNull();

    fireEvent.change(selects(container)[1], { target: { value: '' } });

    expect(getByText('Please Select Year')).toBeInTheDocument();
    expect(API.call).not.toHaveBeenCalled();
  });
});

describe('Reports -> Morocco Payroll', () => {
  const renderMorocco = () =>
    render(<ViewReportMorocco user={{ id: 1 }} userparams={maParams} />);

  // FINDING VRM-DEAD-2: handlesave computes both cutoff labels (ViewReportMorocco.js:67-68)
  // but the screen renders `text` nowhere at all and renders `text1` only inside the NEW HIRE
  // block that VRM-DEAD-1 shows is unreachable. The Morocco report header therefore carries no
  // cutoff label, unlike the India report which prints both at ViewReport.js:277-278.
  test('_FINDING_VRM-DEAD-2 a January Morocco report shows no cutoff label anywhere on the screen', async () => {
    const { container, getByText } = renderMorocco();
    fireEvent.change(selects(container)[0], { target: { value: '1' } });
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });

    await act(async () => {
      fireEvent.click(getByText(/Filter/));
      await flush();
    });

    // the report did run, so the label was computed
    expect(API.call).toHaveBeenCalledTimes(1);
    expect(headerText(container)).toContain('Employee No');
    // ... and is displayed nowhere
    expect(container.textContent).not.toContain('Dec 21 - Jan 20');
    expect(container.textContent).not.toContain('Jan 01 - Jan 31');
  });

  test('exporting with nothing selected raises both messages and calls no endpoint', () => {
    const { getByTestId, getByText } = renderMorocco();

    fireEvent.click(getByTestId('export-dropdown'));

    expect(getByText('Please Select Month')).toBeInTheDocument();
    expect(getByText('Please Select Year')).toBeInTheDocument();
    expect(API.call).not.toHaveBeenCalled();
  });

  test('exporting with only the year selected raises the month message alone', () => {
    const { container, getByTestId, getByText, queryByText } = renderMorocco();
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });

    fireEvent.click(getByTestId('export-dropdown'));

    expect(getByText('Please Select Month')).toBeInTheDocument();
    expect(queryByText('Please Select Year')).toBeNull();
    expect(API.call).not.toHaveBeenCalled();
  });

  test('exporting with only the month selected raises the year message alone', () => {
    const { container, getByTestId, getByText, queryByText } = renderMorocco();
    fireEvent.change(selects(container)[0], { target: { value: '7' } });

    fireEvent.click(getByTestId('export-dropdown'));

    expect(getByText('Please Select Year')).toBeInTheDocument();
    expect(queryByText('Please Select Month')).toBeNull();
    expect(API.call).not.toHaveBeenCalled();
  });

  // FINDING VRM-DEAD-1: the response carries new-hire rows (timeoffItemsnew in the
  // fixture) but the save handler only stores `content.reports`; Setdatatimeoffnew is
  // never called, so datatimeoffnew stays [] for the life of the screen. The NEW HIRE
  // heading and its rows can never appear. Asserting today's behaviour — when the setter
  // is wired up this test fails and should be flipped to assert the rendered block.
  test('_FINDING_VRM-DEAD-1 a successful report never renders the NEW HIRE block, even when the response carries new hires', async () => {
    const { container, getByText, queryByText } = renderMorocco();
    fireEvent.change(selects(container)[0], { target: { value: '7' } });
    fireEvent.change(selects(container)[1], { target: { value: YEAR } });

    await act(async () => {
      fireEvent.click(getByText(/Filter/));
      await flush();
    });

    expect(API.call).toHaveBeenCalledTimes(1);
    expect(queryByText(/NEW HIRE/)).toBeNull();
    expect(container.textContent).not.toContain('Ana Cruz');
    // the label the dead heading would have carried is computed but never displayed
    expect(container.textContent).not.toContain('Jun 21 - Jul 20');
  });
});
