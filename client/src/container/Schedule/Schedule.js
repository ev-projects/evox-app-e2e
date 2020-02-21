import React, { Component,useState  } from "react";
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { addTemplateSchedule } from '../../store/actions/scheduleActions'

import Formatter from '../../services/Formatter'
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./Schedule.css";


class Schedule extends Component {    
  state = {}

  onSubmitHandler = (values) => {
    if(values.schedule_type=='standard'){
        var start_time = Formatter.convert_time(values.std_start_time)
        var end_time = Formatter.convert_time(values.std_end_time)
        var break_time =Formatter.convert_time(values.std_break)
        this.setState((state, props) => ({ all : {start_time : start_time,end_time : end_time,break_time : break_time}  }));
        values.schedule_details = this.state;
    }else if (values.schedule_type=='flexible') {
        var start_time = Formatter.convert_time(values.flx_start_time)
        var end_time = Formatter.convert_time(values.flx_end_time)
        var start_flexy_time = Formatter.convert_time(values.flx_start_flexy_time)
        var end_flexy_time = Formatter.convert_time(values.flx_end_flexy_time)
        var break_time = Formatter.convert_time(values.flx_break) 
        this.setState((state, props) => ({ all : {start_time : start_time,end_time : end_time, start_flexy_time : start_flexy_time, end_flexy_time : end_flexy_time, break_time : break_time}  }));
        values.schedule_details = this.state;
    }else if (values.schedule_type=='customize'){
      values.work_days.forEach((day,index) => {
        var start_time = Formatter.convert_time(values.cst_field[index].start_time);
        var end_time = Formatter.convert_time(values.cst_field[index].end_time);
        var start_flexy_time = Formatter.convert_time(values.cst_field[index].start_flexy_time);
        var end_flexy_time = Formatter.convert_time(values.cst_field[index].end_flexy_time);
        var break_time = Formatter.convert_time(values.cst_field[index].break_time);
        this.setState((state, props) => ({ [day] : {start_time : start_time,end_time : end_time, start_flexy_time : start_flexy_time, end_flexy_time : end_flexy_time, break_time : break_time}  }));
      })
      values.schedule_details = this.state;
    }

    this.props.addTemplateSchedule(values)
  }

  render() {
    return <Formik 
    onSubmit={this.onSubmitHandler} 
    validationSchema={validationSchema} 
    initialValues={{wd_index:[{ischeck:false,index:null,day:"mon"},{ischeck:false,index:null,day:"tue"}],wd:{mon:{ischeck:false,index:null},tue:{ischeck:false,index:null},wed:{ischeck:false,index:null},thu:{ischeck:false,index:null},fri:{ischeck:false,index:null},sat:{ischeck:false,index:null},sun:{ischeck:false,index:null},}
    ,cst_field: [],cst_start_time: [],cst_end_time: [], cst_start_flexy_time: [], cst_end_flexy_time: [], flx_break: '',flx_start_time: '',flx_end_time: '' ,flx_start_flexy_time: '',flx_end_flexy_time: '' ,std_break: '',std_start_time: '',std_end_time: '' , name : '',temp_schedule_details: [], source_type: 'template',schedule_policies : {allow_undertime:0, allow_late:0, allow_night_diff:0}, schedule_type : '', work_days: [], duty : [], schedule_details : { all : {start_time:null,end_time:null,break_time:null}, mon:[],tue:[],wed:[],thur: [],fri:[],sat:[],sun:[] } }}>{({values,errors,setFieldValue,touched,handleSubmit,handleChange}) => (
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
     
        <Form.Group>
        <input 
          type="checkbox"
          checked={values.schedule_policies.allow_undertime}
          onChange={() => setFieldValue('schedule_policies.allow_undertime', values.schedule_policies.allow_undertime==0?1:0)}
        />
        <label for="Standard">Undertime &nbsp;</label>
        <input 
          type="checkbox"
          checked={values.schedule_policies.allow_late}
          onChange={() => setFieldValue('schedule_policies.allow_late', values.schedule_policies.allow_late==0?1:0)}
        />
        <label for="Tardiness">Tardiness &nbsp;</label>
        <input 
          type="checkbox"
          checked={values.schedule_policies.allow_night_diff}
          onChange={()  => {
           setFieldValue('schedule_policies.allow_night_diff', values.schedule_policies.allow_night_diff==0?1:0)}}
        />
        <label for="Nightdiff">Night Differential &nbsp;</label>
        </Form.Group>

    </Col>

    <Col sm={7} >
                <div className="header">
                    <h1>
                        Schedule Type
                    </h1>
                </div>

          <input 
            type="radio"
            name="schedule_type"
            value="Standard"
            onChange={() => {
                  setFieldValue('schedule_type', 'standard')
            }}
          />         
        <label for="Standard">Standard &nbsp;</label>

        <input 
          type="radio"
          name="schedule_type"
          value="Flexible" 
          onChange={() => {
                  setFieldValue('schedule_type', 'flexible')
            }}
        />    
        <label for="Flexible">Flexible &nbsp;</label>

        <input 
          type="radio"
          name="schedule_type"
          value="Custom"
          onChange={() => setFieldValue("schedule_type", "customize")}
        />
        <label for="Custom">Custom &nbsp;</label>
        <Form.Control.Feedback type="invalid">
        &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
        </Form.Control.Feedback>
    </Col>
    <Col sm={7} >
                <div className="header">
                    <h1>
                      Work Days
                    </h1>
                </div>
    <Form.Group>
        <FieldArray
      name="cst_field"
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
                      const nextValue = values.work_days.filter(value => value !== "sat");
                      setFieldValue('work_days', nextValue);
                      arrayHelpers.remove(values.wd.sun.index);

                    }else{
                      // ADD
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
                      selected={values.std_start_time}              
                      onChange={date => setFieldValue('std_start_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_start_time" className="input-feedback" />
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
                      selected={values.std_end_time}              
                      onChange={date => setFieldValue('std_end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_end_time" className="input-feedback" />
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
                      selected={values.std_break}              
                      onChange={date => setFieldValue('std_break', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_break" className="input-feedback" />
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
                      selected={values.flx_start_time}              
                      onChange={date => setFieldValue('flx_start_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_start_time" className="input-feedback" />
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
                      selected={values.flx_end_time}              
                      onChange={date => setFieldValue('flx_end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_end_time" className="input-feedback" />
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
                      selected={values.flx_start_flexy_time}              
                      onChange={date => setFieldValue('flx_start_flexy_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_start_flexy_time" className="input-feedback" />
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
                      selected={values.flx_end_flexy_time}              
                      onChange={date => setFieldValue('flx_end_flexy_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_end_flexy_time" className="input-feedback" />
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
                      placeholder="On Duty"
                      selected={values.flx_break}              
                      onChange={date => setFieldValue('flx_break', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_break" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
        </Form.Row>
    </Col>
    ): values.schedule_type === 'customize' ? (
        <Col sm={7} >
            {values.work_days.map((day, index) => (  

            <div>    
              <Scheduledetails day={day} index={index} />
            </div>  
            ))}
            {values.wd_index.map((object, index) => (               
              <div>    
              {object.day}
              </div>  
            ))}
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

function Scheduledetails(props){
    return (<Field>
        {({ field, form }) => (
          <label>
        <div className="header">
            <h1>
              {props.day} Customize Schedule
            </h1>
        </div>
        <Form.Row>

            <Form.Group as={Col} sm={4}>
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
                  selected={field.value.cst_field[props.index].start_time}
                  onChange={date => form.setFieldValue('cst_field['+[props.index]+'].start_time', date)}
                />
              <Form.Control.Feedback type="invalid">
                <Field name={`cst_field.${props.index}.start_time`}>
                    {({
                          meta
                      }) => (
                        <div>
                            {meta.touched && meta.error && (
                                <div className="error">{meta.error}</div>
                            )}
                        </div>
                    )}
                </Field>
              </Form.Control.Feedback>
            </Form.Group>
   


            <Form.Group as={Col} sm={4} >
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
                  selected={field.value.cst_field[props.index].end_time}
                  onChange={date => form.setFieldValue('cst_field['+[props.index]+'].end_time', date)}
                />
              <Form.Control.Feedback type="invalid">
                <Field name={`cst_field.${props.index}.end_time`}>
                    {({
                          meta
                      }) => (
                        <div>
                            {meta.touched && meta.error && (
                                <div className="error">{meta.error}</div>
                            )}
                        </div>
                    )}
                </Field>
              </Form.Control.Feedback>
            </Form.Group>
        </Form.Row>
        <Form.Row>
            <Form.Group as={Col} sm={4} >
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
                  selected={field.value.cst_field[props.index].start_flexy_time}
                  onChange={date => form.setFieldValue('cst_field['+[props.index]+'].start_flexy_time', date)}
                />
                <Form.Control.Feedback type="invalid">
                  <Field name={`cst_field.${props.index}.start_flexy_time`}>
                      {({
                            meta
                        }) => (
                          <div>
                              {meta.touched && meta.error && (
                                  <div className="error">{meta.error}</div>
                              )}
                          </div>
                      )}
                  </Field>
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4}>
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
                  selected={field.value.cst_field[props.index].end_flexy_time}
                  onChange={date => form.setFieldValue('cst_field['+[props.index]+'].end_flexy_time', date)}
                />
              <Form.Control.Feedback type="invalid">
                <Field name={`cst_field.${props.index}.end_flexy_time`}>
                    {({
                          meta
                      }) => (
                        <div>
                            {meta.touched && meta.error && (
                                <div className="error">{meta.error}</div>
                            )}
                        </div>
                    )}
                </Field>
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
                  placeholder="On Duty"
                  selected={field.value.cst_field[props.index].break_time}
                  onChange={date => form.setFieldValue('cst_field['+[props.index]+'].break_time', date)}
                />
              <Form.Control.Feedback type="invalid">
                <Field name={`cst_field.${props.index}.break_time`}>
                    {({
                          meta
                      }) => (
                        <div>
                            {meta.touched && meta.error && (
                                <div className="error">{meta.error}</div>
                            )}
                        </div>
                    )}
                </Field>
              </Form.Control.Feedback>
        </Form.Group>
        </Form.Row>
        </label>
        )}
      </Field>);
}

function Checkbox(props) {
    return (
      <Field name={props.name}>
        {({ field, form }) => (
          <label>
            <input
              type="checkbox"
              checked={field.value.includes(props.value)}
              onChange={() => {
                if (field.value.includes(props.value)) {
                  //remove when uncheck
                  const nextValue = field.value.filter(
                    value => value !== props.value
                  );                

                  form.setFieldValue(props.name, nextValue);
                } else {
                  //Add when check
                  const nextValue = field.value.concat(props.value);
                  form.setFieldValue(props.name, nextValue);
                }
              }}
            />
            {props.value} &nbsp;
          </label>
        )}
      </Field>
    );
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
  std_start_time: Yup.string().when('schedule_type', {
        is: 'standard',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  std_end_time: Yup.string().when('schedule_type', {
        is: 'standard',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  std_break: Yup.string().when('schedule_type', {
        is: 'standard',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  flx_start_time: Yup.string().when('schedule_type', {
        is: 'flexible',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  flx_end_time: Yup.string().when('schedule_type', {
        is: 'flexible',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  flx_start_flexy_time: Yup.string().when('schedule_type', {
        is: 'flexible',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  flx_end_flexy_time: Yup.string().when('schedule_type', {
        is: 'flexible',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  flx_break: Yup.string().when('schedule_type', {
        is: 'flexible',
        then: Yup.string().required(required_field),
        otherwise: Yup.string()
  }),
  cst_field: Yup.array().when('schedule_type', {
        is: 'customize',
        then:   Yup.array().of(
        Yup.object().shape({
          start_time: validation_var,
          end_time: validation_var,
          start_flexy_time: validation_var,
          end_flexy_time: validation_var,
          break_time: validation_var,
        }, ['start_flexy_time', 'end_flexy_time']))
        }),
        otherwise: Yup.string()
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
