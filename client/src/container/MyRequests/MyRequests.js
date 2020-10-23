import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyRequests.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchRequestList } from '../../store/actions/requestListActions';
import { InputDate,InputTime   } from '../../components/DatePickerComponent/DatePicker.js';

class MyRequests extends Component {

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
  this.props.fetchRequestList( formData );
  }

  componentWillMount(){

    var urlData = {url: this.props.params.url};
      this.props.fetchRequestList(urlData);
  }

  render = () => {  
  const initialValue = {
    status: null,
    valid_from: null,
    valid_to: null,
    department_id: null,
    name: null,
    page: 1,
    url: 'MyRequests'
  }
  

  var request_list = this.props.requestList.result;
  var record_number = this.props.requestList.record_number;

  const validationSchema = Yup.object().shape({});
  if(this.props.isListLoaded){
    let pagination = [];
    for (let number = 1; number <= request_list.last_page; number++) {
      pagination.push(
        <Field>
          {({ field, form }) => (
            <div>
              <Button type="submit" className="pagination_btn text-center" active={number === request_list.current_page} onClick={() => form.setFieldValue("page",number)}>{number}</Button>
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
                <Content col="12" title="My Requests">
                <Tabs defaultActiveKey="home" id="uncontrolled-tab-example">
                  <Tab eventKey="home" title="All Requests">
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status==null}
                      onClick={() => setFieldValue("status", null)}
                    >
                      <Badge variant="light">{record_number.all}</Badge>
                       &nbsp;All Status
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="pending"}
                      onClick={() => setFieldValue("status", "pending")}
                    >
                      <Badge className="pending" variant="light">9</Badge>
                       &nbsp;Pending
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="approved"}
                      onClick={() => setFieldValue("status", "approved")}
                    >
                      <Badge className="approved" variant="light">9</Badge>
                      &nbsp;Approved 
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="canceled"}
                      onClick={() => setFieldValue("status", "canceled")}
                    >
                      <Badge className="canceled" variant="light">9</Badge>
                      &nbsp;Canceled 
                    </ToggleButton>
                  </ButtonGroup>
                  <ButtonGroup toggle className="mb-2">
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="declined"}
                      onClick={() => setFieldValue("status", "declined")}
                    >
                      <Badge className="denied" variant="light">9</Badge>
                      &nbsp;Declined 
                    </ToggleButton>
                  </ButtonGroup>
                  <Button variant="primary" type="submit" onClick={() => setFieldValue("page", 1)}>
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
                    </Row>
                    { request_list.data.length > 0  ? (<div>
                      Record Displayed: { record_number }
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th>Request Type / Date</th>
                      <th>Date Requested</th>
                      <th  colspan="2"> Request Information</th>
                      <th>Status</th>
                      <th>Updated By / Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request_list.data.map(function(item){
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
                        <td>{item.table_name} / {item.created_at}</td>
                        <td>{item.date_requested}</td>
                        <td>{fourthColumn}</td>
                        <td>{fifthColumn}</td>
                        <td> <Status status={item.status} /></td>
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


  const Status = (props) => {
    let pagination = [];
    switch( props.status ) { 
      case "Pending":
          pagination.push( <Badge variant="secondary">{props.status}</Badge>);
          break;
      case "Canceled":
          pagination.push(<Badge variant="dark">{props.status}</Badge>);
          break;
      case "Approved":
          pagination.push(<Badge variant="success">{props.status}</Badge>);
          break;
      case "Declined":
          pagination.push(<Badge variant="danger">{props.status}</Badge>);
      break;
   }
    return pagination;
}



  const mapStateToProps = (state) => {
    return {
      requestList  : state.requestList.instance,
      isListLoaded : state.requestList.isListLoaded
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchRequestList : ( params ) => dispatch( fetchRequestList(  params ) ),
    }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(MyRequests);







