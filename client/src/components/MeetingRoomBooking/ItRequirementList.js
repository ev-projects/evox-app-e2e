import React, { useState, useEffect } from "react";
import {Table} from 'react-bootstrap';
import { Link } from "react-router-dom"; 
import Authenticator from "../../services/Authenticator";
import axios from "axios";
import { useDispatch } from "react-redux";
import {
    ContainerWrapper,
    ContainerBody,
    Content
  } from "../../components/GridComponent/AdminLte.js";
import { connect, dispatch } from "react-redux";
import PreLoader from "./PreLoader";
import Pagination from "react-bootstrap-4-pagination";
import { pagenationRequestlist, viewRequestlist } from "./Createlocationapi";
import "./MeetingRoom.css";

const ItRequirementList = (props) => {

  const dispatch = useDispatch();
  const [totalpagecount, setTotalpagecount] = useState(1);
  const [currentpagecount, setCurrentpagecount] = useState(1);
  const [requestlist, setRequestlist] = useState([]);
  const { user } = props;
    useEffect(() => {
     
      dispatch(viewRequestlist(setRequestlist,setTotalpagecount,setCurrentpagecount,user.id))
       
        },[]);


        

        let paginationConfig = {
          totalPages: totalpagecount,
          currentPage: currentpagecount,
          showMax: 10,
          size: "sm",
          threeDots: true,
          prevNext: true,
          borderColor: "#0097a7",
          activeBorderColor: "#0097a7",
          activeBgColor: "#0097a7",
          disabledBgColor: "white",
          activeColor: "white",
          color: "white",
          disabledColor: "white",
          // circle: true,
          // shadow: true,
          onClick: function (page) {
            console.log(page);
            setCurrentpagecount(page);

          dispatch(pagenationRequestlist(setRequestlist,page,setTotalpagecount,
           setCurrentpagecount,user.id))
      
           
            
          },
        };
  return (
    <div>
    <ContainerWrapper>
      <ContainerBody>
      <Content label="Create Room">
        <h2 className="page-title">IT Requirement Request list</h2>
        <div className="mb-3">
        <Table striped bordered hover >
          <thead>
            <tr>
              <th>Room Name</th>
              <th>Reserved By</th>
              <th>Start Date</th>
              <th>End Datey</th>
              <th>Total Hours</th>
              <th>Requirements</th>
              {/* <th>Actions</th> */}
            </tr>
          </thead>
          <tbody>
            {requestlist.length > 0 &&
              requestlist.map((requestlist, pos) => (
                <tr>
                  <td>{requestlist.name}</td>
                  <td>{requestlist.user_name}</td>
                  <td>{requestlist.start_date}</td>
                  <td>{requestlist.end_date}</td>
                  <td>{requestlist.total_hours}</td>
                  <td><ul>{requestlist.Reqiurement_List.split(',').map((step)=> <li>{step}{""}</li>)}</ul></td>
                  {/* <td className="actions">
                    <span>
                  <Link
                          to={{
                            pathname: global.links.location_master + location.id,
                            resetInitialState: true,
                          }}
                          title="View Location Details"
                        >
                          <i
                            className="fa fa-eye ev-color"
                            aria-hidden="true"
                          ></i>
                        </Link>
                    </span>
                  </td> */}
                </tr>
              ))}
          </tbody>
        </Table>
        </div>
        <Pagination {...paginationConfig} />
        </Content>
      </ContainerBody>
    </ContainerWrapper>
    </div>
  )
}

const mapStateToProps = (state) => {
    return {
      user: state.user,
      myTeamList: state.myTeamList,
    };
  };
  
export default connect(mapStateToProps)(ItRequirementList);
