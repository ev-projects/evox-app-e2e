import React, { Component } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { connect } from 'react-redux'

import './ModalLoginContainer.css';
import ModalLogin from '../../../container/ModalLogin/ModalLogin';
import { useLocation } from 'react-router-dom';

const ModalLoginContainer = (props) => {
    
  const { modalLogin } = props;
  const location = useLocation();
  //console.log('Location:', location);
  //console.log(modalLogin);
  if (location.pathname !== '/' & location.pathname !== '/login') {
    return (
      <Modal className='modal-login-dialog' show={modalLogin.onShow} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Login to Continue</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ModalLogin />
        </Modal.Body>
      </Modal>
    );
  } else {
    return (<></>)
  }
}


const mapStateToProps = (state) => {
  return {
    modalLogin : state.modalLogin
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    hideModalLogin: () => dispatch({'type': 'HIDE_MODAL_LOGIN'}),
    showModalLogin : () => dispatch({'type': 'SHOW_MODAL_LOGIN'}),
  };
}
export default connect(mapStateToProps, mapDispatchToProps)(ModalLoginContainer);