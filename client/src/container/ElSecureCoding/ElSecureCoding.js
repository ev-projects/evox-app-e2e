import React, { Component } from "react";
import "./ElSecureCoding.css";
import { Row, Button, Form } from "react-bootstrap";
import { connect } from "react-redux";
import { tickDpa } from "../../store/actions/profile/profileActions";
import { showAlert } from "../../store/actions/settings/alertActions";
import ReactGoogleSlides from "react-google-slides";
import {
  Content,
  ContainerWrapper,
  ContainerBody,
} from "../../components/GridComponent/AdminLte.js";
import Wrapper from "../../components/Template/Wrapper";
import ReactPlayer from "react-player/lazy";
import { Formik } from "formik";
import * as yup from "yup";

class ElSecureCoding extends Component {
  constructor(props) {
    super(props);

    this.state = {

      confirm: false,
    };
  }


 

  render() {
    const {

      showSubmitForm,
    } = this.state;
    const { user } = this.props;

    return (
      <Wrapper {...this.props}>
        <ContainerWrapper>
          <ContainerBody>
            <Content col="12" title="Secure Coding - A Refresher">
              <Row>
                <div className="col-lg-12 col-md-12 col-sm-12">
                  <h2></h2>
              
                  <br />
                  <div  className="slides">
                  
                      <iframe src="https://eastvantage-my.sharepoint.com/:p:/p/kristiyan_bojinov/ERZxKxWhokhHnu4iX3L0JLQB4GePgbIMxqtFYGatSC1czw?e=KjqZMU&wdOrigin=TEAMS-MAGLEV.p2p_ns.rwc&wdExp=TEAMS-TREATMENT&wdhostclicktime=1713347666973&web=1&action=embedview&wdbipreview=true" 
   width="1280px" height="720px" frameborder="0">This is an embedded <a target="_blank" href="https://office.com">Microsoft Office</a> presentation, powered by 
   <a target="_blank" href="https://office.com/webapps">Office</a>.</iframe>
                  </div>
                  
                </div>
              </Row>
            </Content>
          </ContainerBody>
        </ContainerWrapper>
      </Wrapper>
    );
  }
}

// Object for Data Validation
const validationSchema = yup.object().shape({
  confirm: yup
    .bool()
    .oneOf([true], "Please tick the checkbox to confirm the submission."),
});

const mapStateToProps = (state) => {
  return {
    user: state.user,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    tickDpa: (id) => dispatch(tickDpa(id)),
    showAlert: (message, timeout) => dispatch(showAlert(message, timeout)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(ElSecureCoding);
