import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import Select from "react-select";
import moment from 'moment';
import { useParams, useLocation, useHistory } from "react-router-dom";
import "./AlterLog.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime,InputDateTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchAlterLog, 
         addAlterLog, 
         updateAlterLog, 
         updateAlterLogStatus, 
         resetAlterLogInstance, 
         clearAlterLogInstance } from '../../../store/actions/requests/alterLogActions';

import { setRedirect } from '../../../store/actions/redirectActions';
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions'


import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";
import settingsReducers from "../../../store/reducers/settings/settingsReducers";

class AlterLog extends Component {


  
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async(values) => {
    

    // Setting of Form Data to be passed in the submission
    var formData = new FormData();
    for (var key in values) {
      
        if( values[key] != null ) {
            switch( key ) {
                case "date":
                    formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
                    break;
                case "current_time_in":
                case "current_time_out":
                case "new_time_in":
                case "new_time_out":
              
                // formData.append(key, moment( values[key] ).format("YYYY-MM-DD HH:mm:ss") );
                  // console.log( moment( values[key]).subtract(this.props.user?.user_offset_seconds, 'seconds').format("YYYY-MM-DD HH:mm:ss"));

                  formData.append(key, moment( values[key]).format("YYYY-MM-DD HH:mm:ss") );
                    break;
                default:
                    formData.set(key, values[key]);
                    break;
            }
        }
    }

    

    // Checks on what action to use depending on the values.action
    switch( values.action  ) { 

        // If action is NULL, it means it's either store/update
        case null:
          if (window.confirm("Are you sure you want to submit/update this request?")) {
              switch( values.method ) {

                case "store":
                    this.props.addAlterLog( formData );
                    this.props.getMyDtrNotifications( this.props?.user?.id );
                    break;
          
                case "update":
                    formData.append('_method', 'PUT')
                    this.props.updateAlterLog( values.id, formData );
                    this.props.getMyDtrNotifications( this.props?.user?.id );
                    break;

                default:
                    break;

              }
            }
            break;

        // If action is approve/decline/cancel, it means it's a change of Status
        case "approve":
        case "decline":
        case "cancel":
            if (window.confirm("Are you sure you want to "+ values.action +" this request?")) {
                formData.append('_method', 'PUT')
                this.props.updateAlterLogStatus( values.id, formData, values.action ,this.props?.user?.id, this.props.settings.current_payroll_cutoff.start_date , this.props.settings.current_payroll_cutoff.end_date);
                await this.props.getMyDtrNotifications( this.props?.user?.id );
                // let history = useHistory();
                // history.push(global.links.my_team_all_requests);
                
            }
            break;
    }
    
  }

  
  componentWillMount(){
      console.log( this.props.params);
      // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      this.props.clearAlterLogInstance();

      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {

        this.props.fetchAlterLog( this.props.params.id )
      }
  }

  render = () => {  

    console.log(this.props.instance.current_time_out);
    console.log(new Date(  this.props.location.current_time_out ));
    // If there's an existing instance and it's status is Canceled/Declined, reset the Alter Log instance but retain the ID to reuse the existing record.
    // if( this.props.instance.id != undefined && ['canceled', 'declined'].includes( this.props.instance.status ) ) {
    //   this.props.resetAlterLogInstance();
    // }

    // Checks if the Instance is On Approval state.
    const onApproval = this.props.instance?.is_under_supervisee ? this.props.instance.is_under_supervisee : false;

    // Sets the Method of the current state.
    const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

    const   owner_offset = this.props.instance.offset_difference != undefined ? this.props.instance.offset_difference : null;

    
    var target_date = new Date(  this.props.location.date );
    
    target_date.setSeconds(target_date.getSeconds() + (this.props.user?.user_offset_seconds+ ( target_date.getTimezoneOffset() != 0 ? target_date.getTimezoneOffset() * 60 : 0)))
    
    const initialValue = {
        action:             null,
        method:             method,
        id:                 this.props.instance.id != undefined ? this.props.instance.id : null, 
        date:               this.props.instance.date != undefined ? this.props.instance.date : ( this.props.location.date != undefined ? target_date : null ),
        user_id:            this.props.instance.user_id != undefined ? this.props.instance.user_id.toString() : this.props.user.id.toString(), 
        current_time_in:    this.props.instance.current_time_in != undefined ? new Date( this.props.instance.current_time_in ) : ( this.props.location.current_time_in != undefined ? new Date(  this.props.location.current_time_in ) : null ), 
        current_time_out:   this.props.instance.current_time_out != undefined ? new Date( this.props.instance.current_time_out ) : ( this.props.location.current_time_out != undefined ? new Date(  this.props.location.current_time_out ) : null ), 
        new_time_in:        this.props.instance.new_time_in != undefined ? new Date( this.props.instance.new_time_in ) : ( this.props.location.current_time_in != undefined ? new Date(  this.props.location.current_time_in ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        new_time_out:       this.props.instance.new_time_out != undefined ? new Date( this.props.instance.new_time_out ) : ( this.props.location.current_time_out != undefined ? new Date(  this.props.location.current_time_out ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        employee_note:      this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        approver_note:      this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null,
        pov_current_time_in:    this.props.instance.pov_current_time_in != undefined ? new Date( this.props.instance.pov_current_time_in ) : ( this.props.location.pov_current_time_in != undefined ? new Date(  this.props.location.pov_current_time_in ) : null ), 
        pov_current_time_out:   this.props.instance.pov_current_time_out != undefined ? new Date( this.props.instance.pov_current_time_out ) : ( this.props.location.pov_current_time_out != undefined ? new Date(  this.props.location.pov_current_time_out ) : null ), 
        pov_new_time_in:        this.props.instance.pov_new_time_in != undefined ? new Date( this.props.instance.pov_new_time_in ) : ( this.props.location.pov_current_time_in != undefined ? new Date(  this.props.location.pov_current_time_in ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        pov_new_time_out:       this.props.instance.pov_new_time_out != undefined ? new Date( this.props.instance.pov_new_time_out ) : ( this.props.location.pov_current_time_out != undefined ? new Date(  this.props.location.pov_current_time_out ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        pov_timezone:                 this.props.instance.pov_timezone != undefined ? "-" + this.props.instance.pov_timezone : null,
    }

    // Sets the default title for hte Request. Checks aswell if it's for approval.
    let title = initialValue.date != undefined ? 'Alter Log - ' + moment(initialValue.date).format("MMMM D YYYY") : '';
    // if( method == "approval" && this.props.instance.user != undefined ) {
    //     title += " of " + this.props.instance.user.full_name;
    // }



    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( (method == 'store' && initialValue.date != undefined) || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
    
      return <Wrapper {...this.props} >
        <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler}
        validationSchema={validationSchema} 
        initialValues={initialValue}
        >
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        
          <form onSubmit={handleSubmit}>
            <input type="hidden" name="action" value={values.action} />
            <input type="hidden" name="method" value={method} />
            <input type="hidden" name="date" value={values.date} />
            <input type="hidden" name="id"  value={values.id} />
            { onApproval ? <input type="hidden" name="status"  value={values.status} /> : null}
            <ContainerWrapper>
              <ContainerBody>
                <Content col="6" title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
                {  /** Shows Approver Note if on Approval   */
                    onApproval ? 
                  <Row>
                 
                   <Col size="6">
                   <div className="form-group">
                            <h5><b>Supervisor Perspective Timezone</b> </h5>
                            <label>-{this.props.user?.pov_timezone}</label>
                        </div>
                   </Col>
                  </Row>
                  :
                    null 
                  }
                <Row>  
                    <Col size="6"> 
                      <div className="form-group">
                        <label>Current Time-In:</label>
                        <InputDateTime name="current_time_in" value={values.current_time_in} readOnly />
                      </div>
                    </Col> 
                    <Col size="6">   
                      <div className="form-group">
                        <label>Current Time-Out:</label>
                        <InputDateTime name="current_time_out" value={values.current_time_out} readOnly />
                      </div>
                    </Col> 
                  </Row> 
                  <Row>  
                    <Col size="6"> 
                      <div className="form-group">
                        <label>New Time-In:</label>
                        <InputDateTime name="new_time_in" value={values.new_time_in} minDate={values.date} maxDate={values.date}
                         popperPlacement="right-start" contrast_too = "new_time_in" offset_data={owner_offset}/>
                      </div>  
                    </Col> 
                    <Col size="6">
                      <div className="form-group">
                        <label>New Time-Out:</label>
                        <InputDateTime name="new_time_out" value={values.new_time_out} minDate={values.date} maxDate={ DateFormatter.add_day_to_datetime( values.date, 1 ) } 
                        popperPlacement="right-start" contrast_too = "new_time_out" offset_data={owner_offset}/>
                      </div> 
                    </Col> 
                  </Row> 

                  {  /** Shows Approver Note if on Approval   */
                    onApproval ? 
                   
                    <div className="alterPOV">
                    <div className="form-group">
                            <h5><b>Employee Perspective Timezone</b> </h5>
                            <label>{values.pov_timezone}</label>
                        </div>
                        <Row>  
                        <Col size="6"> 
                          <div className="form-group">
                            <label>Current Time-In:</label>
                            <InputDateTime name="pov_current_time_in" value={values.pov_current_time_in} readOnly />
                          </div>
                        </Col> 
                        <Col size="6">   
                          <div className="form-group">
                            <label>Current Time-Out:</label>
                            <InputDateTime name="pov_current_time_out" value={values.pov_current_time_out} readOnly />
                          </div>
                        </Col> 
                      </Row> 
                      <Row>  
                        <Col size="6"> 
                          <div className="form-group">
                            <label>New Time-In:</label>
                            <InputDateTime name="pov_new_time_in" value={values.pov_new_time_in}  popperPlacement="right-start" readOnly />
                          </div>  
                        </Col> 
                        <Col size="6">
                          <div className="form-group">
                            <label>New Time-Out:</label>
                            <InputDateTime name="pov_new_time_out" value={values.pov_new_time_out}  popperPlacement="right-start" readOnly />
                          </div> 
                        </Col> 
                      </Row> 
                    </div> 
                    
                    :
                    null 
                  }

                  {  /** Shows Employee Note if Not on Approval   */
                  ! onApproval ? 
                    <div className="form-group">
                      <label>Note:</label>
                      <textarea className="form-control" rows="3" name="employee_note" onChange={handleChange} value={values.employee_note??''} placeholder="Enter Note..."></textarea>
                      <Form.Control.Feedback type="invalid">
                        &nbsp;{errors.employee_note && touched.employee_note && errors.employee_note}
                      </Form.Control.Feedback> 
                    </div> 
                    :
                    null 
                  }

                  {  /** Shows Approver Note if on Approval   */
                    onApproval ? 
                    <span>
                    <div className="form-group">
                      <b>Employee's Note:</b> {values.employee_note??''}
                    </div>
                    <div className="form-group">
                      <label>Note:</label>
                      <textarea className="form-control" rows="3" name="approver_note" onChange={handleChange} value={values.approver_note} placeholder="Enter Note..."></textarea>
                      <Form.Control.Feedback type="invalid">
                        &nbsp;{errors.approver_note && touched.approver_note && errors.approver_note}
                      </Form.Control.Feedback> 
                    </div> 
                    </span>
                    :
                    null 
                  }
                  <RequestButtons method={method} {...this} />
                  
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
    
      </Formik>
      </Wrapper>
  }
    return <PageLoading/>;
  }
}


/** Form Validation */

const validationSchema = Yup.object().shape({
  
    current_time_in:          Yup.string().nullable(),
    current_time_out:         Yup.string().nullable(),
    new_time_in:              Yup.date().required("This field is required").nullable().max( Yup.ref('new_time_out') , 'Please select a valid Time-In.'),
    new_time_out:             Yup.date().required("This field is required").nullable().min( Yup.ref('new_time_in') , 'Please select a valid Time-Out.'),
    employee_note:            Yup.string().nullable(),
    approver_note:            Yup.string().nullable()
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.alterLog.instance,
    isInstanceLoaded  : state.alterLog.isInstanceLoaded,
		user			        : state.user,
    settings        : state.settings
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchAlterLog         : ( id ) => dispatch( fetchAlterLog( id ) ),
      addAlterLog           : ( post_data ) => dispatch( addAlterLog( post_data ) ),
      updateAlterLog        : ( id, post_data ) => dispatch( updateAlterLog( id, post_data ) ),
      updateAlterLogStatus  : ( id, post_data, status, user_id, fromdate, todate ) => dispatch( updateAlterLogStatus( id, post_data, status, user_id, fromdate, todate ) ),
      setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
      resetAlterLogInstance : () => dispatch( resetAlterLogInstance() ),
      clearAlterLogInstance : () => dispatch( clearAlterLogInstance() ),
      getMyDtrNotifications  : () => dispatch( getMyDtrNotifications() ),

    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AlterLog);








