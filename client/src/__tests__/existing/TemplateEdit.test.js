// WAVE-2 REACHABILITY PASS — authored 2026-07-27, needs first live Jest run
// Target: src/container/Schedule/TemplateEdit/TemplateEdit.js (55 stmts, 0% — no test existed)
// Reachability: RouteList.js -> /app/schedule/template/:templateid
// ⚠ BUG-7 INSTANCE #4: componentWillMount calls this.props.getTemplateSchedule(
// this.props.params.templateid, 'Template') — RRv3 style. Tests inject `params` directly.
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
    Scheduledetails:          () => <div>Scheduledetails</div>,
    SchedulePolicy:           () => <div />,
    WorkDays:                 () => <div />,
    StandardSchedDetailsForm: () => <div />,
    FlexibleSchedDetailsForm: () => <div />,
    ScheduleHolidayPolicy:    () => <div />,
    onSelectTimeHandlerStd:   jest.fn(),
    onSelectTimeHandlerFlexi: jest.fn(),
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
jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/Template/BackButton', () => () => <div />);
jest.mock('react-datepicker', () => () => <input type="date" />);

const TemplateEdit = require('../../container/Schedule/TemplateEdit/TemplateEdit').default;

const defaultProps = {
    params: { templateid: '1' },     // BUG-7: v3-style params injected directly
    user: { id: 1 },
    template: { isScheduleLoaded: false },
    updateSchedule: jest.fn(),
    getTemplateSchedule: jest.fn(),
};

function renderPage(props = {}) {
    return render(
        <MemoryRouter>
            <TemplateEdit {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('TemplateEdit container', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing before template loads', () => {
        expect(() => renderPage()).not.toThrow();
    });

    test('fetches the template schedule on mount with the route template id', () => {
        renderPage();
        expect(defaultProps.getTemplateSchedule).toHaveBeenCalledWith('1', 'Template');
    });

    test('BUG-7 characterization: crashes when params prop is absent (RRv4 reality)', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => renderPage({ params: undefined })).toThrow();
        spy.mockRestore();
    });
});
