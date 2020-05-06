import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form  } from 'react-bootstrap';
import Select from "react-select";

import "./Overtime.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import Formatter from "../../../services/Formatter";
import DateFormatter from "../../../services/DateFormatter";



import { fetchOvertime, addOvertime, updateOvertime } from '../../../store/actions/overtimeActions';


class Overtime extends Component {
    
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

    // Sets the Overtime Type
    const overtimeType = this.props.constant.OVERTIME_TYPE!= undefined ? this.props.constant.OVERTIME_TYPE : null;
    
    // Sets Initial Value of the current Formik form.
    const initialValue = {
        date:           this.props.instance.date != undefined ? new Date( this.props.instance.date ) : null, 
        amount:         this.props.instance.amount != undefined ? DateFormatter.get_specific_datetime( null, this.props.instance.amount+":00" ) : null,  
        type:           this.props.instance.type != undefined ? this.props.instance.type : null, 
        employee_note:  this.props.instance.employee_note != undefined ? this.props.instance.employee_note : null,
        approver_note:  this.props.instance.approver_note != undefined ? this.props.instance.approver_note : null
    }

    /** Show the Form if the Method is Store OR Approval/Update and the isLoaded is TRUE (Will be true once the Instance is loaded.) */
    if( method == 'store' || (['approval', 'update'].includes( method ) && this.props.isInstanceLoaded) ){
      
      return <Formik 
        enableReinitialize
        // onSubmit={this.onSubmitHandler} 
        validationSchema={validationSchema} 
        initialValues={initialValue}>
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
        <form onSubmit={handleSubmit}>
          <ContainerWrapper>
            <ContainerBody>
              <Content col="6" title="Overtime">
                <Row>  
                  <Col size="4"> 
                    <div className="form-group">
                      <label>Date:</label>
                      <InputDate name="date" value={values.date}/>
                    </div>
                  </Col> 
                  <Col size="3">   
                    <div className="form-group">
                      <label>Amount:</label>
                      <InputTime name="amount" value={values.amount}/>
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
                    <button type="submit" className="btn btn-primary">Submit</button> 
                  : 
                  method == 'update' ?
                    <div>
                      <button type="submit" className="btn btn-primary">Update</button> &nbsp;
                    </div>
                  :
                  method == 'approval' ?
                    <div>
                      <button type="submit" className="btn btn-primary">Approve</button> &nbsp;
                      <button type="submit" className="btn btn-danger">Deny</button>  &nbsp;
                      <button type="submit" className="btn btn-secondary">Cancel</button> &nbsp;
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
    date:           Yup.string().required("This field is required").nullable(),
    amount:         Yup.date().required("This field is required").nullable().min( DateFormatter.get_specific_datetime( null, '00:00:59' ) , 'Please select valid time.'),
    type:           Yup.string().required("This field is required").nullable(),
    employee_note:  Yup.string().required("This field is required").nullable(),
    approver_note:  Yup.string().required("This field is required").nullable()
});

const mapStateToProps = (state) => {
  return {
    constant          : state.constant,
    instance          : state.overtime.instance,
    isInstanceLoaded  : state.overtime.isInstanceLoaded
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
      fetchOvertime   : ( id ) => dispatch( fetchOvertime( id ) ),
      addOvertime     : ( post_data ) => dispatch( addOvertime( post_data ) ),
      updateOvertime  : ( id, post_data ) => dispatch( updateOvertime( id, post_data ) ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(Overtime);








