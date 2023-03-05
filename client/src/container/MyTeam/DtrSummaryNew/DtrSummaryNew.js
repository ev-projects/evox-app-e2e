import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup,Dropdown } from 'react-bootstrap';
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import "./DtrSummaryNew.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import { fetchNewDtrSummary,exportDtrSummary, exportNewDtrSummary } from '../../../store/actions/dtr/dtrSummaryActions';
import { Form  } from 'react-bootstrap';
import Authenticator from "../../../services/Authenticator.js";

class DtrSummaryNew extends Component {

  constructor(props){
    super(props);
    //Added status filter for employment status
    this.state = {
      initialState : {
        valid_from: ( this.props.settings?.current_payroll_cutoff?.start_date ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
        valid_to:   ( this.props.settings?.current_payroll_cutoff?.end_date ? new Date( this.props.settings.current_payroll_cutoff.end_date) : null),
        department_id: null,
        name: null,
        is_active: 1,
        export: false
      }
    }; 
  }
  componentDidMount() {
    //console.log(this.props.user);
    if ((this.props.user) && (this.props.user.departments_handled.length > 0)) {
      //console.log(this.state.initialState);
      if (!this.state.initialState.department_id) {
        this.setState({ initialState: {
          ...this.state.initialState,
          department_id: this.props.user.departments_handled[0].id
        }}, () => {
          //console.log(this.state.initialState);
          if (this.state.initialState.valid_from && this.state.initialState.valid_to)
          this.onSubmitHandler(this.state.initialState);
        });
      }
    }
  }
	onSubmitHandler = (values) => {
    var formData = {};
    formData['page'] = (this.props.dtrSummary?.pagination?.current_page ? this.props.dtrSummary?.pagination?.current_page : 1);
    if (this.props.dtrSummary?.pagination?.has_next_page == true)
    formData['page'] = formData['page'] + 1;

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
    
    if(values.export == "department"){
      formData['export'] = 'department';
      this.props.exportDtrSummary( formData );
    }else if(values.export == "all"){

      var formData = {};
      formData['page'] = (this.props.dtrSummary?.pagination?.current_page ? this.props.dtrSummary?.pagination?.current_page : 1);
      if (this.props.dtrSummary?.pagination?.has_next_page == true)
      formData['page'] = formData['page'] + 1;
      
      for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
            formData[key] = moment( values[key] ).format("YYYY-MM-DD")
          break;
            //case "export":
            case "department_id":
            case "name":
          break;
          default:
            formData[key] = values[key];
          break;
          }
        } 
      }
      
      this.props.exportDtrSummary( formData );
    }else if(values.export == "all_new"){

      var formData = {};
      formData['page'] = (this.props.dtrSummary?.pagination?.current_page ? this.props.dtrSummary?.pagination?.current_page : 1);
      if (this.props.dtrSummary?.pagination?.has_next_page == true)
      formData['page'] = formData['page'] + 1;
      
      for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
            formData[key] = moment( values[key] ).format("YYYY-MM-DD")
          break;
            //case "export":
            case "department_id":
            case "name":
          break;
          default:
            formData[key] = values[key];
          break;
          }
        } 
      }
      this.props.exportNewDtrSummary( formData );
    }else if(values.export == "department_new"){

      var formData = {};
      formData['page'] = (this.props.dtrSummary?.pagination?.current_page ? this.props.dtrSummary?.pagination?.current_page : 1);
      if (this.props.dtrSummary?.pagination?.has_next_page == true)
      formData['page'] = formData['page'] + 1;
      
      for (var key in values) {
        if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
            formData[key] = moment( values[key] ).format("YYYY-MM-DD")
          break;
            //case "export":
            // case "department_id":
            case "name":
          break;
          default:
            formData[key] = values[key];
          break;
          }
        } 
      }
      this.props.exportNewDtrSummary( formData );
    }
    
    else{


	  this.props.fetchNewDtrSummary( formData );

    }
	}
  

	render = () => {  
    console.log(this.props.dtrSummary)
    var column = [];
 
    // if(this.props.isListLoaded){

    //   let pagination = [];  
    //   for (let number = 1; number <= request_list.last_page; number++) {
    //     pagination.push(
    //       <Field>
    //         {({ field, form }) => (
    //           <div>
    //             <Button type="submit" className="pagination_btn text-center" active={number === request_list.current_page} onClick={() =>{resetValues(form.setFieldValue,number) }}>{number}</Button>
    //           </div>
    //         )}
    //       </Field>
    //     );
    //   }
    // }
    return(<Formik 
		enableReinitialize
		onSubmit={this.onSubmitHandler} 
		validationSchema={validationSchema} 
		initialValues={this.state.initialState}>
		{
		({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
		<form onSubmit={handleSubmit}>
		<Wrapper {...this.props} >
			  <ContainerWrapper>  
        <h2 className="page-title">DTR SUMMARY </h2>
        <Row className="filters filter-dtr"> 
              <Col className="date-range"> 
                      <div className="form-group">
                        <label>Date Range:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>  
                    
                    <Col className="dept"> 
                    <div className="form-group">
                          
                          <select
                          className="form-control" 
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                          <option    label="- Department -" />
                          {this.props.user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })}
                          </select>
                          <Form.Control.Feedback type="invalid">
                    <ErrorMessage component="div" name="department_id" className="input-feedback" />
                  </Form.Control.Feedback> 
                      </div>

                    
                    </Col> 
                    <Col className="search-name"> 
                      <div className="form-group">
                          
                          <input type="textfield" className="form-control" variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    
                    </Col> 
                    <Col>
                    <select
                    className="form-control"
                      name="is_active"
                      value={values.is_active}
                      onChange={handleChange}
                    >
                      <option value="1" label="Active" />
                      <option value="0" label="Inactive" />
                    </select>
              </Col>
                    <Col className="btns filter-button">   
                      <div className="form-group">
                      <label> </label>
                        <Button id="btn-generate" variant="primary" type="submit" onClick={() => setFieldValue("export", false)}><i className="fa fa-newspaper-o" /> Generate</Button>&nbsp;&nbsp;
                        
                        { Authenticator.check('supervisor', 'allow_dtr_summary_export') &&
                          <Dropdown className="export-drop-down">
                            <Dropdown.Toggle variant="success" id="dropdown-basic">
                              <i className="fa fa-download" /> Export
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                              <Dropdown.Item id="btn-export-department"  as="button" type="submit" onClick={() => setFieldValue("export", "department")}>Export</Dropdown.Item>
                              <Dropdown.Item id="btn-export-all"  as="button" type="submit" onClick={() => setFieldValue("export", "all")}>Export All</Dropdown.Item>
                              <Dropdown.Item id="btn-export-department"  as="button" type="submit" onClick={() => setFieldValue("export", "department_new")}>Export(NEW)</Dropdown.Item>
                              <Dropdown.Item id="btn-export-all"  as="button" type="submit" onClick={() => setFieldValue("export", "all_new")}>Export All(NEW)</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        }
                      </div>

                     
                    </Col>
                    </Row>     
				  <div className="content-table">
				  

                      { this.props.dtrSummary.isListLoaded? (<Row><div className="dtr-summary-table">
                         
  <table class="table dtrSummary">
    <thead class="thead-light">
      <tr>
        <th scope="col" class="th-id"># ID</th>
        <th scope="col" class="th-name">Employee Name</th>
        {/* <th scope="col" class="th-dept">Department</th> */}
        <th scope="col">UL</th>
        <th scope="col">VL+SL</th>
        <th scope="col">Late</th>
        <th scope="col">UT</th>
        <th scope="col">HR</th>
        <th scope="col">ND</th>
        <th scope="col">OT HR</th>
        <th scope="col">OT ND</th>
        <th scope="col">RD HR</th>
        <th scope="col">RD ND</th>
        <th scope="col">RD OT HR</th>
        <th scope="col">RD OT ND</th>
        <th scope="col">LH HR</th>
        <th scope="col">LH ND</th>
        <th scope="col">LH OT HR</th>
        <th scope="col">LH OT ND</th>
        <th scope="col">SH HR</th>
        <th scope="col">SH ND</th>
        <th scope="col">SH OT HR</th>
        <th scope="col">SH OT ND</th>
        <th scope="col">DSH HR</th>
        <th scope="col">DSH ND</th>
        <th scope="col">DSH OT HR</th>
        <th scope="col">DSH OT ND</th>
        <th scope="col">DLH HR</th>
        <th scope="col">DLH ND</th>
        <th scope="col">DLH OT HR</th>
        <th scope="col">DLH OT ND</th>
        <th scope="col">SLH HR</th>
        <th scope="col">SLH ND</th>
        <th scope="col">SLH OT HR</th>
        <th scope="col">SLH OT ND</th>
       
      </tr>
    </thead>
    <tbody>
    {this.props.dtrSummary.dtrItems.map((list, index) => {
        var holiday = [];
  return <tr >
        <td>{list.Employee_Number}</td>
        <td>{list.Employee_Name}</td>
        <td>{list.UL}</td>
        <td>{list.Leaves}</td>
        <td>{list.Late}</td>
        <td>{list.Under_Time}</td>
        <td>{list.Render_Hr}</td>
        <td>{list.Night_Diff}</td>
        <td>{list.OverTime}</td>
        <td>{list.OT_ND}</td>
        <td>{list.RD_Render_HR}</td>
        <td>{list.RD_ND}</td>
        <td>{list.RD_OT}</td>
        <td>{list.RD_OT_ND}</td>
        <td>{list.LH_Render_HR}</td>
        <td>{list.LH_ND}</td>
        <td>{list.LH_OT}</td>
        <td>{list.LH_OT_ND}</td>
        <td>{list.SH_Render_Hr}</td>
        <td>{list.SH_ND}</td>
        <td>{list.SH_OT}</td>
        <td>{list.SH_OT_ND}</td>
        <td>{list.DSH_Render_HR}</td>
        <td>{list.DSH_ND}</td>
        <td>{list.DSH_OT}</td>
        <td>{list.DSH_OT_ND}</td>
        <td>{list.DLH_Render_HR}</td>
        <td>{list.DLH_ND}</td>
        <td>{list.DLH_OT}</td>
        <td>{list.DLH_OT_ND}</td>
        <td>{list.SLH_Render_HR}</td>
        <td>{list.SLH_ND}</td>
        <td>{list.SLH_OT}</td>
        <td>{list.SLH_OT_ND}</td>
       {/* <td>DEPARTMENT</td> */}
        </tr>
  })}

  </tbody>
</table>
{/* <Paginate pagination={request_list} /> */}
</div></Row>) : (<div className="pd20">Sorry 2, no record found</div>)}    
				  </div>
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
    department_id:  		Yup.string().nullable().when('export', {
      is: 'department',
      then:   Yup.string().required("This field is required").nullable()
    }),
  });
  
  const mapStateToProps = (state) => {
    return {
      dtrSummary  : state.dtrSummary,
      settings  : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
    fetchNewDtrSummary : ( params ) => dispatch( fetchNewDtrSummary(  params ) ),
    exportDtrSummary : ( params ) => dispatch( exportDtrSummary( params ) ),
    exportNewDtrSummary : ( params ) => dispatch( exportNewDtrSummary( params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(DtrSummaryNew);

  