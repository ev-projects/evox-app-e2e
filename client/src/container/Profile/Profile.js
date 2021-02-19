import React, { Component } from "react";
import "./Profile.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchProfile, changePassword } from '../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../components/Template/Wrapper";
import QuickPunch from "../QuickPunch";
import BackButton from "../../components/Template/BackButton";
import Validator from "../../services/Validator";
import ChangePasswordForm from "../../components/ChangePasswordForm";

class Profile extends Component {
    constructor(props){
      super(props)

      this.initialState = {

        showChangePasswordForm : false,
      }
      

      this.state = this.initialState; 
    }
    
    componentWillMount(){
        this.props.fetchProfile( this.props.params.id );
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
      this.props.fetchProfile( this.props.params.id );
    }

    setShowChangePasswordForm = ( bool ) => {
        this.setState({
            showChangePasswordForm : bool
        })
    }

    render(){

      const { profile, user, page } = this.props;

        return (
            <Wrapper >
               <ContainerWrapper>
                  <ContainerBody>
                    { Object.keys(profile.details).length > 0 && !page.isReloading ?
                        <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                            <Row>
                                <Content col="8" title="User Profile"  subtitle={ <BackButton {...this.props}/>} >
                                        
                                            <Row>
                                                <div className="col-lg-4 text-center" >
                                                    <img src={ Validator.isValid( profile.profilePicture ) ? "data:image/jpg;base64,"+ profile.profilePicture : "/images/default-user-image.png"}
                                                        style={{'marginTop': '15px', 'width' :'170px', 'height': '170px'}} />
                                                </div>
                                                <div className="col-lg-8" >
                                                    
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> Name: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.full_name}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> Username: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.username}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> E-mail: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.email}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                </div>
                                            </Row>
                                            <br/>
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
    fetchProfile : ( id ) => dispatch( fetchProfile( id) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Profile);
