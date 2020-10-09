import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./RequestList.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchRequestList,resetRequestList } from '../../../store/actions/requestListActions';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';

class RequestList extends Component {

  onSubmitHandler = (values) => {

    var formData = {};

    for (var key in values) {
      if( values[key] != null && values[key] != ""  ) {
          switch( key ) {
            case "valid_from":
            case "valid_to":
              formData[key] = moment( values[key] ).format("YYYY-MM-DD")
            break;
            default:
              formData[key] = values[key];
            break;
          }
      } 
  }
  console.log(formData);
  this.props.fetchRequestList( values.page, formData );
  
  }

  componentWillMount(){
    var page = 1;
    if( this.props.params.page != undefined ) {
      page = this.props.params.page;
    }else{
      page = 1;
    }
      this.props.fetchRequestList(page);
  }

  paginate(page) {
    this.props.fetchRequestList(page)
  }

  render = () => {  
  const initialValue = {
    status: null,
    valid_from: null,
    valid_to: null,
    department_id: null,
    name: null,
    page: 1
  }

  const validationSchema = Yup.object().shape({});
  if(this.props.isListLoaded){
    let pagination = [];
    for (let number = 1; number <= this.props.requestList[0].last_page; number++) {
      pagination.push(
        <Field>
          {({ field, form }) => (
            <div>
              <Button type="submit" className="pagination_btn text-center" onClick={() => form.setFieldValue("page",number)}>{number}</Button>
            </div>
          )}
        </Field>
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
                <Content col="12" title="My Team Request">
                <Tabs defaultActiveKey="home" id="uncontrolled-tab-example">
                  <Tab eventKey="home" title="All Requests">
                  <Button className="request_list_btn" variant="primary" onClick={() => setFieldValue("status", null)}>
                    <Badge variant="light">9</Badge> All Status 
                  </Button>
                  <Button className="request_list_btn" variant="primary" onClick={() => setFieldValue("status", "pending")}>
                    <Badge className="pending" variant="light">9</Badge> Pending 
                  </Button>
                  <Button className="request_list_btn" variant="primary" onClick={() => setFieldValue("status", "approved")}>
                    <Badge className="approved" variant="light">9</Badge> Approved 
                  </Button>
                  <Button className="request_list_btn" variant="primary" onClick={() => setFieldValue("status", "canceled")}>
                    <Badge className="canceled" variant="light">9</Badge> Canceled 
                  </Button>
                  <Button className="request_list_btn" variant="primary" onClick={() => setFieldValue("status", "declined")}>
                    <Badge className="denied" variant="light">9</Badge> Denied 
                  </Button>
                  <Button variant="primary" type="submit">
                    Filter
                  </Button>
                  <Row>  
                    <Col size="2"> 
                      <div className="form-group">
                        <label>Date From:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                      </div>
                    </Col> 
                    <Col size="2">   
                    <div className="form-group">
                        <label>Date To:</label>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>
                    <Col size="2"> 
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
                          <option value="1" label="OPS - Product Dev" />
                          </select>
                      </div>
                    
                    </Col> 
                    <Col size="2"> 
                      <div className="form-group">
                          <label>Name:</label>
                          <input type="textfield" className="form-control" variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    
                    </Col> 
                    </Row>
                    { this.props.requestList[0].data.length > 0  ? (<div>
                
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>
                        <input type="checkbox"/></th>
                      <th>Name / Department</th>
                      <th>Request Type / Date</th>
                      <th>Date Requested</th>
                      <th  colspan="2"> Request Information</th>
                      <th>Status</th>
                      <th>Updated By / Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.props.requestList[0].data.map(function(item){
                        var fourthColumn = [];
                        var fifthColumn = [];
                        switch( item.table_name ) { 
                          case "Change Schedule":

                            var payroll_items = {allow_late:"Late", allow_undertime:"Undertime", allow_night_diff: "Night Differential"};

                            for (var key in item.fifth_column) {
                              if(item.fifth_column[key]=='1'){
                                fourthColumn.push(
                                  <span>{eval('payroll_items.'+key)},</span>
                                );
                              }
                            }
                            fifthColumn.push(
                              <div>
                              <p> Rest Days: {item.fourth_column.rest_day.join()}</p>
                              <p> Work Days: {item.fourth_column.work_days.join()}</p>
                              </div>
                            );
                            
                              break;
                          case "Alter Log":
                            fourthColumn.push(
                              <div>
                                New
                                <p>In: {item.fifth_column.new_time_in}</p>
                                <p>Out: {item.fifth_column.new_time_out}</p>
                              </div>
                            );
                            fifthColumn.push(
                              <div>
                                Old
                                <p>In: {item.fourth_column.current_time_in}</p>
                                <p>Out: {item.fourth_column.current_time_out}</p>
                              </div>
                            );
                              break;
                          case "Rest Day Work":
                            fourthColumn.push(
                              <span>From: {item.fifth_column}</span>

                            );
                            fifthColumn.push(
                              <span>To: {item.fourth_column}</span>

                            );
                              break;
                          case "Overtime":
                              fifthColumn.push(
                                <span>{item.fifth_column}</span>

                              );
                              fourthColumn.push(
                                <span>{item.fourth_column}</span>

                              );
                              break;
                       }
                        return <tr>
                        <td><input type="checkbox"/></td>
                        <td>{item.created_by} / {item.department_name}</td>
                        <td>{item.table_name} / Date</td>
                        <td>{item.date_requested}</td>
                        <td>{fourthColumn}</td>
                        <td>{fifthColumn}</td>
                        <td>{item.status}</td>
                        <td>{item.updated_by} / {item.updated_at}</td>
                        <td><i className="fa fa-eye" aria-hidden="true"></i>&nbsp;<i className="fa fa-check-circle" aria-hidden="true"></i>&nbsp;<i className="fa fa-times-circle" aria-hidden="true"></i></td>
                      </tr>         
                    })}
                  </tbody>
                </Table>
                <Pagination className="justify-content-center" >{pagination}</Pagination>
                </div>) : (<div> Sorry, No Record Found </div>)}
                  </Tab>
                </Tabs>    
                </Content>
            </ContainerWrapper>
          </Wrapper>
      </form>
      )}
    
      </Formik>);
  }

  return <PageLoading/>;


  }
  }

  const mapStateToProps = (state) => {
    return {
      requestList  : state.requestList.instance,
      isListLoaded : state.requestList.isListLoaded
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchRequestList : ( page , params ) => dispatch( fetchRequestList( page , params ) ),
      resetRequestList : () => dispatch( resetRequestList() )
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(RequestList);







