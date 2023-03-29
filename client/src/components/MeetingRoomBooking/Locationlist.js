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
import PreLoader from "./PreLoader";
import Pagination from "react-bootstrap-4-pagination";
import { pagenationLocationlist, viewLocationlist } from "./Createlocationapi";

const Locationlist = () => {
  const dispatch = useDispatch();
  const [loader, setLoader] = useState(false);
  const [totalpagecount, setTotalpagecount] = useState(1);
  const [currentpagecount, setCurrentpagecount] = useState(1);
    const [locationlist, setLocationlist] = useState([]);
  
    useEffect(() => {
     
      dispatch(viewLocationlist(setLocationlist,setTotalpagecount,setCurrentpagecount))
       
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

          dispatch(pagenationLocationlist(setLocationlist,page,setTotalpagecount,
           setCurrentpagecount))
      
           
            
          },
        };
  return (
    <div>

    <ContainerWrapper>
      <ContainerBody>
      <Content label="Create Room">
        <h2 className="page-title">Country list</h2>
        <div className="mb-3">
        <Table striped bordered hover >
          <thead>
            <tr>
              <th>Location ID</th>
              <th>Location Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {locationlist.length > 0 &&
              locationlist.map((location, pos) => (
                <tr>
                  <td>{location.id}</td>
                  <td>{location.location_name}</td>
                  <td className="actions">
                    <span>
                      {Authenticator.check(
                        "supervisor",
                        "view_employee_dtr"
                      ) && (
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
                      )}
                    </span>
                  </td>
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
  );
};

export default Locationlist;
