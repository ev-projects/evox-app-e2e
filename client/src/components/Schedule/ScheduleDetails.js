import React, { Component } from "react";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import DatePicker from "react-datepicker";

import "./Schedule.css";

var day = {mon:"Monday", tue:"Tuesday", wed : "Wednesday" , thu: "Thursday", fri: "Friday", sat : "Saturday", sun : "Sunday"};

const SchedulePolicy = (props) => {
    return (<Field>
        {({ field, form }) => (
    <div>
        <Form.Group>
        <label>
        <input 
          type="checkbox"
          checked={field.value.schedule_policies.allow_undertime=="1"}
          onChange={() => form.setFieldValue('schedule_policies.allow_undertime', field.value.schedule_policies.allow_undertime==1?0:1 )}
        />

        Undertime &nbsp;</label>
        <label>
        <input 
          type="checkbox"
          checked={field.value.schedule_policies.allow_late=="1"}
          onChange={() => form.setFieldValue('schedule_policies.allow_late', field.value.schedule_policies.allow_late==1?0:1)}
        />
        Tardiness &nbsp;</label>
        <label>
        <input 
          type="checkbox"
          checked={field.value.schedule_policies.allow_night_diff=="1"}
          onChange={()  => {
           form.setFieldValue('schedule_policies.allow_night_diff',field.value.schedule_policies.allow_night_diff==1?0:1)}}
        />
        Night Differential &nbsp;</label>
        </Form.Group>
        </div>
        )}
      </Field>);
}

const WorkDays = (props) => {
    return (<div>   <WorkDay day="mon" />
                    <WorkDay day="tue" />
                    <WorkDay day="wed" />
                    <WorkDay day="thu" />
                    <WorkDay day="fri" />
                    <WorkDay day="sat" />
                    <WorkDay day="sun" /></div>);
}


const WorkDay = (props) => {
    return (<Field>
        {({ field, form }) => (
        <FieldArray
        name="cst_schedule_details"
        render={arrayHelpers => (
          <label>
            <input
              type="checkbox"
              checked={field.value.work_days.includes(props.day)}
              onChange={() => {
                  if(field.value.work_days.includes(props.day)){
                    // REMOVE
                    const nextValue = field.value.work_days.filter(value => value !== props.day);
                    form.setFieldValue('work_days', nextValue);
                    
                    arrayHelpers.remove(eval('field.value.wd.'+props.day+'.index'));
                  }else{
                    // ADD
                    const index = field.value.work_days.length;
                    form.setFieldValue('wd.'+props.day+'.index',index);

                    const nextValue = field.value.work_days.concat(props.day);
                    form.setFieldValue('work_days', nextValue);

                    arrayHelpers.push({break_time : "",start_time : "",end_time : "",start_flexy_time : "",end_flexy_time : "" });
                  }
              }}
            />
            {eval('day.'+props.day)} &nbsp;
            </label>
            )}
    />
        )}
      </Field>);
}



const StandardSchedDetailsForm = (props) => {
   return (<Field>
        {({ field, form }) => (
          <div>
          <Form.Row>
            <Col sm={4}>
              <Form.Label>On Duty :</Form.Label>
              <DatePicker 
                    className="form-control"
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={60}
                    timeCaption="Time"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm"
                    selected={field.value.std_schedule_details[0].start_time}              
                    onChange={(date) => onSelectTimeHandlerStd(date,0,form.setFieldValue,'std_')}
                  />
              <Form.Control.Feedback type="invalid">
                <ErrorMessage component="div" name="std_schedule_details[0].start_time" className="input-feedback" />
              </Form.Control.Feedback>
            </Col>
            <Col sm={4}>
            <Form.Label>Off Duty :</Form.Label>
                <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      selected={field.value.std_schedule_details[0].end_time}                
                      onChange={date => form.setFieldValue('std_schedule_details[0].end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_schedule_details[0].end_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>
            <Col sm={4}>
            <Form.Label>Break :</Form.Label>
                <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Break"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      selected={field.value.std_schedule_details[0].break_time}                
                      onChange={date => form.setFieldValue('std_schedule_details[0].break_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="std_schedule_details[0].break_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>
            </Form.Row>
          </div>
        )}
      </Field>);
}

const FlexibleSchedDetailsForm = (props) => {
   return (<Field>
        {({ field, form }) => (
          <div>
          <Form.Row>
            <Col sm={4}>
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
                      selected={field.value.flx_schedule_details[0].start_time}              
                      onChange={(date) => onSelectTimeHandlerStd(date,0,form.setFieldValue,'flx_')}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].start_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>

            <Col sm={4}>
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
                      selected={field.value.flx_schedule_details[0].end_time}                
                      onChange={date => form.setFieldValue('flx_schedule_details[0].end_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].end_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>
        </Form.Row>

        <Form.Row>
            <Col sm={4}>
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
                      selected={field.value.flx_schedule_details[0].start_flexy_time}                
                      onChange={(date) => onSelectTimeHandlerFlexi(date,0,form.setFieldValue,'flx_')}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].start_flexy_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>

            <Col sm={4}>
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
                      selected={field.value.flx_schedule_details[0].end_flexy_time}                
                      onChange={date => form.setFieldValue('flx_schedule_details[0].end_flexy_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].end_flexy_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>

            <Col sm={4}>
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
                      selected={field.value.flx_schedule_details[0].break_time}                
                      onChange={date => form.setFieldValue('flx_schedule_details[0].break_time', date)}
                    />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name="flx_schedule_details[0].break_time" className="input-feedback" />
                </Form.Control.Feedback>
            </Col>
        </Form.Row>
          </div>
        )}
      </Field>);
}

const Scheduledetails = (props) => {
    return (<Field>
        {({ field, form }) => (
          <div className="stripe">
          <Form.Label>{eval('day.'+props.day)} :</Form.Label>
        <Form.Row>
            <Form.Group as={Col} sm={4}>
                <h6>On Duty</h6>
                <DatePicker 
                  className="form-control"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={60}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholder="On Duty"
                  selected={field.value.cst_schedule_details[props.index].start_time}              
                  onChange={(date) => onSelectTimeHandlerStd(date,props.index,form.setFieldValue,'cst_')}
                />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={`cst_schedule_details.${props.index}.start_time`}className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>
            <Form.Group as={Col} sm={4} >
                <h6>Off Duty</h6>
                <DatePicker 
                  className="form-control"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={60}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholder="On Duty"
                  selected={field.value.cst_schedule_details[props.index].end_time}              
                  onChange={date => form.setFieldValue('cst_schedule_details['+props.index+'].end_time', date)}
                />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={`cst_schedule_details.${props.index}.end_time`}className="input-feedback"/>
                </Form.Control.Feedback>
            </Form.Group>
        </Form.Row>
        <Form.Row>
            <Form.Group as={Col} sm={4} >
            <h6>Flexi Start</h6>
                <DatePicker 
                  className="form-control"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={60}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholder="On Duty"
                  selected={field.value.cst_schedule_details[props.index].start_flexy_time}              
                  onChange={(date) => onSelectTimeHandlerFlexi(date,props.index,form.setFieldValue,'cst_')}
                />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={`cst_schedule_details.${props.index}.start_flexy_time`}className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4}>
            <h6>Flexi End </h6>
                <DatePicker 
                  className="form-control"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={60}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholder="On Duty"
                  selected={field.value.cst_schedule_details[props.index].end_flexy_time}              
                  onChange={date => form.setFieldValue('cst_schedule_details['+props.index+'].end_flexy_time', date)}
                />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={`cst_schedule_details.${props.index}.end_flexy_time`}className="input-feedback" />
                </Form.Control.Feedback>
            </Form.Group>

            <Form.Group as={Col} sm={4}>
            <h6>Break </h6>
                <DatePicker 
                  className="form-control"
                  showTimeSelect
                  showTimeSelectOnly
                  timeIntervals={60}
                  timeCaption="Time"
                  dateFormat="HH:mm"
                  timeFormat="HH:mm"
                  placeholder="On Duty"
                  selected={field.value.cst_schedule_details[props.index].break_time}              
                  onChange={date => form.setFieldValue('cst_schedule_details['+props.index+'].break_time', date)}
                />
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={`cst_schedule_details.${props.index}.break_time`}className="input-feedback" />
                </Form.Control.Feedback>
        </Form.Group>
        </Form.Row>
        </div>
        )}
      </Field>);
}

  const onSelectTimeHandlerStd = (data, index,setFieldValue,sched_type) => {
    
    if(data!==null){
      var onDuty = data;
      var offDuty = new Date(); 
      var breakTime = new Date(); 

      breakTime.setMinutes(0); 
      breakTime.setHours(1)

      offDuty.setMinutes(onDuty.getMinutes()); 
      offDuty.setHours( onDuty.getHours() + 9 ); 

      setFieldValue(sched_type + 'schedule_details['+index+'].start_time', onDuty); 
      setFieldValue(sched_type + 'schedule_details['+index+'].end_time',offDuty); 
      setFieldValue(sched_type + 'schedule_details['+index+'].start_flexy_time', onDuty); 
      setFieldValue(sched_type + 'schedule_details['+index+'].end_flexy_time',offDuty); 
      setFieldValue(sched_type + 'schedule_details['+index+'].break_time',breakTime); 
    }else{
      setFieldValue(sched_type + 'schedule_details['+index+'].start_time', null); 
    }

  };

   const onSelectTimeHandlerFlexi = (data, index,setFieldValue,sched_type) => {
    if(data!==null){
      var onDuty = data;
      var offDuty = new Date(); 

      offDuty.setMinutes(onDuty.getMinutes()); 
      offDuty.setHours( onDuty.getHours() + 9 ); 

      setFieldValue(sched_type + 'schedule_details['+index+']start_flexy_time', onDuty); 
      setFieldValue(sched_type +  'schedule_details['+index+']end_flexy_time',offDuty); 
    }else{
      setFieldValue(sched_type + 'schedule_details['+index+'].start_flexy_time', null); 
    }

  };




export {
  Scheduledetails,
  onSelectTimeHandlerStd,
  onSelectTimeHandlerFlexi,
  StandardSchedDetailsForm,
  FlexibleSchedDetailsForm,
  SchedulePolicy,
  WorkDays
}