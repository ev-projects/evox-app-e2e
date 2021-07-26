import React, { Component } from "react";
import "./DPAForm.css";
import { Row,Button,Form  } from 'react-bootstrap';
import { connect } from 'react-redux';
import { tickDpa } from '../../store/actions/profile/profileActions' ;
import { showAlert } from '../../store/actions/settings/alertActions'

import {Content,ContainerWrapper,ContainerBody } from '../../components/GridComponent/AdminLte.js';
import Wrapper from "../../components/Template/Wrapper";
import ReactPlayer from 'react-player/lazy'
import { Formik } from 'formik';
import * as yup from "yup";

class DPAForm extends Component {
    constructor(props){
      super(props)

      this.state = {
          url: 'https://www.eastvantage.com/webinar/2020_Data_Privacy_Orientation.mp4',
          pip: false,
          playing: ( this.props.user?.dpa_ticked_at != null ? false : true ),
          controls: true,
          light: false,
          volume: 0.35,
          muted: false,
          played: 0,
          loaded: 0,
          duration: 0,
          config: { 
            file: { 
              attributes: {
                onContextMenu: e => e.preventDefault(),
                controlsList: 'nodownload' 
              } 
            } 
          },
          playbackRate: 1.0,
          loop: false,
          width: '100%',
          height: '350px',
          showSubmitForm : false,
          confirm: false
      } 
    }
  
    // Tracks every second being runned on the player
    handleProgress = state => {
      // Show the form if the Video is already played beyond 23:15 seconds and if the showSubmitForm is 'false'
      if (!this.state.seeking && state.playedSeconds >= 1395 && this.state.showSubmitForm == false) {
        this.toggleSubmitForm(true);
      }
    }

    // Toggle show of DPA Form
    toggleSubmitForm = ( bool ) => {
        this.setState({
          showSubmitForm : bool
        })
    }
    
    // Toggle Confirm Button
    toggleConfirmButton = () => {
        this.setState({
          confirm : !this.state.confirm
        })
    }

    // Submit DPA Form
    onSubmitHandler = ( values ) => {
      if( values.confirm ) {
          this.props.tickDpa( this.props.user.id );
      }
    }

    render(){

      const { width, height, url, playing, controls, light, volume, muted, config, loop, playbackRate, pip, showSubmitForm } = this.state
      const { user } = this.props;

        return (
            <Wrapper {...this.props} >
               <ContainerWrapper>
                  <ContainerBody>
                    <Content col="12" title="Webinar: Data Privacy"  >
                        <Row>
                          <div className="col-lg-12 col-md-12 col-sm-12">
                            <h2></h2>
                            <p>
                              All employees are required to watch the Data Privacy webinar below. Please tick the checkbox that will appear once the video ends to confirm your attendance. <br/>
                              <br/>
                              A 30-minute orientation for all Eastvantage employees that provides information on Data Privacy and Data
                              Protection. In this orientation, you are given an overview of data protection principles, Eastvantage's role
                              as a Personal Information Controller, Eastvantage's role as a Personal Information Processor, and your role
                              in keeping data confidential as an employee or associate for our clients. Moreover, this orientation covers
                              the basics of the various data protection policies that the company has available as a resource for you to
                              review online.
                            </p>
                            <br/>
                              <ReactPlayer 
                                  ref={this.ref}
                                  width={width}
                                  height={height}
                                  url={url}
                                  pip={pip}
                                  playing={playing}
                                  controls={controls}
                                  light={light}
                                  loop={loop}
                                  playbackRate={playbackRate}
                                  volume={volume}
                                  muted={muted}
                                  config={config}
                                  onReady={()=>{ /*console.log('onReady Call back')*/ }}
                                  onStart={()=>{ /*console.log('onStart Call back')*/ }}
                                  onPause={()=>{ /*console.log('onPause Call back')*/ }}
                                  onProgress={this.handleProgress}
                                  onEnded={()=>{ this.toggleSubmitForm(true) }}
                                  onError={()=>{ /*console.log('onError Call back')*/ }}
                              />
                          <Formik 
                            validationSchema={validationSchema} 
                            onSubmit={this.onSubmitHandler}
                            initialValues={{ confirm : this.state.confirm}}>
                            {({ values, handleChange, handleSubmit, touched, errors}) => (
                            <form onSubmit={handleSubmit}> 
                              { 
                                // If the DPA is not yet ticked, allow the condition to show the Submit Form 
                                user.dpa_ticked_at == null  ? 
                                (
                                  // If the showSubmitForm is true ( which triggered by the video ending/ video reaching 23:15 seconds ), show the Submit form and button.
                                  showSubmitForm ? 
                                  <p>
                                    <br/>
                                    <Form.Control.Feedback type="invalid">
                                      &nbsp;{errors.confirm && touched.confirm && errors.confirm}
                                    </Form.Control.Feedback> 
                                    <input 
                                      name="confirm" 
                                      type="checkbox"
                                      checked={values.confirm}
                                      onChange={handleChange} 
                                    />
                                    I confirm that I attended the training class listed above. I listened, read, and understood the training, and I understand that as an employee, it is my responsibility to abide by Eastvantage policy and procedures, in accordance with the training. If I have questions about the training, materials presented or Eastvantage policy and procedures, I understand it is my responsibility to seek clarification from the Human Resources Department.
                                    <br/>
                                    <br/>
                                    <Button type="button" className="btn btn-secondary"  type="submit"><i className="fa fa-location-arrow" /> Submit</Button>
                                                                  
                                  </p>
                                  : null
                                )
                                : 
                                <p> <br/> Thank you for watching the video! </p>
                              }
                            </form>
                            )}
                          </Formik>
                          </div>
                        </Row>
           
                    </Content>
                  </ContainerBody>
              </ContainerWrapper>
            </Wrapper>
        );
    }
};


// Object for Data Validation
const validationSchema = yup.object().shape({
  confirm: yup
    .bool()
    .oneOf([true], 'Please tick the checkbox to confirm the submission.')
});


const mapStateToProps = (state) => {
  return {
      user : state.user
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    tickDpa : ( id ) => dispatch( tickDpa( id) ),
    showAlert: ( message, timeout ) => dispatch( showAlert( message, timeout ) ),

  }
}
export default connect(mapStateToProps, mapDispatchToProps)(DPAForm);
