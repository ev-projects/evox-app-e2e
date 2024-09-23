import React, { Component } from "react";
import { Container,Col,Tabs,Tab,Badge,Table,Button,Pagination,FormControl,Row,ToggleButton,ButtonGroup } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyTeamRequests.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import Authenticator from "../../../services/Authenticator";
import * as Yup from 'yup';
import PageLoading from "../../PageLoading";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import { fetchRequestList,fetchStatusNumbers,bulkRequest } from '../../../store/actions/filters/requestListActions';
import { InputDate,InputTime   } from '../../../components/DatePickerComponent/DatePicker.js';
import Paginate from "../../../components/Template/Paginate";
import Validator from "../../../services/Validator";
import Formatter from "../../../services/Formatter";


class MyTeamAllRequests extends Component {

  constructor(props){
  
    super(props);
  
    this.initialState = {
       
        filters: {
          status:           this.props.filters?.status ?? "pending",
          valid_from:       null,
          valid_to:         null,
          department_id:    this.props.filters?.department_id ?? this.props.user.departments_handled_strict.length == 1 ? null : null,
          name:             this.props.filters?.name ?? null,
          page:             this.props.filters?.page ?? 1,
          use_filter:       this.props.filters?.use_filter ? this.props.filters?.use_filter :  0,
          showall:          this.props.filters?.showall ? this.props.filters?.showall :  0,
          departmentselect: this.props.filters?.departmentselect ? this.props.filters?.departmentselect :  1,
          checkedList:      this.props.filters?.checkedList ?? [],
          isAll:            this.props.filters?.isAll ?? false,
          action:           this.props.filters?.action ?? null,
          request_type:     this.props.requesttype ?  this.props.requesttype : "alteration",
          bulk_action:      this.props.filters?.bulk_action ?? null,
          first_load:       this.props.filters?.first_load ?? true,
          url:              'my_team_requests'
      }
    }
    this.state = this.initialState; 

  }

  onSubmitHandler = (values) => {
    var formData = { url: "my_team_requests"  };
    // console.log(values)
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
        values.checkedList = [];
        values.action = '';
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
    }
    this.props.fetchRequestList( formData );
    // this.props.fetchStatusNumbers( formData );
  }


  componentDidMount(){
    var filters = {
      ...this.state.filters,
      valid_from: Validator.isValid(this.state.filters.valid_from) ?  new Date(this.state.filters.valid_from).toISOString().substring(0, 10) : null,
      valid_to  : Validator.isValid(this.state.filters.valid_to) ?  new Date(this.state.filters.valid_to).toISOString().substring(0, 10) : null,
      request_type : this.state.filters.request_type,
    };
  //   console.log(this.props.settings)
  //   if(Validator.isValid(this.props.settings?.current_payroll_cutoff?.start_date)){
  //     if(Validator.isValid(this.props.settings.current_payroll_cutoff.start_date) && !Validator.isValid(this.state.filters.valid_from)){

  //       var filters = {
  //         ...this.state.filters,
  //         valid_from: Validator.isValid(this.props.settings.current_payroll_cutoff.start_date) ?  new Date(this.props.settings.current_payroll_cutoff.start_date).toISOString().substring(0, 10) : null,
  //         valid_to  : Validator.isValid(this.props.settings.current_payroll_cutoff.end_date) ?  new Date(this.props.settings.current_payroll_cutoff.end_date).toISOString().substring(0, 10) : null,
  //         request_type : this.state.filters.request_type,
  //       };
  //  }
  //   }
  
 
    // if(Validator.isValid(this.state.filters.first_load)){
    //   filters =this.state.filters.first_load == true ? {
    //     ...this.state.filters,
    //     valid_from: Validator.isValid(this.props.settings?.current_payroll_cutoff) ? 
    // new Date(this.props.settings.current_payroll_cutoff.start_date).toISOString().substring(0, 10) : null,
    //     valid_to  : Validator.isValid(this.props.settings?.current_payroll_cutoff) ? 
    // new Date ( this.props.settings.current_payroll_cutoff.end_date).toISOString().substring(0, 10) : null,
  
    //   } : filters;

    // }
    // Fetch the my Team Request list upon mounting of the component if the My Team Request List is not yet initially loaded.

    // alert(this.props.isListLoaded);
    // if( ! this.props.isListLoaded ) {
    //   this.props.fetchRequestList( filters );
    // }
    // if( ! this.props.isListLoaded ) {
      this.props.fetchRequestList( filters );
    // }

    // if( ! this.props.isNumbersLoaded ) {
      // this.props.fetchStatusNumbers( filters );
    // }
  }

  componentDidUpdate(prevProps) {

    const { requestList } = this.props;
  
    const { store_departments } = this.state;
  
    if (requestList.result && requestList.result.department) {
  
      const departments = requestList.result.department;
  
      if (departments.length > 0 && departments !== store_departments) {
  
        this.setState({ store_departments: departments });
  
      }
  
    }
  
  }

  render = () => {  

    console.log( this.props);
  var request_list = this.props.requestList.result;
  var record_number = this.props.requestList.record_number;
  var request_list_department = this.props.requestList?.result?.department;
    
  // console.log(this.state.store_departments);
  var request_list_department = [];

      request_list_department = this.state.store_departments;
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
      <Wrapper {...this.props} >
            <ContainerWrapper>
            <h3>My Team Overall Request</h3> 
            <div className="request-tab"><Tabs
                      id="uncontrolled-tab-example"
                      defaultActiveKey={values.request_type}
                      onSelect={(key) =>  {
                        setFieldValue("request_type", key)
                        setFieldValue("page", 1);
                        handleSubmit()
                        }
                      }
                      >
                  <Tab  eventKey="all" title="All Requests" type="submit">
                  </Tab>
                  <Tab eventKey="alteration" title="Alteration" type="submit">
                  </Tab>
                  <Tab eventKey="overtime" title="Overtime" type="submit">
                  </Tab>
                  <Tab eventKey="rest_day_work" title="Rest Day Work" type="submit">
                  </Tab>
                  <Tab eventKey="change_schedule" title="Change Schedule" type="submit">
                  </Tab>
                  <Tab eventKey="alter_logs_punches" title="MultiPunch Alteration" type="submit">
                  </Tab>
                </Tabs>
            </div>
            
            <ContainerBody>  
                <Content col="12">
                    <Row className="status-filter">
                  <ButtonGroup toggle className=" flex-wrap">
                    {/* <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status==null}
                      onClick={() =>{ setFieldValue("status", null); handleSubmit();} }
                    >
                      <Badge variant="light">{all_status}</Badge>
                       &nbsp;All Status
                    </ToggleButton> */}
                  {/* </ButtonGroup>
                  <ButtonGroup toggle className="mb-2"> */}
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="pending"}
                      onClick={() =>  { setFieldValue("status", "pending"); setFieldValue("page", 1); handleSubmit();}}
                    >
                      {/* <Badge className="pending" variant="light">{pending}</Badge> */}
                      <i class="fa fa-circle request_i request_list_i-pending" aria-hidden="true"></i>Pending &nbsp;<Badge className="counter-request" variant="light">{pending}</Badge>
                    </ToggleButton>
                  {/* </ButtonGroup>
                  <ButtonGroup toggle className="mb-2"> */}
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="approved"}
                      onClick={() =>{ setFieldValue("status", "approved");  setFieldValue("page", 1); handleSubmit();}}
                    >
                      {/* <Badge className="approved" variant="light">{approved}</Badge> */}
                      <i class="fa fa-circle request_i request_list_i-approved" aria-hidden="true"></i>Approved &nbsp;<Badge className="counter-request" variant="light">{approved}</Badge>
                    </ToggleButton>
                  {/* </ButtonGroup>
                  <ButtonGroup toggle className="mb-2"> */}
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="canceled"}
                      onClick={() =>  { setFieldValue("status", "canceled");  setFieldValue("page", 1); handleSubmit();}}
                    >
                      {/* <Badge className="canceled" variant="light">{canceled}</Badge> */}
                      <i class="fa fa-circle request_i request_list_i-cancelled" aria-hidden="true"></i>Cancelled &nbsp;<Badge className="counter-request" variant="light">{canceled}</Badge>
                    </ToggleButton>
                  {/* </ButtonGroup>
                  <ButtonGroup toggle className="mb-2"> */}
                    <ToggleButton
                      type="checkbox"
                      variant="secondary"
                      className="request_list_btn"
                      checked={values.status=="declined"}
                      onClick={() => { setFieldValue("status", "declined");   setFieldValue("page", 1); handleSubmit();}}
                    >
                      {/* <Badge className="denied" variant="light">{declined}</Badge> */}
                      <i class="fa fa-circle request_i request_list_i-declined" aria-hidden="true"></i>Declined &nbsp;<Badge className="counter-request" variant="light">{declined}</Badge>
                    </ToggleButton>
                  </ButtonGroup>
                  </Row>
                  <Row  className="filters">  
                    <Col className="date-range"> 
                      <div className="form-group">
                        <label>Date Range:</label>
                        <InputDate name="valid_from" value={values.valid_from}/>
                        <InputDate name="valid_to" value={values.valid_to}/>
                      </div>
                    </Col> 
                    
                    <Col className="dept"> 
                      <div className="form-group ">
                          
                          <select
                          className="form-control" 
                            name="department_id"
                            value={values.department_id}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                          <option    label="- Department -" />
                          {/* {this.props.user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })} */}
                           {request_list_department?.map(function(item){
                            return <option value={item.id} label={item.DepartmentName} />;
                          })}
                          </select>
                      </div>
                    </Col> 
                    <Col className="search-name">
                      <div className="form-group">
                          
                          <input type="textfield" className="form-control" variant="primary" placeholder="Enter name" name="name" onChange={handleChange} value={values.name} />
                      </div>
                    </Col> 
                    <Col className="filter-button">
                    <div className="form-group">
                      <Row>
                        <Col>
                        <Button className="display-block" variant="primary" type="submit" onClick={() => {setFieldValue("page", 1); setFieldValue("action", "");}} >
                          <i className="fa fa-filter" /> Filter
                        </Button>
                        </Col>
                        {Authenticator.scanLevel(["DivisionHead", "Division Head"]) && (

                        <Col>
                        {/* <Button 
                        className="display-block" 
                        variant="primary" 
                        type="submit" 
                        onClick={() => {
                        // Toggle the 'showall' field value
                        setFieldValue("showall", values.showall === 0 ? 1 : 0);
                        setFieldValue("departmentselect", 1);

                        setFieldValue("page", 1);
                        setFieldValue("action", "");

                        }}
                        >
                       <i className= {values.showall === 0 ? "fa fa-filter" : "fa fa-power-off"} /> {values.showall === 0 ? 'Show All' : 'OFF'}
                        </Button> */}
                         <label>
          <input className="showall_checkbox"
            type="checkbox"
            checked={values.showall ==1}
            onClick={() => {
              setFieldValue("showall", values.showall === 0 ? 1 : 0);
              setFieldValue("departmentselect", 1);
              setFieldValue("department_id",null)
              setFieldValue("page", 1);
              setFieldValue("action", "");
              handleSubmit();
            }}

          />
          <span className="showall_text">ShowAll</span>
        </label>
                        </Col>

                        )}
                      </Row>
                      
                    </div>
                    </Col>
                    </Row>
                    <hr/>
                    <Row className="bulk-action">
                      <Col className="col-lg-12 col-md-6 col-sm-8"> 
                      <div className="form-group">
                          <label>Action:</label>
                          <div className="select-div">
                          <select
                            className="form-control" 
                            name="bulk_action"
                            value={values.bulk_action}
                            onChange={handleChange}
                            style={{ display: 'block' }}
                          >
                            <option label="Select Action" />
                            <option value="approve" label="Approved" className="action-approved"/>
                            <option value="deny" label="Deny" className="action-deny"/>
                          </select>
                          </div>
                          <div className="btn-div">
                          <Button className="display-block"  variant="primary" type="submit" onClick={() => setFieldValue("action", "bulk_action")} >
                          <i className="fa fa-edit" /> Update
                        </Button>
                        </div>
                          
                      </div>
                      <ErrorMessage component="div" name="bulk_action" className="input-feedback" />
                      <ErrorMessage component="div" name="checkedList" className="input-feedback" />
                    </Col> 
                     
                    </Row>
                    <Row>
                    </Row>
                    { request_list.data.length > 0  ? (<div>
                {/* Record Displayed:  */}
                { record_number }
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th><Field type="checkbox" name="isAll"  onClick={() =>  { selectAllChecklist(setFieldValue,values,request_list.data)}} /></th>
                      <th>Name / Department</th>
                      <th>Request Type / Date / Note</th> 
                      <th>Date Requested</th>
                      <th  colspan="2"> Request Information</th>
                      <th>Status</th>
                      <th>Updated By / Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="request_list">
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
                              <p> Rest Days: {item.fourth_column?.rest_day?.join()}</p>
                              <p> Work Days: {item.fourth_column?.work_days?.join()}</p>
                              </div>
                            ); 
                            link =  global.links.change_schedule + item.id.toString();
                              break;
                          case "alter_logs":
                              fourthColumn.push(
                                <div>
                                  <span className="alter-logs-new">New</span>
                                  <p>In: {item.fifth_column.new_time_in}</p>
                                  <p>Out: {item.fifth_column.new_time_out}</p>
                                </div>
                              );
                              fifthColumn.push(
                                <div>
                                  <span className="alter-logs-old">Old</span>
                                  <p>In: {item.fourth_column.current_time_in}</p>
                                  <p>Out: {item.fourth_column.current_time_out}</p>
                                </div>
                              );
                              link =  global.links.alter_log + item.id.toString();
                              break;
                              case "alter_log_punches":
                                fourthColumn.push(
                                  <div>
                                    <span className="alter-logs-new">New</span>
                                    <p>
                                      Timelog:  {item.fifth_column}
                                    </p>
                                  </div>
                                );
                                fifthColumn.push(
                                  <div>
                                    <span className="alter-logs-old">Old</span>
                                    <p>Timelog: {item.fourth_column}</p>
                                  </div>
                                );
                                link =  global.links.alter_log_punch + item.id.toString();
                                break;
                          case "rest_day_works":
                            fourthColumn.push(
                              <span>From: {item.fourth_column}</span>
                            );
                            fifthColumn.push(
                              <span>To: {item.fifth_column}</span>
                            );

                              link =  global.links.rest_day_work + item.id.toString();
                              break;
                          case "overtimes":
                              fifthColumn.push(
                                <span>{item.fifth_column}</span>
                              );
                              fourthColumn.push(
                                <span>{item.fourth_column}</span>

                              );
                              link =  global.links.overtime + item.id.toString();
                              break;
                       }
                        return <tr>
                        <td> 
                        { item.status !="Canceled"  ? (<Field type="checkbox" name="checkedList" value={item.id.toString()+"."+item.table_name} />) : (<span></span>)}
                        </td>
                        <td><b>{item.created_by}</b><br/> <small>{item.department_name}</small></td>
                        <td><b>{ Formatter.slug_to_title( item.table_name.slice(0, -1) )}</b><br/> <small>{item.created_at}</small>  <br/><br/> { item.employee_note ? <small><b>NOTE: </b>{item.employee_note}</small> : null} </td>
                        <td>{item.date_requested}</td>
                        <td>{fourthColumn}</td>
                        <td>{fifthColumn}</td>
                        <td className="status"><div className={item.status}><Status status={item.status} /></div></td>
                        <td>{item.updated_by} <br/><small>{item.updated_at}</small></td>
                        <td> <Link to={{ pathname: link, previousPath:  global.links.base +'team/MyTeamRequests' }} className="nav-link" ><i className="fa fa-eye" aria-hidden="true"></i></Link></td>
                      </tr>         
                    })}
                  </tbody>
                </Table>
                <Paginate pagination={request_list} />
                {/* <Pagination className="justify-content-center" >{pagination}</Pagination> */}
                </div>) : (<div> Sorry, No Record Found </div>)}
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
      stored_departments  : state.myTeamRequestList.stored_departments,
      requestList     : state.myTeamRequestList.instance,
      isListLoaded    : state.myTeamRequestList.isListLoaded,
      isNumbersLoaded : state.myTeamRequestList.isNumbersLoaded,
      statusNumbers   : state.myTeamRequestList.statusNumbers,
      filters         : state.myTeamRequestList.filters,
      requesttype     : state.myTeamRequestList.requesttype,
      settings        : state.settings
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchRequestList : ( params ) => dispatch( fetchRequestList(  params ) ), 
      fetchStatusNumbers : ( params ) => dispatch( fetchStatusNumbers( params) ),
      bulkRequest : ( post_data ) => dispatch( bulkRequest( post_data ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(MyTeamAllRequests);







