import React, { Component,useState  } from "react";
import { Redirect,Link } from "react-router-dom";
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { scheduleAssign,getDefaultSchedule } from '../../store/actions/scheduleActions'
import Formatter from '../../services/Formatter'
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";
import "./AssignDefault.css";

import { Scheduledetails, onSelectTimeHandlerStd ,onSelectTimeHandlerFlexi,ScheduleType,Workdays} from '../../components/Schedule/ScheduleDetails.js';


class AssignDefault extends Component {    
    constructor(props){
      super(props)
    }

  state = {}

  onSubmitHandler = (values) => {
    if(values.schedule_type=='standard'){
        var start_time = Formatter.convert_time(values.std_schedule_details[0].start_time);
        var end_time = Formatter.convert_time(values.std_schedule_details[0].end_time);
        var break_time =Formatter.convert_time(values.std_schedule_details[0].break_time);
        this.setState((state, props) => ({ all : {start_time : start_time,end_time : end_time,break_time : break_time}  }));
    }else if (values.schedule_type=='flexible') {
        var start_time = Formatter.convert_time(values.flx_schedule_details[0].start_time)
        var end_time = Formatter.convert_time(values.flx_schedule_details[0].end_time)
        var start_flexy_time = Formatter.convert_time(values.flx_schedule_details[0].start_flexy_time)
        var end_flexy_time = Formatter.convert_time(values.flx_schedule_details[0].end_flexy_time)
        var break_time = Formatter.convert_time(values.flx_schedule_details[0].break_time) 
        this.setState((state, props) => ({ all : {start_time : start_time,end_time : end_time, start_flexy_time : start_flexy_time, end_flexy_time : end_flexy_time, break_time : break_time}}));
    }else if (values.schedule_type=='customize'){
        values.work_days.forEach((day,index) => {
          var start_time = Formatter.convert_time(values.cst_schedule_details[index].start_time);
          var end_time = Formatter.convert_time(values.cst_schedule_details[index].end_time);
          var start_flexy_time = Formatter.convert_time(values.cst_schedule_details[index].start_flexy_time);
          var end_flexy_time = Formatter.convert_time(values.cst_schedule_details[index].end_flexy_time);
          var break_time = Formatter.convert_time(values.cst_schedule_details[index].break_time);
          this.setState((state, props) => ({ [day] : {start_time : start_time,end_time : end_time, start_flexy_time : start_flexy_time, end_flexy_time : end_flexy_time, break_time : break_time}  }));
        })
    }
    values.schedule_details = this.state;
    values.valid_from = values.from.toISOString().substring(0, 10);
    this.props.scheduleAssign(values)
  }

 
  componentWillMount(){
    this.props.getDefaultSchedule(this.props.params.userId);
  }

  render = () => {

  if( this.props.schedule.isScheduleLoaded ){

    const from_date = this.props.schedule.valid_from!==undefined?new Date(this.props.schedule.valid_from):null;
    const work_day = this.props.schedule.work_days!==undefined?this.props.schedule.work_days:[];

    var allow_late = (this.props.schedule.schedule_policies?.allow_late!==undefined)?this.props.schedule.schedule_policies.allow_late:0;
    var allow_undertime = (this.props.schedule.schedule_policies?.allow_undertime!==undefined)?this.props.schedule.schedule_policies.allow_undertime:0;
    var allow_night_diff = (this.props.schedule.schedule_policies?.allow_night_diff!==undefined)?this.props.schedule.schedule_policies.allow_night_diff:0;

    const schedule_policies = {schedule_policies: {allow_late : allow_late , allow_undertime : allow_undertime, allow_night_diff: allow_night_diff }};
    const sched_type = this.props.schedule.schedule_type;
    
    var std_schedule_details = [];
    var flx_schedule_details = [];
    var cst_schedule_details = [];

    if(sched_type=='standard'){
      std_schedule_details = [{start_time: new Date("2020-01-01 " + this.props.schedule.schedule_details.all.start_time), end_time : new Date("2020-01-01 " + this.props.schedule.schedule_details.all.end_time), break_time:new Date("2020-01-01 " +this.props.schedule.schedule_details.all.break_time)}];
    }else if(sched_type=='flexible'){
      flx_schedule_details = [{start_time: new Date("2020-01-01 " + this.props.schedule.schedule_details.all.start_time), end_time : new Date("2020-01-01 " + this.props.schedule.schedule_details.all.end_time), start_flexy_time: new Date("2020-01-01 " + this.props.schedule.schedule_details.all.start_flexy_time), end_flexy_time : new Date("2020-01-01 " + this.props.schedule.schedule_details.all.end_flexy_time), break_time:new Date("2020-01-01 " +this.props.schedule.schedule_details.all.break_time)}];
    }else if(sched_type=='customize'){
      var index = 0;
      for (var key in this.props.schedule.schedule_details) {
        var start_time =  new Date("2020-01-01 " + eval('this.props.schedule.schedule_details.' +key+'.start_time'));
        var end_time = new Date("2020-01-01 " + eval('this.props.schedule.schedule_details.' +key+'.end_time'));
        var start_flexy_time = new Date("2020-01-01 " + eval('this.props.schedule.schedule_details.' +key+'.start_flexy_time'));
        var end_flexy_time = new Date("2020-01-01 " + eval('this.props.schedule.schedule_details.' +key+'.end_flexy_time'));
        var break_time = new Date("2020-01-01 " +  eval('this.props.schedule.schedule_details.' +key+'.break_time'));
        cst_schedule_details[index] = {start_time: start_time, end_time : end_time, start_flexy_time: start_flexy_time, end_flexy_time : end_flexy_time, break_time: break_time }; 
        index++;
      }
    }
    return <Formik 
    onSubmit={this.onSubmitHandler} 
    validationSchema={validationSchema} 
    initialValues={{
      bind_to:'user', 
      bind_id: this.props.params.userId,
      sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],
      wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}},
      from : from_date,
      std_schedule_details: std_schedule_details,
      flx_schedule_details: flx_schedule_details,
      cst_schedule_details: cst_schedule_details, 
      source_type: 'default',
      schedule_policies : schedule_policies.schedule_policies,
      schedule_type : sched_type,
      work_days:work_day 
    }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
      <form onSubmit={handleSubmit}> 
    <Container> 
    <Col sm={7} >
                <div className="header">
                    <h1>
                        Schedule From 
                    </h1>
                </div>
            <Form.Group as={Col} sm={4} controlId="formGridEmail">
                <DatePicker 
                      className="form-control"
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="MMMM d, yyyy"
                      timeFormat="MMMM d, yyyy"
                      selected={values.from}              
                      onChange={date => setFieldValue('from', date)}
                    />           
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="from" className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
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
        )}
        />
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
        Custom &nbsp;</label>      
      )}
      />  
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
      <Workdays day="mon" />
      <Workdays day="tue" />
      <Workdays day="wed" />
      <Workdays day="thu" />
      <Workdays day="fri" />
      <Workdays day="sat" />
      <Workdays day="sun" />
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
                      selected={values.std_schedule_details[0].start_time}              
                      onChange={(date) => onSelectTimeHandlerStd(date,0,setFieldValue,'std_')}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_schedule_details[0].start_time" className="input-feedback" />
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
                      selected={values.std_schedule_details[0].end_time}                
                      onChange={date => setFieldValue('std_schedule_details[0].end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_schedule_details[0].end_time" className="input-feedback" />
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
                      selected={values.std_schedule_details[0].break_time}                
                      onChange={date => setFieldValue('std_schedule_details[0].break_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_schedule_details[0].break_time" className="input-feedback" />
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
                      selected={values.flx_schedule_details[0].start_time}              
                      onChange={(date) => onSelectTimeHandlerStd(date,0,setFieldValue,'flx_')}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].start_time" className="input-feedback" />
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
                      selected={values.flx_schedule_details[0].end_time}                
                      onChange={date => setFieldValue('flx_schedule_details[0].end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].end_time" className="input-feedback" />
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
                      selected={values.flx_schedule_details[0].start_flexy_time}                
                      onChange={(date) => onSelectTimeHandlerFlexi(date,0,setFieldValue,'flx_')}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].start_flexy_time" className="input-feedback" />
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
                      selected={values.flx_schedule_details[0].end_flexy_time}                
                      onChange={date => setFieldValue('flx_schedule_details[0].end_flexy_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].end_flexy_time" className="input-feedback" />
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
                      selected={values.flx_schedule_details[0].break_time}                
                      onChange={date => setFieldValue('flx_schedule_details[0].break_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].break_time" className="input-feedback" />
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
    return <div>no page found</div>
   
  }
}


// Object for Data Validation
const required_field = "This field is required"

const validation_var = Yup.string().required(required_field).nullable();



const validationSchema = Yup.object().shape({
  from: validation_var,
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
        schedule : state.schedule
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      scheduleAssign : (post_data) => dispatch( scheduleAssign(post_data) ),
      getDefaultSchedule : (employee_id) => dispatch( getDefaultSchedule(employee_id) )
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(AssignDefault);
