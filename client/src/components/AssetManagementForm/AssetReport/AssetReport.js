import React, { Component } from "react";
import { connect } from 'react-redux';
import { Table } from 'react-bootstrap';

import "./AssetReport.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { Formik, ErrorMessage, getIn  } from 'formik';
import Wrapper from "../../../components/Template/Wrapper";
import API from "../../../services/API";

import { setRedirect } from '../../../store/actions/redirectActions';

import { getAllAssets } from '../../../store/actions/userActions' ;

class AssetReport extends Component {

  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      action: null,
      geo_id: '',
      department_id: '',
      emp_name: '',
    }
  }

  // Set the onSubmitHandler for filtering 
  onSubmitHandler = (values) => {
    var formData = {};
    for (var key in values) {
      if( values[key] != null && values[key] != ""  ) {
        switch( key ) {
          default:
            formData[key] = values[key];
          break;
        }
      } 
    }

    if (values.action === 'filter') {
      this.props.getAllAssets(formData);
    } else if (values.action === 'export') {
      API.call({
        method: "post",
        url: "/user/assetExport",
        params: formData
      })
      .then((result) => {
        const url = window.URL.createObjectURL(new Blob([result.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Asset_Reports.csv');
        document.body.appendChild(link);
        link.click();
      })
      .catch((e) => {
        // dispatch(Formatter.alert_error(e));
      });
    }
  }

  componentDidMount(){
    if (!this.props.user.is_all_asset_loaded) {
      const params = {
        geo_id: this.state.geo_id,
        department_id: this.state.department_id,
        emp_name: this.state.emp_name,
      };
      this.props.getAllAssets(params);
    }
  }

  render = () => {
    // Sets the Method of the current state.
    const method = 'store';
    const geos = this.props.geos;
    const deparments = this.props.user.departments_handled;
    const all_assets = this.props.all_assets;
    const asset_reports_filter = this.props.asset_reports_filter;

    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:         null,
        method:         method,
        geo_id:         (asset_reports_filter != undefined) ? asset_reports_filter.geo_id : '',
        department_id:  (asset_reports_filter != undefined) ? asset_reports_filter.department_id : '',
        emp_name:       (asset_reports_filter != undefined) ? asset_reports_filter.emp_name : '',
    }

    return (
      <Wrapper {...this.props} >
        <Formik 
          enableReinitialize
          onSubmit={this.onSubmitHandler}
          initialValues={initialValue} >
        {
        ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        <form onSubmit={handleSubmit}>
          <ContainerWrapper>
            <ContainerBody>
              <Content label="Create Room">
                <h2>IT Asset Reports</h2>
                <div>
                  <Row>
                    <Col size="3">
                      <div className="form-group">
                        <label>Select Geo</label>
                        <select
                          className="form-control"
                          name="geo_id"
                          value={values.geo_id}
                          onChange={handleChange}
                          style={{ display: 'block' }}>
                          <option />
                            { geos && geos.length > 0 &&  geos.map(function(geo){
                              return <option value={geo.country_id} label={geo.country_name} />
                            })}
                        </select>
                      </div>
                    </Col>
                    <Col size="3">
                      <div className="form-group">
                        <label>Select Department</label>
                        <select
                          className="form-control"
                          name="department_id"
                          value={values.department_id}
                          onChange={handleChange}
                          style={{ display: 'block' }}>
                          <option />
                            { deparments && deparments.length > 0 && deparments.map(function(department){
                              return <option value={department.id} label={department.department_name} />
                            })}
                        </select>
                      </div>
                    </Col>
                    <Col size="3">
                      <div className="form-group">
                        <label>Employee Name</label>
                        <input type="text" className="form-control" name="emp_name" value={values.emp_name} onChange={handleChange} />
                      </div>
                    </Col>
                    <Col size="3" style={{"text-align":"center"}}>
                      <Row>
                        <div className="form-group mt-4">
                          <button type="submit" onClick={(e) => { setFieldValue('action', 'filter'); handleSubmit(); }} className="btn btn-primary"><i className="fa fa-filter" /> Filter</button>
                        </div>
                        <div className="form-group mt-4">
                          <button type="submit" onClick={(e) => { setFieldValue('action', 'export'); handleSubmit(); }} className="btn btn-primary btnspace" >Export</button>
                        </div>
                      </Row>
                    </Col>
                  </Row>
                </div>
                <div className="mb-3 table-container">
                  <Table striped bordered hover className="tablealignment">
                      <thead>
                        <tr>
                          <th>Emp No</th>
                          <th>Employee Name</th>
                          <th>Is Personal Equipment</th>
                          <th>Equipment Type</th>
                          <th>Serial No</th>
                          <th>Asset Tag</th>
                        </tr>
                      </thead>
                      <tbody>
                      { all_assets && all_assets.length > 0 &&
                          all_assets.map((asset, pos) => (
                          <tr>
                              <td>{asset.emp_num}</td>
                              <td>{asset.EmpName}</td>
                              <td>{asset.IsPersonalEquipment}</td>
                              <td>{asset.equipment_type}</td>
                              <td>{asset.serial_no}</td>
                              <td>{asset.asset_tag}</td>
                          </tr>
                          ))}
                      </tbody>
                  </Table>
                </div>
              </Content>
            </ContainerBody>
          </ContainerWrapper>
        </form>
        )}
        </Formik>;    
      </Wrapper>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    constantuser:         state.constant,
    user:                 state.user,
    settingsuser:         state.settings,
    geos:                 state.settings.countries,
    all_assets:           state.user.all_assets,
    asset_reports_filter: state.user.asset_reports_filter
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      getAllAssets  : ( geo_id, deparment_id, emp_name ) => dispatch( getAllAssets( geo_id, deparment_id, emp_name ) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(AssetReport);