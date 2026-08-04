// evoxtest_MoreDeep_frontend.test.js
// AssetManagementForm.js and COE.js — same ref-based direct-handler-call pattern as the
// other evoxtest_*Deep files, targeting onSubmitHandler/componentDidMount/componentWillMount
// branches not reached by the existing dedicated test suites.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children }) => <div>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AssetManagementForm from '../../components/AssetManagementForm/AssetManagementForm';
import COE from '../../container/Request/COE/COE';

function renderWithRef(Component, props) {
  const ref = React.createRef();
  const utils = render(
    <MemoryRouter>
      <Component ref={ref} {...props} />
    </MemoryRouter>
  );
  return { ref, ...utils };
}

beforeAll(() => {
  global.links = global.links || {};
  global.links.asset_management = '/asset-management/';
});

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  localStorage.setItem('session_id', 'test-session');
});

describe('AssetManagementForm — handler branches', () => {
  const defaultProps = {
    addUserAsset: jest.fn(),
    updateUserAsset: jest.fn(),
    getUserAsset: jest.fn(),
    getUserAssets: jest.fn(),
    setRedirect: jest.fn(),
    constant: {},
    user: { id: 1, is_asset_loaded: false, user_assets: [], user_asset: {} },
    settings: {},
    params: {},
  };

  test('componentDidMount: no id -> fetches all user assets', () => {
    renderWithRef(AssetManagementForm, defaultProps);
    expect(defaultProps.getUserAssets).toHaveBeenCalled();
  });

  test('componentDidMount: id present -> fetches the single asset', () => {
    renderWithRef(AssetManagementForm, { ...defaultProps, params: { id: '5' } });
    expect(defaultProps.getUserAsset).toHaveBeenCalledWith('5');
  });

  test('componentDidMount: already loaded -> does not re-fetch', () => {
    renderWithRef(AssetManagementForm, {
      ...defaultProps, user: { ...defaultProps.user, is_asset_loaded: true },
    });
    expect(defaultProps.getUserAssets).not.toHaveBeenCalled();
  });

  test('onSubmitHandler: Add action, confirmed -> addUserAsset called', () => {
    const { ref } = renderWithRef(AssetManagementForm, defaultProps);
    ref.current.onSubmitHandler({ action: 'Add', personal_equipment: 'Laptop' });
    expect(defaultProps.addUserAsset).toHaveBeenCalled();
  });

  test('onSubmitHandler: Add action declined -> addUserAsset not called', () => {
    window.confirm = jest.fn(() => false);
    const { ref } = renderWithRef(AssetManagementForm, defaultProps);
    ref.current.onSubmitHandler({ action: 'Add', personal_equipment: 'Laptop' });
    expect(defaultProps.addUserAsset).not.toHaveBeenCalled();
  });

  test('onSubmitHandler: Update action -> updateUserAsset called with id', () => {
    const { ref } = renderWithRef(AssetManagementForm, { ...defaultProps, params: { id: '5' } });
    ref.current.onSubmitHandler({ action: 'Update', personal_equipment: 'Monitor' });
    expect(defaultProps.updateUserAsset).toHaveBeenCalled();
  });
});

describe('COE — handler branches', () => {
  const defaultProps = {
    addCOE: jest.fn(),
    fetchCOE: jest.fn(),
    setRedirect: jest.fn(),
    constant: { COE_PURPOSES: [{ value: 'loan', label: 'Loan Application' }] },
    user: { id: 1 },
    instance: {},
    params: {},
  };

  test('componentWillMount fetches COE instance', () => {
    renderWithRef(COE, defaultProps);
    expect(defaultProps.fetchCOE).toHaveBeenCalled();
  });

  test('onSubmitHandler builds form data and calls addCOE', () => {
    const { ref } = renderWithRef(COE, defaultProps);
    ref.current.onSubmitHandler({ purpose_index: 0, purpose_note: 'Visa application', show_compensation: 'yes' });
    expect(defaultProps.addCOE).toHaveBeenCalled();
  });

  test('setAction updates state', () => {
    const { ref } = renderWithRef(COE, defaultProps);
    ref.current.setAction('confirm');
    expect(ref.current.state.action).toBe('confirm');
  });
});
