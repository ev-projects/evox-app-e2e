import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyTeamRequests.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import PageLoading from "../../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchRequestList,fetchStatusNumbers,bulkRequest } from '../../../store/actions/filters/requestListActions';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import Paginate from "../../../components/Template/Paginate";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";

class MyTeamRequests extends Component {

  constructor(props){
    super(props);

    this.initialState = {
        filters: {
          status:           this.props.filters?.status ?? null,
          valid_from:       this.props.filters?.valid_from ? new Date( this.props.filters?.valid_from ) : (( this.props.settings?.current_payroll_cutoff?.start_date ) ? new Date( this.props.settings.current_payroll_cutoff.start_date) : null),
          valid_to:         this.props.filters?.valid_to ? new Date( this.props.filters?.valid_to ) : (( this.props.settings?.current_payroll_cutoff?.end_date ) ? new Date( this.props.settings.current_payroll_cutoff.end_date ) : null),
          department_id:    this.props.filters?.department_id ?? null,
          name:             this.props.filters?.name ?? null,
          page:             this.props.filters?.page ?? 1,
          checkedList:      this.props.filters?.checkedList ?? [],
          isAll:            this.props.filters?.isAll ?? false,
          action:           this.props.filters?.action ?? null,
          bulk_action:      this.props.filters?.bulk_action ?? null,
          url:              'my_team_requests'
      }
    }
    this.state = this.initialState; 
  }

  onSubmitHandler = (values) => {
    
    var formData = { url: "my_team_requests"  };

    switch(values.action) {
      case "bulk_action":
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
        this.props.bulkRequest( formData );

        // Fetch request
        this.props.fetchRequestList( formData );

        values.checkedList = [];
        values.action = '';
        console.log(this.state)
        console.log(this.props)
      
        break;

    default:
        for (var key in values) {
          if( values[key] != null && values[key] != ""  ) {
              switch( key ) {
                case "valid_from":
                case "valid_to":
                  formData[key] = moment( values[key] ).format("YYYY-MM-DD")
                  break;
                case "checked":
                  break;
                default:
                  formData[key] = values[key];
                  break;
              }
          } 
          
      }
      this.props.fetchRequestList( formData , this.props.statusNumbers );
    }
  }

  componentWillMount(){

    // Fetch the my Team Request list upon mounting of the component if the My Team Request List is not yet initially loaded.
    if( ! this.props.isListLoaded ) {

      var filters = {
        ...this.state.filters,
        valid_from: Validator.isValid(this.state.filters.valid_from) ? this.state.filters.valid_from.toISOString().substring(0, 10) : null,
        valid_to:   Validator.isValid(this.state.filters.valid_to) ? this.state.filters.valid_to.toISOString().substring(0, 10) : null
      };

      this.props.fetchRequestList( filters );
    }
  }

  componentDidUpdate(){
    if( !this.props.isNumbersLoaded && this.props.isListLoaded ){
      var formData = {  url: "my_team_requests" };
      this.props.fetchStatusNumbers( formData, this.props.requestList );
    }
  }

  render = () => {  

  var request_list = this.props.requestList.result;
  var record_number = this.props.requestList.record_number;

  const required_field = "This field is required";

  const validationSchema = Yup.object().shape({
    checkedList: Yup.string().nullable().when('action', {
      is: 'bulk_action',
      then:   Yup.string().required("Select a record to be updated").nullable()
    }),
    bulk_action: Yup.string().nullable().when('action', {
      is: 'bulk_action',
      then:   Yup.string().required("Please choose action").nullable()
    }),
    valid_from: Yup.date().nullable().max( Yup.ref('valid_to') , 'Please select a Valid From date.'),
    valid_to: Yup.date().nullable().min( Yup.ref('valid_from') , 'Please select a Valid To date.'),
  });

    if(this.props.isListLoaded){

    let pagination = [];  
    for (let number = 1; number <= request_list.last_page; number++) {
      pagination.push(
        <Field>
          {({ field, form }) => (
            <div>
              <Button type="submit" className="pagination_btn text-center" active={number === request_list.current_page} onClick={() =>{resetValues(form.setFieldValue,number) }}>{number}</Button>
            </div>
          )}
        </Field>
      );
    }

    var pending = 0;
    var approved = 0;
    var canceled = 0;
    var declined = 0;

    if(this.props.isNumbersLoaded){
      pending = this.props.statusNumbers.pending===undefined?0:this.props.statusNumbers.pending;
      approved = this.props.statusNumbers.approved===undefined?0:this.props.statusNumbers.approved;
      canceled = this.props.statusNumbers.canceled===undefined?0:this.props.statusNumbers.canceled;
      declined = this.props.statusNumbers.declined===undefined?0:this.props.statusNumbers.declined;
    }
    var all_status = pending + approved + canceled+ declined;

    return(<Formik 
      enableReinitialize
      onSubmit={this.onSubmitHandler} 
      validationSchema={validationSchema} 
      initialValues={this.state.filters}>
      {
      ({values,errors,setFieldValue,field,touched,handleSubmit,handleReset,handleChange}) => (
      <form onSubmit={handleSubmit}>
      <Wrapper>
            <ContainerWrapper>   
            <ContainerBody>  
                <Content col="12" title="My Team Request"  subtitle={ <BackButton {...this.props} /> }>
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
                      <Badge variant="light">{all_status}</Badge>
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
                      <Badge className="pending" variant="light">{pending}</Badge>
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
                      <Badge className="approved" variant="light">{approved}</Badge>
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
                      <Badge className="canceled" variant="light">{canceled}</Badge>
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
                      <Badge className="denied" variant="light">{declined}</Badge>
                      &nbsp;Declined 
                    </ToggleButton>
                  </ButtonGroup>
                  
                  <Row  className="filters">  
                    <Col className="col-2"> 
                      <div className="form-group">
                        <label>Date From:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                      </div>
                    </Col> 
                    <Col className="col-2">   
                    <div className="form-group">
                        <label>Date To:</label>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col>
                    <Col className="col-3"> 
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
                      </div>
                    </Col> 
                    <Col className="col-3"> 
                      <div className="form-group">
                          <label>Name:</label>
                          <input type="textfield" className="form-control" variant="primary" placeholder="Name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    </Col> 
                    <Col className="col-2">
                    <div className="form-group">
                          <label>&nbsp;</label>
                          <Button className="display-block" variant="primary" type="submit" onClick={() => {setFieldValue("page", 1); setFieldValue("action", "");}} >
                          Filter
                        </Button>
                    </div>
                    </Col>
                    </Row>
                    <hr/>
                    <Row className="bulk-action">
                      <Col lg="4"> 
                      <div className="form-group">
                          <label>Action:</label>
                          <select
                            className="form-control" 
                            name="bulk_action"
                            value={values.bulk_action}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                            <option label="Select Action" />
                            <option value="approve" label="Approved" />
                            <option value="deny" label="Deny" />
                          </select>
                          
                      </div>
                      <ErrorMessage component="div" name="bulk_action" className="input-feedback" />
                    </Col> 
                    <Col lg="2"> 
                    <div className="form-group">
                        <label>&nbsp;</label>  
                        <Button className="display-block"  variant="primary" type="submit" onClick={() => setFieldValue("action", "bulk_action")} >
                          Update
                        </Button>
                    </div>
                    <ErrorMessage component="div" name="checkedList" className="input-feedback" />
                    </Col> 
                    </Row>
                    <Row>
                    </Row>
                    { request_list.data.length > 0  ? (<div>
                Record Displayed: { record_number }
                <Table striped bordered hover>
                  <thead>
                    <tr>
                      <th><Field type="checkbox" name="isAll"  onClick={() =>  { selectAllChecklist(setFieldValue,values,request_list.data)}} /></th>
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
                    {request_list.data.map(function(item){
                        var fourthColumn = [];
                        var fifthColumn = [];
                        var link= '';
                        switch( item.table_name ) { 
                          case "change_schedules":
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
                              <p> Rest Days: {item.fourth_column?.rest_day.join()}</p>
                              <p> Work Days: {item.fourth_column?.work_days.join()}</p>
                              </div>
                            ); 
                            link =  global.change_schedule + item.id.toString();
                              break;
                          case "alter_logs":
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
                              link =  global.alter_log + item.id.toString();
                              break;
                          case "rest_day_works":
                            fourthColumn.push(
                              <span>From: {item.fourth_column}</span>
                            );
                            fifthColumn.push(
                              <span>To: {item.fifth_column}</span>
                            );

                              link =  global.rest_day_work + item.id.toString();
                              break;
                          case "overtimes":
                              fifthColumn.push(
                                <span>{item.fifth_column}</span>
                              );
                              fourthColumn.push(
                                <span>{item.fourth_column}</span>

                              );
                              link =  global.overtime + item.id.toString();
                              break;
                       }
                        return <tr>
                        <td> 
                        { item.status !="Canceled"  ? (<Field type="checkbox" name="checkedList" value={item.id.toString()+"."+item.table_name} />) : (<span></span>)}
                        </td>
                        <td><b>{item.created_by}</b><br/> <small>{item.department_name}</small></td>
                        <td><b>{item.table_name}</b><br/> <small>{item.created_at}</small></td>
                        <td>{item.date_requested}</td>
                        <td>{fourthColumn}</td>
                        <td>{fifthColumn}</td>
                        <td> <Status status={item.status} /></td>
                        <td>{item.updated_by} <br/><small>{item.updated_at}</small></td>
                        <td> <Link to={{ pathname: link, previousPath:  global.base_url +'team/MyTeamRequests' }} className="nav-link" ><i className="fa fa-eye" aria-hidden="true"></i></Link></td>
                      </tr>         
                    })}
                  </tbody>
                </Table>
                <Paginate pagination={request_list} />
                {/* <Pagination className="justify-content-center" >{pagination}</Pagination> */}
                </div>) : (<div> Sorry, No Record Found </div>)}
                  </Tab>
                </Tabs>    
                </Content>
            </ContainerBody>  
            </ContainerWrapper>
          </Wrapper>
      </form>
      )}
    
      </Formik>);
  }
  return <PageLoading/>;
  }
  }

  const selectAllChecklist = (setFieldValue,values,request_list) => {
    if(!values.isAll){
      var list = [];

      // Iterate each variable and apply it to the checkedList
      for (var i = 0; i < request_list.length; i++) {
        if(request_list[i].status!="Canceled"){
          list.push(request_list[i].id.toString()+"."+request_list[i].table_name)
        }
      }

      setFieldValue( "checkedList",list ) ;
    }else{
      // Reset the checklist if uncheck
      setFieldValue( "checkedList",[]  ) ;
    }
    
  };

  const resetValues = (setFieldValue,number) => {
    setFieldValue("page",number); 
    setFieldValue("action", "");
    setFieldValue( "checkedList",[]  ) ;
    setFieldValue( "isAll",false  ) ;
  };

  const Status = (props) => {
    let pagination = [];
    switch( props.status ) { 
      case "Pending":
          pagination.push( <Badge variant="secondary"><span></span>{props.status}</Badge>);
          break;
      case "Canceled":
          pagination.push(<Badge variant="dark"><span></span>{props.status}</Badge>);
          break;
      case "Approved":
          pagination.push(<Badge variant="success"><span></span>{props.status}</Badge>);
          break;
      case "Declined":
          pagination.push(<Badge variant="danger"><span></span>{props.status}</Badge>);
      break;
   }
    return pagination;
  }

  const mapStateToProps = (state) => {

    return {
      requestList     : state.myTeamRequestList.instance,
      isListLoaded    : state.myTeamRequestList.isListLoaded,
      isNumbersLoaded : state.myTeamRequestList.isNumbersLoaded,
      statusNumbers   : state.myTeamRequestList.statusNumbers,
      filters         : state.myTeamRequestList.filters,
      settings        : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchRequestList : ( params , request_numbers ) => dispatch( fetchRequestList(  params , request_numbers ) ), 
      fetchStatusNumbers : ( params , requestList ) => dispatch( fetchStatusNumbers( params , requestList ) ),
      bulkRequest : ( post_data ) => dispatch( bulkRequest( post_data ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(MyTeamRequests);







