// evoxtest_PoliciesViewerRemainingArms.test.js
//
// SOURCE FILES UNDER TEST
//   src/components/PoliciesDocument/PoliciesDocumentViewer.js  (8 uncovered fns / 2 branch arms)
//   src/components/PoliciesDocument/UploadedDocumentList.js    (5 uncovered fns)
//
// MENU PATH
//   Company -> Policies -> (eye icon on a document)  => PoliciesDocumentViewer modal
//   Company -> Manage Policy Accessibility           => UploadedDocumentList
//
// WHY THESE WERE UNCOVERED
//   evoxtest_PoliciesViewerDeep2 already drives the closed guard, the loading card, the
//   iframe arm (pdf/png/jpg/jpeg), the xlsx ReactFileViewer arm and the download button.
//   Two branch arms survive it:
//     * the CSV leg of the wrapper-class ternary at line 117 — the existing suite proves
//       xlsx picks the 'doc' wrapper, never csv;
//     * the <object> PDF fallback at line 135, which is unreachable (see the finding).
//   UploadedDocumentList's five uncovered functions are its mapStateToProps (covered in
//   evoxtest_IntegrationsConnectWiringDeep) plus four handlers with no rendered trigger.
//
// ADD-ONLY: complements evoxtest_PoliciesViewerDeep2 and evoxtest_UploadedDocumentListDeep2,
// repeating none of their cases.
//
// FINDINGS
//   PDV-DEAD-1  PoliciesDocumentViewer's document switch tests `FileExtension === 'pdf'`
//               in the FIRST condition (line 118, together with png/jpg/jpeg) and again in
//               the ELSE-IF (line 125). The second test can never be true, so the <object
//               type="application/pdf"> fallback at line 135 is unreachable — every PDF is
//               rendered through the iframe. Characterized below.
//   UDL-DEAD-1  UploadedDocumentList declares openModal, closeModal, handleviewer and
//               downloadBase64File, and imports PoliciesDocumentViewer, but renders no
//               view or download control at all — the only per-row button is the
//               activate/deactivate toggle. Nothing on the screen can open a document.
//               Characterized below.

const mockDispatch = jest.fn((a) => a);
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
  useDispatch: () => mockDispatch,
}));
jest.mock('jszip', () => jest.fn());
jest.mock('react-file-viewer', () => (props) => (
  <div data-testid="react-file-viewer">viewer-{props.fileType}</div>
));
jest.mock('../../container/PageLoadingCard.js/PageLoadingCard.js', () => () => (
  <div data-testid="page-loading-card">loading</div>
));
jest.mock('../../components/PoliciesDocument/PoliciesDocumentApi.js', () => ({
  fetchPolicyDocument: jest.fn((id) => ({ type: 'STUB_FETCH_POLICY_DOC', id })),
  fecthUserDepartment: jest.fn((...a) => ({ type: 'STUB_FETCH_DEPT', a })),
  fecthUserContry: jest.fn((...a) => ({ type: 'STUB_FETCH_COUNTRY', a })),
}));
jest.mock('react-bootstrap/Modal', () => {
  const React = require('react');
  const Modal = ({ children, show }) => (show ? <div data-testid="modal">{children}</div> : null);
  Modal.Header = ({ children }) => <div>{children}</div>;
  Modal.Title = ({ children }) => <div>{children}</div>;
  Modal.Body = ({ children }) => <div>{children}</div>;
  return Modal;
});
jest.mock('react-bootstrap', () => {
  const React = require('react');
  const passthrough = ({ children }) => <div>{children}</div>;
  return {
    Row: passthrough, Form: passthrough, Col: passthrough, Collapse: passthrough,
    Container: passthrough, Overlay: passthrough, Popover: passthrough,
    Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
    Table: ({ children }) => <table>{children}</table>,
    Badge: ({ children }) => <span>{children}</span>,
  };
});
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import API from '../../services/API';

const PoliciesDocumentViewer =
  require('../../components/PoliciesDocument/PoliciesDocumentViewer').default;
const UploadedDocumentList =
  require('../../components/PoliciesDocument/UploadedDocumentList').default;

const docs = [{ Id: 1 }, { Id: 2 }];

function renderViewer(policydocument) {
  return render(
    <PoliciesDocumentViewer
      isOpen closeModal={jest.fn()} policiesdocument={docs} index={0} id={2}
      policydocument={policydocument}
    />
  );
}

const wrapperClass = (container) =>
  container.querySelector('[data-testid="modal"] div[style]').className;

beforeEach(() => {
  jest.clearAllMocks();
  API.call.mockResolvedValue({ data: {} });
});

describe('Company -> Policies: the document viewer picks a renderer per file type', () => {
  test('a CSV policy renders through ReactFileViewer inside the spreadsheet wrapper', () => {
    const { getByTestId, container } = renderViewer({
      FileExtension: 'csv', FileData: 'data:text/csv;base64,QQ==', FileName: 'matrix.csv',
    });

    expect(getByTestId('react-file-viewer').textContent).toBe('viewer-csv');
    expect(wrapperClass(container)).toBe('doc');
  });

  test('a Word policy uses the same viewer but not the spreadsheet wrapper', () => {
    const { getByTestId, container } = renderViewer({
      FileExtension: 'docx', FileData: 'data:application/msword;base64,QQ==', FileName: 'policy.docx',
    });

    expect(getByTestId('react-file-viewer').textContent).toBe('viewer-docx');
    expect(wrapperClass(container)).toBe('');
  });

  // FINDING PDV-DEAD-1: 'pdf' is matched by the first condition alongside png/jpg/jpeg, so
  // the else-if that repeats `=== 'pdf'` can never run and its <object> fallback is dead
  // markup. Asserting today's behaviour — a PDF always arrives in the iframe.
  test('_FINDING_PDV-DEAD-1 a PDF renders in the iframe and never through the object fallback', () => {
    const { container } = renderViewer({
      FileExtension: 'pdf', FileData: 'data:application/pdf;base64,QQ==', FileName: 'handbook.pdf',
    });

    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame.getAttribute('src')).toBe('data:application/pdf;base64,QQ==');
    expect(frame.getAttribute('height')).toBe('650px');
    expect(container.querySelectorAll('object').length).toBe(0);
    expect(container.querySelectorAll('[data-testid="react-file-viewer"]').length).toBe(0);
    expect(wrapperClass(container)).toBe(''); // pdf is neither xlsx nor csv
  });

  test('a document whose type has not arrived yet shows the loading card instead of a viewer', () => {
    const { getByTestId, queryByTestId } = renderViewer({
      FileExtension: null, FileData: null, FileName: null,
    });

    expect(getByTestId('page-loading-card')).toBeInTheDocument();
    expect(queryByTestId('react-file-viewer')).toBeNull();
  });
});

describe('Company -> Manage Policy Accessibility: what the screen offers per row', () => {
  const policiesdocument = [
    { Id: 4, Title: 'Code of Conduct', FileExtension: 'pdf', countryname: 'Philippines', Name: 'HR', IsActive: '1' },
    { Id: 5, Title: 'Travel Policy', FileExtension: 'csv', countryname: 'India', Name: 'Finance', IsActive: '0' },
  ];

  const renderList = () => render(
    <UploadedDocumentList
      user={{ id: 1, country_id: 1 }}
      policiesdocument={policiesdocument}
      userdepartment={[{ Id: 9 }]}
    />
  );

  // FINDING UDL-DEAD-1: the screen imports PoliciesDocumentViewer and keeps the modal
  // state and handlers for it, but renders neither the viewer nor any control that would
  // call handleviewer/downloadBase64File. An administrator managing accessibility cannot
  // look at or download the document being toggled.
  test('_FINDING_UDL-DEAD-1 each row offers only the activate/deactivate toggle — no view, no download', () => {
    const { container } = renderList();
    const rows = container.querySelectorAll('tbody tr');

    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect(row.querySelectorAll('button').length).toBe(1);
    });
    expect(container.querySelectorAll('button.download-btn').length).toBe(0);
    expect(container.querySelectorAll('.fa-eye').length).toBe(0);
    expect(container.querySelectorAll('[data-testid="modal"]').length).toBe(0);
    expect(container.querySelectorAll('a[download]').length).toBe(0);
  });

  test('the single button per row states the action that toggling would perform', () => {
    const { container } = renderList();
    const buttons = Array.from(container.querySelectorAll('tbody button')).map((b) => b.textContent);

    expect(buttons).toEqual(['Click to deactivate', 'Click to activate']);
  });
});
