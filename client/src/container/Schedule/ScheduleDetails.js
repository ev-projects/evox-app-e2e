import React, { Component } from "react";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import { Form,Button,Container,Col,InputGroup,FormControl  } from 'react-bootstrap';
import DatePicker from "react-datepicker";



const ScheduleType = (props) => {
    return (<Field>
        {({ field, form }) => (
    <div>
        <Form.Group>
        <label>
        <input 
          type="checkbox"
          checked={field.value.schedule_policies.allow_undertime}
          onChange={() => form.setFieldValue('schedule_policies.allow_undertime', !field.value.schedule_policies.allow_undertime)}
        />
        Undertime &nbsp;</label>
        <label>
        <input 
          type="checkbox"
          checked={field.value.schedule_policies.allow_late}
          onChange={() => form.setFieldValue('schedule_policies.allow_late', !field.value.schedule_policies.allow_late)}
        />
        Tardiness &nbsp;</label>
        <label>
        <input 
          type="checkbox"
          checked={field.value.schedule_policies.allow_night_diff}
          onChange={()  => {
           form.setFieldValue('schedule_policies.allow_night_diff', !field.value.schedule_policies.allow_night_diff)}}
        />
        Night Differential &nbsp;</label>
        </Form.Group>
        </div>
        )}
      </Field>);
}



const Scheduledetails = (props) => {
    return (<Field>
        {({ field, form }) => (
          <div>
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
                  selected={field.value.temp_schedule_details[props.index].start_time}              
                  onChange={(date) => onSelectTimeHandlerStd(date,props.index,form.setFieldValue)}
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
                  selected={field.value.temp_schedule_details[props.index].end_time}              
                  onChange={(date) => form.setFieldValue(date,props.index,form.setFieldValue)}
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
                  selected={field.value.temp_schedule_details[props.index].start_flexy_time}              
                  onChange={(date) => onSelectTimeHandlerFlexi(date,props.index,form.setFieldValue)}
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
                  selected={field.value.temp_schedule_details[props.index].end_flexy_time}              
                  onChange={(date) => form.setFieldValue(date,props.index,form.setFieldValue)}
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
                  selected={field.value.temp_schedule_details[props.index].break_time}              
                  onChange={(date) => form.setFieldValue(date,props.index,form.setFieldValue)}
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
        </div>
        )}
      </Field>);
}

  const onSelectTimeHandlerStd = (data, index,setFieldValue) => {
    var onDuty = data;
    var offDuty = new Date(); 
    var breakTime = new Date(); 

    breakTime.setMinutes(0); 
    breakTime.setHours(1)

    offDuty.setMinutes(onDuty.getMinutes()); 
    offDuty.setHours( onDuty.getHours() + 9 ); 

    setFieldValue('temp_schedule_details['+index+'].start_time', onDuty); 
    setFieldValue('temp_schedule_details['+index+'].end_time',offDuty); 
    setFieldValue('temp_schedule_details['+index+'].start_flexy_time', onDuty); 
    setFieldValue('temp_schedule_details['+index+'].end_flexy_time',offDuty); 
    setFieldValue('temp_schedule_details['+index+'].break_time',breakTime); 
  };

   const onSelectTimeHandlerFlexi = (data, index,setFieldValue) => {
    var onDuty = data;
    var offDuty = new Date(); 

    offDuty.setMinutes(onDuty.getMinutes()); 
    offDuty.setHours( onDuty.getHours() + 9 ); 

    setFieldValue('temp_schedule_details['+index+'].start_flexy_time', onDuty); 
    setFieldValue('temp_schedule_details['+index+'].end_flexy_time',offDuty); 
  };


export {
  Scheduledetails,
  onSelectTimeHandlerStd,
  onSelectTimeHandlerFlexi,
  ScheduleType
}