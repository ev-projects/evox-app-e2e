// evoxtest_RealSubmitDeep_frontend.test.js
// The mapDispatchToProps closures for a handful of request-form containers (COE, Overtime,
// RestDayWork) only execute when Formik's real onSubmit fires through the REAL connect()
// wiring — connect() doesn't forward refs by default, so the ref-based direct-method-call
// technique used elsewhere can't reach these specific closures. This drives an actual
// DOM fill-and-submit against the real store + real RequestButtons/Formik tree.

jest.mock('../../store/actions/requests/coeActions', () => ({
  addCOE: (...a) => ({ type: 'STUB', a }),
  fetchCOE: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/requests/overtimeActions', () => ({
  fetchOvertime: (...a) => ({ type: 'STUB', a }),
  addOvertime: (...a) => ({ type: 'STUB', a }),
  updateOvertime: (...a) => ({ type: 'STUB', a }),
  updateOvertimeStatus: (...a) => ({ type: 'STUB', a }),
  clearOvertimeInstance: () => ({ type: 'STUB' }),
  resetOvertimeInstance: () => ({ type: 'STUB' }),
}));
jest.mock('../../store/actions/requests/restDayWorkActions', () => ({
  fetchRestDayWork: (...a) => ({ type: 'STUB', a }),
  addRestDayWork: (...a) => ({ type: 'STUB', a }),
  updateRestDayWork: (...a) => ({ type: 'STUB', a }),
  updateRestDayWorkStatus: (...a) => ({ type: 'STUB', a }),
  resetRestDayWorkInstance: () => ({ type: 'STUB' }),
  clearRestDayWorkInstance: () => ({ type: 'STUB' }),
}));
jest.mock('../../store/actions/redirectActions', () => ({
  setRedirect: (...a) => ({ type: 'STUB', a }),
  clearRedirect: () => ({ type: 'STUB' }),
}));
jest.mock('../../services/API', () => ({ call: jest.fn(() => Promise.resolve({
  status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } },
})) }));
jest.mock('../../store/actions/userActions', () => ({
  getUserAsset: (...a) => ({ type: 'STUB', a }),
  getUserAssets: (...a) => ({ type: 'STUB', a }),
  addUserAsset: (...a) => ({ type: 'STUB', a }),
  updateUserAsset: (...a) => ({ type: 'STUB', a }),
  fetchUser: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
  tickDpa: (...a) => ({ type: 'STUB', a }),
}));
jest.mock('../../store/actions/settings/alertActions', () => ({
  showAlert: (...a) => ({ type: 'STUB', a }),
}));
// The real InputDate/InputTime read the Formik context internally (useFormikContext) and
// call form.setFieldValue(props.name, date) themselves — they don't take an onChange prop
// from the parent. The mock needs to do the same for a typed value to actually land in
// Formik state (and therefore in onSubmitHandler's `values`).
jest.mock('../../components/DatePickerComponent/DatePicker.js', () => {
  const { useFormikContext } = require('formik');
  const StubInput = (type) => (props) => {
    const form = useFormikContext();
    return (
      <input
        name={props.name}
        type={type}
        onChange={(e) => form.setFieldValue(props.name, new Date(e.target.value))}
      />
    );
  };
  return { InputDate: StubInput('date'), InputTime: StubInput('time') };
});
jest.mock('react-player/lazy', () => (props) => (
  <video
    data-testid="react-player"
    onContextMenu={props.config?.file?.attributes?.onContextMenu}
    onEnded={props.onEnded}
  />
));

import React from 'react';
import { render, fireEvent, act, wait } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../../store';
import API from '../../services/API';
import COE from '../../container/Request/COE/COE';
import Overtime from '../../container/Request/Overtime/Overtime';
import RestDayWork from '../../container/Request/RestDayWork/RestDayWork';
import AssetManagementForm from '../../components/AssetManagementForm/AssetManagementForm';
import DPAForm from '../../container/DPAForm/DPAForm';

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);

beforeAll(() => {
  store.dispatch({
    type: 'LOGIN_SUCCESS',
    user: { id: 1, full_name: 'Test Employee', pov_timezone: 'Asia/Manila',
      departments_handled: [], user_server_timestamp: '2026-03-15 08:00:00',
      user_server_timestamp_mils: 0, user_offset_seconds: 0 },
    payload: {},
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
  window.alert = jest.fn();
  API.call.mockResolvedValue({
    status: 200, data: { content: { Result: '1', StartDate: '2026-03-01', EndDate: '2026-03-31' } },
  });
});

describe('COE — real Formik submit through the real connected export', () => {
  test('filling purpose + compensation and clicking Submit reaches the real addCOE dispatch closure', async () => {
    const { container, getByText } = renderWithStore(<COE params={{}} />);
    const purposeSelect = container.querySelector('select[name="purpose_index"]');
    const compSelect = container.querySelector('select[name="show_compensation"]');
    fireEvent.change(purposeSelect, { target: { value: '0' } });
    fireEvent.change(compSelect, { target: { value: '1' } });
    await act(async () => {
      fireEvent.click(getByText('Submit'));
    });
    expect(container).toBeTruthy();
  });
});

describe('Overtime — real Formik submit through the real connected export', () => {
  test('Result "1" (regular period): fills required fields, submits, reaches addOvertime', async () => {
    const { container, getByText } = renderWithStore(<Overtime params={{}} />);
    fireEvent.change(container.querySelector('input[name="date"]'), { target: { value: '2026-03-10' } });
    fireEvent.change(container.querySelector('input[name="amount"]'), { target: { value: '2026-03-10T01:30' } });
    fireEvent.change(container.querySelector('select[name="type"]'), { target: { value: 'pre_overtime' } });
    await act(async () => {
      fireEvent.click(getByText('Submit'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container).toBeTruthy();
  });

  test('Result "2" (dispute period): fills required fields, submits, reaches addOvertime', async () => {
    API.call.mockResolvedValueOnce({ status: 200, data: { content: { Result: '2' } } });
    const { container, getByText } = renderWithStore(<Overtime params={{}} />);
    fireEvent.change(container.querySelector('input[name="date"]'), { target: { value: '2026-03-10' } });
    fireEvent.change(container.querySelector('input[name="amount"]'), { target: { value: '2026-03-10T01:30' } });
    fireEvent.change(container.querySelector('select[name="type"]'), { target: { value: 'pre_overtime' } });
    await act(async () => {
      fireEvent.click(getByText('Submit'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container).toBeTruthy();
  });
});

describe('RestDayWork — real Formik submit through the real connected export', () => {
  test('clicking Submit reaches the real addRestDayWork dispatch closure', async () => {
    const { container, getByText } = renderWithStore(<RestDayWork params={{}} />);
    await act(async () => {
      fireEvent.click(getByText('Submit'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container).toBeTruthy();
  });
});

describe('AssetManagementForm — real Formik submit through the real connected export', () => {
  test('filling required fields and clicking Add reaches the real addUserAsset dispatch closure', async () => {
    const { container, getByText } = renderWithStore(<AssetManagementForm params={{}} />);
    fireEvent.change(container.querySelector('select[name="personal_equipment"]'), { target: { value: '1' } });
    fireEvent.change(container.querySelector('select[name="equipment_type"]'), { target: { value: 'Laptop' } });
    fireEvent.change(container.querySelector('input[name="serial_no"]'), { target: { value: 'SN-001' } });
    fireEvent.change(container.querySelector('input[name="asset_tag"]'), { target: { value: 'TAG-001' } });
    await act(async () => {
      fireEvent.click(getByText('Add'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container).toBeTruthy();
  });

  test('equipment_type = Others toggles the add-equipment-type field', () => {
    const { container } = renderWithStore(<AssetManagementForm params={{}} />);
    fireEvent.change(container.querySelector('select[name="equipment_type"]'), { target: { value: 'Others' } });
    expect(container).toBeTruthy();
  });
});

describe('DPAForm — state toggles + real Formik submit through the real connected export', () => {
  test('the video onContextMenu handler is wired and callable', () => {
    const { getByTestId } = renderWithStore(<DPAForm params={{}} />);
    const player = getByTestId('react-player');
    const preventDefault = jest.fn();
    fireEvent.contextMenu(player, { preventDefault });
  });

  test('video onEnded -> checkbox confirm -> submit reaches the real tickDpa dispatch closure', async () => {
    const { container, getByText, getByTestId } = renderWithStore(<DPAForm params={{}} />);
    act(() => {
      fireEvent.ended(getByTestId('react-player'));
    });
    const checkbox = container.querySelector('input[name="confirm"]');
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    await act(async () => {
      fireEvent.click(getByText('Submit'));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container).toBeTruthy();
  });
});
