import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form, Button } from 'react-bootstrap';

import "./AssetManagementForm.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import { setRedirect } from '../../store/actions/redirectActions';

import { getUserAsset, getUserAssets, addUserAsset, updateUserAsset } from '../../store/actions/userActions' ;

import Wrapper from "../../components/Template/Wrapper";
import RequestButtons from "../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../components/RequestComponent/RequestButtons/RequestSubtitle";

class AssetManagementForm extends Component {

  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      action: null,
      showAddEquipment: false,
    }
  }


  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {
    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

     for (var key in values) {
      if( values[key] != null ) {
        formData.set(key, values[key]);
      }
    }

    if (values.action === "Add") {
      if (window.confirm("Data Confirmation Statement\n\nI confirm that all data provided is true and correct. I understand that any discrepancies, whether intentional or due to negligence, may result in disciplinary action and that I will be held fully accountable.")) {
        this.props.addUserAsset( formData );
      }
    } else if (values.action === "Update") {
      formData.set('id', this.props.params.id);
      this.props.updateUserAsset( formData );
      window.location.href = global.links.asset_management;
    }
  }

  componentDidMount(){
    if (this.props.params.id != undefined) {
      if (!this.props.user.is_asset_loaded) {
        this.props.getUserAsset(this.props.params.id);
      }
    } else {
      if (!this.props.user.is_asset_loaded) {
        this.props.getUserAssets();
      }
    }
  }

  render = () => {
    // Sets the Method of the current state.
    const method = 'store';

    let title = 'IT Asset Management';
    const asset_id = this.props.params.id;
    const user_assets = this.props.user.user_assets;
    const user_asset = this.props.user.user_asset;
    const btn_func = asset_id != undefined ? 'Update' : 'Add';
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        personal_equipment: (user_asset) ? user_asset.personal_equipment : null,
        equipment_type:     (user_asset) ? user_asset.equipment_type : null,
        serial_no:          (user_asset) ? user_asset.serial_no : null,
        asset_tag:          (user_asset) ? user_asset.asset_tag : null,
        add_equipment_type: (user_asset) ? user_asset.add_equipment_type : null,
    }

    return <Wrapper {...this.props} >
      <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler} 
        validationSchema={validationSchema} 
        initialValues={initialValue}>
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="action" value={values.action} />
          <input type="hidden" name="method" value={method} />
          <ContainerWrapper>
            <ContainerBody>
              <Content col="9" title={title} subtitle={<RequestSubtitle method={method} />}>
                <Row>  
                  <Col size="4">
                    <div className="form-group">
                      <label>Employee Name</label>
                      <input type="text" className="form-control" name="employee_name" value={this.props.user.first_name + " " + this.props.user.last_name} disabled />
                    </div>
                  </Col>
                  <Col size="4">
                    <div className="form-group">
                      <label>Employee Number</label>
                      <input type="text" className="form-control" name="emp_num" value={this.props.user.emp_num} disabled />
                    </div>
                  </Col>
                  <Col size="4">
                    <div className="form-group">
                      <label>Email</label>
                      <input type="text" className="form-control" name="email" value={this.props.user.email} disabled />
                    </div>
                  </Col>
                </Row><br/>

                <Row>  
                  <Col size="3">
                    <div className="form-group">
                      <label className="itam-required">Personal Equipment</label>
                      <select name="personal_equipment" className="form-control" value={values.personal_equipment} onChange={handleChange}>
                        <option value=""></option>
                        <option value="1">Yes</option>
                        <option value="2">No</option>
                      </select>
                      <Form.Control.Feedback type="invalid">
                        <ErrorMessage component="div" name="personal_equipment" className="input-feedback" />
                      </Form.Control.Feedback>
                    </div>
                  </Col>
                  <Col size="3">
                    <div className="form-group">
                      <label className="itam-required">Equipment Type</label>
                      <select name="equipment_type" className="form-control" value={values.equipment_type} onChange={(e) => {setFieldValue(e.target.name, e.target.value); (e.target.value == "Others") ? this.setState({'showAddEquipment': true}) : this.setState({'showAddEquipment': false}); }}>
                        <option value=""></option>
                        <option value="Desktop">Desktop</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Keyboard">Keyboard</option>
                        <option value="Mouse">Mouse</option>
                        <option value="Monitor">Monitor</option>
                        <option value="Headset">Headset</option>
                        <option value="Webcam">Webcam</option>
                        <option value="Wifi Modem">Wifi Modem</option>
                        <option value="Others">Others</option>
                      </select>
                      <Form.Control.Feedback type="invalid">
                        <ErrorMessage component="div" name="equipment_type" className="input-feedback" />
                      </Form.Control.Feedback><br/>
                      {this.state.showAddEquipment &&
                        <div>
                          <input name="add_equipment_type" type="text" className="form-control" onChange={handleChange} value={values.add_equipment_type} />
                          <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="add_equipment_type" className="input-feedback" />
                          </Form.Control.Feedback><br/>
                        </div>
                      }
                    </div>
                  </Col>
                  <Col size="3">
                    <div className="form-group">
                      <label className="itam-required">Serial No</label>
                      <input name="serial_no" type="text" className="form-control" onChange={handleChange} value={values.serial_no} placeholder='Please indicate "N/A" if not applicable' />
                      <Form.Control.Feedback type="invalid">
                        <ErrorMessage component="div" name="serial_no" className="input-feedback" />
                      </Form.Control.Feedback>
                    </div>
                  </Col>
                  <Col size="3">
                    <div className="form-group">
                      <label className="itam-required">Asset Tag</label>
                      <input name="asset_tag" type="text" className="form-control" onChange={handleChange} value={values.asset_tag} placeholder='Please indicate "N/A" if not applicable' />
                      <Form.Control.Feedback type="invalid">
                        <ErrorMessage component="div" name="asset_tag" className="input-feedback" />
                      </Form.Control.Feedback>
                    </div>
                  </Col>
                </Row><br/>
                {/* <RequestButtons method={method} {...this} /><br/><br/> */}
                <span>
                  <Button type="button" className="back-button btn btn-secondary" onClick={() => this.props.history.goBack() } ><i className="fa fa-arrow-circle-left" /> Back</Button>&nbsp;
                  <div style={{'float': 'right'}}>
                    <Button type="submit" className="btn btn-primary-2" onClick={(e)=>{ setFieldValue('action', btn_func); handleSubmit(e); }}><i className="fa  is-green fa-location-arrow" /> {btn_func}</Button>
                  </div>
                </span>

                {asset_id === undefined ?
                  <div>
                  {user_assets != undefined && user_assets.length > 0 ?
                    <table class="table table-bordered" style={{ 'marginTop': '50px' }}>
                      <thead>
                        <tr>
                          <th scope="col">Item No</th>
                          <th scope="col">Equipment Type</th>
                          <th scope="col">Personal Equipment</th>
                          <th scope="col">Serial No</th>
                          <th scope="col">Asset Tag</th>
                          <th scope="col" className="is-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {user_assets.map((asset, index) => {
                          let is_personal = '';
                          let has_serial = asset.serial_no ?? "N/A";
                          let has_asset = asset.asset_tag ?? "N/A";;
                          if (asset.personal_equipment == 1) {
                            is_personal = 'Yes'
                          } else if (asset.personal_equipment == 2) {
                            is_personal = 'No';
                          }
                          return (
                            <tr key={index}>
                              <th scope="row">{index + 1}</th>
                              <td>{asset.equipment_type}</td>
                              <td>{is_personal}</td>
                              <td>{has_serial}</td>
                              <td>{has_asset}</td>
                              <td className="is-center">
                                <button type="submit" className="btn" onClick={(e)=>{ e.preventDefault(); window.location.href = global.links.asset_management + asset.id; }}><i className="fa is-green fa-edit"></i></button>
                              </td>
                            </tr>
                          )})}
                      </tbody>
                    </table>
                    : <h3 style={{ 'marginTop': '50px' }}>No assets found</h3>
                  }
                  </div>
                : null}
              </Content>
            </ContainerBody>
          </ContainerWrapper>
        </form>
      )}
    
      </Formik>;    
    </Wrapper>
  }
}

/** Form Validation */
const validationSchema = Yup.object().shape({
    personal_equipment: Yup.string().required("This field is required").nullable(),
    equipment_type: Yup.string().required("This field is required").nullable(),
    add_equipment_type: Yup.string().nullable().when('equipment_type', {
      is: 'Others',
      then: Yup.string().required("This field is required").nullable()
    }),
    serial_no: Yup.string().required("This field is required").nullable(),
    asset_tag: Yup.string().required("This field is required").nullable(),
  });

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
		user			        : state.user,
    settings          : state.settings,
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      addUserAsset    : ( post_data ) => dispatch( addUserAsset( post_data) ),
      updateUserAsset : ( post_data ) => dispatch( updateUserAsset( post_data) ),
      getUserAssets   : () => dispatch( getUserAssets() ),
      getUserAsset    : ( id ) => dispatch( getUserAsset( id ) ),
      setRedirect     : ( link ) => dispatch( setRedirect( link ) ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(AssetManagementForm);