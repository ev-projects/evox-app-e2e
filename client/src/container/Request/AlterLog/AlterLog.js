import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import Select from "react-select";
import moment from 'moment';

import "./AlterLog.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime,InputDateTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import Formatter from "../../../services/Formatter";
import DateFormatter from "../../../services/DateFormatter";



import { fetchAlterLog, addAlterLog, updateAlterLog } from '../../../store/actions/alterLogActions';


class AlterLog extends Component {
    

  onSubmitHandler = (values, e) => {
    console.log(values);
    console.log(this.props);
    console.log(e);
  }


  componentWillMount(){
      // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
      if( this.props.params.id != undefined ) {
        this.props.fetchOvertime( this.props.params.id )
      }
  }

  render = () => {  
  
    // Checks if the Instance is On Approval state.
    const onApproval = this.props.onApproval != undefined ? this.props.onApproval : false;

    // Sets the Method of the current state.
    const method = (( onApproval ) ? 'approval' : ((this.props.params.id != undefined) ? 'update' : 'store') )

    // Sets Initial Value of the current Formik form.
    const initialValue = {
        method:             method,
        date:               this.props.instance.date != undefined ? new Date( this.props.instance.date ) : ( this.props.location.date != undefined ? new Date(  this.props.location.date ) : null ), 
        current_time_in:    this.props.instance.current_time_in != undefined ? new Date( this.props.instance.current_time_in ) : ( this.props.location.current_time_in != undefined ? new Date(  this.props.location.current_time_in ) : null ), 
        current_time_out:   this.props.instance.current_time_out != undefined ? new Date( this.props.instance.current_time_out ) : ( this.props.location.current_time_out != undefined ? new Date(  this.props.location.current_time_out ) : null ), 
        new_time_in:        this.props.instance.new_time_in != undefined ? new Date( this.props.instance.new_time_in ) : ( this.props.location.current_time_in != undefined ? new Date(  this.props.location.current_time_in ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        new_time_out:       this.props.instance.new_time_out != undefined ? new Date( this.props.instance.new_time_out ) : ( this.props.location.current_time_out != undefined ? new Date(  this.props.location.current_time_out ) : ( this.props.location.date != undefined ? DateFormatter.get_specific_datetime( this.props.location.date, null ) : null ) ),
        employee_note:      this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        approver_note:      this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null
    }

    /** Show the Form if the Method is Store OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( (method == 'store' && initialValue.date != undefined) || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
      
      return <Formik 
        enableReinitialize
        onSubmit={this.onSubmitHandler} 
        validationSchema={validationSchema} 
        initialValues={initialValue}
        >
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="method" value={method} />
          <input type="hidden" name="date" value={values.date} />
          <ContainerWrapper>
            <ContainerBody>
              <Content col="6" title={ initialValue.date != undefined ? 'Alter Log for ' + moment(values.date).format("MMMM D, YYYY, dddd") : '' }>
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
                      <InputDateTime name="new_time_in" value={values.new_time_in} minDate={values.date} maxDate={values.date} popperPlacement="right-start" />
                    </div>  
                  </Col> 
                  <Col size="6">
                    <div className="form-group">
                      <label>New Time-Out:</label>
                      <InputDateTime name="new_time_out" value={values.new_time_out} minDate={values.date} maxDate={ DateFormatter.add_day_to_datetime( values.date, 1 ) } popperPlacement="right-start" />
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
                  <div className="form-group">
                    <label>Note:</label>
                    <textarea className="form-control" rows="3" name="approver_note" onChange={handleChange} value={values.approver_note} placeholder="Enter Note..."></textarea>
                    <Form.Control.Feedback type="invalid">
                      &nbsp;{errors.approver_note && touched.approver_note && errors.approver_note}
                    </Form.Control.Feedback> 
                  </div> 
                  :
                  null 
                }
                
                { /** Shows the respective buttons base on the onApproval variable  */
                  method == 'store' ? 
                    <Button type="submit" className="btn btn-primary">Submit</Button> 
                  : 
                  method == 'update' ?
                    <div>
                      <Button type="submit" className="btn btn-primary">Update</Button> &nbsp;
                    </div>
                  :
                  method == 'approval' ?
                    <div>
                      <Button type="submit" className="btn btn-primary">Approve</Button> &nbsp;
                      <Button type="submit" className="btn btn-danger">Deny</Button>  &nbsp;
                      <Button type="submit" className="btn btn-secondary">Cancel</Button> &nbsp;
                    </div>
                  :
                  ''
                }
                
              </Content>
            </ContainerBody>
          </ContainerWrapper>
        </form>
    )}
  
    </Formik>;    
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
    employee_note:            Yup.string().nullable().when('method', (method, schema) => 
                                                              ( ['store','update'].includes( method )  ? schema.required("This field is required") : schema)
                                                          ),
    approver_note:            Yup.string().nullable().when('method', (method, schema) => 
                                                              ( ['approval'].includes( method )  ? schema.required("This field is required") : schema)
                                                          )
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.alterLog.instance,
    isInstanceLoaded  : state.alterLog.isInstanceLoaded
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchAlterLog   : ( id ) => dispatch( fetchAlterLog( id ) ),
      addAlterLog     : ( post_data ) => dispatch( addAlterLog( post_data ) ),
      updateAlterLog  : ( id, post_data ) => dispatch( updateAlterLog( id, post_data ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(AlterLog);








