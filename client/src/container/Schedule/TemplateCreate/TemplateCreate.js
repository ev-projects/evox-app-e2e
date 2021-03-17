import React, { Component,useState  } from "react";
import { Redirect } from "react-router-dom";
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';

import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";


import { addTemplateSchedule } from '../../../store/actions/scheduleActions'
import Formatter from '../../../services/Formatter'
import { Scheduledetails, onSelectTimeHandlerStd, onSelectTimeHandlerFlexi, SchedulePolicy, WorkDays, StandardSchedDetailsForm,FlexibleSchedDetailsForm} from '../../../components/Schedule/ScheduleDetails.js';

import { ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";


class Schedule extends Component {    
  state = {}

  onSubmitHandler = (values) => {
    // Format the data that will be past on the API
    values.schedule_details = Formatter.format_schedule_details(values);

    this.props.addTemplateSchedule(values)
  }

  componentWillMount(){
      
  }

  render = () => {
    return <Wrapper {...this.props} >
    <Formik 
      onSubmit={this.onSubmitHandler} 
      validationSchema={validationSchema} 
      initialValues={{sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}}
      ,name : '',std_schedule_details: [],flx_schedule_details: [],cst_schedule_details: [], source_type: 'template',schedule_policies : {allow_undertime:0, allow_late:0, allow_night_diff:0}, schedule_type : '', work_days: [] }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
    <form onSubmit={handleSubmit}> 
        <ContainerWrapper> 
        <Col sm={7} >
          <Form.Group className="white_bg">
            <div className="header">
              <h1>
                Schedule Template
              </h1>
            </div>
            <div className="body">
              <InputGroup>
                <FormControl variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                <Form.Control.Feedback type="invalid">
                &nbsp;{errors.name && touched.name && errors.name}
                </Form.Control.Feedback>
              </InputGroup> 
            </div>
          </Form.Group>
        </Col>          
        <Col sm={7}>
          <Form.Group className="white_bg">
            <div className="header">
              <h1>
                Schedule Policy
              </h1>
            </div>
            <div className="body">
              <SchedulePolicy/> 
            </div>
          </Form.Group>
        </Col>
        <Col sm={7} >
          <Form.Group className="white_bg">
            <div className="header">
              <h1>
                Schedule Type
              </h1>
            </div>
          <div className="body">
            <FieldArray name="std_schedule_details" render={arrayHelpers => (
              <label>          
                <input 
                  type="radio"
                  name="schedule_type"
                  checked={values.schedule_type === "standard"}
                  onChange={() => {
                    setFieldValue('std_schedule_details', []);
                    arrayHelpers.insert(0,{break_time : "",start_time : "",end_time : ""})
                    setFieldValue('schedule_type', 'standard')
                  }}
                /> 
              Standard &nbsp;</label>
            )}/>
            <FieldArray name="flx_schedule_details" render={arrayHelpers => (
              <label>
                <input 
                  type="radio"
                  name="schedule_type"
                  checked={values.schedule_type === "flexible"}
                  onChange={() => { 
                    setFieldValue('flx_schedule_details', []);

                    arrayHelpers.insert(0,{break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" })
                    setFieldValue('schedule_type', 'flexible');
                  }}
                /> 
              Flexible &nbsp;</label>
              )}
              />
              <FieldArray name="cst_schedule_details" render={arrayHelpers => (
              <label>
                <input 
                  type="radio"
                  name="schedule_type"
                  checked={values.schedule_type === "customize"}
                  onChange={() => {
                    setFieldValue('cst_schedule_details', []);
                    for (var i = 0; i < values.work_days.length; i++) {
                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" })
                    }
                    setFieldValue('schedule_type', 'customize')
                  }}
                /> 
              Customize &nbsp;</label>      
            )}
            />  
            <Form.Control.Feedback type="invalid">
            &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
            </Form.Control.Feedback>
          </div>
          </Form.Group >   </Col>
        <Col sm={7} >
          <Form.Group className="white_bg">
            <div className="header">
              <h1>
                Work Days
              </h1>
            </div>
            <div className="body">
              <WorkDays/>

            </div>
          </Form.Group>
        </Col>
                
        { values.schedule_type  === '' ? (
          null
        ) : values.schedule_type  === 'standard' ? ( 
          <Col sm={7} >
            <Form.Group className="white_bg">
              <div className="header">
                  <h1>
                    Standard Form
                  </h1>
              </div>
              <div className="body">
                <StandardSchedDetailsForm/>
              </div>
            </Form.Group>
          </Col>
          ) : values.schedule_type=== 'flexible' ? (
          <Col sm={7} >
            <Form.Group className="white_bg">
              <div className="header">
                  <h1>
                    Flexible Form
                  </h1>
              </div>
              <div className="body">
                <FlexibleSchedDetailsForm/>
              </div>
            </Form.Group>
          </Col>
        ): values.schedule_type === 'customize' ? (
            <Col sm={7} >
              <Form.Group className="white_bg">
              <div className="header">
                <h1>
                  Customize Schedule
                </h1>
              </div>
              <div className="body">
                {values.sorted_weekday.map((day, index) => {
                      if(values.work_days.includes(day)==true){
                      return <Scheduledetails day={day} index={values.work_days.indexOf(day)} />
                      }
                })}
              </div>
              </Form.Group>
            </Col>
        ) : null}
        <Col sm={7}>
          <Button variant="primary" type="submit">
            <i className="fa fa-location-arrow" /> Submit
          </Button>
        </Col>
      </ContainerWrapper>
      </form>
    )}
    </Formik>
    </Wrapper>;
  }

  
}


// Object for Data Validation
const required_field = "This field is required"

const validation_var = Yup.string().required(required_field).nullable();



const validationSchema = Yup.object().shape({
  name: validation_var,
  schedule_type: Yup
    .string()
    .min(3)
    .max(255)
    .required('Please Select Schedule Type'),
  std_schedule_details: Yup.array().when('schedule_type', {
        is: 'standard',
        then:   Yup.array().of(
        Yup.object().shape({
          start_time: validation_var,
          end_time: validation_var,
          break_time: validation_var,
        }))
  }),
  flx_schedule_details: Yup.array().when('schedule_type', {
        is: 'flexible',
        then:   Yup.array().of(
        Yup.object().shape({
         start_time: validation_var,
          end_time: validation_var,
          start_flexy_time: validation_var,
          end_flexy_time: validation_var,
          break_time: validation_var,
        }))
  }),
  cst_schedule_details: Yup.array().when('schedule_type', {
        is: 'customize',
        then:   Yup.array().of(
        Yup.object().shape({
         start_time: validation_var,
          end_time: validation_var,
          start_flexy_time: validation_var,
          end_flexy_time: validation_var,
          break_time: validation_var,
        }))
  })
});




const mapStateToProps = (state) => {
    return {
        user : state.user
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      addTemplateSchedule : (post_data) => dispatch( addTemplateSchedule(post_data) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
