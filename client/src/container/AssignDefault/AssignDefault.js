import React, { Component,useState  } from "react";
import PageNotFound from "../PageNotFound";
import { Redirect,Link } from "react-router-dom";
import { Form,Button,Container,Col,InputGroup,FormControl,Tabs,Tab  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { scheduleAssign,getDefaultSchedule,listTemplate,getTemplateSchedule } from '../../store/actions/scheduleActions'
import Formatter from '../../services/Formatter'
import DatePicker from "react-datepicker";
import * as Yup from 'yup';
import "react-datepicker/dist/react-datepicker.css";

import { Scheduledetails, onSelectTimeHandlerStd ,onSelectTimeHandlerFlexi,ScheduleType,Workdays,StandardSchedDetailsForm,FlexibleSchedDetailsForm} from '../../components/Schedule/ScheduleDetails.js';


class AssignDefault extends Component {    
  constructor(props){
    super(props)
  }

  state = { std_schedule_details:[], flx_schedule_details: [] , cst_schedule_details : [] }

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
    values.valid_to = values.to.toISOString().substring(0, 10);
    this.props.scheduleAssign(values)
  }

  loadTemplateSched = (template_id) => {
    this.props.getTemplateSchedule(template_id,'Default');

  }

  componentWillMount(){
    this.props.listTemplate();

    this.props.getDefaultSchedule(this.props.params.userid);
  }

  render = () => {

  if( this.props.page_reloaded ){   
    console.log(this.props);
    var templateList = this.props.template_list;

    var default_schedule = this.props.default_schedule;
    var creation_type = 'customize';
    if(this.props.template_data!=null){
      default_schedule.work_days = this.props.template_data.work_days;
      default_schedule.schedule_policies = this.props.template_data.schedule_policies;
      default_schedule.schedule_details = this.props.template_data.schedule_details;
      default_schedule.schedule_type = this.props.template_data.schedule_type
      creation_type = 'template';
    }

    const from_date = default_schedule.valid_from!==undefined?new Date(default_schedule.valid_from):null;
    const to_date = new Date();
    to_date.setHours( to_date.getHours() + 9 );

    const work_day = default_schedule.work_days!==undefined?default_schedule.work_days:[];

    var allow_late = (default_schedule.schedule_policies?.allow_late!==undefined&&default_schedule.schedule_policies.allow_late==1)?default_schedule.schedule_policies.allow_late:0;
    var allow_undertime = (default_schedule.schedule_policies?.allow_undertime!==undefined&&default_schedule.schedule_policies.allow_undertime==1)?default_schedule.schedule_policies.allow_undertime:0;
    var allow_night_diff = (default_schedule.schedule_policies?.allow_night_diff!==undefined&&default_schedule.schedule_policies.allow_night_diff==1)?default_schedule.schedule_policies.allow_night_diff:0;

    var schedule_policies =  {allow_late : allow_late , allow_undertime : allow_undertime, allow_night_diff: allow_night_diff };
    
    var sched_type = default_schedule.schedule_type;

    var std_schedule_details = [];
    var flx_schedule_details = [];
    var cst_schedule_details = [];

    if(sched_type=='standard'){
      std_schedule_details = [{start_time: new Date("2020-01-01 " + default_schedule.schedule_details.all.start_time), end_time : new Date("2020-01-01 " + default_schedule.schedule_details.all.end_time), break_time:new Date("2020-01-01 " +default_schedule.schedule_details.all.break_time)}];
    }else if(sched_type=='flexible'){
      flx_schedule_details = [{start_time: new Date("2020-01-01 " + default_schedule.schedule_details.all.start_time), end_time : new Date("2020-01-01 " + default_schedule.schedule_details.all.end_time), start_flexy_time: new Date("2020-01-01 " + default_schedule.schedule_details.all.start_flexy_time), end_flexy_time : new Date("2020-01-01 " + default_schedule.schedule_details.all.end_flexy_time), break_time:new Date("2020-01-01 " +default_schedule.schedule_details.all.break_time)}];
    }else if(sched_type=='customize'){
      var index = 0;
      for (var key in default_schedule.schedule_details) {
        var start_time =  new Date("2020-01-01 " + eval('default_schedule.schedule_details.' +key+'.start_time'));
        var end_time = new Date("2020-01-01 " + eval('default_schedule.schedule_details.' +key+'.end_time'));
        var start_flexy_time = new Date("2020-01-01 " + eval('default_schedule.schedule_details.' +key+'.start_flexy_time'));
        var end_flexy_time = new Date("2020-01-01 " + eval('default_schedule.schedule_details.' +key+'.end_flexy_time'));
        var break_time = new Date("2020-01-01 " +  eval('default_schedule.schedule_details.' +key+'.break_time'));
        cst_schedule_details[index] = {start_time: start_time, end_time : end_time, start_flexy_time: start_flexy_time, end_flexy_time : end_flexy_time, break_time: break_time }; 
        index++;
      }
    }

    return <Formik 
    enableReinitialize
    onSubmit={this.onSubmitHandler} 
    validationSchema={validationSchema} 
    initialValues={{
      bind_to:'user', 
      bind_id: this.props.params.userid,
      sorted_weekday:['mon','tue','wed','thu','fri','sat','sun'],
      wd:{mon:{index:null},tue:{index:null},wed:{index:null},thu:{index:null},fri:{index:null},sat:{index:null},sun:{index:null}},
      from : from_date,
      to : to_date,
      std_schedule_details: std_schedule_details,
      flx_schedule_details: flx_schedule_details,
      cst_schedule_details: cst_schedule_details, 
      creation_type : creation_type,
      source_type: 'default',
      schedule_policies : schedule_policies,
      schedule_type : sched_type,
      work_days:work_day 
    }}>{({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
      <form onSubmit={handleSubmit}> 
    <Container> 
    <Col sm={7}>
      <div>
      <Form.Group className="white_bg">
        <div className="header">
          <h1>
            Source Type
          </h1>
        </div>
        <div className="body">
          <label>          
            <input 
              type="radio"
              checked={values.source_type === "default"}
              onChange={() => {
                setFieldValue('source_type', "default")
              }}
            /> 
          Default &nbsp;</label>
          <label>
            <input 
              type="radio"
              checked={values.source_type === "temporary"}
              onChange={() => { 
                setFieldValue('source_type', "temporary")
              }}
            /> 
          Temporary &nbsp;</label>
 
          <Form.Control.Feedback type="invalid">
            &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
            </Form.Control.Feedback>
        </div>
        </Form.Group>
      </div>
    </Col>
    <Col sm={7}>
      <div>
      <Form.Group className="white_bg">
      <div className="header">
        <h1>
            Schedule Scope
        </h1>
      </div>
      <div className="body">
        <Form.Row>
          <Col sm={4}>
          <Form.Label>Date From :</Form.Label>
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
              &nbsp;<ErrorMessage component="div" name="from" className="input-feedback" />
            </Form.Control.Feedback>
            </Col>
            { values.source_type === 'temporary' ? (
            <Col sm={4}>
            <Form.Label>Date To :</Form.Label>
              <DatePicker 
                className="form-control"
                timeIntervals={60}
                timeCaption="Time"
                dateFormat="MMMM d, yyyy"
                timeFormat="MMMM d, yyyy"
                selected={values.to}              
                onChange={date => setFieldValue('to', date)}
              />           
              <Form.Control.Feedback type="invalid">
                &nbsp;<ErrorMessage component="div" name="to" className="input-feedback" />
              </Form.Control.Feedback>
            </Col>
            ) : null}
          </Form.Row>
          </div>
        </Form.Group>
      </div>
    </Col>    
    <Col sm={7}>
      <div>
      <Form.Group className="white_bg">
        <div className="header">
          <h1>
            Creation Type
          </h1>
        </div>
        <div className="body">
          <label>          
            <input 
              type="radio"
              checked={values.creation_type === "customize"}
              onChange={() => {
                setFieldValue('creation_type', "customize")
              }}
            /> 
          Customize &nbsp;</label>
          <label>
            <input 
              type="radio"
              checked={values.creation_type === "template"}
              onChange={() => { 
                setFieldValue('creation_type', "template")
              }}
            /> 
          Template &nbsp;</label>
          <Form.Control.Feedback type="invalid">
            &nbsp;{errors.schedule_type && touched.schedule_type && errors.schedule_type}
            </Form.Control.Feedback>
           { values.creation_type  === "template" ? (<div>
          <Form.Label>Custom Select</Form.Label>
          <Form.Control as="select" onChange={e => this.loadTemplateSched(e.target.value)} >
            <option >Please Select Template</option>
            {templateList.map((day, index) => {
                 return <option value={day.id}>{day.name}</option>;
            })}
          </Form.Control>
            </div>) : null}
        </div>  
        </Form.Group>
      </div>
    </Col>      
    <Col sm={7}>
      <Form.Group className="white_bg">
        <div className="header">
          <h1>
            Schedule Policy
          </h1>
        </div>
        <div className="body">
          <ScheduleType/> 
        </div>
      </Form.Group>
    </Col>
    <Col sm={7}>
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
      </Form.Group>
    </Col>
    <Col sm={7} >
      <Form.Group className="white_bg">
        <div className="header">
          <h1>
            Work Days
          </h1>
        </div>
        <div className="body">
          <Workdays day="mon" />
          <Workdays day="tue" />
          <Workdays day="wed" />
          <Workdays day="thu" />
          <Workdays day="fri" />
          <Workdays day="sat" />
          <Workdays day="sun" />
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
    <Button variant="primary" type="submit">
      Create
    </Button>
  </Container>
  </form>
  )}
 
  </Formik>;
    }
    return <PageNotFound/>;
   
  }
}


// Object for Data Validation
const required_field = "This field is required"

const validation_var = Yup.string().required(required_field).nullable();



const validationSchema = Yup.object().shape({

  from: validation_var,
  to: Yup.string().nullable().when('source_type', {
        is: 'update',
        then:   validation_var
  }),
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
        page_reloaded: state.schedule.isScheduleLoaded,
        template_list : state.schedule.templateList,
        default_schedule : state.schedule.defaultSchedule,
        template_data : state.schedule.templateData,
        
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      listTemplate : () => dispatch( listTemplate() ),
      scheduleAssign : (post_data) => dispatch( scheduleAssign(post_data) ),
      getDefaultSchedule : (employee_id) => dispatch( getDefaultSchedule(employee_id) ),
      getTemplateSchedule : (template_id,type) => dispatch( getTemplateSchedule(template_id,type) ),
    }
  }

export default connect(mapStateToProps, mapDispatchToProps)(AssignDefault);
