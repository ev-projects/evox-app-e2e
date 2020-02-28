import React, { Component,useState  } from "react";
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { addTemplateSchedule } from '../../store/actions/scheduleActions'
import moment from "moment";
import Formatter from '../../services/Formatter'
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./Schedule.css";

import { Scheduledetails, onSelectTimeHandlerStd ,onSelectTimeHandlerFlexi,ScheduleType} from './ScheduleDetails.js';


class Schedule extends Component {    
  state = {}
  d = new Date()

  onSubmitHandler = (values) => {
    if(values.schedule_type=='standard'){

    }else if (values.schedule_type=='flexible') {

    }else if (values.schedule_type=='customize'){

    }
    this.props.addTemplateSchedule(values)
  }



  render() {
    return <Formik 
    onSubmit={this.onSubmitHandler} 
    validationSchema={validationSchema} 
    initialValues={{sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}}
    ,name : '',temp_schedule_details: [], source_type: 'template',schedule_policies : {allow_undertime:0, allow_late:0, allow_night_diff:0}, schedule_type : '', work_days: [],schedule_details : { all : {start_time:null,end_time:null,break_time:null} } }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleChange}) => (
      <form onSubmit={handleSubmit}> 
    <Container> 
    <Col sm={7} >
                <div className="header">
                    <h1>
                        Schedule Template
                    </h1>
                </div>
    <InputGroup>
        <FormControl variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
        <Form.Control.Feedback type="invalid">
        &nbsp;{errors.name && touched.name && errors.name}
        </Form.Control.Feedback>
    </InputGroup> 
    </Col>          
    <Col sm={7}>
        <div className="header">
            <h1>
                Schedule Policy
            </h1>
        </div>
    <Form.Row></Form.Row>
      <ScheduleType/>
    </Col>

    <Col sm={7} >
                <div className="header">
                    <h1>
                        Schedule Type
                    </h1>
                </div>
      <FieldArray name="temp_schedule_details" render={arrayHelpers => (
          <div>
          <label>          
          <input 
            type="radio"
            name="schedule_type"
            onChange={() => {
              setFieldValue('schedule_type', 'standard')
              for (var i = 0; i < values.temp_schedule_details.length; i++) {
                arrayHelpers.remove(i);
              }
              arrayHelpers.push({break_time : "",start_time : "",end_time : ""})
            }}
          /> 
        Standard &nbsp;</label>
        <label>
          <input 
            type="radio"
            name="schedule_type"
            onChange={() => { 
              setFieldValue('schedule_type', 'flexible');
              for (var i = 0; i < values.temp_schedule_details.length; i++) {
                arrayHelpers.remove(i);
              }
               arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" })
            }}
          /> 
        Flexible &nbsp;</label>
        <label>
          <input 
            type="radio"
            name="schedule_type"
            onChange={() => {
              setFieldValue('schedule_type', 'customize')
              for (var i = 0; i < values.temp_schedule_details.length; i++) {
                arrayHelpers.remove(i);
              }
              for (var i = 0; i < values.work_days.length; i++) {
                arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" })
              }
            }}
          /> 
        Custom &nbsp;</label>
        <Form.Control.Feedback type="invalid">
        &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
        </Form.Control.Feedback>
            </div>
            )}
    />
    </Col>
    <Col sm={7} >
                <div className="header">
                    <h1>
                      Work Days
                    </h1>
                </div>
    <Form.Group>
      <FieldArray
        name="temp_schedule_details"
        render={arrayHelpers => (
        <div>
          <label>
            <input
              type="checkbox"
              checked={values.wd.mon.ischeck}
              onChange={() => {
                  setFieldValue('wd.mon.ischeck', !values.wd.mon.ischeck)
                  if(values.wd.mon.ischeck){
                    // REMOVE
                    const nextValue = values.work_days.filter(value => value !== "mon");
                    setFieldValue('work_days', nextValue);

                    arrayHelpers.remove(values.wd.mon.index);
                  }else{
                    // ADD
                    const index = values.work_days.length;
                    setFieldValue('values.wd.mon.index',index);

                    const nextValue = values.work_days.concat("mon");
                    setFieldValue('work_days', nextValue);

                    arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                  }
              }}
            />
            Monday &nbsp;
            </label>
            <label>
              <input
                type="checkbox"
                checked={values.wd.tue.ischeck}
                onChange={() => {
                    setFieldValue('wd.tue.ischeck', !values.wd.tue.ischeck)

                    if(values.wd.tue.ischeck){
                      // REMOVE
                      const nextValue = values.work_days.filter(value => value !== "tue");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.remove(values.wd.tue.index);
                    }else{
                      // ADD
                      const index = values.work_days.length;
                      setFieldValue('values.wd.tue.index',index);

                      const nextValue = values.work_days.concat("tue");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                    }
                }}
              />
              Tuesday &nbsp;
            </label>
            <label>
              <input
                type="checkbox"
                checked={values.wd.wed.ischeck}
                onChange={() => {
                    setFieldValue('wd.wed.ischeck', !values.wd.wed.ischeck)

                    if(values.wd.wed.ischeck){
                      // REMOVE
                      const nextValue = values.work_days.filter(value => value !== "wed");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.remove(values.wd.wed.index);
                    }else{
                      // ADD
                      const index = values.work_days.length;
                      setFieldValue('values.wd.wed.index',index);

                      const nextValue = values.work_days.concat("wed");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                    }
                }}
              />
              Wednesday &nbsp;
            </label>
            <label>
              <input
                type="checkbox"
                checked={values.wd.thu.ischeck}
                onChange={() => {
                    setFieldValue('wd.thu.ischeck', !values.wd.thu.ischeck)

                    if(values.wd.thu.ischeck){
                      // REMOVE
                      const nextValue = values.work_days.filter(value => value !== "thu");
                      setFieldValue('work_days', nextValue);
                      
                      arrayHelpers.remove(values.wd.thu.index);
                    }else{
                      // ADD
                      const index = values.work_days.length;
                      setFieldValue('values.wd.thu.index',index);

                      const nextValue = values.work_days.concat("thu");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                    }
                }}
              />
              Thursday &nbsp;
            </label>
            <label>
              <input
                type="checkbox"
                checked={values.wd.fri.ischeck}
                onChange={() => {
                    setFieldValue('wd.fri.ischeck', !values.wd.fri.ischeck)
                    if(values.wd.fri.ischeck){
                      // REMOVE
                      const nextValue = values.work_days.filter(value => value !== "fri");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.remove(values.wd.fri.index);
                    }else{
                      // ADD
                      const index = values.work_days.length;
                      setFieldValue('values.wd.fri.index',index);

                      const nextValue = values.work_days.concat("fri");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                    }
                }}
              />
              Friday &nbsp;
            </label>
            <label>
              <input
                type="checkbox"
                checked={values.wd.sat.ischeck}
                onChange={() => {
                    setFieldValue('wd.sat.ischeck', !values.wd.sat.ischeck)
                    if(values.wd.sat.ischeck){
                      // REMOVE
                      const nextValue = values.work_days.filter(value => value !== "sat");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.remove(values.wd.sat.index);
                    }else{
                      // ADD
                      const index = values.work_days.length;
                      setFieldValue('values.wd.sat.index',index);

                      const nextValue = values.work_days.concat("sat");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                    }
                }}
              />
              Saturday &nbsp;
            </label>
            <label>
              <input
                type="checkbox"
                checked={values.wd.sun.ischeck}
                onChange={() => {
                    setFieldValue('wd.sun.ischeck', !values.wd.sun.ischeck)
                    if(values.wd.sun.ischeck){
                      // REMOVE
                      const nextValue = values.work_days.filter(value => value !== "sun");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.remove(values.wd.sun.index);
                    }else{
                      // ADD
                      const index = values.work_days.length;
                      setFieldValue('values.wd.sun.index',index);

                      const nextValue = values.work_days.concat("sun");
                      setFieldValue('work_days', nextValue);

                      arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                    }
                }}
              />
              Sunday &nbsp;
            </label>
            </div>
            )}
    />
    </Form.Group>
    </Col>
            
    { values.schedule_type  === '' ? (
       null
    ) : values.schedule_type  === 'standard' ? ( 
    <Col sm={7} >
        <div className="header">
            <h1>
              Standard Form
            </h1>
        </div>
        <Form.Row>
            <Form.Group as={Col} sm={4} controlId="formGridEmail">
            <Form.Label>On Duty :</Form.Label>
                <DatePicker 
                      className="form-control"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      selected={values.temp_schedule_details[0].start_time}              
                      onChange={(date) => onSelectTimeHandlerStd(date,0,setFieldValue)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].start_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4} controlId="formGridPassword">
            <Form.Label>Off Duty :</Form.Label>
                <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      selected={values.temp_schedule_details[0].end_time}                
                      onChange={date => setFieldValue('temp_schedule_details[0].end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].end_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
           <Form.Group as={Col} sm={4} controlId="formGridPassword">
            <Form.Label>Break :</Form.Label>
                <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Break"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      selected={values.temp_schedule_details[0].break_time}                
                      onChange={date => setFieldValue('temp_schedule_details[0].break_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].break_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
        </Form.Row>
    </Col>
    ) : values.schedule_type=== 'flexible' ? (
    <Col sm={7} >
        <div className="header">
            <h1>
              Flexible Form
            </h1>
        </div>
        <Form.Row>
            <Form.Group as={Col} sm={4} controlId="formGridEmail">
                <Form.Label>On Duty :</Form.Label>
                <DatePicker 
                      className="form-control"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      placeholder="On Duty"
                      selected={values.temp_schedule_details[0].start_time}              
                      onChange={(date) => onSelectTimeHandlerStd(date,0,setFieldValue)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].start_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4} controlId="formGridPassword">
                <Form.Label>Off Duty :</Form.Label>
                <DatePicker 
                      className="form-control"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      placeholder="On Duty"
                      selected={values.temp_schedule_details[0].end_time}                
                      onChange={(date) => setFieldValue('temp_schedule_details[0].end_time',setFieldValue)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].end_flexy_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
        </Form.Row>

        <Form.Row>
            <Form.Group as={Col} sm={4} controlId="formGridEmail">
                <Form.Label>Flexi Start :</Form.Label>
                    <DatePicker 
                      className="form-control"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      placeholder="On Duty"
                      selected={values.temp_schedule_details[0].start_flexy_time}                
                      onChange={(date) => onSelectTimeHandlerFlexi(date,0,setFieldValue)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].start_flexy_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4} controlId="formGridPassword">
                <Form.Label>Flexi End :</Form.Label>
                    <DatePicker 
                      className="form-control"
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      placeholder="On Duty"
                      selected={values.temp_schedule_details[0].end_flexy_time}                
                      onChange={date => setFieldValue('temp_schedule_details[0].end_flexy_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].end_flexy_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4} controlId="formGridPassword">
                <Form.Label>Break :</Form.Label>
                    <DatePicker 
                      className="form-control"
                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm"
                      placeholder="Break"
                      selected={values.temp_schedule_details[0].break_time}                
                      onChange={date => setFieldValue('temp_schedule_details[0].break_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="temp_schedule_details[0].break_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
        </Form.Row>
    </Col>
    ): values.schedule_type === 'customize' ? (
        <Col sm={7} >
            {values.sorted_weekday.map((day, index) => {
                  if(values.work_days.includes(day)==true){
                  return <Scheduledetails day={day} index={values.work_days.indexOf(day)} />
                  }
            })}
        </Col>
     ) : null}
    <Button variant="primary" type="submit">
      Create
    </Button>
  </Container>
  </form>
  )}
 
  </Formik>;
  }
}


// Object for Data Validation
const required_field = "This field is required"

const validation_var = Yup.string().required(required_field).nullable();



const validationSchema = Yup.object().shape({
  name: Yup
    .string()
    .min(3)
    .max(255)
    .required(required_field),
  schedule_type: Yup
    .string()
    .min(3)
    .max(255)
    .required('Please Select Schedule Type'),
  temp_schedule_details: Yup.array().when('schedule_type', {
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
        otherwise: Yup.array().of(
        Yup.object().shape({
          start_time: validation_var,
          end_time: validation_var,
          break_time: validation_var,
        }))
  });




const mapStateToProps = (state) => {
    return {
        user : state.user
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      addTemplateSchedule : (post_data) => dispatch( addTemplateSchedule(post_data) )
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
