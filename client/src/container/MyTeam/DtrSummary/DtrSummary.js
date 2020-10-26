import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./DtrSummary.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchDtrSummary,exportDtrSummary } from '../../../store/actions/dtrSummaryActions';
import { Form  } from 'react-bootstrap';

class DtrSummary extends Component {

	onSubmitHandler = (values) => {
    var formData = {};

		for (var key in values) {
		  if( values[key] != null && values[key] != ""  ) {
			  switch( key ) {
				case "valid_from":
				case "valid_to":
				  formData[key] = moment( values[key] ).format("YYYY-MM-DD")
        break;
        case "export":
				break;
				default:
				  formData[key] = values[key];
				break;
			  }
		  } 
	  }
    
    if(values.export){
      this.props.exportDtrSummary( formData );
    }else{
	  this.props.fetchDtrSummary( formData );

    }
	}
  

	render = () => {  
	const initialValue = {
		valid_from: null,
		valid_to: null,
		department_id: null,
    name: null,
    export: false,
  }

    var column = [];
    for (var key in this.props.dtrSummary.instance.column) {
      column.push(
        <React.Fragment>
        <th>{key.toUpperCase()}</th>
        <th>{key.toUpperCase()} ND</th>
        <th>{key.toUpperCase()} OT</th>
        <th>{key.toUpperCase()} ND w/ OT</th>
        </React.Fragment>
      ); 
    }

    return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={initialValue}>
		{
		({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		<Wrapper>
			  <ContainerWrapper>       
				  <Content col="12" title="DTR Summary">
				  <Row>  
                    <Col> 
                      <div className="form-group">
                        <label>Date From:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                      </div>
                    </Col> 
                    <Col>   
                      <div className="form-group">
                        <label>Date To:</label>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>
                    <Col> 
                    <div className="form-group">
                          <label>Department:</label>
                          <select
                          className="form-control" 
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                          <option    label="Select a Department" />
                          {this.props.user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })}
                          </select>
                          <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name="department_id" className="input-feedback" />
                  </Form.Control.Feedback> 
                      </div>

                    
                    </Col> 
                    <Col> 
                      <div className="form-group">
                          <label>Name:</label>
                          <input type="textfield" className="form-control" variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    
                    </Col> 
					          <Col>   
                    	<div className="form-group">
						<label> </label>
							<Button variant="primary" type="submit" onClick={() => setFieldValue("export", false)}>Submit</Button>
                      </div>
                    </Col>
                    <Col>   
                    	<div className="form-group">
						<label> </label>
							<Button variant="primary" onClick={() => setFieldValue("export", true)} type="submit">Export</Button>
                      </div>
                    </Col>
                    </Row>

                      { this.props.dtrSummary.isListLoaded? (<div>
                         
  <table class="table">
    <thead class="thead-light">
      <tr>
        <th scope="col"># ID</th>
        <th scope="col">Name</th>
        <th scope="col">Department</th>
        <th scope="col">Leaves</th>
        <th scope="col">UL</th>
        <th scope="col">Late</th>
        <th scope="col">Undertime</th>
        <th scope="col">Night Diff</th>
        <th scope="col">Overtime</th>
        <th scope="col">OT with ND</th>
        <th scope="col">RD</th>
        <th scope="col">RD ND</th>
        <th scope="col">RD OT</th>
        <th scope="col">RD OT with ND</th>
        {column}
      </tr>
    </thead>
    <tbody>
    {this.props.dtrSummary.instance.summary.map((list, index) => {
      for (var key in this.props.dtrSummary.instance.column) {
        var holiday = [];

        if(eval("list.summary").hasOwnProperty(key)===true){
          holiday.push(
            <React.Fragment>
              <td>{ eval("list.summary."+key+".rendered_hours") }</td>
              <td>{ eval("list.summary."+key+".night_diff") }</td>
              <td>{ eval("list.summary."+key+".overtime") }</td>
              <td>{ eval("list.summary."+key+".overtime_night_diff")}</td>
              </React.Fragment>
          ); 
        }else{
          holiday.push(
            <React.Fragment>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            <td>0</td>
            </React.Fragment>
          ); 
        }
    }

  return <tr >
          <td>{list.employee_info.employee_id}</td>
          <td>{list.employee_info.name}</td>
          <td>{list.employee_info.department}</td> 
          <td>{list.summary.reg.vl_sl}</td>
          <td>{list.summary.reg.ul}</td>
          <td>{list.summary.reg.late}</td>
          <td>{list.summary.reg.undertime}</td>
          <td>{list.summary.reg.night_diff}</td>
          <td>{list.summary.reg.overtime}</td>
          <td>{list.summary.reg.overtime_night_diff}</td>
          <td>{list.summary.rd.rendered_hours}</td>
          <td>{list.summary.rd.night_diff}</td>
          <td>{list.summary.rd.overtime}</td>
          <td>{list.summary.rd.overtime_night_diff}</td>
          {holiday}
        </tr>
  })}

  </tbody>
</table>
</div>) : (<div> No Record to be displayed</div>)}    
				  </Content>
			  </ContainerWrapper>
	
			</Wrapper>
		</form>
		)}
	  
		</Formik>);
	}
}



  const validationSchema = Yup.object().shape({
    valid_from:      		Yup.date().required("This field is required").nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
    valid_to:     			Yup.date().required("This field is required").nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.'),
    department_id:  		Yup.string().required("This field is required").nullable()

});
  
  const mapStateToProps = (state) => {
    return {
      dtrSummary  : state.dtrSummary,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
    fetchDtrSummary : ( params ) => dispatch( fetchDtrSummary(  params ) ),
    exportDtrSummary : ( params ) => dispatch( exportDtrSummary( params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrSummary);

  