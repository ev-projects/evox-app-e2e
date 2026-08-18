// evoxtest_DpaAndAssetGatesDeep.test.js
//
// SOURCE FILES UNDER TEST
//   src/container/DPAForm/DPAForm.js                       (6 uncovered fns / 2 branch arms)
//   src/components/AssetManagementForm/AssetManagementForm.js (2 uncovered fns / 2 branch arms)
//
// MENU PATHS
//   DPA acknowledgement — Webinar: Data Privacy (route: /app/dpa)
//   Assets -> IT Asset Management, add form and edit form (route: asset_management [+ /:id])
//
// WHY THESE WERE UNCOVERED
//   The existing DPAForm.test.js and AssetManagementForm.test.js are smoke tests: they
//   mount both screens and assert the title renders. Neither drives the video-progress
//   gate that reveals the acknowledgement tickbox, the acknowledgement submit itself, or
//   the Add-vs-Update split in the asset submit handler — so the gate conditions
//   (DPAForm.js:49, :70 and AssetManagementForm.js:47, :56) and the handlers behind them
//   stayed unexecuted.
//
// The screens are driven the way an employee uses them: watch the video, tick the box,
// submit; or open the asset form for a new asset versus an existing one.
//
// FINDINGS
//   DPA-DEAD-1  toggleConfirmButton is declared but never referenced — the tickbox is a
//               Formik field driven by Formik's own handleChange, so the component's
//               `confirm` state can only ever hold its initial false. Characterized below.
//   DPA-NOOP-1  Four of the six ReactPlayer callbacks (onReady, onStart, onPause, onError)
//               are empty arrow functions whose bodies are commented-out console.log
//               calls. A playback error is silently swallowed: the employee sees a dead
//               player and no message. Characterized below.

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  connect: () => (Component) => Component,
}));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
  ContainerHeader: ({ children }) => <div>{children}</div>,
  Content: ({ children, title }) => <div><h3>{title}</h3>{children}</div>,
  ContainerWrapper: ({ children }) => <div>{children}</div>,
  ContainerBody: ({ children }) => <div>{children}</div>,
  Row: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
}));
jest.mock('../../components/RequestComponent/RequestButtons/RequestButtons', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
// The real player needs a media element; this stub exposes the callback props so the
// progress/ended/error events can be raised exactly as ReactPlayer would raise them.
let playerProps = null;
jest.mock('react-player/lazy', () => (props) => {
  playerProps = props;
  return <div data-testid="react-player" />;
});

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';

import DPAForm from '../../container/DPAForm/DPAForm';
import AssetManagementForm from '../../components/AssetManagementForm/AssetManagementForm';

global.links = new Proxy({}, { get: (t, k) => `/link/${String(k)}/` });

const CONFIRM_TEXT = /I confirm that I attended the training class listed above/;

function renderDPA(props = {}) {
  const ref = React.createRef();
  const tickDpa = jest.fn();
  const utils = render(
    <MemoryRouter>
      <DPAForm
        ref={ref}
        user={{ id: 7, full_name: 'Ana Cruz', dpa_ticked_at: null }}
        tickDpa={tickDpa}
        showAlert={jest.fn()}
        history={{ push: jest.fn() }}
        {...props}
      />
    </MemoryRouter>
  );
  return { ...utils, ref, tickDpa };
}

beforeEach(() => {
  jest.clearAllMocks();
  playerProps = null;
});

describe('Webinar: Data Privacy — the acknowledgement gate', () => {
  test('an employee who has not acknowledged yet gets the video auto-playing and no tickbox', () => {
    const { queryByText, getByTestId, ref } = renderDPA();

    expect(getByTestId('react-player')).toBeInTheDocument();
    expect(playerProps.playing).toBe(true);
    expect(playerProps.controls).toBe(true);
    expect(playerProps.url).toBe('/images/webinar/2020_Data_Privacy_Orientation.mp4');
    expect(queryByText(CONFIRM_TEXT)).toBeNull();
    expect(ref.current.state.showSubmitForm).toBe(false);
  });

  test('progress short of 23:15 keeps the acknowledgement hidden', () => {
    const { queryByText, ref } = renderDPA();

    act(() => { playerProps.onProgress({ playedSeconds: 1394 }); });

    expect(ref.current.state.showSubmitForm).toBe(false);
    expect(queryByText(CONFIRM_TEXT)).toBeNull();
  });

  test('passing 23:15 reveals the acknowledgement tickbox and its submit button', () => {
    const { queryByText, container, ref } = renderDPA();

    act(() => { playerProps.onProgress({ playedSeconds: 1395 }); });

    expect(ref.current.state.showSubmitForm).toBe(true);
    expect(queryByText(CONFIRM_TEXT)).not.toBeNull();
    expect(container.querySelector('input[name="confirm"][type="checkbox"]')).not.toBeNull();
  });

  test('scrubbing (seeking) suppresses the reveal even past the threshold', () => {
    const { queryByText, ref } = renderDPA();
    act(() => { ref.current.setState({ seeking: true }); });

    act(() => { playerProps.onProgress({ playedSeconds: 1500 }); });

    expect(ref.current.state.showSubmitForm).toBe(false);
    expect(queryByText(CONFIRM_TEXT)).toBeNull();
  });

  test('once revealed, further progress events leave the form alone', () => {
    const { ref } = renderDPA();
    act(() => { playerProps.onProgress({ playedSeconds: 1400 }); });
    const toggleSpy = jest.spyOn(ref.current, 'toggleSubmitForm');

    act(() => { playerProps.onProgress({ playedSeconds: 1500 }); });

    expect(toggleSpy).not.toHaveBeenCalled();
    expect(ref.current.state.showSubmitForm).toBe(true);
    toggleSpy.mockRestore();
  });

  test('letting the video run to the end also reveals the acknowledgement', () => {
    const { queryByText, ref } = renderDPA();

    act(() => { playerProps.onEnded(); });

    expect(ref.current.state.showSubmitForm).toBe(true);
    expect(queryByText(CONFIRM_TEXT)).not.toBeNull();
  });

  test('submitting without ticking the box records nothing and shows the validation message', async () => {
    const { container, tickDpa, findByText } = renderDPA();
    act(() => { playerProps.onEnded(); });

    await act(async () => {
      fireEvent.submit(container.querySelector('form'));
    });

    expect(tickDpa).not.toHaveBeenCalled();
    await findByText(/Please tick the checkbox to confirm the submission./);
  });

  test('ticking the box and submitting records the acknowledgement for that employee', async () => {
    const { container, tickDpa } = renderDPA();
    act(() => { playerProps.onEnded(); });

    const checkbox = container.querySelector('input[name="confirm"]');
    await act(async () => {
      fireEvent.click(checkbox);
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form'));
    });

    expect(tickDpa).toHaveBeenCalledWith(7);
    expect(tickDpa).toHaveBeenCalledTimes(1);
  });

  test('an employee who already acknowledged sees the submission date and no video autoplay', () => {
    const { queryByText, getByText } = renderDPA({
      user: { id: 7, full_name: 'Ana Cruz', dpa_ticked_at: '2026-03-01 09:00:00' },
    });

    expect(getByText(/Thank you for watching the video!/)).toBeInTheDocument();
    expect(getByText('2026-03-01 09:00:00')).toBeInTheDocument();
    expect(queryByText(CONFIRM_TEXT)).toBeNull();
    expect(playerProps.playing).toBe(false);
  });

  test('an employee who already acknowledged keeps the thank-you even after the video ends', () => {
    const { queryByText, getByText } = renderDPA({
      user: { id: 7, dpa_ticked_at: '2026-03-01 09:00:00' },
    });

    act(() => { playerProps.onEnded(); });

    expect(getByText(/Thank you for watching the video!/)).toBeInTheDocument();
    expect(queryByText(CONFIRM_TEXT)).toBeNull();
  });

  // FINDING DPA-DEAD-1: toggleConfirmButton flips a `confirm` state field that nothing
  // reads — the tickbox is a Formik field, so Formik owns its value and the component
  // state stays false throughout. The method has no caller anywhere in the file.
  test('_FINDING_DPA-DEAD-1 ticking the box never changes the component confirm state', async () => {
    const { container, ref } = renderDPA();
    act(() => { playerProps.onEnded(); });

    expect(ref.current.state.confirm).toBe(false);
    await act(async () => {
      fireEvent.click(container.querySelector('input[name="confirm"]'));
    });

    expect(container.querySelector('input[name="confirm"]').checked).toBe(true); // Formik has it
    expect(ref.current.state.confirm).toBe(false);                               // the class does not
  });

  // FINDING DPA-NOOP-1: onReady / onStart / onPause / onError are empty arrows. The last
  // one matters: if the webinar file fails to load, the employee is left with a dead
  // player, no message and no way to acknowledge — and nothing is reported.
  test('_FINDING_DPA-NOOP-1 a player error is swallowed — no message, no acknowledgement path', () => {
    const { queryByText, ref } = renderDPA();

    act(() => {
      playerProps.onReady();
      playerProps.onStart();
      playerProps.onPause();
      playerProps.onError(new Error('media decode failed'));
    });

    expect(ref.current.state.showSubmitForm).toBe(false);
    expect(queryByText(CONFIRM_TEXT)).toBeNull();
    expect(queryByText(/error/i)).toBeNull();
  });
});

describe('Assets -> IT Asset Management — add versus edit', () => {
  const assetUser = {
    id: 1, first_name: 'Ana', last_name: 'Cruz',
    is_asset_loaded: false, user_assets: [], user_asset: null,
  };

  function renderAsset(props = {}) {
    const ref = React.createRef();
    const actions = {
      getUserAsset: jest.fn(), getUserAssets: jest.fn(),
      addUserAsset: jest.fn(), updateUserAsset: jest.fn(), setRedirect: jest.fn(),
    };
    const utils = render(
      <MemoryRouter>
        <AssetManagementForm
          ref={ref} user={assetUser} params={{}} history={{ push: jest.fn() }}
          {...actions} {...props}
        />
      </MemoryRouter>
    );
    return { ...utils, ref, actions };
  }

  test('opening the blank form loads the employee whole asset list', () => {
    const { actions } = renderAsset();

    expect(actions.getUserAssets).toHaveBeenCalledTimes(1);
    expect(actions.getUserAsset).not.toHaveBeenCalled();
  });

  test('opening an existing asset loads only that asset', () => {
    const { actions } = renderAsset({ params: { id: '5' } });

    expect(actions.getUserAsset).toHaveBeenCalledWith('5');
    expect(actions.getUserAssets).not.toHaveBeenCalled();
  });

  test('an already-loaded asset list is not fetched again on either route', () => {
    const loaded = { ...assetUser, is_asset_loaded: true };

    const blank = renderAsset({ user: loaded });
    expect(blank.actions.getUserAssets).not.toHaveBeenCalled();

    const existing = renderAsset({ user: loaded, params: { id: '5' } });
    expect(existing.actions.getUserAsset).not.toHaveBeenCalled();
  });

  test('adding an asset asks for the data-confirmation statement before sending anything', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { ref, actions } = renderAsset();

    ref.current.onSubmitHandler({ action: 'Add', asset_tag: 'EV-100', serial: null });

    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('I confirm that all data provided is true and correct')
    );
    expect(actions.addUserAsset).toHaveBeenCalledTimes(1);
    const sent = actions.addUserAsset.mock.calls[0][0];
    expect(sent.get('asset_tag')).toBe('EV-100');
    expect(sent.get('action')).toBe('Add');
    expect(sent.has('serial')).toBe(false); // null values are dropped from the payload
    confirmSpy.mockRestore();
  });

  test('declining the data-confirmation statement sends nothing', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
    const { ref, actions } = renderAsset();

    ref.current.onSubmitHandler({ action: 'Add', asset_tag: 'EV-100' });

    expect(actions.addUserAsset).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  test('updating an existing asset sends the route id with the payload and asks for no confirmation', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    // The update arm assigns window.location.href; jsdom cannot navigate, so the real
    // location is swapped for a plain object for the duration of this test.
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    const { ref, actions } = renderAsset({ params: { id: '5' } });
    ref.current.onSubmitHandler({ action: 'Update', asset_tag: 'EV-100' });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(actions.updateUserAsset).toHaveBeenCalledTimes(1);
    const sent = actions.updateUserAsset.mock.calls[0][0];
    expect(sent.get('id')).toBe('5');
    expect(sent.get('asset_tag')).toBe('EV-100');
    expect(window.location.href).toBe('/link/asset_management/');

    window.location = originalLocation;
    confirmSpy.mockRestore();
  });

  test('an unrecognised action sends nothing at all', () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { ref, actions } = renderAsset();

    ref.current.onSubmitHandler({ action: 'Cancel', asset_tag: 'EV-100' });

    expect(actions.addUserAsset).not.toHaveBeenCalled();
    expect(actions.updateUserAsset).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
