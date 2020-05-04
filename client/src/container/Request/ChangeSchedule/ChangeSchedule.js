import React, { Component } from "react";
import "./ChangeSchedule.css";
import { Form  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody,Row,Col } from '../../../components/GridComponent/AdminLte.js';

import { Scheduledetails, onSelectTimeHandlerStd ,onSelectTimeHandlerFlexi,ScheduleType,WorkDays,StandardSchedDetailsForm,FlexibleSchedDetailsForm} from '../../../components/Schedule/ScheduleDetails.js';

import { InputDate,InputTime } from '../../../components/DatePickerComponent/DatePicker.js';

/** Form Manipulation */
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';

class ChangeSchedule extends Component {
  render() {
  	var schedule_policies =  {allow_late : 0 , allow_undertime : 0, allow_night_diff: 0 };


    return <Formik 
    enableReinitialize
    onSubmit={this.onSubmitHandler} 
    validationSchema={validationSchema} 
    initialValues={{
	    date_from: null,  
	    date_to: null, 
	    reason: null, 
	    cst_schedule_details: [],
	    sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],
	    schedule_policies : schedule_policies,
	    work_days: [],
      	wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}}
    }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
    <form onSubmit={handleSubmit}>
		<ContainerWrapper>
		    <ContainerBody>
		        <Content col="7" title="Change of Schedule">
		            <Row>
		                <Col size="4">
		                    <div className="form-group">
		                        <label for="valid_to">Valid From :</label>
		                        <InputDate name="date_from" />
		                    </div>
		                </Col>
		                <Col size="4">
		                    <div className="form-group">
		                        <label for="valid_to">Valid To :</label>
		                        <InputDate name="date_to" />
		                    </div>
		                </Col>
		            </Row>
		            <Row>
		            	<Col size="12">
			            	<div className="form-group">
			                    <label for="valid_to">Payroll Policy :</label>
					    		<ScheduleType/>
					    	</div>
					    </Col> 
		            </Row>
		            <Row>
		            	<Col size="12">
			            	<div className="form-group">
			                    <label for="valid_to">Work Days :</label>
					                <WorkDays/>
							</div>
					    </Col>
					</Row>
		      		{values.sorted_weekday.map((day, index) => {
		                  if(values.work_days.includes(day)==true){
		                  return <Scheduledetails day={day} index={values.work_days.indexOf(day)} />
		                  }
		            })}
				    <div className="form-group">
                    	<label>Reason:</label>
                    	<textarea className="form-control" rows="3" name="name" onChange={handleChange} value={values.reason} placeholder="Enter Reason..."></textarea>
                  		<Form.Control.Feedback type="invalid">
    		            	&nbsp;{errors.reason && touched.reason && errors.reason}
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
	date_from: validation_var,
	date_to: validation_var,
	reason: validation_var,
	cst_schedule_details: Yup.array().of(Yup.object().shape({
         start_time: validation_var,
          end_time: validation_var,
          start_flexy_time: validation_var,
          end_flexy_time: validation_var,
          break_time: validation_var,
   	}))
});

export default ChangeSchedule;








