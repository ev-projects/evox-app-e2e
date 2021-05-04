import React, { Component, useState, useEffect  } from "react";
import DatePicker from "react-datepicker";
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js'
import "./TeamAttendance.css";
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import moment from 'moment';
import { connect } from 'react-redux';
import { getTeamAttendanceStatus } from '../../../store/actions/dashboard/dashboardActions'
import * as Yup from 'yup';
import Formatter from "../../../services/Formatter";

class TeamAttendance extends Component {
	constructor(props){
    	super(props);
	}
	
	onSubmitHandler = (values) => {

	}

  componentWillMount(){ 
    this.props.getTeamAttendanceStatus( this.props.user.id );
	}
	
    componentWillUnmount(){
    }

    
	render = () => {  
		const { team_attendance } = this.props.dashboard;
    return(
      <div >
      { team_attendance.length > 0  ?
            <div className="content-table">
              <Table striped bordered hover>
                  <thead>
                      <tr>
                      <th>Name</th>
                      <th  style={{width:'135px'}}>Schedule</th>
                      <th>Status</th>
                      </tr>
                  </thead>
                  <tbody>
              
                  {team_attendance.map(function (data, i) {
                          return  (<tr>
                          <td>{data.name}</td>
                          <td>
                          {data.schedule.map(function (data, i) {
                          return  (
                                  <div>{data}</div>
                                  )
                              }) 
                          }
                          </td>
                          <td>
                            {data.status.length > 0 ?
                            <div>{data.status.map(t => <span className={Formatter.title_to_slug(t)}>{t}</span>)
                            .reduce((prev, curr) => [prev, ', ', curr])}
                            {data.status.length > 1 ?
                              <div>,</div>
                                :
                                ''
                              }</div>

                              :
                              ''
                            }
                             {Object.keys(data.values).length > 0 ?
                            <div>{ Object.entries(data.values).map(function(key,data) {
                              return <span ><span className={Formatter.title_to_slug(key[0])}>{Formatter.slug_to_title(key[0])}</span> ({key[1]})</span>
                          }).reduce((prev, curr) => [prev, ', ', curr]) } </div>
                          :
                          ''
                        }
                            <div> 
                              </div>
                          </td>
                          </tr>)
                      }) 
                  }
                  </tbody>
              </Table>
              </div>
          
          :
          <div>No record found</div>
          } 
  </div>);
	}
  }




  const validationSchema = Yup.object().shape({});
  
  const mapStateToProps = (state) => {
    return {
      user : state.user,
      dashboard : state.dashboard
    }
  }
  const mapDispatchToProps = (dispatch) => {
	  return {
      getTeamAttendanceStatus  : ( id ) => dispatch( getTeamAttendanceStatus( id ) ),
	  }
  }
  export default connect(mapStateToProps, mapDispatchToProps)(TeamAttendance);
  