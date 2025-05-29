import React, { Component } from "react";
import { connect } from 'react-redux';

import "./AssetManagementForm.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../components/GridComponent/AdminLte.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import { setRedirect } from '../../store/actions/redirectActions';

import { addUserAsset } from '../../store/actions/userActions' ;

import Wrapper from "../../components/Template/Wrapper";
import RequestButtons from "../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../components/RequestComponent/RequestButtons/RequestSubtitle";


class AssetManagementForm extends Component {

  // Set the default constructor with Action state in null
  constructor(props) {
    super(props);
    this.state = {
      action: null
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

    this.props.addUserAsset( formData );

    // Setting of Form Data to be passed in the submission
    // var formData = new FormData();

    // for (var key in values) {

    //     if( values[key] != null ) {
    //         switch( key ) {
    //             case "amount":
    //               formData.append(key, moment( values[key] ).format("HH:mm") );
    //               break;
    //             case "date":
    //                 formData.append(key, moment( values[key] ).format("YYYY-MM-DD") );
    //                 break;
    //             default:
    //                 formData.set(key, values[key]);
    //                 break;
    //         }
    //     }
    // }

    // include session id in the post parameter
    // formData.set('session_id', localStorage.getItem('session_id'));
    
    
   // Checks on what method to use depending on the values.method
    // switch( values.action ) { 

    //     // If action is NULL, it means it's either store/update
    //     case null:
    //         if (window.confirm("Are you sure you want to submit/update this request?")) {
    //             switch( values.method ) {

    //               case "store":
    //                   this.props.addOvertime( formData );
    //                   break;
            
    //               case "update":
    //                   formData.append('_method', 'PUT')
    //                   this.props.updateOvertime( values.id, formData );
    //                   break;

    //               default:
    //                   break;

    //             }
    //         }
    //         break;

    //     // If action is approve/decline/cancel, it means it's a change of Status
    //     case "approve":
    //     case "decline":
    //     case "cancel":
    //         if (window.confirm("Are you sure you want to "+ values.action +" this request?")) {
    //           formData.append('_method', 'PUT')
    //           this.props.updateOvertimeStatus( values.id, formData, values.action, this.props?.user?.id, this.props.settings.current_payroll_cutoff.start_date , this.props.settings.current_payroll_cutoff.end_date );
    //         }
    //         break;
    // }
  }

  // Set the setAction Function for Setting of the Approval Action to be proceeded
  setAction = (action) => {
    this.setState({'action':action});
  }

  componentWillMount(){
      
      // // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      // this.props.clearOvertimeInstance();

      // // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      // if( this.props.params.id != undefined ) {

      //   this.props.fetchOvertime( this.props.params.id )
      // }
  }

  render = () => {
    // Sets the Method of the current state.
    const method = 'store';
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        personal_equipment: null,
        serial_no:          null,
        asset_tag:          null,
    }

    // Sets the default title for hte Request. Checks aswell if it's for approval.
    let title = 'IT Asset Management';

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
          <input type="hidden" name="date" value={values.date} />
          <input type="hidden" name="id"  value={values.id} />
          <ContainerWrapper>
            <ContainerBody>
              <Content col="9" title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
                <Row>  
                  <Col size="4"> 
                    <div className="form-group">
                      <label>Employee Name:</label>
                      <input type="text" className="form-control" name="employee_name" value={this.props.user.first_name + " " + this.props.user.last_name} disabled />
                    </div>
                  </Col>
                  <Col size="4">   
                    <div className="form-group">
                      <label>Employee Number:</label>
                      <input type="text" className="form-control" name="emp_num" value={this.props.user.emp_num} disabled />
                    </div>
                  </Col>
                  <Col size="4">   
                    <div className="form-group">
                      <label>Email:</label>
                      <input type="text" className="form-control" name="email" value={this.props.user.email} disabled />
                    </div>
                  </Col>
                </Row><br/>

                <Row>  
                  <Col size="4"> 
                    <div className="form-group">
                      <label>Personal Equipment:</label><br/>
                      <input name="personal_equipment" type="radio" value="1" onChange={handleChange}/><label htmlFor="personal_equipment">YES&nbsp;</label>
                      <input name="personal_equipment" type="radio" value="2" onChange={handleChange}/><label htmlFor="personal_equipment">NO&nbsp;</label>
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <label>Equipment Type:</label>
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <label>Serial No:</label>
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <label>Asset Tag:</label>
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[0]" value="Desktop" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[0]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[0]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[1]" value="Laptop" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[1]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[1]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[2]" value="Keyboard" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[2]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[2]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[3]" value="Mouse" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[3]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[3]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[4]" value="Monitor" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[4]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[4]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[5]" value="Headset" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[5]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[5]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[6]" value="Webcam" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[6]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[6]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>

                <Row>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="equipment[7]" value="Wifi Modem" disabled />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="serial_no[7]" onChange={handleChange} />
                    </div>
                  </Col>
                  <Col size="4"> 
                    <div className="form-group">
                      <input type="text" className="form-control" name="asset_tag[7]" onChange={handleChange} />
                    </div>
                  </Col>
                </Row>
                <RequestButtons method={method} {...this} />
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
    // date:           Yup.string().required("This field is required").nullable(),
    // amount:         Yup.date().required("This field is required").nullable().min( DateFormatter.get_specific_datetime( null, '00:29:59' ) , 'Please select valid time.')
    //                                                                         .max( DateFormatter.get_specific_datetime( null, '8:00:01' ) , 'Please select valid time.'),
    // type:           Yup.string().required("This field is required").nullable(),
    // employee_note:  Yup.string().nullable(),
    // approver_note:  Yup.string().nullable()
  });

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.overtime.instance,
    isInstanceLoaded  : state.overtime.isInstanceLoaded,
		user			        : state.user,
    settings          : state.settings
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      addUserAsset  : ( post_data ) => dispatch( addUserAsset( post_data) ),
      setRedirect   : ( link ) => dispatch( setRedirect( link ) ),
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(AssetManagementForm);