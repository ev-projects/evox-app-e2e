import React, { Component,useState  } from "react";
import { Redirect } from "react-router-dom";
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";

import { updateSchedule, getTemplateSchedule } from '../../../store/actions/scheduleActions'
import Formatter from '../../../services/Formatter'
import { Scheduledetails, onSelectTimeHandlerStd, onSelectTimeHandlerFlexi, SchedulePolicy, WorkDays, StandardSchedDetailsForm,FlexibleSchedDetailsForm, ScheduleHolidayPolicy} from '../../../components/Schedule/ScheduleDetails.js';
import { ContainerWrapper } from '../../../components/GridComponent/AdminLte.js';

import PageLoading from "../../PageLoading";
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";

class Schedule extends Component {    
  state = {}

  onSubmitHandler = (values) => {
    // Format the data that will be past on the API
    values.schedule_details = Formatter.format_schedule_details(values);
    this.props.updateSchedule(values,this.props.params.templateid)
  }


  componentWillMount(){
    this.props.getTemplateSchedule(this.props.params.templateid,'Template');
  }

  render = () => {
  if(this.props.template.isScheduleLoaded){

    const name = this.props.template.name;
    const sched_type = this.props.template.schedule_type;
    const work_days = this.props.template.work_days;

    var schedule_policies =  {
      allow_late :            ( Validator.isNumeric(this.props.template?.schedule_policies?.allow_late ) ? parseInt(this.props.template.schedule_policies.allow_late) : 0),
      allow_undertime :       ( Validator.isNumeric(this.props.template?.schedule_policies?.allow_undertime ) ? parseInt(this.props.template.schedule_policies.allow_undertime) : 0),
      allow_night_diff :      ( Validator.isNumeric(this.props.template?.schedule_policies?.allow_night_diff ) ? parseInt(this.props.template.schedule_policies.allow_night_diff) : 0),
      allow_special_holiday : ( Validator.isNumeric(this.props.template?.schedule_policies?.allow_special_holiday ) ? parseInt(this.props.template.schedule_policies.allow_special_holiday) : 1),
      allow_legal_holiday :   ( Validator.isNumeric(this.props.template?.schedule_policies?.allow_legal_holiday ) ? parseInt(this.props.template.schedule_policies.allow_legal_holiday) : 1)
    };
    
    var std_schedule_details = [];
    var flx_schedule_details = [];
    var cst_schedule_details = [];

    if(sched_type=='standard'){
      std_schedule_details = [{start_time: new Date("2020-01-01 " + this.props.template.schedule_details.all.start_time), end_time : new Date("2020-01-01 " + this.props.template.schedule_details.all.end_time), break_time:new Date("2020-01-01 " +this.props.template.schedule_details.all.break_time)}];
    }else if(sched_type=='flexible'){
      flx_schedule_details = [{start_time: new Date("2020-01-01 " + this.props.template.schedule_details.all.start_time), end_time : new Date("2020-01-01 " + this.props.template.schedule_details.all.end_time), start_flexy_time: new Date("2020-01-01 " + this.props.template.schedule_details.all.start_flexy_time), end_flexy_time : new Date("2020-01-01 " + this.props.template.schedule_details.all.end_flexy_time), break_time:new Date("2020-01-01 " +this.props.template.schedule_details.all.break_time)}];
    }else if(sched_type=='customize'){
      var index = 0;
      for (var key in this.props.template.schedule_details) {
        var start_time        =  new Date("2020-01-01 " + eval('this.props.template.schedule_details.' +key+'.start_time'));
        var end_time          =  new Date("2020-01-01 " + eval('this.props.template.schedule_details.' +key+'.end_time'));
        var start_flexy_time  =  new Date("2020-01-01 " + eval('this.props.template.schedule_details.' +key+'.start_flexy_time'));
        var end_flexy_time    =  new Date("2020-01-01 " + eval('this.props.template.schedule_details.' +key+'.end_flexy_time'));
        var break_time        =  new Date("2020-01-01 " + eval('this.props.template.schedule_details.' +key+'.break_time'));
        cst_schedule_details[index] = {start_time: start_time, end_time : end_time, start_flexy_time: start_flexy_time, end_flexy_time : end_flexy_time, break_time: break_time }; 
        index++;
      }
    }

    return <Wrapper {...this.props} >
    <Formik 
      onSubmit={this.onSubmitHandler} 
      validationSchema={validationSchema} 
      initialValues={{
        sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],
        wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}},
        name : name,
        std_schedule_details: std_schedule_details,
        flx_schedule_details: flx_schedule_details,
        cst_schedule_details: cst_schedule_details, 
        source_type: 'template',
        schedule_policies : schedule_policies,
        schedule_type : sched_type, 
        work_days: work_days 
      }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
    <form onSubmit={handleSubmit}> 
      <ContainerWrapper> 
      <Col sm={7} >
        <Form.Group className="white_bg">
          <div className="header">
            <h4>
              Schedule Template
            </h4>
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
            <h4>
              Holiday Policy
            </h4>
          </div>
          <div className="body">
            <ScheduleHolidayPolicy/> 
          </div>
        </Form.Group>
      </Col>            
      <Col sm={7}>
        <Form.Group className="white_bg">
          <div className="header">
            <h4>
              Schedule Policy
            </h4>
          </div>
          <div className="body">
            <SchedulePolicy/> 
          </div>
        </Form.Group>
      </Col>
      <Col sm={7} >
        <Form.Group className="white_bg">
          <div className="header">
            <h4>
              Schedule Type
            </h4>
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
        </Form.Group>    </Col>
      <Col sm={7} >
        <Form.Group className="white_bg">
          <div className="header">
            <h4>
              Work Days
            </h4>
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
                <h4>
                  Standard Form
                </h4>
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
                <h4>
                  Flexible Form
                </h4>
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
              <h4>
                Customize Schedule
              </h4>
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
          <i className="fa fa-edit" /> Update
        </Button>&nbsp; 
        <BackButton {...this.props}/>
      </Col>
    </ContainerWrapper>
    </form>
  )}
  </Formik>
  </Wrapper>;
  }

  return <PageLoading/>;
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
        template : state.schedule
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      updateSchedule : (post_data,sched_id) => dispatch( updateSchedule(post_data,sched_id) ),
      getTemplateSchedule : (template_id,type) => dispatch( getTemplateSchedule(template_id,type) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(Schedule);
