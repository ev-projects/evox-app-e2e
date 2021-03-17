import React, { Component } from "react";
import "./JobInformation.css";
import { Container,Row,Col,Table,Image, Spinner,Button,Form,InputGroup,FormControl   } from 'react-bootstrap';
import { connect } from 'react-redux';
import { useFormikContext } from 'formik';
import { fetchJobInformation ,changePassword } from '../../../store/actions/profile/profileActions' ;

import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { Formik,FieldArray,Field,ErrorMessage,getIn  } from 'formik';
import * as Yup from 'yup';
import Wrapper from "../../../components/Template/Wrapper";
import BackButton from "../../../components/Template/BackButton";
import Validator from "../../../services/Validator";
import Authenticator from "../../../services/Authenticator";
import { Link } from "react-router-dom"; 

class JobInformation extends Component {
    constructor(props){
      super(props)

      this.initialState = {

        showChangePasswordForm : false,
      }
      

      this.state = this.initialState; 
    }
    
    componentWillMount(){
        this.props.fetchJobInformation( this.props.params.id );
    }

    
    componentWillReceiveProps = async(nextProps) => {
  
    }

    
    componentDidUpdate(prevProps) {
        if (this.props.location.pathname !== prevProps.location.pathname) {
            this.onRouteChanged();
        }
    }

    onRouteChanged() {
      this.props.fetchJobInformation( this.props.params.id );
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
                    { !page.isReloading ?
                        <div style={{'flex': '1 1 auto', 'padding': '1.25rem'}}>
                            <Row>
                                <Content col="12" title="Job Information"  subtitle={ <BackButton {...this.props}/>} >

                                <Button type="button" className="btn-updatesched btn btn-secondary float-right"><Link to={{
                                    pathname: global.links.job_information + this.props.params.id,
                                    }}
                                    title="Job Information"
                                >
                                    Job Information
                                </Link></Button>     
                                <Button type="button" className="btn-updatesched btn btn-secondary float-right"><Link to={{
                                    pathname: global.links.personal_information + this.props.params.id,
                                    }}
                                    title="Personal Information"
                                >
                                    Personal Information
                                </Link></Button>                          
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
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.full_name}   />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> Job Title: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.job_title}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row>  
                                                    <Row>  
                                                        <Col size="12" style={{'marginBottom': '5px'}}>  
                                                            <label> Department: </label>    
                                                            <InputGroup>
                                                                <FormControl class="form-control" variant="primary" disabled="true" disabled="true" value={profile.details.department
}  />
                                                            </InputGroup> 
                                                        </Col> 
                                                    </Row> 
                                                   
                                                </div>
                                            </Row>
                                            <br/>
                                            <Row>
                                            { profile.employment_status != null ?
                                            <React.Fragment>
                                            <label>Employment Status </label> 
                                            <Table striped bordered hover>
                                                        <thead>
                                                            <tr>
                                                            <th>Effective Date</th>
                                                            <th>Employment Status</th>
                                                            <th>Comment</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {profile.employment_status.slice().reverse().map(function (data, i) {
                                                                return  (<tr>
                                                                <td>{data.date}</td>
                                                                <td>{data.emp_status}</td>
                                                                <td>{data.comment}</td>
                                                                </tr>)
                                                            }) 
                                                        }
                                                          
                                                        </tbody>
                                                    </Table>
                                                    </React.Fragment>

                                                     :
                                                     null
                                                     } 
                                                     { profile.job_information != null ? 
                                                    <React.Fragment>
                                                     <label> Job Information </label> 
                                                    <Table striped bordered hover>
                                                        <thead>
                                                            <tr>
                                                            <th>Effective Date</th>
                                                            <th>Location Status</th>
                                                            <th>Department</th>
                                                            <th>Job Title</th>
                                                            <th>Reports To</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                        {profile.job_information.slice().reverse().map(function (data, i) {
                                                                return  (<tr>
                                                                <td>{data.date}</td>
                                                                <td>{data.location}</td>
                                                                <td>{data.department}</td>
                                                                <td>{data.jobTitle}</td>
                                                                <td>{data.reportsTo}</td>
                                                                </tr>)
                                                            }) 
                                                        }
                                                          
                                                        </tbody>
                                                    </Table>
                                                    </React.Fragment>

                                                    :
                                                    null
                                                    } 
                                                
                                            </Row>
                                            <br/> 
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
    fetchJobInformation : ( id ) => dispatch( fetchJobInformation( id) )

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(JobInformation);
