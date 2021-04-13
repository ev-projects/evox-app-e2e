import React, { Component } from "react";
import "./PersonalInformation.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import Select from "react-select";
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchPersonalInformation, changePassword } from '../../../store/actions/profile/profileActions' ;
import Authenticator from "../../../services/Authenticator";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import ChangePasswordForm from "../../../components/ChangePasswordForm";
import { Link } from "react-router-dom"; 

class PersonalInformation extends Component {
    constructor(props){
      super(props)

      this.initialState = {

        showChangePasswordForm : false,
      }
      

      this.state = this.initialState; 
    }
    
    componentWillMount(){
        this.props.fetchPersonalInformation( this.props.params.id );
    }

    
    componentWillReceiveProps = async(nextProps) => {
        
        // If the closeAllForm is triggered, manually set all the showing of forms to False.
        if( nextProps.profile?.closeAllForm  ) {
            
           this.setShowChangePasswordForm(false);
        }
    }

    
    componentDidUpdate(prevProps) {
        if (this.props.location.pathname !== prevProps.location.pathname) {
            this.onRouteChanged();
        }
    }

    onRouteChanged() {
      this.props.fetchPersonalInformation( this.props.params.id );
    }

    setShowChangePasswordForm = ( bool ) => {
        this.setState({
            showChangePasswordForm : bool
        })
    }

    render(){
      
      const { profile, user, page } = this.props;
      const options = [
        { value: 1, label: 'Active' },
        { value: 0, label: 'Inactive' },
      ]
      
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
                    { Object.keys(profile.details).length > 0 && !page.isReloading ?
                        <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                            <Row>
                                <Content col="12" title="Personal Information"  subtitle={ <BackButton {...this.props}/>} >
                                <div className="profile-tabs">
                                {!Authenticator.check('client') ?
                                    <Button type="button" className="btn float-right">
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
                                <Button type="button" className="btn active float-right">
                                    <Link to={{
                                        pathname: global.links.personal_information + this.props.params.id,
                                        }}
                                        title="Personal Information"
                                    >
                                    Personal Information
                                    </Link>
                                </Button>
                                </div>            

                                           
                                            <Row>

                                               
                                                <div className="col-lg-8" >
                                                    
                                                       <h4>Basic Information</h4>
                                                       <Row>
                                                       <Col size="3">  
                                                            <label> Status: </label>    
                                                            { profile.details.is_active != null ?
                                                            <InputGroup>
                                                                <Select
                                                                    name="year"
                                                                    className="year-dropdown col-lg-12"
                                                                    placeholder="Select Status"
                                                                    isDisabled={true}
                                                                    value={options.filter(option => option.value === profile.details.is_active)}
                                                                    options={options}
                                                                />
                                                            </InputGroup> 
                                                            :
                                                            null
                                                            }
                                                        </Col>   
                                                        <Col size="3">  
                                                            <label> Employee Number: </label>    
                                                           
                                                        <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.emp_num}  />
                                                            </InputGroup>
                                                        </Col> 
                                                       
                                                    </Row>
                                                    
                                                    
                                                       <Row>
                                                       <Col size="6" style={{'marginBottom': '5px'}}>
                                                       <label> Full Name: </label> 
                                                        <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.full_name}  />
                                                            </InputGroup>
                                                        </Col> 
                                                        <Col size="6" style={{'marginBottom': '5px'}}>  
                                                            <label> Nick Name: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.nickname}  />
                                                            </InputGroup> 
                                                        </Col>     
                                                       </Row>
                                                                                                           
                                                     
                                                    
                                                   
                                                    <Row>  
                                                        <Col size="4" style={{'marginBottom': '5px'}}>  
                                                            <label> Birth Date: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.birthdate}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row>
                                                    <hr /> 
                                                    <h4>Contact Information</h4>
                                                    {!Authenticator.check('client') ?
                                                    <Row>  
                                                        <Col size="6" style={{'marginBottom': '5px'}}>  
                                                            <label> Mobile Number: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.mobile_phone}  />
                                                            </InputGroup> 
                                                        </Col>
                                                        <Col size="6" style={{'marginBottom': '5px'}}>  
                                                            <label> Work Email: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.email}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                    :
                                                    null
                                                  }
                                                </div>
                                            </Row>
                                            
                                                    <hr />
                                            <Row>
                                                <div className="col-lg-12" >
                                                    { profile.details.id == user.id ?
                                                        <Button type="button" className="btn btn-secondary" onClick={()=> {this.setShowChangePasswordForm(true)}} >Change Password</Button>
                                                        :
                                                        null
                                                    }
                                                    
                                                </div>
                                            </Row>

                                </Content>
                                {
                                    this.state.showChangePasswordForm ? 
                                    <ChangePasswordForm {...this} />
                                    : 
                                    null
                                }
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
    fetchPersonalInformation : ( id ) => dispatch( fetchPersonalInformation( id) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(PersonalInformation);
