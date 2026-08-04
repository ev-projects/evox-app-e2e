// evoxtest_FreshServiceFormDeep2.test.js
// Wave-1 interaction coverage for components/FreshService/FreshServiceForm.js
// (29 Jul baseline: 134 uncovered lines / 29.1%). Drives the Create Ticket flow:
// cascading department→category→sub-category selects, subject prefix preview,
// validation arms, CC autocomplete (debounced suggestions), attachments, and
// both submit paths. ADDITIVE ONLY — complements evoxtest_FreshServiceDeep_frontend.
// Menu: EV Assist → Create Ticket (route: fresh_service_create).
//
// FINDING FS-VAL-1 (documented, no assertable UI): module-level WORKSPACE_CATEGORIES
// is declared `{}` and never populated ("Will be loaded from JSON file" never happens),
// so validateTicketData's category/sub-category validation arms (lines ~110-130) are
// unreachable — invalid category combinations are NEVER validated client-side.

jest.mock('@tinymce/tinymce-react', () => {
  const ReactLocal = require('react');
  return {
    // Real TinyMCE fires onInit ONCE on mount — firing it every render would re-fill
    // the default signature whenever the test clears the description.
    Editor: (props) => {
      const inited = ReactLocal.useRef(false);
      if (!inited.current && props.onInit) {
        inited.current = true;
        props.onInit({}, { setContent: () => {} });
      }
      return (
        <textarea
          data-testid="tinymce-editor"
          value={props.value}
          onChange={(e) => props.onEditorChange && props.onEditorChange(e.target.value, {})}
        />
      );
    },
  };
});
jest.mock('../../store/actions/freshservice/freshServiceActions', () => ({
  fetchWorkSpaces: (...a) => ({ type: 'STUB_FETCH_WORKSPACES', a }),
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../services/API', () => ({ call: jest.fn() }));
jest.mock('../../services/Formatter', () => ({
  alert_error: jest.fn(() => ({ type: 'STUB_ALERT_ERROR' })),
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../../store';
import API from '../../services/API';
import Formatter from '../../services/Formatter';
import FreshServiceForm from '../../components/FreshService/FreshServiceForm';

window.scrollTo = jest.fn();

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);

const baseUser = {
  id: 1, first_name: 'Test', last_name: 'Employee', department_main: 'Engineering',
  emp_num: '1001', country: 'Philippines', email: 'test.employee@eastvantage.com',
};

const workspaces = [{ Id: 1, Name: 'IT Support' }, { Id: 2, Name: 'HR' }];
// categories keyed by workspace Id; sub_categories keyed by category Id
const categories = {
  1: [{ Id: 11, CategoryName: 'Hardware' }, { Id: 12, CategoryName: 'Software' }],
  // workspace 2 (HR) has NO categories → exercises the '[HR] | | - ' prefix arm
};
const sub_categories = {
  11: [{ Id: 111, SubCategoryName: 'Laptop' }, { Id: 112, SubCategoryName: 'Desktop' }],
};

function seedStore() {
  store.dispatch({ type: 'FETCH_USER_SUCCESS', user: baseUser, payload: {} });
  store.dispatch({
    type: 'FETCH_WORKSPACES_SUCCESS',
    workspaces, categories, sub_categories, isLoaded: true,
  });
}

function routeApi(overrides = {}) {
  API.call.mockImplementation((req) => {
    const url = req.url || '';
    if (url.indexOf('/users/suggestions') !== -1) {
      return (overrides.suggestions || (() => Promise.resolve({ data: ['Gary Aure <gary.aure@eastvantage.com>'] })))(req);
    }
    if (url.indexOf('/attachments/') !== -1) {
      return (overrides.attachments || (() => Promise.resolve({ data: { content: { files: ['stored-ref-9'] } } })))(req);
    }
    if (url === '/freshservice/tickets') {
      return (overrides.create || (() => Promise.resolve({ data: { content: { id: 12345 } } })))(req);
    }
    return Promise.resolve({ data: {} });
  });
}

// Select elements appear/disappear with the cascade; resolve them by their label text.
function selectByLabel(container, labelText) {
  const labels = Array.from(container.querySelectorAll('label.form-label'));
  const label = labels.find((l) => l.textContent === labelText);
  return label ? label.parentElement.querySelector('select') : null;
}

function chooseDepartment(container, id) {
  fireEvent.change(selectByLabel(container, 'EV Department *'), { target: { value: String(id) } });
}

beforeEach(() => {
  jest.clearAllMocks();
  seedStore();
  routeApi();
});

describe('FreshServiceForm — cascade and subject prefix', () => {
  test('department with categories reveals Category; category reveals Sub-category; prefix builds up', () => {
    const { container, getByText } = renderWithStore(<FreshServiceForm />);
    getByText('Create New Ticket');

    expect(selectByLabel(container, 'Category *')).toBeNull();
    chooseDepartment(container, 1);
    expect(selectByLabel(container, 'Category *')).not.toBeNull();
    expect(container.textContent).toContain('[IT Support] | | - ');

    fireEvent.change(selectByLabel(container, 'Category *'), { target: { value: '11' } });
    expect(container.textContent).toContain('[IT Support] | [Hardware] | - ');
    expect(selectByLabel(container, 'Sub-category')).not.toBeNull();

    fireEvent.change(selectByLabel(container, 'Sub-category'), { target: { value: '111' } });
    expect(container.textContent).toContain('[IT Support] | [Hardware] | [Laptop] | - ');
  });

  test('department without categories keeps the bare prefix; changing department resets category', () => {
    const { container } = renderWithStore(<FreshServiceForm />);
    chooseDepartment(container, 1);
    fireEvent.change(selectByLabel(container, 'Category *'), { target: { value: '11' } });
    expect(container.textContent).toContain('[Hardware]');

    chooseDepartment(container, 2); // HR: no categories
    expect(selectByLabel(container, 'Category *')).toBeNull();     // dropdown gone
    expect(container.textContent).toContain('[HR] | | - ');        // category reset in prefix
  });

  test('typing a subject feeds the live preview behind the prefix', () => {
    const { container } = renderWithStore(<FreshServiceForm />);
    chooseDepartment(container, 1);
    const subjectInput = container.querySelector('input[placeholder="Brief description"]');
    fireEvent.change(subjectInput, { target: { value: 'VPN not connecting' } });
    expect(container.textContent).toContain('[IT Support] | | - VPN not connecting');
  });
});

describe('FreshServiceForm — validation arms', () => {
  test('empty submit surfaces subject + workspace errors; typing clears the field error', () => {
    const { container, getByText, queryByText } = renderWithStore(<FreshServiceForm />);
    fireEvent.click(getByText('Create a Ticket'));

    getByText(/Subject must be at least 5 characters/);
    getByText(/Workspace must be selected/);
    expect(API.call).not.toHaveBeenCalled();

    // updateField deletes the matching error key as the user types
    const subjectInput = container.querySelector('input[placeholder="Brief description"]');
    fireEvent.change(subjectInput, { target: { value: 'Printer jammed on floor 3' } });
    expect(queryByText(/Subject must be at least 5 characters/)).toBeNull();
  });

  test('blank description arm: clearing the editor triggers "Description is required"', () => {
    const { container, getByText, getByTestId } = renderWithStore(<FreshServiceForm />);
    chooseDepartment(container, 2);
    fireEvent.change(container.querySelector('input[placeholder="Brief description"]'), { target: { value: 'Payslip question' } });
    fireEvent.change(getByTestId('tinymce-editor'), { target: { value: '' } });
    fireEvent.click(getByText('Create a Ticket'));
    getByText(/Description is required/);
  });

  test('short description arm: under 10 chars after trim', () => {
    const { container, getByText, getByTestId } = renderWithStore(<FreshServiceForm />);
    chooseDepartment(container, 2);
    fireEvent.change(container.querySelector('input[placeholder="Brief description"]'), { target: { value: 'Payslip question' } });
    fireEvent.change(getByTestId('tinymce-editor'), { target: { value: '  short  ' } });
    fireEvent.click(getByText('Create a Ticket'));
    getByText(/Description must be at least 10 characters/);
  });

  test('oversize subject arm: total subject above 255 characters', () => {
    const { container, getByText } = renderWithStore(<FreshServiceForm />);
    chooseDepartment(container, 2);
    fireEvent.change(container.querySelector('input[placeholder="Brief description"]'),
      { target: { value: 'x'.repeat(260) } });
    fireEvent.click(getByText('Create a Ticket'));
    getByText(/must be less than 255 characters/);
  });
});

describe('FreshServiceForm — submit paths', () => {
  function fillValidForm(utils) {
    chooseDepartment(utils.container, 1);
    fireEvent.change(selectByLabel(utils.container, 'Category *'), { target: { value: '11' } });
    fireEvent.change(utils.container.querySelector('input[placeholder="Brief description"]'),
      { target: { value: 'Laptop <screen> flickering' } });
    fireEvent.change(utils.getByTestId('tinymce-editor'),
      { target: { value: 'The screen flickers every few minutes since Monday.' } });
    fireEvent.change(selectByLabel(utils.container, 'Priority *'), { target: { value: '3' } });
  }

  test('valid submit POSTs sanitized payload and shows the success banner + reset form', async () => {
    const utils = renderWithStore(<FreshServiceForm />);
    fillValidForm(utils);
    fireEvent.click(utils.getByText('Create a Ticket'));

    await utils.findByText(/EV Assist has logged your request/);

    const createCall = API.call.mock.calls.find((c) => c[0].url === '/freshservice/tickets');
    expect(createCall[0].method).toBe('post');
    expect(createCall[0].data.workspace_id).toBe('1');
    expect(createCall[0].data.priority).toBe(3);
    expect(createCall[0].data.status).toBe(2);
    // sanitizeInput strips angle brackets from the combined subject
    expect(createCall[0].data.subject).toContain('Laptop screen flickering');
    expect(createCall[0].data.subject).not.toContain('<screen>');

    // form reset: prefix preview back to placeholder
    expect(utils.container.textContent).toContain('Please select categories above...');
  });

  test('create failure dispatches alert_error and keeps the form filled', async () => {
    routeApi({ create: () => Promise.reject(new Error('HTTP 500')) });
    const utils = renderWithStore(<FreshServiceForm />);
    fillValidForm(utils);
    fireEvent.click(utils.getByText('Create a Ticket'));

    await utils.findByText('Create a Ticket'); // back from 'Creating...'
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(utils.queryByText(/EV Assist has logged your request/)).toBeNull();
    // form NOT reset — the subject input keeps its (raw, unsanitized) value
    expect(utils.container.querySelector('input[placeholder="Brief description"]').value)
      .toBe('Laptop <screen> flickering');
  });
});

describe('FreshServiceForm — attachments (visible once a department is chosen)', () => {
  test('upload lists the file; remove moves its ref into removed_attachments on submit', async () => {
    const utils = renderWithStore(<FreshServiceForm />);
    chooseDepartment(utils.container, 1);

    const fileInput = utils.container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'invoice.pdf', { type: 'application/pdf' })] } });
    await utils.findByText(/invoice\.pdf/);

    fireEvent.click(utils.container.querySelector('.attachment-remove-btn-fs'));
    expect(utils.queryByText(/invoice\.pdf/)).toBeNull();

    // the removed stored-ref rides along on the next valid submit
    fireEvent.change(utils.container.querySelector('input[placeholder="Brief description"]'),
      { target: { value: 'Need invoice reissued' } });
    fireEvent.change(utils.getByTestId('tinymce-editor'),
      { target: { value: 'Please reissue the July invoice attachment.' } });
    fireEvent.click(utils.getByText('Create a Ticket'));
    await utils.findByText(/EV Assist has logged your request/);

    const createCall = API.call.mock.calls.find((c) => c[0].url === '/freshservice/tickets');
    expect(createCall[0].data.removed_attachments).toEqual(['stored-ref-9']);
  });

  test('upload failure dispatches alert_error and lists nothing', async () => {
    routeApi({ attachments: () => Promise.reject(new Error('HTTP 413')) });
    const utils = renderWithStore(<FreshServiceForm />);
    chooseDepartment(utils.container, 1);

    fireEvent.change(utils.container.querySelector('input[type="file"]'),
      { target: { files: [new File(['x'], 'huge.bin')] } });
    await utils.findByText('Create a Ticket');
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(utils.queryByText(/huge\.bin/)).toBeNull();
  });
});

describe('FreshServiceForm — CC autocomplete (1s debounce)', () => {
  test('typing 2+ chars fetches suggestions; clicking one adds a removable CC tag', async () => {
    const utils = renderWithStore(<FreshServiceForm />);
    const ccInput = utils.container.querySelector('input[placeholder="Type to search"]');

    fireEvent.change(ccInput, { target: { value: 'gary' } });
    const suggestion = await utils.findByText('Gary Aure <gary.aure@eastvantage.com>', {}, { timeout: 4000 });

    fireEvent.click(suggestion);
    // tag shows the parsed address; suggestion list clears; input resets
    expect(utils.container.querySelector('.cc-tag').textContent).toContain('gary.aure@eastvantage.com');
    expect(utils.container.querySelector('.cc-suggestions')).toBeNull();
    expect(ccInput.value).toBe('');

    fireEvent.click(utils.container.querySelector('.cc-tag-remove'));
    expect(utils.container.querySelector('.cc-tag')).toBeNull();
  });

  test('suggestions fetch failure dispatches alert_error', async () => {
    routeApi({ suggestions: () => Promise.reject(new Error('HTTP 500')) });
    const utils = renderWithStore(<FreshServiceForm />);
    const ccInput = utils.container.querySelector('input[placeholder="Type to search"]');

    fireEvent.change(ccInput, { target: { value: 'gary' } });
    await new Promise((r) => setTimeout(r, 1500)); // let the debounce fire + reject
    expect(Formatter.alert_error).toHaveBeenCalled();
    expect(utils.container.querySelector('.cc-suggestions')).toBeNull();
  });

  test('clearing the input short-circuits the debounce (no fetch under 2 chars / empty)', async () => {
    const utils = renderWithStore(<FreshServiceForm />);
    const ccInput = utils.container.querySelector('input[placeholder="Type to search"]');

    fireEvent.change(ccInput, { target: { value: 'g' } });   // < 2 chars → no call
    await new Promise((r) => setTimeout(r, 1200));
    fireEvent.change(ccInput, { target: { value: '' } });    // empty → clears suggestions
    const suggestionCalls = API.call.mock.calls.filter((c) => (c[0].url || '').indexOf('suggestions') !== -1);
    expect(suggestionCalls.length).toBe(0);
  });
});
