import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import Select from "react-select";
import moment from 'moment';

import "./RestDayWork.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { fetchRestDayWork, 
         addRestDayWork, 
         updateRestDayWork, 
         updateRestDayWorkStatus, 
         resetRestDayWorkInstance, 
         clearRestDayWorkInstance } from '../../../store/actions/requests/restDayWorkActions';

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";

class RestDayWork extends Component {

  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = (values) => {

    // Setting of Form Data to be passed in the submission
    var formData = new FormData();

    for (var key in values) {
      
        if( values[key] != null ) {
            switch( key ) {
                case "date":
                    formData.set(key, moment( values[key] ).format("YYYY-MM-DD"));
                    break;
                case "start_time":
                case "end_time":
                case "break_time":
                    formData.append(key, moment( values[key] ).format("HH:mm") );
                    break;
                default:
                    formData.set(key, values[key]);
                    break;
            }
        }
    }
    
    // Checks on what action to use depending on the values.action
    switch( values.action ) { 

        // If action is NULL, it means it's either store/update
        case null:
            if (window.confirm("Are you sure you want to submit/update this request?")) {
                switch( values.method ) {

                  case "store":
                      this.props.addRestDayWork( formData );
                      break;
            
                  case "update":
                      formData.append('_method', 'PUT')
                      this.props.updateRestDayWork( values.id, formData );
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
                this.props.updateRestDayWorkStatus( values.id, formData, values.action );
            }
            break;
    }
  }
  
  componentWillMount(){
      
      // Clear the Instance of Rest Day Work before rendering new Instance (If applicable)
      this.props.clearRestDayWorkInstance();

      // If the ID is defined, load the Rest Day Work Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {

        this.props.fetchRestDayWork( this.props.params.id )
      }
  }

  render = () => {  

    // If there's an existing instance and it's status is Canceled/Declined, reset the Rest Day Work instance but retain the ID to reuse the existing record.
    // if( this.props.instance.id != undefined && ['canceled', 'declined'].includes( this.props.instance.status ) ) {
    //   this.props.resetRestDayWorkInstance();
    // }

    // Checks if the Instance is On Approval state.
    const onApproval = this.props.instance?.is_under_supervisee && Authenticator.check('supervisor', 'manage_employee_request') ? this.props.instance.is_under_supervisee : false;

    // Sets the Method of the current state.
    const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:             null,
        method:             method,
        id:                 this.props.instance.id != undefined ? this.props.instance.id : null, 
        date:               this.props.instance.date != undefined ? new Date( this.props.instance.date ) : null,
        user_id:            this.props.instance.user_id != undefined ? this.props.instance.user_id.toString() : this.props.user.id.toString(), 
        start_time:         this.props.instance.start_time != undefined ? DateFormatter.get_specific_datetime( null, this.props.instance.start_time+":00" ) : null,
        end_time:           this.props.instance.end_time != undefined ? DateFormatter.get_specific_datetime( null, this.props.instance.end_time+":00" ): null,
        break_time:         this.props.instance.break_time != undefined ? DateFormatter.get_specific_datetime( null, this.props.instance.break_time+":00" ) : null,
        employee_note:      this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        approver_note:      this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null,
    }


    // Sets the default title for the Request. Checks aswell if it's for approval.
    let title = 'Rest Day Work';
    // if( method == "approval" && this.props.instance.user != undefined ) {
    //     title += " of " + this.props.instance.user.full_name;
    // }

    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( (method == 'store') || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){

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
                  <Row>  
                    <Col size="4"> 
                      <div className="form-group">
                        <label>Date: </label>
                        <InputDate name="date" value={values.date}/> 
                      </div>
                    </Col> 
                  </Row>
                  <Row>  
                    <Col size="4">   
                      <div className="form-group">
                        <label>On Duty: </label>
                        <InputTime name="start_time" value={values.start_time} />
                      </div>
                    </Col> 
                    <Col size="4"> 
                      <div className="form-group">
                        <label>Off Duty: </label>
                        <InputTime name="end_time" value={values.end_time}/>
                      </div>  
                    </Col> 
                    <Col size="4">
                      <div className="form-group">
                        <label>Break: </label>
                        <InputTime name="break_time" value={values.break_time}/>
                      </div> 
                    </Col> 
                  </Row> 

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
    date:           Yup.string().required("This field is required").nullable(),
    start_time:     Yup.date().required("This field is required").nullable(),
    end_time:       Yup.date().required("This field is required").nullable(),
    break_time:     Yup.date().required("This field is required").nullable().max( DateFormatter.get_specific_datetime( null, '01:00:01' ) , 'Please select valid break time.'),
    employee_note:  Yup.string().nullable(),
    approver_note:  Yup.string().nullable()
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.restDayWork.instance,
    isInstanceLoaded  : state.restDayWork.isInstanceLoaded,
		user			        : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchRestDayWork         : ( id ) => dispatch( fetchRestDayWork( id ) ),
      addRestDayWork           : ( post_data ) => dispatch( addRestDayWork( post_data ) ),
      updateRestDayWork        : ( id, post_data ) => dispatch( updateRestDayWork( id, post_data ) ),
      updateRestDayWorkStatus  : ( id, post_data, status ) => dispatch( updateRestDayWorkStatus( id, post_data, status ) ),
      setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
      resetRestDayWorkInstance : () => dispatch( resetRestDayWorkInstance() ),
      clearRestDayWorkInstance : () => dispatch( clearRestDayWorkInstance() )
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(RestDayWork);








