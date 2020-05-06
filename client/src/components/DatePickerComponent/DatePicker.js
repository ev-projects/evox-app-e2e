import React, { Component } from "react"; 

import { Form  } from 'react-bootstrap';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';

import "react-datepicker/dist/react-datepicker.css";
import DatePicker from "react-datepicker";

/** This is component for Time Picker */
const InputTime = (props) => {
  
  if(props.name=="on_duty"){
    return(<Field>
        {({ field, form }) => (
                <span>
                  <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      selected={ eval('field.value.' + props.name)}              
                      onChange={date => onSelectTimeHandlerStd(date,form.setFieldValue)}
                  /> 
                  <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name={props.name} className="input-feedback" />
                  </Form.Control.Feedback> 
                </span>)}
      </Field>
          );
  }

      return(<Field>
        {({ field, form }) => (
                <span>
                  <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      selected={ eval('field.value.' + props.name)}              
                      onChange={date => form.setFieldValue(props.name, date)}
                  /> 
                  <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name={props.name} className="input-feedback" />
                  </Form.Control.Feedback> 
                </span>)}
      </Field>
          );


}



/** This is component for Date */
const InputDate = (props) => {
    return(<Field>
        {({ field, form }) => (
                <div>
                  <DatePicker 
                      className="form-control"                      
                      showDateSelect
                      showDateSelectOnly
                      timeCaption="Time"
                      dateFormat="MMMM d, yyyy"
                      timeFormat="MMMM d, yyyy"
                      selected={ eval('field.value.' + props.name)}              
                      onChange={date => form.setFieldValue(props.name, date)}
                  /> 
                  <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name={props.name} className="input-feedback" />
                  </Form.Control.Feedback> 
                </div>)}
      </Field>
          );
}
    

  const onSelectTimeHandlerStd = (data, setFieldValue) => {
    if(data!==null){
        var onDuty = data;
        var offDuty = new Date(); 
        var breakTime = new Date(); 

        breakTime.setMinutes(0); 
        breakTime.setHours(1)

        offDuty.setMinutes(onDuty.getMinutes()); 
        offDuty.setHours( onDuty.getHours() + 9 ); 

    setFieldValue('on_duty', onDuty)
    setFieldValue('off_duty', offDuty)
    setFieldValue('break', breakTime)
    }else{
        setFieldValue('on_duty', null) 
    }

  };


export {
  InputDate,
  InputTime
}