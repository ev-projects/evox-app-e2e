import React, { Component } from "react";
import "./RestdayWork.css";
import { Form  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';
import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';


class RestdayWork extends Component {
  render() {
    return <Formik 
    enableReinitialize
    onSubmit={this.onSubmitHandler} 
    validationSchema={validationSchema} 
    initialValues={{
      date_request: null, 
      on_duty: null,  
      off_duty: null, 
      break: null, 
      note: null, 
    }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
    <form onSubmit={handleSubmit}>
      		<ContainerWrapper>
      			<ContainerBody>
	    		  <Content col="6" title="Rest Day Work">
	    		  <Row>
	    		  <Col size="4">
				   <div className="form-group">
                    <label for="exampleInputEmail1">Date Request : </label>
                    <InputDate name="date_request" /> 
                  </div>
 			       </Col>
 			       </Row>
 			       <Row>  
 			       <Col size="4"> 
		            <div className="form-group">
                    <label for="exampleInputEmail1">On Duty : </label>
                	<InputTime name="on_duty" />
                  </div>
                  </Col> 
                  <Col size="4">   
                  <div className="form-group">
                    <label for="exampleInputEmail1">Off Duty : </label>
                 	<InputTime name="off_duty" />
                  </div>
                  </Col> 
                  <Col size="4">   
                  <div className="form-group">
                    <label for="exampleInputEmail1">Break : </label>
                 	<InputTime name="break" />
                  </div>
                  </Col> 
                  </Row> 
				          <div className="form-group">
                    <label>Note:</label>
                    <textarea className="form-control" rows="3" name="note" onChange={handleChange} value={values.note} placeholder="Enter Note..."></textarea>
                  <Form.Control.Feedback type="invalid">
    		            &nbsp;{errors.note && touched.note && errors.note}
    		          </Form.Control.Feedback> 
                  </div>
                  <button type="submit" className="btn btn-primary">Submit</button>
	              </Content>
              </ContainerBody>
            </ContainerWrapper>
    </form>
  )}
 
  </Formik>;
    }
}


/** Form Validation */
const required_field = "This field is required";
const validation_var = Yup.string().required(required_field).nullable();
const validationSchema = Yup.object().shape({
  date_request: validation_var,
  on_duty: validation_var,
  off_duty: validation_var,
  break: validation_var,
  note: validation_var
});


export default RestdayWork;








