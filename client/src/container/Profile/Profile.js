import React, { Component } from "react";
import "./Profile.css";
import { Container,Row,Col, Tabs, Tab, Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { fetchTimeOff , fetchPersonalInformation, fetchProfile, fetchJobInformation, fetchLeaveCredits } from '../../store/actions/profile/profileActions' ;
import Select from "react-select";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import ChangePasswordForm from "../../components/ChangePasswordForm";
import * as Yup from 'yup';
import Wrapper from "../../components/Template/Wrapper";
import BackButton from "../../components/Template/BackButton";
import Validator from "../../services/Validator";
import Authenticator from "../../services/Authenticator";
import { Link } from "react-router-dom"; 
import moment from 'moment';
import PersonalInformation from "./PersonalInformation";
import JobInformation from "./JobInformation";
import TimeOff from "./TimeOff";
import Formatter from "../../services/Formatter";
import LeaveCredits from "./LeaveCredits";

class Profile extends Component {
    constructor(props){
      super(props)
      this.state = {
          current_tab: null
      }
    }
    
    componentWillMount(){
        this.setInitialDetails();
    }
    
    componentDidUpdate(prevProps, prevState ) {
        
        if (this.props.location.pathname !== prevProps.location.pathname) {
            this.onRouteChanged();
        }

        if( prevState.current_tab !== this.state.current_tab ) {

            switch( this.state.current_tab ) {
                case "personal_information":
                    this.props.fetchPersonalInformation( this.props.params.id );
                    break;
                case "job_information":
                    this.props.fetchJobInformation( this.props.params.id );
                    break;
                case "time_off":
                    const start_date = moment().startOf('month');
                    const end_date =  moment().endOf('month');
                    
                    this.setState({
                        start_date: start_date,
                        end_date: end_date
                    })

                    this.props.fetchLeaveCredits(this.props.params.id);
                    this.props.fetchTimeOff(this.props.params.id, start_date, end_date);
                    break;
            }
        }

    }

    onRouteChanged() {
        this.setInitialDetails();
    }

    setInitialDetails(){
        this.props.fetchProfile( this.props.params.id )
        this.setTab( "personal_information" )
        this.props.fetchPersonalInformation( this.props.params.id );
    }

    setTab( tab ) {
        this.setState({
            current_tab: tab
        })
    }

    render(){
      
      const { profile, user, page } = this.props;

        return (
            <Wrapper >
               <ContainerWrapper>
                  <ContainerBody>
                    <Row>
                        <Col>
                            <div className="profile-header"> 
                                <div className="picture" >
                                    <img src={ Validator.isValid( profile.profile_picture ) ? "data:image/jpg;base64,"+ profile.profile_picture : "/images/default-user-image.png"}
                                         />
                                </div>
                                <div className="information" >
                                    { profile.details.full_name} <br />
                                    { profile.details.department} <br />
                                    { profile.personal_information?.job_title}      
                                </div>
                            </div>
                        </Col>
                    </Row>
                    { Object.keys(profile.details).length > 0 && !page.isReloading ?
                        <div className="profile-content">
                            <Row>
                                <Content col="12" title={Formatter.slug_to_title(this.state.current_tab)}  subtitle={ <BackButton {...this.props}/>} >
                                    <div className="profile-tabs">
                                        <Tabs defaultActiveKey="home" 
                                                id="uncontrolled-tab-example"
                                                defaultActiveKey={this.state.current_tab}
                                                onSelect={ (key) =>  { this.setTab(key) } }
                                        >
                                            <Tab eventKey="personal_information" title="Personal Info" type="submit"></Tab>
                                            {!Authenticator.check('client') ? <Tab eventKey="job_information" title="Job Info" type="submit"></Tab> : null }
                                            {!Authenticator.check('client') ? <Tab eventKey="time_off" title="Time Off" type="submit"></Tab> : null }
                                            
                                        </Tabs>
                                    </div>
                                    { this.state.current_tab == "personal_information" && profile.personal_information != [] ? 
                                        <PersonalInformation  />
                                        :
                                        null
                                    }
                                    { this.state.current_tab == "job_information" && profile.employment_status != []  && profile.job_information != [] ? 
                                        <JobInformation  />
                                        :
                                        null
                                    }
                                    { this.state.current_tab == "time_off" && profile.leaves_list != [] ? 
                                        <TimeOff start_date={this.state.start_date} end_date={this.state.end_date}/>
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

const mapStateToProps = (state) => {
  return {
      profile : state.profile,
      user : state.user,
      page : state.page
  }
} 
const mapDispatchToProps = (dispatch) => {

  return {
    fetchProfile : ( id ) => dispatch( fetchProfile( id) ),
    fetchPersonalInformation : ( id ) => dispatch( fetchPersonalInformation( id) ),
    fetchJobInformation : ( id ) => dispatch( fetchJobInformation( id) ),
    fetchLeaveCredits : ( id ) => dispatch( fetchLeaveCredits( id ) ),
    fetchTimeOff : ( id, start_date, end_date ) => dispatch( fetchTimeOff( id, start_date, end_date ) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Profile);
