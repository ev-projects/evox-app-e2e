// evoxtest_IntegrationsConnectWiringDeep.test.js
//
// SOURCE FILES UNDER TEST (the connect() wiring closure in each)
//   components/PoliciesDocument/PoliciesDocumentDownload.js   mapStateToProps
//   components/PoliciesDocument/PoliciesDocumentViewer.js     mapStateToProps
//   components/PoliciesDocument/PoliciesDocumentUpload.js     mapStateToProps
//   components/PoliciesDocument/UploadedDocumentList.js       mapStateToProps
//   components/NeoReport/NeoOnboarding.js                     mapStateToProps
//   components/NeoReport/NeoSubmissions.js                    mapStateToProps
//   components/NeoReport/NeoDetails.js                        mapStateToProps
//   components/AssetManagementForm/AssetManagementForm.js     mapDispatchToProps
//   components/AssetManagementForm/AssetReport/AssetReport.js mapStateToProps + mapDispatchToProps
//   components/DateReport/ViewReport.js                       mapStateToProps
//   components/DateReport/ViewReportMorocco.js                mapStateToProps
//   components/PayrollDispute/DisputeForm.js                  mapStateToProps + mapDispatchToProps
//   components/Summary/SummaryDashbord.js                     mapStateToProps + mapDispatchToProps
//   container/DPAForm/DPAForm.js                              mapDispatchToProps
//   container/DPAFormIndia/DPAFormIndia.js                    mapStateToProps + mapDispatchToProps
//   container/Profile/JobInformation/JobInformation.js        mapStateToProps
//   container/RequestEmailApproval/RequestEmailApproval.js    mapStateToProps + mapDispatchToProps
//
// MENU PATHS
//   Company -> Policies (download / upload / manage accessibility) · HR -> NEO Report
//   Assets -> My Assets and Assets -> Asset Report · Reports -> Payroll Report (PH / Morocco)
//   Payroll -> Payroll Dispute · Dashboard summary panel · Profile -> Job Information
//   DPA acknowledgement (PH and India) · approval link mailed to an approver
//
// WHY THESE WERE UNCOVERED
//   The house mock `connect: () => (Component) => Component` throws both map functions
//   away, so no existing suite can execute them, and the *inner* dispatch-prop arrows are
//   a second layer that only runs when the prop itself is called. They carry real rules:
//   which store slice feeds which prop, and which action creator each callback dispatches
//   with which arguments. A rename in a reducer silently breaks a screen today.
//
//   This suite captures the two closures off connect() and exercises them directly; it
//   never renders, so it needs no DOM fixtures and stays independent of the component
//   suites that already cover the rendering.
//
// FINDINGS: none. (Every mapping checked here resolves to a key its reducer really holds;
// the DisputeForm split — roles/features from state.lookup, role assignment from
// state.assignRole, the user list from state.dashboard — was verified against the three
// reducers before these expectations were written.)

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  // Identity connect that keeps hold of the two map functions so the wiring can be
  // exercised without a live store.
  connect: (mapStateToProps, mapDispatchToProps) => (Component) => {
    Component.__mapStateToProps = mapStateToProps;
    Component.__mapDispatchToProps = mapDispatchToProps;
    return Component;
  },
  useDispatch: () => jest.fn(),
}));

// Heavy / ESM-only leaves that only need to load, never render.
jest.mock('jszip', () => jest.fn());
jest.mock('react-file-viewer', () => () => null);
jest.mock('react-multi-select-component', () => () => null);
jest.mock('react-google-slides', () => () => null);
jest.mock('react-player/lazy', () => () => null);
jest.mock('react-spring/renderprops', () => ({ Spring: () => null }));
jest.mock('../../components/Template/Wrapper', () => ({ children }) => children || null);

// Action creators are stubbed so each dispatch prop can be checked for the exact action
// it hands to dispatch, arguments included.
jest.mock('../../store/actions/userActions', () => ({
  logIn: (...a) => ({ type: 'STUB_LOGIN', a }),
  fetchUser: (...a) => ({ type: 'STUB_FETCH_USER', a }),
  getUserAsset: (...a) => ({ type: 'STUB_GET_USER_ASSET', a }),
  getUserAssets: (...a) => ({ type: 'STUB_GET_USER_ASSETS', a }),
  addUserAsset: (...a) => ({ type: 'STUB_ADD_USER_ASSET', a }),
  updateUserAsset: (...a) => ({ type: 'STUB_UPDATE_USER_ASSET', a }),
  getAllAssets: (...a) => ({ type: 'STUB_GET_ALL_ASSETS', a }),
}));
jest.mock('../../store/actions/redirectActions', () => ({
  setRedirect: (...a) => ({ type: 'STUB_SET_REDIRECT', a }),
  clearRedirect: () => ({ type: 'STUB_CLEAR_REDIRECT' }),
}));
jest.mock('../../store/actions/profile/profileActions', () => ({
  tickDpa: (...a) => ({ type: 'STUB_TICK_DPA', a }),
  fetchJobInformation: (...a) => ({ type: 'STUB_FETCH_JOB_INFO', a }),
  changePassword: (...a) => ({ type: 'STUB_CHANGE_PASSWORD', a }),
}));
jest.mock('../../store/actions/settings/alertActions', () => ({
  showAlert: (...a) => ({ type: 'STUB_SHOW_ALERT', a }),
}));
jest.mock('../../store/actions/report/reportActions', () => ({
  getDisputeReport: (...a) => ({ type: 'STUB_GET_DISPUTE_REPORT', a }),
}));
jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
  getDashboardOverall: (...a) => ({ type: 'STUB_GET_DASHBOARD_OVERALL', a }),
  getRecentDtr: (...a) => ({ type: 'STUB_GET_RECENT_DTR', a }),
}));
jest.mock('../../store/actions/approval/requestApprovalActions', () => ({
  requestApprovalChangeStatus: (...a) => ({ type: 'STUB_APPROVAL_CHANGE_STATUS', a }),
}));
jest.mock('../../store/actions/neo/neoActions', () => ({
  fetchNeoOnboardingUsers: (...a) => ({ type: 'STUB_NEO_ONBOARDING_USERS', a }),
  sendNeoOnboardingLink: (...a) => ({ type: 'STUB_NEO_SEND_LINK', a }),
  fetchNeoSubmissionUsers: (...a) => ({ type: 'STUB_NEO_SUBMISSION_USERS', a }),
  fetchNeoSubmissionData: (...a) => ({ type: 'STUB_NEO_SUBMISSION_DATA', a }),
}));

import PoliciesDocumentDownload from '../../components/PoliciesDocument/PoliciesDocumentDownload';
import PoliciesDocumentViewer from '../../components/PoliciesDocument/PoliciesDocumentViewer';
import PoliciesDocumentUpload from '../../components/PoliciesDocument/PoliciesDocumentUpload';
import UploadedDocumentList from '../../components/PoliciesDocument/UploadedDocumentList';
import NeoOnboarding from '../../components/NeoReport/NeoOnboarding';
import NeoSubmissions from '../../components/NeoReport/NeoSubmissions';
import NeoDetails from '../../components/NeoReport/NeoDetails';
import AssetManagementForm from '../../components/AssetManagementForm/AssetManagementForm';
import AssetReport from '../../components/AssetManagementForm/AssetReport/AssetReport';
import ViewReport from '../../components/DateReport/ViewReport';
import ViewReportMorocco from '../../components/DateReport/ViewReportMorocco';
import DisputeForm from '../../components/PayrollDispute/DisputeForm';
import SummaryDashbord from '../../components/Summary/SummaryDashbord';
import DPAForm from '../../container/DPAForm/DPAForm';
import DPAFormIndia from '../../container/DPAFormIndia/DPAFormIndia';
import JobInformation from '../../container/Profile/JobInformation/JobInformation';
import RequestEmailApproval from '../../container/RequestEmailApproval/RequestEmailApproval';

// A single fixture state carrying a recognisable value in every slice these screens read,
// so a map function that reaches for the wrong slice produces a visibly wrong prop.
const state = {
  user: { id: 7, full_name: 'Ana Cruz', country_id: 1, all_assets: [{ id: 3 }], asset_reports_filter: { geo_id: 2 } },
  constant: { asset_types: ['Laptop'] },
  settings: { countries: [{ id: 1, name: 'Philippines' }] },
  profile: { job_information: { position: 'Developer' } },
  dashboard: {
    my_country: [{ id: 1 }],
    my_doc: { HR: [{ Id: 4 }] },
    my_doc_file: { FileName: 'handbook.pdf' },
    my_department: [{ Id: 9, Name: 'Engineering' }],
    morocco_payroll_params: [{ id: 12 }],
    user_list: [{ id: 7, full_name: 'Ana Cruz' }],
  },
  neo: {
    neo_onboarding: [{ userGuid: 'g-1' }],
    neo_submissions: [{ userGuid: 'g-2' }],
    neo_submission_data: { answers: [] },
    neo_bhr_num: 'BHR-100',
  },
  assignRole: {
    userRole: 'Supervisor', userPermission: ['view'], userLevel: 2,
    userFeatures: ['dispute'], isUserRolesPermissionsLoaded: true,
    payroll: { cutoff_id: 3 }, isUserListLoaded: true,
  },
  lookup: { roles: [{ id: 1 }], features: [{ id: 2 }] },
  report: { dispute_record: { id: 55 } },
  myTeamRequestList: { overrallstatusNumbers: { pending: 3 } },
  requestApproval: { status: 'Approved' },
};

let dispatch;
beforeEach(() => {
  dispatch = jest.fn();
});

describe('Policies Document screens — store slices feeding each screen', () => {
  test('Download maps the user, country list, document tree and department list', () => {
    expect(PoliciesDocumentDownload.__mapStateToProps(state)).toEqual({
      user: state.user,
      usercountry: state.dashboard.my_country,
      policiesdocument: state.dashboard.my_doc,
      userdepartment: state.dashboard.my_department,
    });
  });

  test('Viewer maps the selected FILE separately from the document tree', () => {
    const props = PoliciesDocumentViewer.__mapStateToProps(state);

    expect(props.policiesdocument).toBe(state.dashboard.my_doc);
    expect(props.policydocument).toBe(state.dashboard.my_doc_file);
    expect(props.user).toBe(state.user);
  });

  // Modal wiring test removed (EVOX-715, remove Policies Document Modal) —
  // PoliciesDocumentModal.js no longer exists.

  test('Upload maps the departments it must tag a document with, plus the settings country list', () => {
    expect(PoliciesDocumentUpload.__mapStateToProps(state)).toEqual({
      user: state.user,
      usercountry: state.dashboard.my_country,
      userdepartment: state.dashboard.my_department,
      countries: state.settings.countries,
    });
  });

  test('UploadedDocumentList (Manage Policy Accessibility) maps the same four slices as Download', () => {
    expect(UploadedDocumentList.__mapStateToProps(state)).toEqual(
      PoliciesDocumentDownload.__mapStateToProps(state)
    );
  });

  test('an empty dashboard slice maps every policies prop to undefined rather than throwing', () => {
    const empty = { user: {}, dashboard: {}, settings: {} };

    expect(PoliciesDocumentDownload.__mapStateToProps(empty)).toEqual({
      user: {}, usercountry: undefined, policiesdocument: undefined, userdepartment: undefined,
    });
    expect(PoliciesDocumentUpload.__mapStateToProps(empty).countries).toBeUndefined();
  });
});

describe('NEO report screens', () => {
  test('Onboarding maps the onboarding roster', () => {
    expect(NeoOnboarding.__mapStateToProps(state)).toEqual({
      user: state.user,
      onboarding: state.neo.neo_onboarding,
    });
  });

  test('Submissions maps the submissions roster, not the onboarding one', () => {
    const props = NeoSubmissions.__mapStateToProps(state);

    expect(props.submissions).toBe(state.neo.neo_submissions);
    expect(props.onboarding).toBeUndefined();
  });

  test('Details maps the single submission payload and the BHR number', () => {
    expect(NeoDetails.__mapStateToProps(state)).toEqual({
      user: state.user,
      submission_data: state.neo.neo_submission_data,
      bhr_num: state.neo.neo_bhr_num,
    });
  });
});

describe('Asset screens', () => {
  test('AssetReport maps the geo list from settings and the asset list from the user slice', () => {
    expect(AssetReport.__mapStateToProps(state)).toEqual({
      constantuser: state.constant,
      user: state.user,
      settingsuser: state.settings,
      geos: state.settings.countries,
      all_assets: state.user.all_assets,
      asset_reports_filter: state.user.asset_reports_filter,
    });
  });

  test('AssetReport.getAllAssets dispatches getAllAssets with geo, department and employee name', () => {
    AssetReport.__mapDispatchToProps(dispatch).getAllAssets(2, 9, 'Ana');

    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_GET_ALL_ASSETS', a: [2, 9, 'Ana'] });
  });

  test('AssetReport.setRedirect dispatches setRedirect with the link', () => {
    AssetReport.__mapDispatchToProps(dispatch).setRedirect('/app/asset/5');

    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_SET_REDIRECT', a: ['/app/asset/5'] });
  });

  test('AssetManagementForm maps the constant, user and settings slices', () => {
    expect(AssetManagementForm.__mapStateToProps(state)).toEqual({
      constant: state.constant,
      user: state.user,
      settings: state.settings,
    });
  });

  test('AssetManagementForm create and update each dispatch their own action with the post data', () => {
    const props = AssetManagementForm.__mapDispatchToProps(dispatch);
    const post = { asset_tag: 'EV-100' };

    props.addUserAsset(post);
    props.updateUserAsset(post);

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'STUB_ADD_USER_ASSET', a: [post] });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'STUB_UPDATE_USER_ASSET', a: [post] });
  });

  test('AssetManagementForm getUserAsset passes the id through while getUserAssets takes none', () => {
    const props = AssetManagementForm.__mapDispatchToProps(dispatch);

    props.getUserAsset(5);
    props.getUserAssets();

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'STUB_GET_USER_ASSET', a: [5] });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'STUB_GET_USER_ASSETS', a: [] });
  });

  test('AssetManagementForm setRedirect dispatches setRedirect with the link', () => {
    AssetManagementForm.__mapDispatchToProps(dispatch).setRedirect('/app/assets');

    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_SET_REDIRECT', a: ['/app/assets'] });
  });
});

describe('Payroll report views', () => {
  test('ViewReport maps the user and the country list only', () => {
    expect(ViewReport.__mapStateToProps(state)).toEqual({
      user: state.user,
      usercountry: state.dashboard.my_country,
    });
  });

  test('ViewReportMorocco additionally maps the Morocco payroll parameters', () => {
    const props = ViewReportMorocco.__mapStateToProps(state);

    expect(props.userparams).toBe(state.dashboard.morocco_payroll_params);
    expect(ViewReport.__mapStateToProps(state).userparams).toBeUndefined();
  });
});

describe('Payroll Dispute form', () => {
  test('maps the role/permission slices the dispute screen gates its buttons on', () => {
    const props = DisputeForm.__mapStateToProps(state);

    expect(props.userRole).toBe('Supervisor');
    expect(props.userPermission).toEqual(['view']);
    expect(props.userLevel).toBe(2);
    expect(props.userFeatures).toEqual(['dispute']);
    expect(props.isUserRolesPermissionsLoaded).toBe(true);
    expect(props.roles).toBe(state.lookup.roles);       // roles come from lookup, not assignRole
    expect(props.features).toBe(state.lookup.features);
    expect(props.dispute_record).toBe(state.report.dispute_record);
  });

  // The three sources are deliberately different reducers: the payroll cutoff and the
  // user-list flag come from assignRole, but the user list itself comes from dashboard.
  test('the user list is read from the dashboard slice while its loaded flag comes from assignRole', () => {
    const props = DisputeForm.__mapStateToProps(state);

    expect(props.userLists).toBe(state.dashboard.user_list);
    expect(props.isUserListLoaded).toBe(true);
    expect(props.payroll).toBe(state.assignRole.payroll);
  });

  test('getDisputeReport dispatches the report action for the given dispute id', () => {
    DisputeForm.__mapDispatchToProps(dispatch).getDisputeReport(55);

    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_GET_DISPUTE_REPORT', a: [55] });
  });
});

describe('Dashboard summary panel', () => {
  test('maps the overall status numbers and the whole dashboard slice', () => {
    expect(SummaryDashbord.__mapStateToProps(state)).toEqual({
      overrallstatusNumbers: state.myTeamRequestList.overrallstatusNumbers,
      dashboard: state.dashboard,
    });
  });

  test('getDashboardOverall dispatches with the page type it was given', () => {
    SummaryDashbord.__mapDispatchToProps(dispatch).getDashboardOverall('my_team');

    expect(dispatch).toHaveBeenCalledWith({ type: 'STUB_GET_DASHBOARD_OVERALL', a: ['my_team'] });
  });
});

describe('DPA acknowledgement screens', () => {
  test('both the PH and the India form map only the user slice', () => {
    expect(DPAForm.__mapStateToProps(state)).toEqual({ user: state.user });
    expect(DPAFormIndia.__mapStateToProps(state)).toEqual({ user: state.user });
  });

  test('DPAForm.tickDpa and showAlert dispatch their actions with the caller arguments', () => {
    const props = DPAForm.__mapDispatchToProps(dispatch);

    props.tickDpa(7);
    props.showAlert('DPA acknowledged', 5000);

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'STUB_TICK_DPA', a: [7] });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'STUB_SHOW_ALERT', a: ['DPA acknowledged', 5000] });
  });

  test('DPAFormIndia wires the same two dispatch props', () => {
    const props = DPAFormIndia.__mapDispatchToProps(dispatch);

    props.tickDpa(7);
    props.showAlert('DPA acknowledged', 0);

    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'STUB_TICK_DPA', a: [7] });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'STUB_SHOW_ALERT', a: ['DPA acknowledged', 0] });
  });
});

describe('Profile -> Job Information', () => {
  test('maps the profile and user slices', () => {
    expect(JobInformation.__mapStateToProps(state)).toEqual({
      profile: state.profile,
      user: state.user,
    });
  });

  test('is connected with no mapDispatchToProps at all — it dispatches nothing', () => {
    expect(JobInformation.__mapDispatchToProps).toBeNull();
  });
});

describe('Emailed request approval page', () => {
  test('maps the approval slice and the user', () => {
    expect(RequestEmailApproval.__mapStateToProps(state)).toEqual({
      requestApproval: state.requestApproval,
      user: state.user,
    });
  });

  test('requestApprovalChangeStatus dispatches with the hash code and the chosen status', () => {
    RequestEmailApproval.__mapDispatchToProps(dispatch)
      .requestApprovalChangeStatus('abc123', 'Approved');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'STUB_APPROVAL_CHANGE_STATUS',
      a: ['abc123', 'Approved'],
    });
  });

  test('a rejection travels through the same prop with the Disapproved status', () => {
    RequestEmailApproval.__mapDispatchToProps(dispatch)
      .requestApprovalChangeStatus('abc123', 'Disapproved');

    expect(dispatch).toHaveBeenCalledWith({
      type: 'STUB_APPROVAL_CHANGE_STATUS',
      a: ['abc123', 'Disapproved'],
    });
  });
});
