// WAVE-2 REACHABILITY PASS — authored 2026-07-27, needs first live Jest run
// Target: src/container/Schedule/ScheduleInfo/ScheduleInfo.js (90 stmts, 0% — no test existed)
// Reachability: RouteList.js -> /app/profile/:user_id/schedule/:schedule_id
// ⚠ BUG-7 INSTANCE #3: constructor reads this.props.params.user_id (React Router v3 style).
// Under RRv4 props.params is undefined -> crash at construction. Tests inject `params` directly;
// the app fix is the same one-liner as Overtime.js/ChangeSchedule.js (see FINDINGS-REGISTER BUG-7).
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

jest.mock('../../components/Schedule/ScheduleDetails.js', () => ({
    Scheduledetails:                      () => <div>Scheduledetails</div>,
    ScheduledetailsWithTimezone:          () => <div />,
    SchedulePolicy:                       () => <div />,
    WorkDays:                             () => <div />,
    StandardSchedDetailsForm:             () => <div />,
    FlexibleSchedDetailsForm:             () => <div />,
    StandardSchedDetailsFormWithTimezone: () => <div />,
    FlexibleSchedDetailsFormWithTimezone: () => <div />,
    ScheduleHolidayPolicy:                () => <div />,
    onSelectTimeHandlerStd:               jest.fn(),
    onSelectTimeHandlerFlexi:             jest.fn(),
}));
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader:  ({ children }) => <div>{children}</div>,
    Content:          ({ children }) => <div>{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody:    ({ children }) => <div>{children}</div>,
    Row:              ({ children }) => <div>{children}</div>,
    Col:              ({ children }) => <div>{children}</div>,
}));
jest.mock('../../container/PageLoading', () => () => <div>Loading...</div>);
jest.mock('../../components/Template/Wrapper/index.js', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton/index.js', () => () => <div />);
jest.mock('../../components/RequestComponent/RequestButtons/RequestSubtitle', () => () => <div />);
jest.mock('react-datepicker', () => () => <input type="date" />);

const ScheduleInfo = require('../../container/Schedule/ScheduleInfo/ScheduleInfo').default;

const defaultProps = {
    // BUG-7: v3-style params injected directly (RRv4 would put these on match.params)
    params: { user_id: '1', schedule_id: '2' },
    user: { id: 1 },
    // state.schedule slices via connect passthrough
    page_reloaded: false,
    template_list: [],
    default_schedule: {},
    template_data: {},
    user_info: {},
    getUserInfo: jest.fn(),
    getScheduleInfo: jest.fn(),
    scheduleAssign: jest.fn(),
    listTemplate: jest.fn(),
    getTemplateSchedule: jest.fn(),
};

function renderPage(props = {}) {
    return render(
        <MemoryRouter>
            <ScheduleInfo {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('ScheduleInfo container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing before initial data loads', () => {
        expect(() => renderPage()).not.toThrow();
    });

    test('fetches user info and schedule info on mount using params ids', () => {
        renderPage();
        expect(defaultProps.getUserInfo).toHaveBeenCalledWith('1');
        expect(defaultProps.getScheduleInfo).toHaveBeenCalled();
    });

    test('BUG-7 characterization: crashes when params prop is absent (RRv4 reality)', () => {
        // Silence the expected React error noise; the throw itself is the assertion.
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderPage({ params: undefined })).toThrow();
        spy.mockRestore();
    });
});
