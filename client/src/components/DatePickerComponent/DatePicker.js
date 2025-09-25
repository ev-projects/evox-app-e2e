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

  if(props.type=="overtime"){
    const event = new Date();

    return(<Field>
      {({ field, form }) => (
              <span>
                <DatePicker 
                    className="form-control"                      
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={30}
                    timeCaption="Time"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm" 
                    minTime={event.setHours(0,30,0)}
                    maxTime={event.setHours( 8)}
                    selected={ eval('field.value.' + props.name)?eval('field.value.' + props.name):event.setHours(1,0,0,0) }              
                    onChange={date => form.setFieldValue(props.name, date)}
                /> 
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={props.name} className="input-feedback" />
                </Form.Control.Feedback> 
              </span>)}
    </Field>
          );
  }

  if(props.type=="break_time"){
    const event = new Date();

    return(<Field>
      {({ field, form }) => (
              <span>
                <DatePicker 
                    className="form-control"                      
                    showTimeSelect
                    showTimeSelectOnly
                    timeIntervals={30}
                    timeCaption="Time"
                    dateFormat="HH:mm"
                    timeFormat="HH:mm" 
                    minTime={event.setHours(0,0)}
                    maxTime={event.setHours( 1)}
                    selected={ eval('field.value.' + props.name)?eval('field.value.' + props.name):event.setHours(1,0,0) }              
                    onChange={date => form.setFieldValue(props.name, date)}
                /> 
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={props.name} className="input-feedback" />
                </Form.Control.Feedback> 
              </span>)}
    </Field>
          );
  }
  if(props.contrast_too!=null){
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
                    onChange={date => {form.setFieldValue(props.name, date);
                       onSelectTimeHandlerRestDay(date,form.setFieldValue,props.contrast_too,props.offset_data)}}
                    disabled={props.isDisabled}
                /> 
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={props.name} className="input-feedback" />
                </Form.Control.Feedback> 
              </span>)}
    </Field>
        );
  }

  if(props.type=="indexing"){
    const event = new Date();
    // console.log(event);
    return(<Field>
    
      {({ field, form }) => (
              <span>
                  {/* {console.log(field.value,field.value.new_punch)} */}
                 <DatePicker 
                      className="form-control"                      
                      showTimeSelect
                      showTimeSelectOnly
                      timeIntervals={60}
                      timeCaption="Time"
                      dateFormat="HH:mm"
                      timeFormat="HH:mm" 
                      // selected={field.value.new_punch[props.index].start_time}    
                      selected={ eval('field.value.new_punch'+ "["+props.indexid+"]?."+ props.name)}              
                      onChange={date => {
                        console.log(date, 'new_punch'+ "["+props.indexid+"]?."+ props.name, field.value.new_punch);
                        form.setFieldValue(  'new_punch'+ "["+props.indexid+"]."+ props.name, date);
                        // this.setState({})
                      }}
                      disabled={props.isDisabled}
                  /> 
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={'new_punch'+ "["+props.indexid+"]?."+ props.name} className="input-feedback" />
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
                      onChange={date => {form.setFieldValue(props.name, date);}}
                      disabled={props.isDisabled}
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
                      readOnly={ props.readOnly != undefined ? props.readOnly : false }
                      onChange={date => {form.setFieldValue(props.name, date)}}
                  /> 
                  <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name={props.name} className="input-feedback" />
                  </Form.Control.Feedback> 
                </div>)}
      </Field>
          );
}



const CustomTimeInput = ({ value, onChange }) => {
  return(<input
    value={value}
    onChange={ (e) =>{
                      if(e.target.value.includes(":")){
                        onChange(e.target.value); 
                      }
    }}
    style={{ border: "solid 1px green", textAlign : "center", fontSize : "17.5px" }}
  />);
  }

/** This is component for Date */
const InputDateTime = (props) => {
  if(props.contrast_too!=null){
    return(<Field>
      {({ field, form }) => (
              <div>
              <DatePicker 
                  className="form-control" 
                  showTimeInput
                  customTimeInput={<CustomTimeInput />}
                  popperPlacement={ props.popperPlacement != undefined ? props.popperPlacement : false }
                  showTimeSelectOnly={ props.showTimeSelectOnly != undefined ? props.showTimeSelectOnly : false }
                  showDateSelectOnly={ props.showDateSelectOnly != undefined ? props.showDateSelectOnly : false }
                  minDate={ props.minDate != undefined ? props.minDate : false }
                  maxDate={ props.maxDate != undefined ? props.maxDate : false }
                  dateFormat="MMMM d, yyyy HH:mm:ss"
                  selected={ eval('field.value.' + props.name)}       
                  readOnly={ props.readOnly != undefined ? props.readOnly : false }
                  onChange={date => {form.setFieldValue(props.name, date); ;
                    onSelectTimeHandlerAlterlog(date,form.setFieldValue,props.contrast_too,props.offset_data)}}
              /> 
              <Form.Control.Feedback type="invalid">
                <ErrorMessage component="div" name={props.name} className="input-feedback" />
              </Form.Control.Feedback> 
            </div>)}
    </Field>
        );
  }
  return(<Field>
      {({ field, form }) => (
              <div>
                <DatePicker 
                    className="form-control" 
                    showTimeInput
                    customTimeInput={<CustomTimeInput />}
                    popperPlacement={ props.popperPlacement != undefined ? props.popperPlacement : false }
                    showTimeSelectOnly={ props.showTimeSelectOnly != undefined ? props.showTimeSelectOnly : false }
                    showDateSelectOnly={ props.showDateSelectOnly != undefined ? props.showDateSelectOnly : false }
                    minDate={ props.minDate != undefined ? props.minDate : false }
                    maxDate={ props.maxDate != undefined ? props.maxDate : false }
                    dateFormat="MMMM d, yyyy HH:mm"
                    selected={ eval('field.value.' + props.name)}       
                    readOnly={ props.readOnly != undefined ? props.readOnly : false }
                    onChange={date => form.setFieldValue(props.name, date)}
                /> 
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={props.name} className="input-feedback" />
                </Form.Control.Feedback> 
              </div>)}
    </Field>
        );
}

/** This is component for Date */
const InputDateTimeIndex = (props) => {
  if(props.contrast_too!=null){
    return(<Field>
      {({ field, form }) => (
              <div>
              <DatePicker 
                  className="form-control" 
                  showTimeInput
                  customTimeInput={<CustomTimeInput />}
                  popperPlacement={ props.popperPlacement != undefined ? props.popperPlacement : false }
                  showTimeSelectOnly={ props.showTimeSelectOnly != undefined ? props.showTimeSelectOnly : false }
                  showDateSelectOnly={ props.showDateSelectOnly != undefined ? props.showDateSelectOnly : false }
                  minDate={ props.minDate != undefined ? props.minDate : false }
                  maxDate={ props.maxDate != undefined ? props.maxDate : false }
                  dateFormat="MMMM d, yyyy HH:mm"
                  selected={ eval('field.value.' + props.name)}       
                  readOnly={ props.readOnly != undefined ? props.readOnly : false }
                  onChange={date => {form.setFieldValue(props.name, date); ;
                    onSelectTimeHandlerAlterlog(date,form.setFieldValue,props.contrast_too,props.offset_data)}}
              /> 
              <Form.Control.Feedback type="invalid">
                <ErrorMessage component="div" name={props.name} className="input-feedback" />
              </Form.Control.Feedback> 
            </div>)}
    </Field>
        );
  }
  if(props.type=="indexing"){
    const event = new Date();
    // console.log(event);
    return(<Field>
    
      {({ field, form }) => (
              <span>
                  {/* {console.log(field.value,field.value.new_punch)} */}
                 <DatePicker 
                      className="form-control" 
                       showTimeInput
                       customTimeInput={<CustomTimeInput />}
                       popperPlacement={ props.popperPlacement != undefined ? props.popperPlacement : false }
                       showTimeSelectOnly={ props.showTimeSelectOnly != undefined ? props.showTimeSelectOnly : false }
                       showDateSelectOnly={ props.showDateSelectOnly != undefined ? props.showDateSelectOnly : false }
                       minDate={ props.minDate != undefined ? props.minDate : false }
                       maxDate={ props.maxDate != undefined ? props.maxDate : false }
                      // timeIntervals={60}
                      // timeCaption="Time"
                      dateFormat="MMMM d, yyyy HH:mm"
                      // selected={field.value.new_punch[props.index].start_time}    
                      selected={ eval('field.value.new_punch'+ "["+props.indexid+"]?."+ props.name)}     
                      readOnly={ props.readOnly != undefined ? props.readOnly : false }         
                      onChange={date => {
                        console.log(date, 'new_punch'+ "["+props.indexid+"]?."+ props.name, field.value.new_punch);
                        form.setFieldValue(  'new_punch'+ "["+props.indexid+"]."+ props.name, date);
                        // this.setState({})
                      }}
                      disabled={props.isDisabled}
                  /> 
                <Form.Control.Feedback type="invalid">
                  <ErrorMessage component="div" name={'new_punch'+ "["+props.indexid+"]."+ props.name} className="input-feedback" />
                </Form.Control.Feedback> 
              </span>)}
    </Field>
          );
  }
  return(<Field>
      {({ field, form }) => (
              <div>
                <DatePicker 
                    className="form-control" 
                    showTimeInput
                    customTimeInput={<CustomTimeInput />}
                    popperPlacement={ props.popperPlacement != undefined ? props.popperPlacement : false }
                    showTimeSelectOnly={ props.showTimeSelectOnly != undefined ? props.showTimeSelectOnly : false }
                    showDateSelectOnly={ props.showDateSelectOnly != undefined ? props.showDateSelectOnly : false }
                    minDate={ props.minDate != undefined ? props.minDate : false }
                    maxDate={ props.maxDate != undefined ? props.maxDate : false }
                    dateFormat="MMMM d, yyyy HH:mm"
                    selected={ eval('field.value.' + props.name)}       
                    readOnly={ props.readOnly != undefined ? props.readOnly : false }
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

  const onSelectTimeHandlerRestDay = (data, setFieldValue,type,offset_data) => {
    if(data!==null){
        var onDuty = data;
        var employeeDuty = new Date(); 

        // console.log(onDuty);
        // console.log(onDuty.getTime() +(offset_data* 1000) );
        employeeDuty = new Date(onDuty.getTime() +(offset_data* 1000))
        // employeeDuty.setMinutes(onDuty.getMinutes()); 
        // employeeDuty.setHours( onDuty.getHours() + (offset_data/3600) ); 
    
    setFieldValue("pov_"+ type, employeeDuty)
    }else{
        setFieldValue(type, null) 
    }

  };

  const onSelectTimeHandlerAlterlog = (data, setFieldValue,type,offset_data) => {
    if(data!==null){
        var onDuty = data;
        var offDuty = new Date(data); 

        offDuty = new Date(onDuty.getTime() +(offset_data* 1000))
        // offDuty.setMinutes(onDuty.getMinutes()); 
        // offDuty.setHours( onDuty.getHours() + (offset_data/3600) ); 
    
    setFieldValue("pov_"+ type, offDuty)
    }else{
        setFieldValue(type, null) 
    }

  };


export {
  InputDate,
  InputTime,
  InputDateTime,
  InputDateTimeIndex
}