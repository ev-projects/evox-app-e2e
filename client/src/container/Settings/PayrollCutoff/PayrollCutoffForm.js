import React, { Component } from "react";
import { connect } from 'react-redux';
import { Form,Button,InputGroup,FormControl  } from 'react-bootstrap';
import memoize from 'memoize-one';
import moment from 'moment';
import DataTable from 'react-data-table-component';

import "./PayrollCutoff.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik, ErrorMessage, getIn  } from 'formik';
import * as Yup from 'yup';

import PageLoading from "../../PageLoading";

import DateFormatter from "../../../services/DateFormatter";

import { addPayrollCutoff,
      updatePayrollCutoff,
      fetchPayrollCutoffList,
      clearPayrollCutoffListInstance } from '../../../store/actions/settings/payrollCutoffActions';

import { setRedirect } from '../../../store/actions/redirectActions';

import Wrapper from "../../../components/Template/Wrapper";
import RequestButtons from "../../../components/RequestComponent/RequestButtons/RequestButtons";
import RequestSubtitle from "../../../components/RequestComponent/RequestButtons/RequestSubtitle";


class PayrollCutoff extends Component {
  
  // Set the onSubmitHandler for submissions and check inside the function whether it's for Store/Update/Approve/Cancel/Decline
  onSubmitHandler = async (values) => {
    
        // Setting of Form Data to be passed in the submission
        var formData = new FormData();

        for (var key in values) {
        
            if( values[key] != null ) {
                switch( key ) {
                    case "start_date":
                    case "end_date":
                        formData.append(key, moment( values[key] ).format("YYYY-MM-DD"));
                        break;
                    default:
                        formData.set(key, values[key]);
                        break;
                }
            }
        }

        // If action is NULL, it means it's either store/update
        if (window.confirm("Are you sure you want to submit/update this form?")) {
            switch( values.method ) {

            case "store":
                await this.props.addPayrollCutoff( formData );
                break;
        
            case "update":
                formData.append('_method', 'PUT')
                await this.props.updatePayrollCutoff( values.id, formData );
                break;

            default:
                break;

            }

            await this.props.hideForm()
      
            // Clear the Instance of Payroll Cutoff before rendering new Instance (If applicable)
            // await this.props.clearPayrollCutoffListInstance();

            // If the ID is defined, load the Overtime Instance base on the ID Parameter in Route.
            await this.props.fetchPayrollCutoffList()
        }
    }

  render = () => {  
    
    
    // Sets the Method of the current state.
    const method = (this.props?.instance?.id != undefined) ? 'update' : 'store';

    // Sets Initial Value of the current Formik form.
    const initialValue = { 
        // action:             null,
        method:             method,
        id:                 this.props?.instance?.id != undefined ? this.props?.instance?.id : null, 
        name:               this.props?.instance?.name != undefined ? this.props?.instance?.name : null,
        start_date:         this.props?.instance?.start_date != undefined ? new Date( this.props?.instance?.start_date ) : null, 
        end_date:           this.props?.instance?.end_date != undefined ? new Date( this.props?.instance?.end_date ) : null
    }

    // Sets the default title for the form.
    let title = (method == "store" ? 'Add' : 'Edit') + " Payroll Cut-Off";
    
    return <Content col="6" title={title} >
                <Formik 
                enableReinitialize="true"
                onSubmit={this.onSubmitHandler}
                validationSchema={validationSchema} 
                initialValues={initialValue}
                >
                {
                ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
                
                    <form onSubmit={handleSubmit}>
                    <input type="hidden" name="id"  value={values.id} />
                    <Row> 
                        <Col size="12"> 
                        <Row>  
                            <Col size="4">   
                            <div className="form-group">           
                                <label>Name: </label>   
                                <InputGroup>
                                    <FormControl variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                                    <Form.Control.Feedback type="invalid">
                                    &nbsp;{errors.name && touched.name && errors.name}
                                    </Form.Control.Feedback>
                                </InputGroup> 
                            </div>
                            </Col> 
                            <Col size="4"> 
                            <div className="form-group">
                                <label>Start Date: </label>
                                <InputDate name="start_date" />
                            </div>  
                            </Col> 
                            <Col size="4">
                            <div className="form-group">
                                <label>End Date: </label>
                                <InputDate name="end_date"  />
                            </div> 
                            </Col> 
                        </Row>
                        </Col> 
                    </Row> 
                    <Row>  
                        <Col size="12"> 
                        <Button type="submit" className="btn btn-secondary" >Save</Button>&nbsp;
                        <Button type="button" className="btn btn-secondary" onClick={this.props.hideForm} >Cancel</Button>
                        </Col> 
                    </Row> 
                    </form>
                )}
            
                </Formik>
        </Content>
  // }
  //   return <PageLoading/>;
  }
}


/** Form Validation */

const validationSchema = Yup.object().shape({
  
    name:                 Yup.string().nullable(),
    start_date:           Yup.date().required("This field is required").nullable().max( Yup.ref('start_date') , 'Please select a valid Start Date.'),
    end_date:             Yup.date().required("This field is required").nullable().min( Yup.ref('end_date') , 'Please select a valid End Date.'),
});

const mapStateToProps = (state) => {
  return {
    constant              : state.constant,
    isInstanceLoaded      : state.payrollCutoff.isInstanceLoaded,
    isListInstanceLoaded  : state.payrollCutoff.isListInstanceLoaded,
    instance              : state.payrollCutoff.instance,
    listInstance          : state.payrollCutoff.listInstance
  }
}
const mapDispatchToProps = (dispatch) => {
    return {
        addPayrollCutoff               : ( post_data ) => dispatch( addPayrollCutoff( post_data ) ),
        updatePayrollCutoff            : ( id, post_data ) => dispatch( updatePayrollCutoff( id, post_data ) ),
        fetchPayrollCutoffList         : () => dispatch( fetchPayrollCutoffList() ),
        clearPayrollCutoffListInstance : () => dispatch( clearPayrollCutoffListInstance() ),
    }
}
export default connect(mapStateToProps, mapDispatchToProps)(PayrollCutoff);








