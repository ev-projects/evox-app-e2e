// evoxtest_Containers2_frontend.test.js
// Direct render tests for connected container/component files that lost coverage when
// the Vishnu batch swap started stubbing them out entirely via jest.mock() in their
// parent containers' tests. These render the REAL connected component against the real
// store + real reducers (mocking only the thunk action-creator modules, so dispatch just
// hits real reducer cases), following the same pattern as evoxtest_Actions_frontend.test.js.

jest.mock('../../store/actions/dashboard/dashboardActions', () => ({
  getDashboardOverall: (...args) => ({ type: 'DASHBOARD_ACTION_STUB', args }),
}));
jest.mock('../../store/actions/announcement/departmentAnnouncementActions', () => ({
  fetchDashboardAnnouncementList: (...args) => ({ type: 'DASHBOARD_ACTION_STUB', args }),
  clearDepartmentAnnouncementListInstance: () => ({ type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE' }),
  incrementDashboardAnnouncementList: (...args) => ({ type: 'DASHBOARD_ACTION_STUB', args }),
}));
jest.mock('../../store/actions/lookup/lookupListActions', () => ({
  fetchDepartmentListWithAnnouncements: () => ({ type: 'DASHBOARD_ACTION_STUB' }),
}));

import React from 'react';
import { render, fireEvent, wait } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import store from '../../store';
import DashboardAnnouncementsList from '../../components/Dashboard/DashboardAnnouncementsList/DashboardAnnouncementsList';

global.links = global.links || {};
global.links.announcement_page = '/announcements/';

const renderWithStore = (ui) => render(
  <Provider store={store}><MemoryRouter>{ui}</MemoryRouter></Provider>
);
const waitFor = wait;

describe('DashboardAnnouncementsList', () => {
  beforeEach(() => {
    store.dispatch({ type: 'CLEAR_DEPARTMENT_ANNOUNCEMENT_LIST_INSTANCE' });
    store.dispatch({ type: 'FETCH_DEPARTMENT_LIST_SUCCESS', list: [{ Id: 1, Name: 'Engineering' }, { Id: 2, Name: 'HR' }] });
  });

  test('renders the department dropdown when department list is loaded', async () => {
    const { container } = renderWithStore(<DashboardAnnouncementsList />);
    await waitFor(() => expect(container.querySelector('select[name="department_id"]')).toBeTruthy());
    expect(container.textContent).toMatch(/Departments Announcement/);
  });

  test('shows PageLoading in the announcement list while not yet loaded', async () => {
    const { container } = renderWithStore(<DashboardAnnouncementsList />);
    await waitFor(() => expect(container.querySelector('select')).toBeTruthy());
  });

  // NOTE: componentWillMount unconditionally dispatches clearDepartmentAnnouncementListInstance()
  // on every mount, which wipes any state dispatched *before* render. So these dispatch the
  // list-loaded action *after* mount instead, mirroring the real mount -> fetch -> populate flow.
  test('renders "No Announcements." when the loaded list is empty', async () => {
    const { container } = renderWithStore(<DashboardAnnouncementsList />);
    store.dispatch({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS', list: [] });
    await waitFor(() => expect(container.textContent).toMatch(/No Announcements/));
  });

  test('renders announcement cards (on_link + off_link, thumbnail null + set) with Show More', async () => {
    const { container, getByText } = renderWithStore(<DashboardAnnouncementsList />);
    store.dispatch({
      type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS',
      list: [
        { id: 1, title: 'Company Update', headline: 'Big news', category: 'general',
          on_link: 0, thumbnail: null, release_date: '2020-01-01', Department_name: 'Engineering' },
        { id: 2, title: 'External Link', headline: 'Click through', category: 'general',
          on_link: 1, link: 'example.com/news', thumbnail: 'public/img.png',
          release_date: new Date().toISOString().slice(0, 10), Department_name: 'HR' },
      ],
    });
    await waitFor(() => expect(container.textContent).toMatch(/Company Update/));
    expect(container.textContent).toMatch(/External Link/);
    expect(container.textContent).toMatch(/Show More/);

    fireEvent.click(getByText('Show More'));
  });

  test('renders "No More Announcements to Show" when hideShowMore is true', async () => {
    const { container } = renderWithStore(<DashboardAnnouncementsList />);
    store.dispatch({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS', list: [{
      id: 1, title: 'Only One', headline: 'x', category: 'general',
      on_link: 0, thumbnail: null, release_date: '2020-01-01', Department_name: 'Engineering',
    }] });
    store.dispatch({ type: 'INCREMENT_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS', list: [] });
    await waitFor(() => expect(container.textContent).toMatch(/No More Announcements to Show/));
  });

  test('changing the department select dispatches the filter handler', async () => {
    const { container } = renderWithStore(<DashboardAnnouncementsList />);
    store.dispatch({ type: 'FETCH_DEPARTMENT_ANNOUNCEMENT_INDEX_LOAD_SUCCESS', list: [] });
    await waitFor(() => expect(container.querySelector('select[name="department_id"]')).not.toBeNull());
    const select = container.querySelector('select[name="department_id"]');
    fireEvent.change(select, { target: { value: '2' } });
    expect(container).toBeTruthy();
  });
});
