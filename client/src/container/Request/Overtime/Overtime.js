import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form  } from 'react-bootstrap';
import Select from "react-select";

import "./Overtime.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';
import moment from 'moment';
/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import Formatter from "../../../services/Formatter";
import DateFormatter from "../../../services/DateFormatter";

import { setRedirect } from '../../../store/actions/redirectActions';

import {  fetchOvertime, 
          addOvertime, 
          updateOvertime,
          updateOvertimeStatus, 
          resetOvertimeInstance, 
          clearOvertimeInstance,
        } from '../../../store/actions/requests/overtimeActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";
import Authenticator from "../../../services/Authenticator";


class Overtime extends Component {

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
            switch( key ) {
                case "amount":
                  formData.append(key, moment( values[key] ).format("HH:mm") );
                  break;
                case "date":
                    formData.append(key, moment( values[key] ).format("YYYY-MM-DD") );
                    break;
                default:
                    formData.set(key, values[key]);
                    break;
            }
        }
    }

    // include session id in the post parameter
    formData.set('session_id', localStorage.getItem('session_id'));
    
    
   // Checks on what method to use depending on the values.method
    switch( values.action ) { 

        // If action is NULL, it means it's either store/update
        case null:
            let dateToCheck = moment( values.date ).format("YYYY-MM-DD");
            let confirmMessage = '';
            if (dateToCheck >= this.props.settings.request_payroll_cutoff.StartDate && dateToCheck <= this.props.settings.request_payroll_cutoff.EndDate) {
              confirmMessage = "Are you sure you want to submit/update this request?";
            } else {
              confirmMessage = "The request date exceeds the current payroll cut-off period. This request will be recorded as a dispute and will not be considered as a regular payroll request. Are you sure you want to submit this request?";
            }

            if (window.confirm(confirmMessage)) {
                switch( values.method ) {

                  case "store":
                      this.props.addOvertime( formData );
                      break;
            
                  case "update":
                      formData.append('_method', 'PUT')
                      this.props.updateOvertime( values.id, formData );
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
              this.props.updateOvertimeStatus( values.id, formData, values.action, this.props?.user?.id, this.props.settings.current_payroll_cutoff.start_date , this.props.settings.current_payroll_cutoff.end_date );
            }
            break;
    }
  }

  // Set the setAction Function for Setting of the Approval Action to be proceeded
  setAction = (action) => {
    this.setState({'action':action});
  }

  componentWillMount(){
      
      // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      this.props.clearOvertimeInstance();

      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {

        this.props.fetchOvertime( this.props.params.id )
      }
  }

  componentDidUpdate(prevProps){
    if(this.props.params.id && this.props.params.id !== prevProps.params.id){
      console.log( this.props.params);
      // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      this.props.clearOvertimeInstance();
    
      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
        this.props.fetchOvertime( this.props.params.id )
    }
    if(this.props.params.id === undefined && this.props.params.id !== prevProps.params.id){
      console.log( this.props.params);
      // Clear the Instance of Alter Log before rendering new Instance (If applicable)
      this.props.clearOvertimeInstance();
    }
  }

  
  render = () => {  
    // console.log(this.props.user);
    // Checks if the Instance is On Approval state.
    const onApproval = this.props.instance?.is_under_supervisee ? this.props.instance.is_under_supervisee : false;

    const isManager = this.props.instance?.is_under_supervisee;
    // Sets the Method of the current state.
    const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

    // Sets the Overtime Type
    const overtimeType = this.props.constant.OVERTIME_TYPE!= undefined ? this.props.constant.OVERTIME_TYPE : null;
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        action:           null,
        method:           method,
        isManager :       isManager,
        id:               this.props.instance.id != undefined ? this.props.instance.id : null, 
        date:             this.props.instance.date != undefined ? new Date( this.props.instance.date ) : null,         
        user_id:          this.props.instance.user_id != undefined ? this.props.instance.user_id.toString() : this.props.user.id.toString(), 
        amount:           this.props.instance.amount != undefined ? DateFormatter.get_specific_datetime( null, this.props.instance.amount+":00" ) :  new Date(new Date().setHours(0,0,0,0)) ,  
        type:             this.props.instance.type != undefined ? this.props.instance.type : null, 
        employee_note:    this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        approver_note:    this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null
    }

    // Sets the default title for hte Request. Checks aswell if it's for approval.
    let title = 'Overtime';
    // if( method == "approval" && this.props.instance.employee_name != undefined ) {
    //   title += " of " + this.props.instance.employee_name;
    // }

  
    /** Show the Form if the Method is Store an has a Date Initial Value OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( method == 'store' || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
      
    // if( (method == 'store' && initialValue.date != undefined) || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
    // if(this.props.user.user_has_schedule == false && this.props.user.user_has_schedule !=undefined)
    // {  
    //   return <NoScheduleInfo></NoScheduleInfo>
    // }

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
                <Content col="6"  title={title} subtitle={<RequestSubtitle method={method} user={this.props.instance.user} />}>
                  <Row>  
                    <Col size="4"> 
                      <div className="form-group">
                        <label>Date:</label>
                        <InputDate name="date" value={values.date} readOnly={onApproval}/>
                      </div>
                    </Col> 
                    <Col size="3">   
                      <div className="form-group">
                        <label>Amount(Hours):</label>
                        <InputTime name="amount" type= "overtime" value={values.amount}/>
                      </div>
                    </Col> 
                    <Col size="5">   
                      <div className="form-group">
                        <label>Type:</label>
                        <select name="type" value={ values.type } className="form-control" onChange={handleChange}>
                            <option></option>
                            { /** Iterates the Overtime Type */
                              overtimeType != null ? 
                                Object.keys( overtimeType ).map(function(key, index, value){
                                  return <option value={overtimeType[key]} >{ Formatter.slug_to_title( overtimeType[key] ) }</option>
                                }) 
                                : 
                                null
                            }
                        </select>
                        <Form.Control.Feedback type="invalid">
                            <ErrorMessage component="div" name="type" className="input-feedback" />
                        </Form.Control.Feedback> 
                      </div>
                    </Col> 
                  </Row> 

                    <div className="form-group">
                          <label>{isManager? "Employee": "Enter"} Note:</label>
                        {  /** Shows Approver Note if on Approval   */
                          onApproval ? 
                          <p>{values.employee_note}</p>
                          :
                          <div>
                          <textarea className="form-control" rows="3" name="employee_note" onChange={handleChange} value={values.employee_note??''} placeholder="Enter Note..."  ></textarea> 
                          <Form.Control.Feedback type="invalid">
                            &nbsp;{errors.employee_note && touched.employee_note && errors.employee_note}
                          </Form.Control.Feedback> 
                          </div>
                        }
                      
                    </div> 

                  {  /** Shows Approver Note if on Approval  and not applying of request  */
                    onApproval || values.method !== 'store' ? 
                    <div className="form-group">
                      <label>{isManager? "Enter": "Supervisor"} Note:</label>

                      {  /** Shows Approver Note if on Approval   */
                        isManager ? 
                        <div>
                        <textarea className="form-control" rows="3" name="approver_note" onChange={handleChange} value={values.approver_note??''} placeholder="Enter Note..."  ></textarea> 
                        <Form.Control.Feedback type="invalid">
                          &nbsp;{errors.approver_note && touched.approver_note && errors.approver_note}
                        </Form.Control.Feedback> 
                        </div>
                        :
                        /** Shows Approver Note if on Approval   */
                        <p>{values.approver_note}</p>
                      }
                      
                      <Form.Control.Feedback type="invalid">
                        &nbsp;{errors.approver_note && touched.approver_note && errors.approver_note}
                      </Form.Control.Feedback> 
                    </div> 
                    :
                    null 
                  }
                  <RequestButtons method={method} {...this} />
                </Content>
              </ContainerBody>
            </ContainerWrapper>
          </form>
      )}
    
      </Formik>;    
      </Wrapper>
    }
  return <PageLoading/>;
}
}


/** Form Validation */

const validationSchema = Yup.object().shape({
    date:           Yup.string().required("This field is required").nullable(),
    amount:         Yup.date().required("This field is required").nullable().min( DateFormatter.get_specific_datetime( null, '00:29:59' ) , 'Please select valid time.')
                                                                            .max( DateFormatter.get_specific_datetime( null, '8:00:01' ) , 'Please select valid time.'),
    type:           Yup.string().required("This field is required").nullable(),
    employee_note:  Yup.string().nullable(),
    approver_note:  Yup.string().nullable()
  });

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.overtime.instance,
    isInstanceLoaded  : state.overtime.isInstanceLoaded,
		user			        : state.user,
    settings        : state.settings
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchOvertime   : ( id ) => dispatch( fetchOvertime( id ) ),
      addOvertime     : ( post_data ) => dispatch( addOvertime( post_data ) ),
      updateOvertime  : ( id, post_data ) => dispatch( updateOvertime( id, post_data ) ),
      updateOvertimeStatus  : ( id, post_data, status, user_id, fromdate, todate ) => dispatch( updateOvertimeStatus( id, post_data, status, user_id, fromdate, todate ) ),
      setRedirect           : ( link ) => dispatch( setRedirect( link ) ),
      resetOvertimeInstance : () => dispatch( resetOvertimeInstance() ),
      clearOvertimeInstance : () => dispatch( clearOvertimeInstance() )
    }
}

function NoScheduleInfo(props) {
  return (
        

    <ContainerWrapper>
      <ContainerBody>
        <Content col="6">
          <h5><b>You have no Default or Temporary Schedule!</b></h5>
          <p>User should have Schedule to apply OT request and in order for the system to know when to calculate additional Pre or Post OVERTIME Hours.</p>
          <p>Coordinate with you supervisor to assign Default Schedule in you account.</p>
        </Content>
      </ContainerBody>
    </ContainerWrapper>
 

)
}
export default connect(mapStateToProps, mapDispatchToProps)(Overtime);








