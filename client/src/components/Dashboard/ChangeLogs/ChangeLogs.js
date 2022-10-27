import React, { Component } from "react";
import "./ChangeLogs.css";
import { ContainerHeader,Content,ContainerWrapper,ContainerBody } from '../../../components/GridComponent/AdminLte.js';
import { getChangeLogs } from '../../../store/actions/dashboard/dashboardActions'
import { connect } from 'react-redux';
import { Container,Row,Col,Table,Image, Spinner,Button  } from 'react-bootstrap';

function ChangeLogsInfo(props) {
    return (
      <div id="myModal" className="modal-main">
        <div className="modal-content">
          <div className="modal-header">
            <span className="close" onClick = {() => props.handleModalClose()}>&times;</span>
          </div>

          <div className="modal-body">
            <h2>{ props.changelogInfo.title }</h2>
            <h3><span className="update-category">{ props.changelogInfo.category }</span> &nbsp; { props.changelogInfo.log_date }</h3>
            <div dangerouslySetInnerHTML={{ __html: props.changelogInfo.description}} />
          </div>
        </div>
      </div>    
    )
  }

class ChangeLogs extends Component {

  constructor(props) {
    super(props);
    this.state = {
      changelogInfo: {},
      isShowModel: false
    };
    this.handleShow = this.handleShow.bind(this);
  }
    
  componentWillMount(){ 
    this.props.getChangeLogs();
  }

  handleShow = (data) => {    
    this.setState({
      changelogInfo: data,
      isShowModel: true
    });
  }

  handleOnhide = () => {
    this.setState({
        isShowModel: false
    });
  }

  render() {
    const { changelogs } = this.props.changelog;

    return  <div className="content-table bdr0">
      { changelogs.length > 0  ? 
        <Table>
            <tbody>
                {changelogs.map(data =>
                <tr className="changelogs-tr" onClick={ () => { this.handleShow(data); }}>
                    <td className="log-title"><span className="icn"></span> <span className="date">{data.log_date}</span></td>
                    <td className="desc">{data.title ?? '(No title given)'}</td>
                </tr>
                )}
            </tbody>
        </Table>
        :
        <div>No change logs to be displayed</div>
      } 
      {
        this.state.isShowModel &&
        <ChangeLogsInfo 
          changelogInfo = { this.state.changelogInfo }
          showModel = {this.state.isShowModel}
          handleModalClose = {() => {this.handleOnhide()}}
        />
        }
    </div>;
  }
}


  
const mapStateToProps = (state) => {
return {
  user : state.user,
  changelog : state.dashboard
}
}
const mapDispatchToProps = (dispatch) => {
  return {
    getChangeLogs  : ( ) => dispatch( getChangeLogs( ) ),
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(ChangeLogs);








