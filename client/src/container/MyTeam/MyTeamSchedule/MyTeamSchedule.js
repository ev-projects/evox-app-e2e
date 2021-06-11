import React, { Component } from "react";
import { Card,Col,Badge,Table,Tabs,Tab,Row } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyTeamSchedule.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import { fetchTeamSchedule } from '../../../store/actions/filters/myTeamActions';

class MyTeamSchedule extends Component {

  constructor(props){
    super(props);
    this.initialState = {
        filters: {
          url: 'my_team_requests'
      }
    }
    this.state = this.initialState; 
  }

  onSubmitHandler = (values) => {
  }

  componentDidMount(){
    this.props.fetchTeamSchedule()
  }

  componentDidUpdate(){
  }

  render = () => {  
    
  var { date_list, data } = this.props.team.team_schedule;

  const validationSchema = Yup.object().shape({
  });

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
            <h2>My Team Schedule</h2> 
            <div className="request-tab">
                <Tabs defaultActiveKey="home" id="uncontrolled-tab-example">
                  <Tab eventKey="all" title="Today" >
                  </Tab>
                  <Tab eventKey="alteration" title="Weekly" >
                  </Tab>
                  <Tab eventKey="overtime" title="Monthly">
                  </Tab>
                </Tabs> 
                </div>  
            <ContainerBody>  
                <Content col="12">
                  <Row>
                    <Col>
                      SUNDAY
                    </Col>
                    <Col>
                      MONDAY
                    </Col>
                    <Col>
                      TUESDAY
                    </Col>
                    <Col>
                      WEDNESDAY
                    </Col>
                    <Col>
                        THURSDAY
                    </Col>
                    <Col>
                        FRIDAY
                    </Col>
                    <Col>
                      SATURDAY
                    </Col>
                  </Row>
                    <Row className="empsched">
                    {  data.length > 0  ? (<React.Fragment> 
                      {data.map((value,index) => {
                          return <Col>{date_list[index]}{value.map((schedule_info,index) => {

                            var card_class = '';
                            var card_text = ''; 

                            if(schedule_info.type.includes("early")){
                              card_class = 'early';
                              card_text = schedule_info.Schedule[0];                           
                            }else if(schedule_info.type.includes("on_leave")){
                              card_class = 'on_leave';
                              card_text = 'On Leave';
                            }else if(schedule_info.type.includes("rest_day")){
                              card_class = 'rest_day';
                              card_text = 'Rest Day';
                            }else if(schedule_info.type.includes("late")){
                              card_class = 'late';
                              card_text = schedule_info.Schedule[0]; 
                            }else if(schedule_info.type.includes("absent")){
                              card_class = 'absent';
                              card_text = schedule_info.Schedule[0]; 
                            }

                              return <Card>
                                <div className={"card-body "+card_class}>
                                  <div class="schedule_info">
                                    <div>{schedule_info.Name}</div>
                                    <div> &nbsp; {card_text} &nbsp;</div>
                                  </div>
                              </div>
                              </Card>;
                          })}</Col>;
                      })}
                    </React.Fragment>) : (<React.Fragment></React.Fragment>)}
                    </Row>
                </Content>
            </ContainerBody>  
            </ContainerWrapper>
          </Wrapper>
      </form>
      )}
    
      </Formik>);
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
      team : state.myTeamList
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchTeamSchedule : (  ) => dispatch( fetchTeamSchedule(  ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(MyTeamSchedule);







