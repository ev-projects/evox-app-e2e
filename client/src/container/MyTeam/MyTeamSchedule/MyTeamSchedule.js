import React, { Component } from "react";
import { Card,Col,Badge,Table,Tabs,Tab,Row,Button,Dropdown } from 'react-bootstrap';
import { connect,dispatch } from 'react-redux';
import "./MyTeamSchedule.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import { Formik,FieldArray,Field,ErrorMessage,getIn,Form,useFormikContext  } from 'formik';
import * as Yup from 'yup';
import { fetchTeamSchedule } from '../../../store/actions/filters/myTeamActions';
import { fetchTeamUnderDepartment } from '../../../store/actions/filters/myTeamActions';
import moment from 'moment';
import ReportNavigator from "../../../components/Template/ReportNavigator/ReportNavigator.js";

class MyTeamSchedule extends Component {

  constructor(props){
    super(props);

    this.initialState = {
        filters: {
          start_date:       moment().startOf('day'),
          end_date:         moment().endOf('day'),
          department_id : this.props.user.departments_handled.length > 0?  this.props.user.departments_handled[0].id : null,  
          name : this.props.filters?.name ?? null,  
          team_id :this.props.filters?.team_id ?? null,  
          scope_type : "day",
          pagination: 60,
          page : 1
      }
    }
    this.state = this.initialState.filters; 
  }

  onSubmitHandler = (values) => {
    var params = {};
    for ( var key in values) {
      if( values[key] != null && values[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            params[key] = values[key].format("YYYY-MM-DD");
            break;
          default:
            params[key] = values[key];
            break;
        }
      } 
    }
  this.props.fetchTeamSchedule( params );
  }

  handleChangeDate = ( start_date, end_date, scope_type) => {
    this.state.page = 1;
    this.state.scope_type = scope_type;
    this.handleSubmit();
  }

  filterSchedule = () => {
    this.state.page = 1;
    this.handleSubmit();
  }

  handleSubmit = () => {
    var formData = {};
    var filter = this.state
    for ( var key in filter) {
      if( filter[key] != null && filter[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            formData[key] = filter[key].format("YYYY-MM-DD");
            break;
          default:
            formData[key] = filter[key];
            break;
        }
      } 
    }
    this.props.fetchTeamSchedule( formData );
  }

  componentDidMount(){
    var formData = {};
    var filter = this.state
    for ( var key in filter) {
      if( filter[key] != null && filter[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            formData[key] = filter[key].format("YYYY-MM-DD");
            break;
          default:
            formData[key] = filter[key];
            break;
        }
      } 
    }
    this.props.fetchTeamSchedule( formData );
  }

  paginate = ()  => {
    this.state.page += 1;
    this.handleSubmit();
  }

  export = (export_type)  => {
    var filter = this.state
    var formData = {};

    for ( var key in filter) {
      if( filter[key] != null && filter[key] != ""  ) {
        switch( key ) {
          case "start_date":
          case "end_date": 
            formData[key] = filter[key].format("YYYY-MM-DD");
            break;
          default:
            formData[key] = filter[key];
            break;
        }
      } 
    }

    if(export_type=="all"){
      delete formData.department_id;
    }
    formData["pagination"] = 'all';
    formData["export"] = 'all';

    this.props.fetchTeamSchedule( formData );
  }

  clearState = () =>{
    this.props.team.week = { data: [], date_list: [] };
    this.props.team.month = { data: [], date_list: [] , week_list: []};
    this.props.team.day = [];
  }

  handleSelectDepartment = (department_id) => {
    this.clearState();
    if( department_id != '' ) {
      this.state.department_id = department_id;
      this.props.fetchTeamUnderDepartment(this.props.user.id, department_id);
    }
  }


  handleFilterChange = (e) => {
    this.clearState();
    this.setState({ [e.target.name]: e.target.value });
  }
  
  componentDidUpdate(){
  }

  render = () => {  
  var scope_type = this.state.scope_type;
  var { current_page , last_page } = this.props.team;
  var { team_list } = this.props.team;
  var {  team_schedule } = this.props.team;
  var { user } = this.props; 
  return(
    <Wrapper {...this.props} >
          <ContainerWrapper>
          <h2>My Team Schedule</h2>
          <div className="report-schedule">
          <div className="navigator-bar">
          <ReportNavigator start_date={this.state.start_date} end_date={this.state.end_date} scope_type={this.state.scope_type}  handleChangeDate={this.handleChangeDate} default_view_type={"day"} hide_filter_button={true}/>
          </div>
          <ContainerBody>
          
              <Content col="12">
                
                <Row>
                <Col className="dept"> 
                    <div className="form-group">
                          <select
                          className="form-control" 
                            name="department_id"
                            value={this.state.department_id}
                            onChange={(e) => { 
                              this.handleSelectDepartment(e.target.value)
                            }}
                            style={{ display: 'block' }}
                          >
                          <option label="Select Department" value=''/>
                          {user.departments_handled.map(function(item){
                            return <option value={item.id} label={item.department_name} />;
                          })}
                          </select>
                      </div>
                  </Col> 
                  <Col size="2"> 
                  <div className="form-group">
                            <select
                            className="form-control" 
                              name="team_id"
                              value={this.state.team_id}
                              onChange={this.handleFilterChange}
                              style={{ display: 'block' }}
                            >
                            <option label="Select Team" />
                            {team_list.length > 0 && team_list.map(function(item){
                              return <option value={item.id} label={item.name} />;
                            })}
                            </select>
                        </div>
                  </Col> 
                  <Col size="2"> 
                        <div className="form-group">
                            <input type="textfield" className="form-control" variant="primary" placeholder="Enter Name" name="name" onChange={this.handleFilterChange} value={this.state.name} />
                        </div>
                      </Col> 
                      <Col size="2"> 
                          <Button variant="primary" type="submit" onClick={this.filterSchedule}>
                            <i className="fa fa-filter" /> Filter
                          </Button> &nbsp; 
                      <Dropdown className="export-drop-down">
                            <Dropdown.Toggle variant="success" id="dropdown-basic">
                              <i className="fa fa-download" /> Export
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item  as="button" type="submit" onClick={() =>  this.export("department") }>Export</Dropdown.Item>
                              <Dropdown.Item  as="button" type="submit" onClick={() =>  this.export("all") }>Export All</Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                      </Col>
  
                  </Row>
                    <Row className="legends">
                    <div className="early"><span className="box"></span><span className="status">Early In</span></div>
                    <div className="late"><span className="box"></span><span className="status">Late</span></div>
                    <div className="undertime"><span className="box"></span><span className="status">Undertime</span></div>
                    <div className="holiday"><span className="box"></span><span className="status">Holiday</span></div>
                    <div className="rest_day"><span className="box"></span><span className="status">Rest day</span></div>
                    <div className="on_leave"><span className="box"></span><span className="status">On Leave</span></div>
                    <div className="absent"><span className="box"></span><span className="status">Absent</span></div>
                </Row>
                {scope_type == "day" ? (
                <React.Fragment>
                <div className="today-sched"><DayTeamSchedule data={team_schedule.data} />  </div>
              </React.Fragment>)
                :  scope_type == "week"  ? ( 
                <React.Fragment>
                  <div className="calendar-sched">
                  <WeekTeamSchedule  data={team_schedule}/>
                  </div>
              </React.Fragment>)
                :  scope_type == "month" || scope_type == "custom" ? ( 
                <React.Fragment>
                <div className="calendar-sched">
                  <MonthTeamSchedule  data={team_schedule}/>
                </div>
              </React.Fragment>)
                : "Neither"}
                { current_page < last_page &&
              <div className="viewmore">
              <Button variant="primary" type="submit" onClick={(link) => { this.paginate(link) }}>
                 View More
              </Button>
              </div>
              }
              
              </Content>
              
          </ContainerBody> 
           </div> 
          </ContainerWrapper>
        </Wrapper>);
  }
  }

  const DayTeamSchedule = (props) => {
    return (
    <React.Fragment> {  props.data.length > 0  ? (<React.Fragment> 
      <Row className="Hourframe">
      <div><span>12AM</span></div><div><span>1AM</span></div><div><span>2AM</span></div><div><span>3AM</span></div><div><span>4AM</span></div><div><span>5AM</span></div><div><span>6AM</span></div><div><span>7AM</span></div><div><span>8AM</span></div><div><span>9AM</span></div><div><span>10AM</span></div><div><span>11AM</span></div><div><span>12NN</span></div>
      <div><span>1PM</span></div><div><span>2PM</span></div><div><span>3PM</span></div><div><span>4PM</span></div><div><span>5PM</span></div><div><span>6PM</span></div><div><span>7PM</span></div><div><span>8PM</span></div><div><span>9PM</span></div><div><span>10PM</span></div><div><span>11PM</span></div><div><span>12AM</span></div>
      </Row>
      {props.data.map((page,index) => {
        return  <React.Fragment>{page.map((value,index) => {
          var first_div = {
            width: "0",
            content: "",
            class: ""
          };

          var second_div = {
            width: "0",
            content: "",
            class: ""
          };

          var card = {};
          card = displayStatus(value);

          var card_class = card.class;
          var card_text = card.text;

          if(value.day_type=="underlapped"){

            first_div.width = String(value.hour * 4) + "%";  
            second_div.width = String( value.hour  * 4 ) + "%";
            first_div.content = value.Name + " - "+ card_text;

            first_div.class = card_class;
          }
          else if (value.day_type=="overlapped"){

            first_div.width = String( ( 25 - value.hour ) * 4) + "%";
            second_div.width = String( value.hour  * 4 ) + "%";
            second_div.content = value.Name  +" - "+ card_text;
            
            second_div.class = card_class;
          }else{  
            var schedule_in = moment(value.on_duty);
            var space = (Number( schedule_in.format("HH") ) + Number(schedule_in.format("mm"))/60) * 4 ;
            first_div.width = String( space ) + "%";
            second_div.width = String( value.hour * 4 ) + "%";
            second_div.content = value.Name +" - "+ card_text;

            second_div.class = card_class;
          }

          return <Row className="emp_sched" title={second_div.content}>
          <div style={first_div} className={first_div.class}>{first_div.content}</div>
          <div style={second_div} className={second_div.class}><span>{second_div.content}</span></div>
          <div></div>
          </Row>;
        })}</React.Fragment>;
    })}

    </React.Fragment>) : (<React.Fragment></React.Fragment>)}</React.Fragment>);
  }

  const WeekTeamSchedule = (props) => {
    var week = props.data.data;
    var date_list = props.data.date_list;
    let  column = [];
    let  info = [];  

    var day_index = 0;
    var unique_date = 0

    if(week.length > 0 && date_list.length > 0){
      // Paging
      for (var i = 0; i < week.length; i++) {
        // Data

        for (var j = 0; j < week[i].length; j++) {
          // Data Separated by date

          for (var k = 0; k < week[i][j].length; k++) {
            var data = week[i][j][k];
            var card = {};
            card = displayStatus(data);
            var card_class = card.class;
            var card_text = card.text ;
            
            info.push(<Card>
              <div className={"card-body "+card_class}>
                <div className="schedule_info">
                  <div>{data.Name}</div>
                  <div> &nbsp; {card_text}  <br /></div>
                </div>
            </div>
            </Card>);

          }

          if(date_list[day_index]!=date_list[day_index+1]){
            column.push(<Col>{date_list[day_index]}{info}</Col>);
            unique_date++;
            info = [];
          }
          day_index++;

        }
      }
      
      for ( var i = 6; i >  unique_date - 1; i--) {
        column.push(<Col></Col>);
      }
    }


    return ( <Row  className="emp_sched">
       {column}
    </Row>);
  } 

  const MonthTeamSchedule = (props) => {
    var { date_list, data, week_list } = props.data;
    const week_dictionary = {
      "Sunday": 0,
      "Monday" : 1,
      "Tuesday" : 2, 
      "Wednesday" : 3,
      "Thursday" : 4,
      "Friday" :5,
      "Saturday" : 6,
    } ;

    let row = [];
    let  info = [];
    let  column = []; 


    var day_index = 0;
    var week_index = 0;
    if(data.length > 0 && week_list.length > 0){
      var test = week_dictionary[week_list[week_index][0]];
      for ( var i = 0; i <  test; i++) {
        column.push(<Col></Col>);
      }
      // PAGE
      for (var i = 0; i < data.length; i++) {
        // WEEK
        for (var j = 0; j < data[i].length; j++) {
          // DAY
            for (var k = 0; k < data[i][j].length; k++) {
                //  INFO
                var no_info = data[i][j][k].length;
                for (var l = 0; l < ( no_info  ); l++) {
                  var information =  data[i][j][k][l];
                  var card = {};
                  card = displayStatus(information);
                  var card_class = card.class;
                  var card_text = card.text;
        
                  info.push(<Card>
                    <div className={"card-body "+card_class}>
                      <div className="schedule_info">
                        <div>{information.Name}</div>
                        <div>{card_text}</div>
                      </div>
                  </div>
                  </Card>);
                }
  
                if(date_list[day_index]!=date_list[day_index+1]){
                  column.push(<Col>{date_list[day_index]}{info}</Col>);
                  info = [];
                }
  
                day_index++;
            }
  
  
          if(week_list[week_index][1]=="Saturday" && week_index + 1 < week_list.length){
            if(week_list[week_index+1][0]!="Saturday"){
              row.push(<Row>{column}</Row>);
              column = []
            }
          }
          week_index++;
        }
      }
  
        var test = week_dictionary[week_list[week_list.length-1][1]];
        for ( var i = 6; i >  test; i--) {
          column.push(<Col></Col>);
        }
    }


    row.push(<Row>{column}</Row>)
    return (
      <div  className="emp_sched">{row}</div>
    );

  }

  function displayStatus(schedule_info){
    var card = {
      class : "",
      text : ""
    }

    if(schedule_info.type.includes("early")){
      card.class = 'early';
    }else if(schedule_info.type.includes("on_leave")){
      card.class = 'on_leave';
    }else if(schedule_info.type.includes("holiday")){
      card.class = 'holiday';
    }else if(schedule_info.type.includes("rest_day")){
      card.class = 'rest_day';
    }else if(schedule_info.type.includes("late")){
      card.class = 'late';
    }else if(schedule_info.type.includes("absent")){
      card.class = 'absent';
    }else if(schedule_info.type.includes("no_schedule")){
      card.class = 'no_schedule';
    }else if(schedule_info.type.includes("no_status")){
      card.class = 'no_status';
    }

    if(schedule_info.Schedule.length > 0 ){
      card.text = schedule_info.Schedule +  " " + card.text;
    }
    return card;
  }

  const mapStateToProps = (state) => {
    return {
      user : state.user,
      team : state.myTeamSchedule,
    }
  }
  const mapDispatchToProps = (dispatch) => {
    return {
      fetchTeamSchedule : ( params  ) => dispatch( fetchTeamSchedule( params ) ),
      fetchTeamUnderDepartment : ( user_id, department_id ) => dispatch( fetchTeamUnderDepartment( user_id, department_id ) ),
    }
  }
  
  export default connect(mapStateToProps, mapDispatchToProps)(MyTeamSchedule);







