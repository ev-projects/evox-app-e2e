// DRAFT — generated 2026-07-09, needs verification
/**
 * AssetManagementForm/AssetReport — the "IT Asset Reports" filter/export grid.
 * On mount it loads all_assets via getAllAssets(params) unless
 * user.is_all_asset_loaded is already true. Wrapper/AdminLte stubbed; real
 * Formik used (plain render-prop form, no exotic field deps).
 * Source: src/components/AssetManagementForm/AssetReport/AssetReport.js
 */
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/extend-expect';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    connect: () => (Component) => Component,
    useDispatch: () => jest.fn(),
}));

jest.mock('../../components/Template/Wrapper', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/GridComponent/AdminLte.js', () => ({
    ContainerHeader: ({ children }) => <div>{children}</div>,
    Content: ({ children, label }) => <div>{label ? <h1>{label}</h1> : null}{children}</div>,
    ContainerWrapper: ({ children }) => <div>{children}</div>,
    ContainerBody: ({ children }) => <div>{children}</div>,
    Row: ({ children }) => <div>{children}</div>,
    Col: ({ children }) => <div>{children}</div>,
}));

import AssetReport from '../../components/AssetManagementForm/AssetReport/AssetReport';

const defaultProps = {
    user: {
        is_all_asset_loaded: true,
        departments_handled: [
            { id: 10, department_name: 'Engineering' },
            { id: 20, department_name: 'HR' },
        ],
    },
    geos: [
        { country_id: 1, country_name: 'Philippines' },
        { country_id: 2, country_name: 'India' },
    ],
    all_assets: [],
    asset_reports_filter: undefined,
    getAllAssets: jest.fn(),
    setRedirect: jest.fn(),
};

function renderComponent(props = {}) {
    return render(
        <MemoryRouter>
            <AssetReport {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe('AssetReport component', () => {
    beforeEach(() => jest.clearAllMocks());

    test('renders without crashing', () => {
        expect(() => renderComponent()).not.toThrow();
    });

    test('renders the IT Asset Reports heading', () => {
        const { getByText } = renderComponent();
        expect(getByText(/IT Asset Reports/i)).toBeInTheDocument();
    });

    test('renders geo, department, and employee name fields', () => {
        const { container } = renderComponent();
        expect(container.querySelector('select[name="geo_id"]')).toBeInTheDocument();
        expect(container.querySelector('select[name="department_id"]')).toBeInTheDocument();
        expect(container.querySelector('input[name="emp_name"]')).toBeInTheDocument();
    });

    test('renders geo options from props.geos', () => {
        const { container } = renderComponent();
        const options = container.querySelectorAll('select[name="geo_id"] option');
        // +1 for the blank leading <option/>
        expect(options.length).toBe(defaultProps.geos.length + 1);
    });

    test('renders department options from user.departments_handled', () => {
        const { container } = renderComponent();
        const options = container.querySelectorAll('select[name="department_id"] option');
        expect(options.length).toBe(defaultProps.user.departments_handled.length + 1);
    });

    test('renders Filter and Export buttons', () => {
        const { getByText } = renderComponent();
        expect(getByText(/Filter/i)).toBeInTheDocument();
        expect(getByText(/Export/i)).toBeInTheDocument();
    });

    test('renders table headers', () => {
        const { getByText, getAllByText } = renderComponent();
        expect(getByText('Emp No')).toBeInTheDocument();
        // "Employee Name" is both a filter field label and a table header
        expect(getAllByText('Employee Name').length).toBeGreaterThanOrEqual(2);
        expect(getByText('Is Personal Equipment')).toBeInTheDocument();
        expect(getByText('Equipment Type')).toBeInTheDocument();
        expect(getByText('Serial No')).toBeInTheDocument();
        expect(getByText('Asset Tag')).toBeInTheDocument();
    });

    test('renders a row for each all_assets entry', () => {
        const { getByText } = renderComponent({
            all_assets: [
                { emp_num: 'EMP-001', EmpName: 'Jane Doe', IsPersonalEquipment: 'No', equipment_type: 'Laptop', serial_no: 'SN123', asset_tag: 'TAG1' },
            ],
        });
        expect(getByText('EMP-001')).toBeInTheDocument();
        expect(getByText('Jane Doe')).toBeInTheDocument();
        expect(getByText('SN123')).toBeInTheDocument();
    });

    test('does not crash when all_assets is empty', () => {
        expect(() => renderComponent({ all_assets: [] })).not.toThrow();
    });

    test('does not crash when all_assets is undefined', () => {
        expect(() => renderComponent({ all_assets: undefined })).not.toThrow();
    });

    test('does not crash when geos and departments_handled are empty', () => {
        expect(() => renderComponent({
            geos: [],
            user: { ...defaultProps.user, departments_handled: [] },
        })).not.toThrow();
    });

    test('calls getAllAssets on mount when user.is_all_asset_loaded is falsy', () => {
        const getAllAssets = jest.fn();
        renderComponent({
            user: { ...defaultProps.user, is_all_asset_loaded: false },
            getAllAssets,
        });
        expect(getAllAssets).toHaveBeenCalled();
    });

    test('does not call getAllAssets on mount when user.is_all_asset_loaded is true', () => {
        const getAllAssets = jest.fn();
        renderComponent({
            user: { ...defaultProps.user, is_all_asset_loaded: true },
            getAllAssets,
        });
        expect(getAllAssets).not.toHaveBeenCalled();
    });
});
