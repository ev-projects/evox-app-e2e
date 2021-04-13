import React, { Component } from "react";
import "./TimeOff.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchTimeOff ,changePassword } from '../../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import Formatter from "../../../services/Formatter";
import RestDayWork from "../../Request/RestDayWork";

class TimeOff extends Component {
    constructor(props){
      super(props)
    }
    
    componentWillMount(){
        const start_date = moment('2019-07-01').startOf('month');
        const end_date =  moment().endOf('month');
        this.props.fetchTimeOff(this.props.params.id, start_date, end_date);
    }
    
    componentDidUpdate(prevProps) {
        if (this.props.location.pathname !== prevProps.location.pathname) {
            this.onRouteChanged();
        }
    }

    onRouteChanged() {
      this.props.fetchJobInformation( this.props.params.id );
    }


    render(){
      const { profile, user, page } = this.props;

        return (
            <Wrapper >
               <ContainerWrapper>
                  <ContainerBody>
                  <Row>
                    <div className="profile-header"> 
                        
                        <div className="col-4 picture" >
                            <img src={ Validator.isValid( profile.profilePicture ) ? "data:image/jpg;base64,"+ profile.profilePicture : "/images/default-user-image.png"}
                                style={{'marginTop': '15px', 'width' :'170px', 'height': '170px'}} />
                        </div>
                        <div className="information" >
                            {profile.details.full_name} <br />
                            {profile.details.department} <br />
                            {profile.job_title}      
                        </div>
                        
                            
                    </div>
                    </Row>
                    { !page.isReloading ?
                        <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                            <Row>
                                <Content col="12" title="Time Off"  subtitle={ <BackButton {...this.props}/>} >
                                <div className="profile-tabs">
                                {!Authenticator.check('client') ?
                                    <Button type="button" className="btn active float-right">
                                        <Link to={{
                                            pathname: global.links.time_off + this.props.params.id,
                                            }}
                                            title="Time Off"
                                        >
                                        Time Off
                                        </Link>
                                    </Button>
                                :
                                    null
                                }
                                {!Authenticator.check('client') ?
                                    <Button type="button" className="btn float-right">
                                        <Link to={{
                                            pathname: global.links.job_information + this.props.params.id,
                                            }}
                                            title="Job Information"
                                        >
                                        Job Information
                                        </Link>
                                    </Button>
                                :
                                    null
                                }
                                <Button type="button" className="btn float-right">
                                    <Link to={{
                                        pathname: global.links.personal_information + this.props.params.id,
                                        }}
                                        title="Personal Information"
                                    >
                                    Personal Information
                                    </Link>
                                </Button>
                                </div>                           
                                           
                                { profile.leaves_list?.length > 0 ? 
                                    <div>
                                    { 
                                        profile.leaves_list.slice().reverse().map(function (leave, i) {

                                            return  (<Row className="leave-row">
                                                <div className="icon-column"> 
                                                    <LeaveIcon leave={leave}/>
                                                </div>                  
                                                <div className="details-column"> 
                                                    <b className="time-off-date">{moment(leave.date).format("MMM DD")}</b><br/>
                                                    <LeaveStatus leave={leave}/> {parseFloat(leave.amount)} day of <b>{leave.type}</b>
                                                </div>                  
                                                <div className="note-column"> 
                                                    {leave.employee_note}
                                                </div>
                                                <hr/>
                                            </Row>)
                                        })
                                    }
                                    </div>
                                    :
                                    null
                                } 
                                </Content>
                            </Row>
                        </div>
                    :
                        null
                    }
                  </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
        );
    }
};


// Component for the Leave Icon
export const LeaveIcon = ( props ) => { 

    let icon = "";
    switch( Formatter.title_to_slug( props.leave.type )  ) {
        case "vacation_leave":
            icon = <i class="fa fa-plane fa-icon" /> 
            break;
        case "sick_leave":
            icon = <i className="fa fa-stethoscope fa-icon" /> 
            break;
        case "magna_carta_leave_for_woman":
            icon = <i className="fa fa-female fa-icon" /> 
            break;
        case "maternity_leave":
        case "paternity_leave":
            icon = <i className="fa fa-child fa-icon" /> 
            break;
        case "birthday_leave":
            icon = <i className="fa fa-birthday-cake fa-icon" /> 
            break;
        case "bereavement_leave":
            icon = <i className="fa fa-handshake-o fa-icon" /> 
            break;
        default:
            icon = <i className="fa fa-user fa-icon" /> 
            break;
    }
    return icon;
}

// Component for the Leave Status
export const LeaveStatus = ( props ) => { 

    let status = "";
    switch( props.leave.status ) {
        case "requested":
            status = <i className="fa fa-hourglass" style={{"color": '#ffc84d'}} /> 
            break;
        case "approved":
            status = <i className="fa fa-check-circle" style={{"color": '#82af13'}} /> 
            break;
        case "denied":
            status = <i className="fa fa-times-circle" style={{"color": '#bd2130'}} /> 
            break;
        case "canceled":
            status = <i className="fa fa-ban" style={{"color": '#bd2130'}} /> 
            break;
    }
    return status;
}

const mapStateToProps = (state) => {
  return {
      profile : state.profile,
      user : state.user,
      page : state.page
  }
} 
const mapDispatchToProps = (dispatch) => {

  return {
    fetchTimeOff : ( id, start_date, end_date ) => dispatch( fetchTimeOff( id, start_date, end_date ) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(TimeOff);
