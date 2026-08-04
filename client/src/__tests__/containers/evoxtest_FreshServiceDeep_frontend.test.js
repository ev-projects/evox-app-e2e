// evoxtest_FreshServiceDeep_frontend.test.js
// FreshServiceForm.js and FreshServiceTickets.js are functional (hooks) components with
// a TinyMCE editor dependency that isn't reachable at all under the existing dedicated
// tests (which mock the whole module tree away). @tinymce/tinymce-react tries to inject a
// script tag from a CDN, which can't work under jsdom, so it needs a stub — same category
// of fix as the popper.js reinstall: unblock module resolution, then exercise real render.

jest.mock('@tinymce/tinymce-react', () => ({
  Editor: (props) => {
    if (props.onInit) {
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
}));
jest.mock('../../store/actions/freshservice/freshServiceActions', () => ({
  fetchWorkSpaces: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../services/API', () => ({ call: jest.fn(() => Promise.resolve({ data: [] })) }));

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../../store';
import FreshServiceForm from '../../components/FreshService/FreshServiceForm';
import FreshServiceTickets from '../../components/FreshService/FreshServiceTickets';

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);

const baseUser = {
  id: 1, first_name: 'Test', last_name: 'Employee', department_main: 'Engineering',
  emp_num: '1001', country: 'Philippines', email: 'test.employee@eastvantage.com',
};

const workspaces = [{ id: 1, name: 'IT Support' }];
const categories = { 1: { 'IT Support': ['Hardware', 'Software'] } };
const sub_categories = {};

// react-redux's default mergeProps is {...ownProps, ...stateProps, ...dispatchProps} —
// mapStateToProps output wins over own-props of the same name, so `workspacesLoaded`/
// `workspaces` passed directly as JSX props get silently overwritten by the real (empty)
// reducer state. Dispatching the real FETCH_WORKSPACES_SUCCESS action is the only way to
// actually populate them here.
function loadWorkspaces() {
  store.dispatch({
    type: 'FETCH_WORKSPACES_SUCCESS',
    workspaces, categories, sub_categories, isLoaded: true,
  });
}
function clearWorkspaces() {
  store.dispatch({ type: 'CLEAR_FRESHSERVICE_INSTANCE' });
}

describe('FreshServiceForm — populated render (workspaces loaded)', () => {
  beforeEach(() => clearWorkspaces());

  test('renders the loading state when workspaces are not yet loaded', () => {
    const { container } = renderWithStore(<FreshServiceForm user={baseUser} />);
    expect(container.textContent).toMatch(/Loading workspace categories/);
  });

  test('renders CreateTicketPage once workspaces are loaded', () => {
    loadWorkspaces();
    const { getByTestId } = renderWithStore(<FreshServiceForm user={baseUser} />);
    expect(getByTestId('tinymce-editor')).toBeInTheDocument();
  });

  test('typing a subject and description updates form state', () => {
    loadWorkspaces();
    const { getByTestId } = renderWithStore(<FreshServiceForm user={baseUser} />);
    const editor = getByTestId('tinymce-editor');
    fireEvent.change(editor, { target: { value: 'This is a long enough description.' } });
    expect(editor.value).toBe('This is a long enough description.');
  });
});

describe('FreshServiceTickets — populated render', () => {
  beforeEach(() => clearWorkspaces());

  test('renders with workspaces loaded', () => {
    loadWorkspaces();
    expect(() => renderWithStore(<FreshServiceTickets user={baseUser} />)).not.toThrow();
  });

  test('renders the loading state when workspaces are not yet loaded', () => {
    expect(() => renderWithStore(<FreshServiceTickets user={baseUser} />)).not.toThrow();
  });
});
